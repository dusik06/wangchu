"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DogEntry = {
  lane: number;
  dogKey: string;
  name: string;
  breed: string;
  emoji: string;
  speed: number;
  stamina: number;
  sprint: number;
  composure: number;
  mistakeRate: number;
  winProbability: number;
  odds: number;
};

type RaceEvent = {
  at: number;
  lane: number;
  type: "start" | "surge" | "mistake" | "recover" | "sprint" | "finish";
  message: string;
  intensity: number;
};

type RaceResult = {
  winnerLane: number;
  ranking: number[];
  finishTimes: Record<number, number>;
  progressFrames: Array<{ at: number; progress: Record<number, number> }>;
  events: RaceEvent[];
  durationMs: number;
};

type PlayResponse = {
  success: boolean;
  message?: string;
  raceCode: string;
  selectedLane: number;
  betAmount: number;
  odds: number;
  payoutAmount: number;
  won: boolean;
  newBalance: number;
  result: RaceResult;
};

type RaceState = "idle" | "countdown" | "running" | "photo" | "finished";
type VisualAction = "run" | "jump" | "fall" | "recover" | "mud" | "sprint";
type PathPoint = { t: number; x: number; y: number; action: VisualAction };
type RunnerPath = { lane: number; points: PathPoint[] };

const WORLD_LENGTH = 5200;
const START_X = 260;
const FINISH_X = 4860;
const DOG_COLORS = ["#24242b", "#9a5936", "#f1eee6", "#77808e", "#d8a23d", "#ead8b8"];
const HURDLE_WORLD_X = [1450, 2940, 4070];
const MUD_WORLD_X = [2260, 3560];
const CHARACTER_ASSETS: Record<string, string> = { 민주: "/dog-race/characters/minju.png", 두식: "/dog-race/characters/dusik.jpg", 왕아지: "/dog-race/characters/wangaji.png", 새롭이: "/dog-race/characters/saerobi.png", 왕츄: "/dog-race/characters/wangchu.png", 비니: "/dog-race/characters/bini.png" };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(value: number) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function personality(dog: DogEntry) {
  const top = [
    ["폭주형", dog.speed + (100 - dog.stamina) * 0.3],
    ["꾸준형", dog.stamina + dog.composure * 0.45],
    ["역전형", dog.sprint + dog.stamina * 0.25],
    ["승부사", dog.speed + dog.sprint * 0.32],
    ["냉정형", dog.composure + (20 - dog.mistakeRate) * 1.5],
    ["야생형", dog.speed + dog.mistakeRate * 1.7],
  ] as const;

  return [...top].sort((a, b) => Number(b[1]) - Number(a[1]))[0][0];
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] font-bold text-white/45">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function RacingDog({ dog, running, leader, action }: { dog: DogEntry; running: boolean; leader: boolean; action: VisualAction; }) {
  const src = CHARACTER_ASSETS[dog.name] || CHARACTER_ASSETS["왕츄"];
  const photo = dog.name === "왕츄" || dog.name === "두식";
  return (
    <div className={`character-runner ${running ? "is-running" : "is-waiting"} action-${action} ${leader ? "is-leader" : ""}`}>
      {leader && running ? <div className="leader-badge">선두</div> : null}
      <div className={`character-shell ${photo ? "photo-shell" : "png-shell"}`}>
        <img src={src} alt={dog.name} className="character-image" draggable={false} />
        <div className="character-light" />
      </div>
      <div className="character-shadow" />
      {running ? <><i className="race-dust dust-a"/><i className="race-dust dust-b"/><i className="race-dust dust-c"/></> : null}
      {action === "sprint" ? <><i className="speed-streak streak-a"/><i className="speed-streak streak-b"/></> : null}
      {action === "fall" ? <span className="impact-mark">💥</span> : null}
    </div>
  );
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function smootherstep(value: number) { const t = clamp(value, 0, 1); return t*t*t*(t*(t*6-15)+10); }

function buildRunnerPaths(entries: DogEntry[], result: RaceResult): RunnerPath[] {
  const samples = 240;
  const duration = Math.max(1, result.durationMs);
  return entries.map((dog) => {
    const rankIndex = Math.max(0, result.ranking.indexOf(dog.lane));
    const points: PathPoint[] = [];
    let previousX = START_X;
    for (let i=0;i<=samples;i++) {
      const t=i/samples;
      const eased=smootherstep(t);
      const fade=Math.sin(Math.PI*t);
      const early=Math.sin(Math.PI*clamp(t/0.44,0,1))*((dog.speed-76)*2.4);
      const mid=Math.sin(Math.PI*clamp((t-0.16)/0.62,0,1))*((dog.stamina-76)*2.0);
      const late=smootherstep(clamp((t-0.67)/0.33,0,1))*((dog.sprint-76)*3.2);
      const weave=(Math.sin(t*Math.PI*4.2+dog.lane*1.17)*34 + Math.sin(t*Math.PI*8.3+dog.lane*.61)*12)*fade;
      const rankPull=(5-rankIndex)*14*smootherstep(clamp((t-.7)/.3,0,1));
      let eventOffset=0; let action:VisualAction='run';
      for (const event of result.events) {
        if (event.lane!==dog.lane) continue;
        const center=event.at/duration; const d=Math.abs(t-center);
        if (event.type==='mistake' && d<.052) { const q=1-d/.052; eventOffset-=72*q*Math.max(.7,event.intensity); action=d<.018?'fall':'recover'; }
        if ((event.type==='surge'||event.type==='sprint') && d<.07) { const q=1-d/.07; eventOffset+=68*q*Math.max(.7,event.intensity); action='sprint'; }
      }
      const finalGap=rankIndex*38;
      const maxX=FINISH_X-finalGap;
      let x=START_X+eased*(FINISH_X-START_X)+early+mid+late+weave+rankPull+eventOffset;
      x=clamp(x, i===0?START_X:previousX+0.4, maxX);
      if (i===samples) x=maxX;
      let y=0;
      const hurdle=HURDLE_WORLD_X.find(h=>Math.abs(x-h)<150);
      const mud=MUD_WORLD_X.some(m=>Math.abs(x-m)<180);
      if (hurdle && action!=='fall' && action!=='recover') { const local=clamp((x-(hurdle-150))/300,0,1); y=-Math.sin(local*Math.PI)*82; action='jump'; }
      else if (mud && action==='run') { action='mud'; y=4; }
      points.push({t,x,y,action}); previousX=x;
    }
    return { lane: dog.lane, points };
  });
}

function sampleRunnerPath(path: RunnerPath, phase: number) {
  const p=clamp(phase,0,1); const idx=p*(path.points.length-1); const a=path.points[Math.floor(idx)]; const b=path.points[Math.min(path.points.length-1,Math.ceil(idx))]; const f=idx-Math.floor(idx);
  return { x:lerp(a.x,b.x,f), y:lerp(a.y,b.y,f), action:f<.5?a.action:b.action };
}

export default function DogRaceClient() {
  const [dotori, setDotori] = useState<number | null>(null);
  const [entries, setEntries] = useState<DogEntry[]>([]);
  const [raceCode, setRaceCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLane, setSelectedLane] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [playData, setPlayData] = useState<PlayResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [raceState, setRaceState] = useState<RaceState>("idle");
  const [liveOrder, setLiveOrder] = useState<number[]>([]);
  const [cameraMode, setCameraMode] = useState<"start" | "side" | "close" | "finish">("start");
  const [dogActions, setDogActions] = useState<Record<number, VisualAction>>({});
  const [photoFinish, setPhotoFinish] = useState(false);
  const [finishFlash, setFinishFlash] = useState(false);
  const [crowdLevel, setCrowdLevel] = useState(0);

  const animationRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef<HTMLDivElement | null>(null);
  const finishLineRef = useRef<HTMLDivElement | null>(null);
  const gateRef = useRef<HTMLDivElement | null>(null);
  const dogRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const markerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hurdleRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mudRefs = useRef<Array<HTMLDivElement | null>>([]);
  const eventMemoryRef = useRef<Record<string, boolean>>({});
  const runnerPathsRef = useRef<RunnerPath[]>([]);
  const cameraXRef = useRef(0);
  const cameraShellRef = useRef<HTMLDivElement | null>(null);

  const selectedDog = useMemo(
    () => entries.find((dog) => dog.lane === selectedLane) || null,
    [entries, selectedLane]
  );

  const expectedPayout =
    selectedDog && Number(betAmount) > 0
      ? Math.floor(Number(betAmount) * selectedDog.odds)
      : 0;

  const visibleEvents = useMemo(() => {
    if (!playData) return [];
    return playData.result.events
      .filter((event) => event.at <= elapsed)
      .slice(-4)
      .reverse();
  }, [playData, elapsed]);

  const isLocked =
    raceState === "countdown" ||
    raceState === "running" ||
    raceState === "photo" ||
    raceState === "finished";

  async function loadBalance() {
    const response = await fetch("/api/game/dog-race/balance", {
      cache: "no-store",
    });
    const data = await response.json();
    if (data.success) setDotori(Number(data.dotori));
  }

  useEffect(() => {
    loadBalance();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  async function createRace() {
    if (loading || raceState === "running" || raceState === "countdown") return;

    setLoading(true);
    setSelectedLane(null);
    setBetAmount("");
    setPlayData(null);
    setElapsed(0);
    setRaceState("idle");
    setLiveOrder([]);
    setCameraMode("start");
    setDogActions({});
    setPhotoFinish(false);
    setFinishFlash(false);
    setCrowdLevel(0);
    eventMemoryRef.current = {};
    runnerPathsRef.current = [];
    cameraXRef.current = 0;

    try {
      const response = await fetch("/api/game/dog-race/create", {
        method: "POST",
      });
      const data = await response.json();

      if (!data.success) {
        alert(data.message || "경기를 만들 수 없습니다.");
        return;
      }

      setEntries(data.entries);
      setRaceCode(data.raceCode);
    } finally {
      setLoading(false);
    }
  }

  function visualDistance(
    dog: DogEntry,
    result: RaceResult,
    elapsedMs: number
  ) {
    const duration = Math.max(1, result.durationMs);
    const phase = clamp(elapsedMs / duration, 0, 1);
    const rankIndex = Math.max(0, result.ranking.indexOf(dog.lane));

    const launch = smoothstep(clamp(phase / 0.12, 0, 1));
    const cruise = smoothstep(phase);
    const baseDistance = launch * 110 + cruise * (FINISH_X - START_X - 110);

    const raceFade = Math.sin(Math.PI * phase);
    const speedShape =
      Math.sin(clamp(phase / 0.43, 0, 1) * Math.PI) *
      ((dog.speed - 77) * 2.2);
    const staminaShape =
      Math.sin(clamp((phase - 0.2) / 0.58, 0, 1) * Math.PI) *
      ((dog.stamina - 77) * 1.8);
    const sprintShape =
      smoothstep(clamp((phase - 0.67) / 0.33, 0, 1)) *
      ((dog.sprint - 76) * 2.9);
    const rhythm =
      Math.sin(phase * Math.PI * 5.2 + dog.lane * 1.21) *
        44 *
        raceFade +
      Math.sin(phase * Math.PI * 10.6 + dog.lane * 0.57) *
        17 *
        raceFade;

    let eventShift = 0;
    for (const event of result.events) {
      if (event.lane !== dog.lane || elapsedMs < event.at) continue;
      const age = elapsedMs - event.at;

      if (event.type === "mistake" && age < 1300) {
        eventShift -= (1 - age / 1300) * 125 * event.intensity;
      }

      if (
        (event.type === "surge" || event.type === "sprint") &&
        age < 1700
      ) {
        eventShift += (1 - age / 1700) * 95 * event.intensity;
      }
    }

    const finalPull = smoothstep(clamp((phase - 0.72) / 0.28, 0, 1));
    const finalGap = rankIndex * 34;
    const winnerBonus = rankIndex === 0 ? 20 * finalPull : 0;

    const target = FINISH_X - finalGap;
    const natural =
      START_X +
      baseDistance +
      speedShape +
      staminaShape +
      sprintShape +
      rhythm +
      eventShift +
      winnerBonus;

    return clamp(natural, START_X, target);
  }

  function getActionForDog(
    dog: DogEntry,
    result: RaceResult,
    elapsedMs: number,
    worldX: number
  ): VisualAction {
    const nearHurdle = HURDLE_WORLD_X.some((x) => Math.abs(worldX - x) < 145);
    const nearMud = MUD_WORLD_X.some((x) => Math.abs(worldX - x) < 175);

    const activeEvent = [...result.events].reverse().find(
      (event) => event.lane === dog.lane && elapsedMs >= event.at && elapsedMs - event.at < 1350
    );

    if (activeEvent?.type === "mistake") {
      const age = elapsedMs - activeEvent.at;
      if (age < 520) return "fall";
      if (age < 1050) return "recover";
    }
    if (activeEvent?.type === "sprint" || activeEvent?.type === "surge") return "sprint";

    if (nearHurdle) {
      const hurdleIndex = HURDLE_WORLD_X.findIndex((x) => Math.abs(worldX - x) < 145);
      const key = `${dog.lane}-hurdle-${hurdleIndex}`;
      const failChance = dog.mistakeRate + Math.max(0, 72 - dog.composure) * 0.28;
      const deterministic = (dog.lane * 37 + hurdleIndex * 17 + Math.round(dog.speed)) % 100;
      if (deterministic < failChance) eventMemoryRef.current[key] = true;
      return eventMemoryRef.current[key] ? "fall" : "jump";
    }
    if (nearMud) return "mud";
    return "run";
  }

  function runAnimation(data: PlayResponse) {
    const paths = buildRunnerPaths(entries, data.result);
    runnerPathsRef.current = paths;
    setRaceState("running"); setCameraMode("start"); startRef.current=performance.now(); lastUiUpdateRef.current=0; cameraXRef.current=0;
    if (gateRef.current) gateRef.current.style.transform="translateY(-112%)";
    const tick=(now:number)=>{
      const raw=now-startRef.current; const slowAt=data.result.durationMs-1300; const raceElapsed=raw<=slowAt?raw:slowAt+(raw-slowAt)*.44; const safe=Math.min(raceElapsed,data.result.durationMs); const phase=clamp(safe/data.result.durationMs,0,1);
      const positions=paths.map(path=>{const sampled=sampleRunnerPath(path,phase); const dog=entries.find(e=>e.lane===path.lane)!; return {dog,...sampled};});
      const sorted=[...positions].sort((a,b)=>b.x-a.x); const leaderX=sorted[0]?.x||START_X; const vw=trackRef.current?.clientWidth||1000;
      const mode: "start"|"side"|"close"|"finish" = phase<.12?'start':phase>.84?'finish':phase>.48&&phase<.68?'close':'side';
      const target=clamp(leaderX-vw*(mode==='finish'?.66:mode==='close'?.54:.48),0,WORLD_LENGTH-vw);
      cameraXRef.current += (target-cameraXRef.current)*.045; const cameraX=cameraXRef.current;
      const nextActions:Record<number,VisualAction>={};
      positions.forEach(({dog,x,y,action})=>{const node=dogRefs.current[dog.lane]; if(!node)return; nextActions[dog.lane]=action; node.style.transform=`translate3d(${x-cameraX}px, ${y+(dog.lane-1)*3.8}px, 0)`;});
      if(finishRef.current) finishRef.current.style.transform=`translate3d(${FINISH_X-cameraX}px,0,0)`;
      markerRefs.current.forEach((n,i)=>{if(n)n.style.transform=`translate3d(${720+i*680-cameraX}px,0,0)`;});
      hurdleRefs.current.forEach((n,i)=>{if(n)n.style.transform=`translate3d(${HURDLE_WORLD_X[i]-cameraX}px,0,0)`;});
      mudRefs.current.forEach((n,i)=>{if(n)n.style.transform=`translate3d(${MUD_WORLD_X[i]-cameraX}px,0,0)`;});
      if(trackRef.current) trackRef.current.style.setProperty('--camera-x',`${cameraX}px`);
      if(now-lastUiUpdateRef.current>100){lastUiUpdateRef.current=now; setElapsed(safe); setLiveOrder(sorted.map(v=>v.dog.lane)); setDogActions(nextActions); setCameraMode(mode);}
      if(raceElapsed<data.result.durationMs) animationRef.current=requestAnimationFrame(tick); else {setElapsed(data.result.durationMs);setLiveOrder(data.result.ranking);setDogActions({});setCameraMode('finish');setRaceState('photo');setPhotoFinish(true);setFinishFlash(true);setCrowdLevel(100);window.setTimeout(()=>setFinishFlash(false),420);window.setTimeout(()=>{setPhotoFinish(false);setRaceState('finished');setDotori(data.newBalance);},2200);}
    };
    animationRef.current=requestAnimationFrame(tick);
  }

  async function placeBetAndRace() {
    const amount = Math.floor(Number(betAmount));

    if (!selectedDog) return alert("우승할 왈왈이를 선택해주세요.");
    if (!Number.isFinite(amount) || amount < 10)
      return alert("최소 10도토리부터 베팅할 수 있습니다.");
    if (dotori !== null && amount > dotori)
      return alert("보유 도토리가 부족합니다.");
    if (loading || raceState !== "idle") return;

    setLoading(true);

    try {
      const response = await fetch("/api/game/dog-race/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceCode,
          selectedLane: selectedDog.lane,
          betAmount: amount,
        }),
      });

      const data: PlayResponse = await response.json();

      if (!data.success) {
        alert(data.message || "레이스를 시작할 수 없습니다.");
        return;
      }

      setPlayData(data);
      setRaceState("countdown");
      setCountdown(3);
      setDotori((current) =>
        current === null ? current : current - amount
      );

      let count = 3;
      const timer = window.setInterval(() => {
        count -= 1;

        if (count <= 0) {
          window.clearInterval(timer);
          setCountdown(null);
          runAnimation(data);
        } else {
          setCountdown(count);
        }
      }, 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090611] px-3 py-6 text-white md:px-4 md:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[30px] border border-violet-400/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.22),transparent_36%),linear-gradient(135deg,#171027,#0d0917_62%,#120b1f)] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] md:p-9">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-black tracking-[.28em] text-violet-300">
                WANGCHU GRAND DERBY
              </p>
              <h1 className="text-3xl font-black md:text-5xl">
                왈왈이경주
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-white/45">
                고정 출전견 6마리의 오늘 능력과 성격을 분석하고,
                실제 중계처럼 펼쳐지는 장거리 레이스를 관전하세요.
              </p>
            </div>

            <div className="grid min-w-[290px] grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold text-white/40">보유 도토리</p>
                <p className="mt-1 text-xl font-black text-amber-300">
                  {dotori === null ? "-" : `${dotori.toLocaleString()}개`}
                </p>
              </div>

              <button
                onClick={createRace}
                disabled={
                  loading ||
                  raceState === "countdown" ||
                  raceState === "running"
                }
                className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 px-5 py-4 text-sm font-black shadow-[0_12px_35px_rgba(124,58,237,.35)] disabled:opacity-50"
              >
                {loading
                  ? "처리 중..."
                  : entries.length
                    ? "새 경기 만들기"
                    : "시작하기"}
              </button>
            </div>
          </div>
        </section>

        {!entries.length ? (
          <section className="mt-6 rounded-[30px] border border-white/10 bg-[#120d1d] p-12 text-center">
            <div className="text-7xl">🏟️</div>
            <h2 className="mt-6 text-2xl font-black">
              오늘의 출전 능력을 확인하세요
            </h2>
            <p className="mt-3 text-white/40">
              시작하기를 누르면 민주, 두식, 왕아지, 새롭이, 왕츄,
              비니의 능력과 배당이 공개됩니다.
            </p>
          </section>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold text-white/35">현재 경기</p>
                <p className="mt-1 font-black text-violet-300">{raceCode}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black">
                {raceState === "idle" && "베팅 준비"}
                {raceState === "countdown" && "출발 준비"}
                {raceState === "running" && "LIVE"}
                {raceState === "photo" && "사진 판독 중"}
                {raceState === "finished" && "경기 종료"}
              </div>
            </div>

            {playData && isLocked ? (
              <section
                ref={cameraShellRef}
                className={`relative mt-4 overflow-hidden rounded-[30px] border border-violet-300/15 bg-[#0b1118] shadow-[0_30px_100px_rgba(0,0,0,.65)] ${
                  cameraMode === "finish" && raceState === "running"
                    ? "finish-camera-tension"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#141b29] to-[#0d121d] px-5 py-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[.3em] text-violet-300">
                      LIVE VIRTUAL DOG RACING
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      왕츄 그랜드 더비 경기장
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/35">내 선택</p>
                    <p className="font-black text-amber-300">
                      {playData.selectedLane}번 ·{" "}
                      {playData.betAmount.toLocaleString()} 도토리
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 bg-black/25 px-5 py-2.5 text-xs">
                  <span className="font-bold text-white/55">
                    판정 기준: 캐릭터 앞쪽 판정점이 빨간 결승선을 통과한 순서
                  </span>
                  <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 font-black text-red-300">
                    빨간선 = 공식 판정선
                  </span>
                </div>

                <div
                  ref={trackRef}
                  className={`cinematic-track camera-${cameraMode} relative h-[610px] overflow-hidden md:h-[660px]`}
                >
                  <div className="stadium-sky absolute inset-x-0 top-0 h-[36%]" />
                  <div className="stadium-stands absolute inset-x-0 top-[18%] h-[21%]" />
                  <div className="far-fence absolute inset-x-0 top-[36%] h-8" />
                  <div className="track-field absolute inset-x-0 bottom-0 top-[39%]" />

                  <div className="absolute left-0 right-0 top-[39%] h-[2px] bg-white/25" />
                  <div className="absolute left-0 right-0 bottom-[4%] h-[2px] bg-black/30" />

                  {[0, 1, 2, 3, 4, 5].map((laneIndex) => {
                    const dog = entries[laneIndex];
                    const currentRank =
                      Math.max(0, liveOrder.indexOf(dog.lane)) + 1;

                    return (
                      <div
                        key={dog.lane}
                        className="perspective-lane absolute left-0 right-0"
                        style={{
                          top: `${42 + laneIndex * 8.35}%`,
                          zIndex: 50 + laneIndex,
                        }}
                      >
                        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />

                        <div
                          ref={(node) => {
                            dogRefs.current[dog.lane] = node;
                          }}
                          className="absolute left-0 bottom-[-6px] will-change-transform"
                          style={{
                            transform: `translate3d(${START_X}px,0,0)`,
                          }}
                        >
                          <div
                            className="origin-bottom"
                            style={{
                              transform: `scale(${0.76 + laneIndex * 0.055})`,
                            }}
                          >
                            <RacingDog
                              dog={dog}
                              running={raceState === "running"}
                              leader={currentRank === 1}
                              action={dogActions[dog.lane] || "run"}
                            />
                          </div>

                          <div className="absolute -left-1 top-[-2px] rounded-lg border border-white/15 bg-black/65 px-2 py-1 text-[9px] font-black shadow-lg">
                            {dog.lane} · {dog.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div
                    ref={gateRef}
                    className={`starting-gate absolute left-[120px] top-[38%] z-[90] h-[54%] w-[178px] transition-transform duration-500 ${
                      raceState === "countdown" ? "" : raceState === "running" ? "" : ""
                    }`}
                  >
                    <div className="absolute inset-0 rounded-r-xl border-2 border-zinc-500 bg-[repeating-linear-gradient(90deg,#40434b_0_8px,#1b1e24_8px_18px)] shadow-2xl" />
                    <div className="absolute -top-10 left-0 right-0 rounded-t-xl border border-white/15 bg-[#222733] py-2 text-center text-xs font-black tracking-[.25em] text-white/75">
                      START GATE
                    </div>
                  </div>

                  <div
                    ref={finishLineRef}
                    className="finish-ground-line absolute left-0 top-[39%] z-[73] h-[59%] w-[22px] will-change-transform"
                    style={{ transform: `translate3d(${FINISH_X}px,0,0)` }}
                  >
                    <div className="absolute inset-y-0 left-0 w-[14px] bg-[repeating-linear-gradient(0deg,#fff_0_18px,#0b0b0d_18px_36px)] shadow-[0_0_18px_rgba(255,255,255,.58)]" />
                    <div className="absolute inset-y-0 left-[14px] w-[4px] bg-red-500 shadow-[0_0_14px_rgba(239,68,68,.9)]" />
                  </div>

                  <div
                    ref={finishRef}
                    className="absolute left-0 top-[31%] z-[84] h-[68%] w-[110px] will-change-transform"
                    style={{ transform: `translate3d(${FINISH_X}px,0,0)` }}
                  >
                    <div className="absolute left-[-7px] top-0 h-full w-[8px] bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,.35)]" />
                    <div className="absolute right-[-7px] top-0 h-full w-[8px] bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,.35)]" />
                    <div className="absolute left-[-7px] right-[-7px] top-0 rounded-t-xl border-2 border-white/40 bg-[repeating-linear-gradient(90deg,#fff_0_18px,#111_18px_36px)] px-3 py-2 text-center text-xs font-black text-black shadow-2xl">
                      결승 · FINISH
                    </div>
                  </div>

                  {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                    <div
                      key={index}
                      ref={(node) => {
                        markerRefs.current[index] = node;
                      }}
                      className="distance-marker absolute top-[33%] z-20 will-change-transform"
                    >
                      <div className="h-10 w-1 bg-white/55" />
                      <div className="-translate-x-1/2 rounded bg-black/65 px-2 py-1 text-[9px] font-black text-white/70">
                        {index * 50 + 50}M
                      </div>
                    </div>
                  ))}

                  {HURDLE_WORLD_X.map((_, index) => (
                    <div key={`hurdle-${index}`} ref={(node) => { hurdleRefs.current[index] = node; }} className="absolute left-0 top-[43%] z-[45] h-[48%] w-16 will-change-transform">
                      {[0,1,2,3,4,5].map((lane) => (
                        <div key={lane} className="absolute left-0 h-8 w-14" style={{ top: `${lane * 16.6}%` }}>
                          <div className="absolute bottom-0 left-1 h-7 w-1.5 rounded bg-zinc-300 shadow" />
                          <div className="absolute bottom-0 right-1 h-7 w-1.5 rounded bg-zinc-300 shadow" />
                          <div className="absolute left-0 right-0 top-1 h-2 rounded bg-gradient-to-b from-white to-zinc-400 shadow-md" />
                          <div className="absolute left-1 right-1 top-3 h-1 bg-red-500" />
                        </div>
                      ))}
                    </div>
                  ))}

                  {MUD_WORLD_X.map((_, index) => (
                    <div key={`mud-${index}`} ref={(node) => { mudRefs.current[index] = node; }} className="absolute left-0 top-[42%] z-[35] h-[49%] w-[230px] will-change-transform">
                      <div className="absolute inset-0 rounded-[45%] bg-[radial-gradient(ellipse_at_center,#3b2419_0%,#5b3928_45%,rgba(63,39,27,.1)_72%)] opacity-85" />
                    </div>
                  ))}

                  <div className="speed-vignette pointer-events-none absolute inset-0 z-[100]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[99] h-24 bg-gradient-to-t from-black/45 to-transparent" />
                </div>

                <div className="grid gap-4 border-t border-white/10 bg-[#0b0f16] p-4 md:grid-cols-[1fr_250px]">
                  <div className="min-h-[96px] rounded-2xl border border-white/10 bg-white/[.03] p-4">
                    <p className="text-[10px] font-black tracking-[.25em] text-violet-300">
                      실시간 중계
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {visibleEvents.length ? (
                        visibleEvents.map((event, index) => (
                          <p
                            key={`${event.at}-${event.lane}`}
                            className={`text-sm font-bold ${
                              index === 0 ? "text-white" : "text-white/35"
                            }`}
                          >
                            {event.message}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-white/35">
                          출발 신호를 기다리고 있습니다.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                    <p className="text-[10px] font-black tracking-[.25em] text-white/35">
                      현재 선두
                    </p>
                    <p className="mt-2 text-2xl font-black text-amber-300">
                      {liveOrder[0]
                        ? `${liveOrder[0]}번 ${
                            entries.find(
                              (dog) => dog.lane === liveOrder[0]
                            )?.name || ""
                          }`
                        : "출발 대기"}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                        style={{
                          width: `${Math.min(
                            100,
                            (elapsed / playData.result.durationMs) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[10px] font-black text-white/35">
                      <span>관중 열기</span>
                      <span>{crowdLevel}%</span>
                    </div>
                    <div className="mt-1.5 flex h-4 items-end gap-1">
                      {[20, 36, 55, 72, 88, 100].map((threshold, index) => (
                        <span
                          key={threshold}
                          className={`w-full rounded-sm transition-all duration-200 ${
                            crowdLevel >= threshold
                              ? "bg-gradient-to-t from-fuchsia-600 to-amber-300"
                              : "bg-white/10"
                          }`}
                          style={{ height: `${5 + index * 2}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {finishFlash ? (
                  <div className="pointer-events-none absolute inset-0 z-[145] bg-white finish-flash" />
                ) : null}

                {photoFinish ? (
                  <div className="absolute inset-0 z-[142] overflow-hidden bg-black/35 backdrop-blur-[1px]">
                    <div className="photo-scan-line absolute inset-y-0 w-[3px] bg-white shadow-[0_0_28px_8px_rgba(255,255,255,.7)]" />
                    <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-5 py-2 text-xs font-black tracking-[.28em] text-white shadow-2xl">
                      PHOTO FINISH · 사진 판독 중
                    </div>

                    <div className="absolute inset-x-0 bottom-7 flex justify-center">
                      <div className="rounded-2xl border border-white/15 bg-black/75 px-6 py-4 text-center shadow-[0_20px_70px_rgba(0,0,0,.6)]">
                        <p className="text-xs font-black text-amber-300">
                          결승선 카메라 분석
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          최종 순위를 확인하고 있습니다...
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {countdown !== null ? (
                  <div className="absolute inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="text-center">
                      <p className="text-sm font-black tracking-[.5em] text-white/70">
                        GATE READY
                      </p>
                      <p className="mt-2 text-9xl font-black text-white drop-shadow-[0_0_45px_rgba(168,85,247,.85)]">
                        {countdown}
                      </p>
                    </div>
                  </div>
                ) : null}

                {raceState === "finished" ? (
                  <div className="absolute inset-0 z-[140] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[4px]">
                    <div className="w-full max-w-lg rounded-[30px] border border-amber-300/25 bg-[radial-gradient(circle_at_top,rgba(250,204,21,.18),transparent_42%),#17111f] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,.75)]">
                      <div className="text-6xl">🏆</div>
                      <p className="mt-4 text-xs font-black tracking-[.3em] text-amber-300">
                        OFFICIAL RESULT
                      </p>
                      <h2 className="mt-3 text-3xl font-black">
                        {playData.result.winnerLane}번{" "}
                        {
                          entries.find(
                            (dog) =>
                              dog.lane === playData.result.winnerLane
                          )?.name
                        }{" "}
                        우승
                      </h2>
                      <div className="mt-5 grid grid-cols-3 gap-2">
                        {playData.result.ranking.slice(0, 3).map((lane, index) => {
                          const dog = entries.find((entry) => entry.lane === lane);
                          return (
                            <div
                              key={lane}
                              className={`rounded-2xl border p-3 ${
                                index === 0
                                  ? "border-amber-300/40 bg-amber-300/10"
                                  : "border-white/10 bg-black/20"
                              }`}
                            >
                              <p className="text-xs font-black text-white/40">
                                {index + 1}위
                              </p>
                              <p className="mt-1 font-black">
                                {lane}번 {dog?.name || ""}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 rounded-2xl bg-black/25 p-4">
                        <p
                          className={`text-lg font-black ${
                            playData.won
                              ? "text-emerald-300"
                              : "text-rose-300"
                          }`}
                        >
                          {playData.won
                            ? "베팅 적중!"
                            : "아쉽게 빗나갔습니다"}
                        </p>
                        <p className="mt-2 text-3xl font-black text-amber-300">
                          {playData.payoutAmount.toLocaleString()} 도토리
                        </p>
                      </div>
                      <button
                        onClick={createRace}
                        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-4 text-sm font-black"
                      >
                        새 경기 시작하기
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {!isLocked ? (
              <>
                <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {entries.map((dog) => {
                    const selected = selectedLane === dog.lane;
                    return (
                      <button
                        key={dog.lane}
                        onClick={() => setSelectedLane(dog.lane)}
                        className={`rounded-[26px] border p-5 text-left transition ${
                          selected
                            ? "border-violet-400 bg-violet-500/15 shadow-[0_18px_55px_rgba(109,40,217,.22)]"
                            : "border-white/10 bg-[#151027] hover:-translate-y-1 hover:border-violet-400/30"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5"><img src={CHARACTER_ASSETS[dog.name]} alt={dog.name} className="h-full w-full object-contain" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black tracking-[.18em] text-violet-300">
                              LANE {dog.lane}
                            </p>
                            <h3 className="mt-1 text-2xl font-black">
                              {dog.name}
                            </h3>
                            <p className="mt-1 text-sm font-bold text-amber-200">
                              {personality(dog)}
                            </p>
                            <p className="mt-1 text-xs text-white/35">
                              {dog.breed}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-bold text-white/35">
                              우승 배당
                            </p>
                            <p className="text-2xl font-black text-amber-300">
                              {dog.odds.toFixed(2)}배
                            </p>
                            <p className="text-[11px] text-white/35">
                              예상 {dog.winProbability.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                          <StatBar label="스피드" value={dog.speed} />
                          <StatBar label="체력" value={dog.stamina} />
                          <StatBar label="스퍼트" value={dog.sprint} />
                          <StatBar label="침착성" value={dog.composure} />
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-xs">
                          <span className="text-white/35">실수 확률</span>
                          <span
                            className={
                              dog.mistakeRate >= 13
                                ? "font-black text-rose-400"
                                : "font-black text-emerald-300"
                            }
                          >
                            {dog.mistakeRate}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </section>

                <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
                  <div className="rounded-[28px] border border-white/10 bg-[#120d1d] p-6">
                    <h2 className="text-lg font-black">오늘의 경기 분석</h2>
                    <p className="mt-3 leading-7 text-white/40">
                      성격은 오늘 생성된 능력치를 기준으로 경기마다 다시
                      결정됩니다. 폭주형은 초반, 꾸준형은 중반, 역전형은
                      막판에 강하게 연출됩니다.
                    </p>
                    <p className="mt-4 text-xs leading-6 text-white/25">
                      결과는 베팅 요청 순간 서버에서 한 번만 확정되며,
                      레이스 화면은 확정된 순위와 능력치를 자연스러운 경기
                      흐름으로 재생합니다.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-violet-400/15 bg-gradient-to-b from-[#1a1230] to-[#110b1e] p-6">
                    <p className="text-xs font-black tracking-[.2em] text-violet-300">
                      BET SLIP
                    </p>
                    <h2 className="mt-2 text-xl font-black">
                      우승견 선택
                    </h2>

                    <div className="mt-5 rounded-2xl bg-black/20 p-4">
                      {selectedDog ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black">
                              {selectedDog.lane}번 {selectedDog.name}
                            </p>
                            <p className="mt-1 text-xs text-amber-200">
                              {personality(selectedDog)}
                            </p>
                          </div>
                          <p className="text-2xl font-black text-amber-300">
                            {selectedDog.odds.toFixed(2)}배
                          </p>
                        </div>
                      ) : (
                        <p className="py-2 text-center text-sm text-white/35">
                          위 카드에서 한 마리를 선택하세요.
                        </p>
                      )}
                    </div>

                    <label className="mt-4 block text-xs font-bold text-white/40">
                      베팅 도토리
                    </label>
                    <input
                      value={betAmount}
                      onChange={(event) =>
                        setBetAmount(
                          event.target.value.replace(/[^0-9]/g, "")
                        )
                      }
                      placeholder="최소 10"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-lg font-black outline-none focus:border-violet-400"
                    />

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-white/35">예상 당첨금</span>
                      <span className="font-black text-emerald-300">
                        {expectedPayout.toLocaleString()}개
                      </span>
                    </div>

                    <button
                      onClick={placeBetAndRace}
                      disabled={
                        loading ||
                        !selectedDog ||
                        Number(betAmount) < 10
                      }
                      className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-4 text-sm font-black disabled:opacity-40"
                    >
                      베팅하고 레이스 시작
                    </button>
                  </div>
                </section>
              </>
            ) : null}
          </>
        )}
      </div>

      <style jsx global>{`
        .cinematic-track {
          --camera-x: 0px;
          --speed-blur: 0;
          background: #6a4934;
          perspective: 1100px;
          transform-style: preserve-3d;
        }

        .stadium-sky {
          background:
            radial-gradient(circle at 72% 20%, rgba(255,255,255,.8) 0 2px, transparent 3px),
            radial-gradient(circle at 18% 28%, rgba(255,255,255,.65) 0 1px, transparent 2px),
            linear-gradient(180deg, #5a7192 0%, #8ea5bb 52%, #c8b98e 100%);
        }

        .stadium-stands {
          background:
            repeating-linear-gradient(90deg, #252a35 0 26px, #313746 26px 52px),
            linear-gradient(180deg, #333a49, #171b24);
          box-shadow: inset 0 12px 30px rgba(255,255,255,.06);
        }

        .stadium-stands::after {
          content: "";
          position: absolute;
          inset: 12px 0 0;
          background:
            radial-gradient(circle, #e4b657 0 2px, transparent 3px) 0 0/26px 20px,
            radial-gradient(circle, #d26d71 0 2px, transparent 3px) 13px 8px/30px 22px,
            radial-gradient(circle, #81a7d8 0 2px, transparent 3px) 5px 4px/28px 19px;
          opacity: .55;
        }

        .far-fence {
          background:
            repeating-linear-gradient(90deg, transparent 0 30px, rgba(240,240,245,.7) 30px 34px),
            linear-gradient(180deg, rgba(255,255,255,.7), rgba(68,72,78,.85));
          box-shadow: 0 8px 18px rgba(0,0,0,.32);
        }

        .track-field {
          background:
            linear-gradient(180deg, rgba(255,255,255,.06), transparent 22%),
            repeating-linear-gradient(
              90deg,
              rgba(0,0,0,.035) 0 3px,
              rgba(255,255,255,.025) 3px 8px
            ),
            linear-gradient(180deg, #8c6245 0%, #6c4934 78%, #513426 100%);
        }

        .track-field::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              90deg,
              transparent 0 112px,
              rgba(255,255,255,.07) 113px 115px
            );
          transform: translateX(calc(var(--camera-x) * -0.34));
          will-change: transform;
        }

        .track-field::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at center, rgba(255,255,255,.08) 0 1px, transparent 2px) 0 0/18px 13px;
          opacity: .24;
          transform: translateX(calc(var(--camera-x) * -0.72));
          will-change: transform;
        }

        .speed-vignette {
          background:
            linear-gradient(90deg, rgba(0,0,0,.45), transparent 12%, transparent 88%, rgba(0,0,0,.38)),
            linear-gradient(180deg, rgba(0,0,0,.12), transparent 28%, transparent 76%, rgba(0,0,0,.2));
          box-shadow: inset 0 0 calc(20px + 30px * var(--speed-blur)) rgba(0,0,0,.32);
        }

        .perspective-lane {
          transform: rotateX(1.2deg);
        }

        .racing-dog {
          filter: drop-shadow(0 5px 5px rgba(0,0,0,.38));
        }

        @keyframes torsoRun {
          0%, 100% { transform: translateY(0) scaleX(1.02) rotate(-1deg); }
          50% { transform: translateY(-5px) scaleX(.96) rotate(1deg); }
        }

        @keyframes headRun {
          0%, 100% { transform: translateY(0) rotate(-2deg); transform-origin: 150px 49px; }
          50% { transform: translateY(-4px) rotate(3deg); transform-origin: 150px 49px; }
        }

        @keyframes neckRun {
          0%, 100% { transform: rotate(-2deg); transform-origin: 130px 58px; }
          50% { transform: rotate(3deg); transform-origin: 130px 58px; }
        }

        @keyframes legFrontA {
          0%, 100% { transform: rotate(26deg); transform-origin: 126px 67px; }
          50% { transform: rotate(-42deg); transform-origin: 126px 67px; }
        }

        @keyframes legFrontB {
          0%, 100% { transform: rotate(-34deg); transform-origin: 113px 68px; }
          50% { transform: rotate(30deg); transform-origin: 113px 68px; }
        }

        @keyframes legRearA {
          0%, 100% { transform: rotate(-31deg); transform-origin: 59px 67px; }
          50% { transform: rotate(44deg); transform-origin: 59px 67px; }
        }

        @keyframes legRearB {
          0%, 100% { transform: rotate(36deg); transform-origin: 76px 69px; }
          50% { transform: rotate(-29deg); transform-origin: 76px 69px; }
        }

        @keyframes tailRun {
          0%, 100% { transform: rotate(-8deg); transform-origin: 47px 49px; }
          50% { transform: rotate(11deg); transform-origin: 47px 49px; }
        }

        @keyframes waitingDog {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        @keyframes dustTrail {
          0% { transform: translate3d(0,0,0) scale(.25); opacity: 0; }
          18% { opacity: .55; }
          100% { transform: translate3d(-62px,-12px,0) scale(1.8); opacity: 0; }
        }

        .racing-dog.is-running .dog-torso {
          animation: torsoRun .22s ease-in-out infinite;
        }

        .racing-dog.is-running .dog-head {
          animation: headRun .22s ease-in-out infinite;
        }

        .racing-dog.is-running .dog-neck {
          animation: neckRun .22s ease-in-out infinite;
        }

        .racing-dog.is-running .front-leg-a {
          animation: legFrontA .19s linear infinite;
        }

        .racing-dog.is-running .front-leg-b {
          animation: legFrontB .19s linear infinite;
        }

        .racing-dog.is-running .rear-leg-a {
          animation: legRearA .19s linear infinite;
        }

        .racing-dog.is-running .rear-leg-b {
          animation: legRearB .19s linear infinite;
        }

        .racing-dog.is-running .dog-tail {
          animation: tailRun .17s ease-in-out infinite;
        }

        .racing-dog.is-waiting {
          animation: waitingDog 1.1s ease-in-out infinite;
        }

        .racing-dog.is-leader {
          filter:
            drop-shadow(0 5px 5px rgba(0,0,0,.38))
            drop-shadow(0 0 12px rgba(250,204,21,.25));
        }

        .race-dust {
          position: absolute;
          left: 12px;
          bottom: 5px;
          width: 15px;
          height: 10px;
          border-radius: 999px;
          background: rgba(213,174,130,.55);
          filter: blur(2px);
          animation: dustTrail .6s linear infinite;
        }

        .dust-b {
          width: 9px;
          height: 9px;
          animation-delay: .17s;
          bottom: 13px;
        }

        .dust-c {
          width: 20px;
          height: 7px;
          animation-delay: .34s;
          bottom: 2px;
        }

        .starting-gate {
          transform: translateY(0);
          will-change: transform;
        }


        @keyframes dogJump { 0%,100%{transform:rotate(0deg) scaleY(1)} 30%{transform:rotate(-5deg) scaleY(.92)} 55%{transform:rotate(4deg) scaleY(1.06)} }
        @keyframes dogFall { 0%{transform:rotate(0deg) translateY(0)} 35%{transform:rotate(18deg) translateY(8px)} 70%{transform:rotate(78deg) translateY(14px)} 100%{transform:rotate(88deg) translateY(16px)} }
        @keyframes dogRecover { 0%{transform:rotate(88deg) translateY(16px)} 55%{transform:rotate(28deg) translateY(7px)} 100%{transform:rotate(0deg) translateY(0)} }
        @keyframes mudShake { 0%,100%{transform:translateY(0) rotate(0)} 25%{transform:translateY(2px) rotate(-2deg)} 75%{transform:translateY(2px) rotate(2deg)} }
        @keyframes sprintPulse { 0%,100%{filter:drop-shadow(0 5px 5px rgba(0,0,0,.38)) brightness(1)} 50%{filter:drop-shadow(0 0 16px rgba(250,204,21,.7)) brightness(1.2)} }
        .racing-dog.action-jump{animation:dogJump .55s ease-in-out infinite}
        .racing-dog.action-fall{animation:dogFall .52s ease-out forwards}
        .racing-dog.action-recover{animation:dogRecover .55s ease-out forwards}
        .racing-dog.action-mud{animation:mudShake .18s linear infinite;filter:saturate(.72) brightness(.86)}
        .racing-dog.action-sprint{animation:sprintPulse .24s ease-in-out infinite}
        .racing-dog.action-sprint::before,.racing-dog.action-sprint::after{content:"";position:absolute;left:-74px;top:30px;width:76px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,rgba(255,224,128,.95))}
        .racing-dog.action-sprint::after{top:43px;width:56px;left:-54px;opacity:.72}
        .camera-close{filter:contrast(1.05) saturate(1.08)}
        .camera-close .perspective-lane{transform:rotateX(1.2deg) scale(1.05);transform-origin:center}
        .camera-finish{filter:contrast(1.1) saturate(1.12)}


        @keyframes finishCameraTension {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          20% { transform: translate3d(-1px, 0, 0) scale(1.002); }
          40% { transform: translate3d(1px, -1px, 0) scale(1.004); }
          60% { transform: translate3d(-1px, 1px, 0) scale(1.003); }
          80% { transform: translate3d(1px, 0, 0) scale(1.002); }
        }

        @keyframes photoScan {
          0% { left: 6%; opacity: .25; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { left: 94%; opacity: .25; }
        }

        @keyframes finishFlashAnimation {
          0% { opacity: 0; }
          18% { opacity: .95; }
          42% { opacity: .25; }
          64% { opacity: .72; }
          100% { opacity: 0; }
        }

        @keyframes crowdPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.24); }
        }

        .finish-camera-tension {
          animation: finishCameraTension .16s linear infinite;
          transform-origin: center;
        }

        .photo-scan-line {
          animation: photoScan 1.65s ease-in-out infinite;
        }

        .finish-flash {
          animation: finishFlashAnimation .42s ease-out forwards;
        }

        .camera-finish .stadium-stands::after {
          animation: crowdPulse .24s ease-in-out infinite;
          opacity: .82;
        }

        .camera-finish .track-field {
          filter: contrast(1.08) saturate(1.12);
        }

        .camera-finish .racing-dog {
          filter:
            drop-shadow(0 6px 6px rgba(0,0,0,.42))
            drop-shadow(0 0 9px rgba(255,255,255,.12));
        }


        .character-runner{position:relative;width:132px;height:98px;transform-origin:center bottom;filter:drop-shadow(0 8px 7px rgba(0,0,0,.45));animation:characterGallop .42s ease-in-out infinite}.character-shell{position:absolute;left:14px;bottom:9px;width:104px;height:80px;overflow:hidden;border-radius:38% 46% 34% 42%;border:2px solid rgba(255,255,255,.24);background:rgba(255,255,255,.07);transform-origin:50% 82%;animation:characterStretch .42s ease-in-out infinite;box-shadow:inset 0 0 20px rgba(255,255,255,.12),0 12px 28px rgba(0,0,0,.28)}.character-image{width:100%;height:100%;object-fit:contain;object-position:center;user-select:none;pointer-events:none}.photo-shell .character-image{object-fit:cover;object-position:center 32%;transform:scale(1.08)}.character-light{position:absolute;inset:0;background:linear-gradient(145deg,rgba(255,255,255,.28),transparent 28%),radial-gradient(circle at 72% 78%,rgba(124,58,237,.18),transparent 38%);mix-blend-mode:screen}.character-shadow{position:absolute;left:20px;bottom:0;width:92px;height:13px;border-radius:999px;background:rgba(0,0,0,.42);filter:blur(5px);animation:characterShadow .42s ease-in-out infinite}.leader-badge{position:absolute;left:50%;top:-24px;z-index:10;transform:translateX(-50%);border:1px solid rgba(253,224,71,.3);border-radius:999px;background:rgba(250,204,21,.16);padding:3px 9px;color:#fef3c7;font-size:9px;font-weight:900;white-space:nowrap}.speed-streak{position:absolute;left:-68px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,#fde68a)}.streak-a{top:30px;width:68px}.streak-b{top:48px;width:52px;left:-52px}.impact-mark{position:absolute;right:-6px;top:-8px;font-size:24px}.action-jump{animation:characterJump .5s ease-in-out infinite}.action-fall{animation:characterFall .45s ease-out forwards}.action-recover{animation:characterRecover .55s ease-out forwards}.action-mud{animation:characterMud .2s linear infinite;filter:saturate(.7) brightness(.86) drop-shadow(0 8px 7px rgba(0,0,0,.45))}.action-sprint{animation-duration:.27s;filter:drop-shadow(0 8px 7px rgba(0,0,0,.45)) drop-shadow(0 0 15px rgba(250,204,21,.5))}@keyframes characterGallop{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-7px) rotate(1.4deg)}}@keyframes characterStretch{0%,100%{transform:scaleX(1.04) scaleY(.98) rotate(-1deg)}50%{transform:scaleX(.96) scaleY(1.04) rotate(1deg)}}@keyframes characterShadow{0%,100%{transform:scaleX(1);opacity:.48}50%{transform:scaleX(.78);opacity:.3}}@keyframes characterJump{0%,100%{transform:rotate(0deg) scale(1)}50%{transform:rotate(-5deg) scale(1.03)}}@keyframes characterFall{0%{transform:rotate(0deg) translateY(0)}100%{transform:rotate(82deg) translateY(18px)}}@keyframes characterRecover{0%{transform:rotate(82deg) translateY(18px)}100%{transform:rotate(0deg) translateY(0)}}@keyframes characterMud{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(2px) rotate(-2deg)}75%{transform:translateY(2px) rotate(2deg)}}

        @media (max-width: 768px) {
          .cinematic-track {
            min-width: 760px;
            transform-origin: left top;
          }
        }
      `}</style>
    </main>
  );
}
