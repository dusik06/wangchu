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

const DOG_COLORS = ["#f3b765", "#d46b3d", "#d7a56e", "#8297bc", "#f2eee8", "#88644c"];

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-zinc-400">
        <span>{label}</span><span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DogRunner({ lane, running, effect }: { lane: number; running: boolean; effect?: string }) {
  const color = DOG_COLORS[lane - 1] || DOG_COLORS[0];
  const stumble = effect === "mistake";
  const boost = effect === "surge" || effect === "sprint";

  return (
    <div
      className="relative h-14 w-20 origin-bottom"
      style={{
        transform: `rotate(${stumble ? 12 : 0}deg) scale(${boost ? 1.06 : 1})`,
        transition: "transform 180ms ease",
        filter: boost ? "drop-shadow(0 0 12px rgba(250,204,21,.55))" : "drop-shadow(0 6px 5px rgba(0,0,0,.35))",
      }}
    >
      <svg viewBox="0 0 120 80" className="h-full w-full overflow-visible" aria-hidden="true">
        <g className={running ? "animate-[bounce_.22s_ease-in-out_infinite]" : ""}>
          <path d="M31 39 C38 20, 77 20, 87 39 C92 49, 83 59, 69 58 L44 58 C28 58, 24 48, 31 39Z" fill={color} />
          <circle cx="88" cy="31" r="16" fill={color} />
          <path d="M86 17 L92 4 L101 21Z" fill={color} />
          <path d="M75 19 L76 5 L86 20Z" fill={color} />
          <ellipse cx="100" cy="36" rx="10" ry="7" fill="#f0d5b5" />
          <circle cx="94" cy="27" r="2.7" fill="#17121c" />
          <circle cx="105" cy="35" r="2.4" fill="#17121c" />
          <path d="M29 40 C15 35, 11 24, 19 18" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
          <g className={running ? "animate-[pulse_.18s_ease-in-out_infinite]" : ""}>
            <path d="M43 54 L35 72" stroke={color} strokeWidth="8" strokeLinecap="round" />
            <path d="M62 55 L70 72" stroke={color} strokeWidth="8" strokeLinecap="round" />
            <path d="M76 53 L86 69" stroke={color} strokeWidth="8" strokeLinecap="round" />
            <path d="M50 54 L54 71" stroke={color} strokeWidth="8" strokeLinecap="round" />
          </g>
          <path d="M100 42 Q104 48 109 43" fill="none" stroke="#17121c" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
      {boost && <div className="absolute -left-7 top-7 h-1.5 w-10 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-white opacity-90 blur-[1px]" />}
      {stumble && <div className="absolute -right-2 -top-2 text-lg">💫</div>}
    </div>
  );
}

function interpolateProgress(result: RaceResult | null, elapsed: number) {
  const output: Record<number, number> = {};
  if (!result?.progressFrames.length) return output;

  const frames = result.progressFrames;
  let rightIndex = frames.findIndex((frame) => frame.at >= elapsed);
  if (rightIndex < 0) rightIndex = frames.length - 1;
  const leftIndex = Math.max(0, rightIndex - 1);
  const left = frames[leftIndex];
  const right = frames[rightIndex];
  const span = Math.max(1, right.at - left.at);
  const ratio = Math.max(0, Math.min(1, (elapsed - left.at) / span));

  for (let lane = 1; lane <= 6; lane += 1) {
    const start = Number(left.progress[lane] || 0);
    const end = Number(right.progress[lane] || start);
    output[lane] = start + (end - start) * ratio;
  }

  return output;
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
  const [raceState, setRaceState] = useState<"idle" | "countdown" | "running" | "finished">("idle");
  const animationRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const lastEventRef = useRef(-1);

  const selectedDog = useMemo(
    () => entries.find((dog) => dog.lane === selectedLane) || null,
    [entries, selectedLane]
  );

  const progress = useMemo(() => interpolateProgress(playData?.result || null, elapsed), [playData, elapsed]);

  const visibleEvents = useMemo(() => {
    if (!playData) return [];
    return playData.result.events.filter((event) => event.at <= elapsed).slice(-4).reverse();
  }, [playData, elapsed]);

  const currentEffects = useMemo(() => {
    const map: Record<number, string> = {};
    if (!playData) return map;
    for (const event of playData.result.events) {
      if (event.at <= elapsed && event.at >= elapsed - 1150) map[event.lane] = event.type;
    }
    return map;
  }, [playData, elapsed]);

  const liveRanking = useMemo(() => {
    return [...entries].sort((a, b) => (progress[b.lane] || 0) - (progress[a.lane] || 0));
  }, [entries, progress]);

  async function loadBalance() {
    const response = await fetch("/api/game/dog-race/balance", { cache: "no-store" });
    const data = await response.json();
    if (data.success) setDotori(Number(data.dotori));
  }

  useEffect(() => { loadBalance(); }, []);

  useEffect(() => {
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
    lastEventRef.current = -1;

    try {
      const response = await fetch("/api/game/dog-race/create", { method: "POST" });
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

  function runAnimation(data: PlayResponse) {
    setRaceState("running");
    startRef.current = performance.now();

    const tick = (now: number) => {
      const rawElapsed = now - startRef.current;
      const slowStart = data.result.durationMs - 1500;
      const adjusted = rawElapsed <= slowStart
        ? rawElapsed
        : slowStart + (rawElapsed - slowStart) * 0.48;

      setElapsed(Math.min(adjusted, data.result.durationMs));

      if (adjusted < data.result.durationMs) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setRaceState("finished");
        setDotori(data.newBalance);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
  }

  async function placeBetAndRace() {
    const amount = Math.floor(Number(betAmount));
    if (!selectedDog) return alert("우승할 왈왈이를 선택해주세요.");
    if (!Number.isFinite(amount) || amount < 10) return alert("최소 10도토리부터 베팅할 수 있습니다.");
    if (dotori !== null && amount > dotori) return alert("보유 도토리가 부족합니다.");
    if (loading || raceState !== "idle") return;

    setLoading(true);
    try {
      const response = await fetch("/api/game/dog-race/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceCode, selectedLane: selectedDog.lane, betAmount: amount }),
      });
      const data: PlayResponse = await response.json();

      if (!data.success) {
        alert(data.message || "레이스를 시작할 수 없습니다.");
        return;
      }

      setPlayData(data);
      setRaceState("countdown");
      setCountdown(3);
      setDotori((current) => current === null ? current : current - amount);

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
      }, 760);
    } finally {
      setLoading(false);
    }
  }

  const expectedPayout = selectedDog && Number(betAmount) > 0
    ? Math.floor(Number(betAmount) * selectedDog.odds)
    : 0;

  const isLocked = raceState === "countdown" || raceState === "running" || raceState === "finished";

  return (
    <main className="min-h-screen bg-[#090611] px-3 py-6 text-white md:px-4 md:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[30px] border border-violet-400/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_35%),linear-gradient(135deg,#171027,#0d0917_62%,#120b1f)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:rounded-[34px] md:p-9">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-black tracking-[0.28em] text-violet-300">WANGCHU RACING CLUB</p>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">🐶 왈왈이경주</h1>
              <p className="mt-4 max-w-2xl leading-7 text-zinc-400">능력치를 분석해 우승 왈왈이를 고르고, 추월과 돌발 상황이 이어지는 레이스를 직접 관전하세요.</p>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-xs font-bold text-zinc-500">보유 도토리</p>
                <p className="mt-1 text-xl font-black text-amber-300">{dotori === null ? "-" : `${dotori.toLocaleString()}개`}</p>
              </div>
              <button onClick={createRace} disabled={loading || raceState === "countdown" || raceState === "running"} className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 px-5 py-4 text-sm font-black shadow-[0_12px_35px_rgba(124,58,237,0.35)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? "처리 중..." : entries.length ? "새 경기 만들기" : "시작하기"}
              </button>
            </div>
          </div>
        </section>

        {!entries.length ? (
          <section className="mt-6 overflow-hidden rounded-[30px] border border-white/8 bg-[#120d1d] p-8 text-center md:p-14">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-violet-300/15 bg-violet-500/10 text-6xl shadow-inner">🏁</div>
            <h2 className="mt-6 text-2xl font-black">오늘의 첫 레이스를 준비하세요</h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-zinc-500">시작하기를 누르면 6마리의 능력치와 실시간 배당이 공개됩니다.</p>
          </section>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between px-1">
              <div><p className="text-xs font-bold text-zinc-500">현재 경기</p><p className="mt-1 font-black text-violet-300">{raceCode}</p></div>
              <p className={`rounded-full border px-3 py-1.5 text-xs font-black ${raceState === "finished" ? "border-amber-400/20 bg-amber-400/10 text-amber-300" : raceState === "running" ? "border-rose-400/20 bg-rose-400/10 text-rose-300" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"}`}>
                {raceState === "finished" ? "경기 종료" : raceState === "running" ? "레이스 진행 중" : raceState === "countdown" ? "출발 준비" : "베팅 준비"}
              </p>
            </div>

            {(raceState === "countdown" || raceState === "running" || raceState === "finished") && playData && (
              <section className="relative mt-4 overflow-hidden rounded-[30px] border border-violet-300/15 bg-[#10151b] shadow-[0_28px_90px_rgba(0,0,0,.5)]">
                <div className="relative border-b border-white/10 bg-[linear-gradient(180deg,#111827,#182234)] px-4 py-4 md:px-6">
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-[repeating-linear-gradient(90deg,#fff_0_18px,#111_18px_36px)] opacity-70" />
                  <div className="flex items-center justify-between gap-4">
                    <div><p className="text-[10px] font-black tracking-[.28em] text-violet-300">LIVE RACE</p><h2 className="mt-1 text-lg font-black md:text-2xl">왕츄 스타디움</h2></div>
                    <div className="text-right"><p className="text-xs text-zinc-500">선택</p><p className="font-black text-amber-300">{playData.selectedLane}번 · {playData.betAmount.toLocaleString()} 도토리</p></div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-[linear-gradient(180deg,#245b34_0%,#1e4a2d_12%,#6b4931_12%,#76523a_100%)] py-3">
                  <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent 0 64px,rgba(255,255,255,.16) 65px 66px)" }} />
                  <div className="pointer-events-none absolute bottom-0 right-[8%] top-0 w-5 bg-[repeating-linear-gradient(0deg,#fff_0_13px,#111_13px_26px)] shadow-[0_0_20px_rgba(255,255,255,.3)]" />

                  {entries.map((dog) => {
                    const laneProgress = Math.min(1, progress[dog.lane] || 0);
                    const x = laneProgress * 84;
                    const rank = liveRanking.findIndex((item) => item.lane === dog.lane) + 1;
                    return (
                      <div key={dog.lane} className="relative h-[78px] border-b border-white/10 last:border-b-0">
                        <div className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 text-sm font-black ring-1 ring-white/15">{dog.lane}</div>
                        <div className="absolute right-2 top-2 z-10 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-black text-zinc-200">현재 {rank}위</div>
                        <div
                          className="absolute bottom-1 z-20"
                          style={{
                            left: `calc(${x}% - 22px)`,
                            transition: raceState === "running" ? "left 120ms linear" : "none",
                          }}
                        >
                          <DogRunner lane={dog.lane} running={raceState === "running"} effect={currentEffects[dog.lane]} />
                          <div className="absolute -bottom-1 left-1/2 h-2 w-14 -translate-x-1/2 rounded-full bg-black/35 blur-[2px]" />
                        </div>
                        {currentEffects[dog.lane] === "surge" || currentEffects[dog.lane] === "sprint" ? (
                          <div className="absolute bottom-5 h-7 w-24 rounded-full bg-amber-300/15 blur-xl" style={{ left: `calc(${Math.max(0, x - 5)}% - 50px)` }} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 border-t border-white/10 bg-[#0c1017] p-4 md:grid-cols-[1fr_260px] md:p-5">
                  <div className="min-h-[84px] rounded-2xl border border-white/8 bg-white/[.035] p-4">
                    <p className="text-[10px] font-black tracking-[.24em] text-violet-300">실시간 중계</p>
                    <div className="mt-2 space-y-1.5">
                      {visibleEvents.length ? visibleEvents.map((event, index) => (
                        <p key={`${event.at}-${event.lane}`} className={`text-sm font-bold ${index === 0 ? "text-white" : "text-zinc-500"}`}>{event.message}</p>
                      )) : <p className="text-sm text-zinc-500">출발 신호를 기다리고 있습니다.</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[.035] p-4">
                    <p className="text-[10px] font-black tracking-[.24em] text-zinc-500">진행률</p>
                    <p className="mt-2 text-2xl font-black">{Math.min(100, Math.round((elapsed / playData.result.durationMs) * 100))}%</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${Math.min(100, (elapsed / playData.result.durationMs) * 100)}%` }} /></div>
                  </div>
                </div>

                {countdown !== null && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                    <div className="text-center"><p className="text-sm font-black tracking-[.4em] text-violet-200">READY</p><p className="mt-2 text-8xl font-black drop-shadow-[0_0_35px_rgba(168,85,247,.8)]">{countdown}</p></div>
                  </div>
                )}

                {raceState === "finished" && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[3px]">
                    <div className="w-full max-w-lg rounded-[30px] border border-amber-300/25 bg-[radial-gradient(circle_at_top,rgba(250,204,21,.18),transparent_42%),#17111f] p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,.7)] md:p-9">
                      <div className="text-6xl">🏆</div>
                      <p className="mt-4 text-xs font-black tracking-[.28em] text-amber-300">RACE RESULT</p>
                      <h2 className="mt-2 text-3xl font-black">{playData.result.winnerLane}번 {entries.find((dog) => dog.lane === playData.result.winnerLane)?.name} 우승!</h2>
                      <div className="mt-5 rounded-2xl bg-black/25 p-4">
                        <p className={`text-lg font-black ${playData.won ? "text-emerald-300" : "text-rose-300"}`}>{playData.won ? "베팅 적중!" : "아쉽게 빗나갔습니다"}</p>
                        <p className="mt-2 text-3xl font-black text-amber-300">{playData.payoutAmount.toLocaleString()} 도토리</p>
                      </div>
                      <button onClick={createRace} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-4 text-sm font-black">새 경기 시작하기</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {!isLocked && (
              <>
                <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {entries.map((dog) => {
                    const selected = selectedLane === dog.lane;
                    return (
                      <button key={dog.lane} onClick={() => setSelectedLane(dog.lane)} className={`group rounded-[26px] border p-5 text-left transition duration-300 ${selected ? "border-violet-400 bg-violet-500/14 shadow-[0_18px_55px_rgba(109,40,217,0.22)]" : "border-white/8 bg-[#151027] hover:-translate-y-1 hover:border-violet-400/30"}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/25"><DogRunner lane={dog.lane} running={false} /></div>
                            <div><p className="text-[11px] font-black tracking-widest text-violet-300">LANE {dog.lane}</p><h3 className="mt-1 text-xl font-black">{dog.name}</h3><p className="text-xs text-zinc-500">{dog.breed}</p></div>
                          </div>
                          <div className="text-right"><p className="text-xs font-bold text-zinc-500">우승 배당</p><p className="text-2xl font-black text-amber-300">{dog.odds.toFixed(2)}배</p><p className="text-[11px] text-zinc-500">예상 {dog.winProbability.toFixed(2)}%</p></div>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3"><StatBar label="스피드" value={dog.speed} /><StatBar label="체력" value={dog.stamina} /><StatBar label="스퍼트" value={dog.sprint} /><StatBar label="침착성" value={dog.composure} /></div>
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-xs"><span className="text-zinc-500">실수 확률</span><span className={dog.mistakeRate >= 13 ? "font-black text-rose-400" : "font-black text-emerald-300"}>{dog.mistakeRate}%</span></div>
                      </button>
                    );
                  })}
                </section>

                <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_370px]">
                  <div className="rounded-[28px] border border-white/8 bg-[#120d1d] p-6">
                    <h2 className="text-lg font-black">레이스 분석 가이드</h2>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">{["스피드: 초반과 기본 주행 속도", "체력: 중후반 감속 저항", "스퍼트: 결승 직전 폭발력", "침착성: 흔들림과 실수 억제"].map((text) => <div key={text} className="rounded-2xl bg-white/[0.035] p-4 text-sm text-zinc-400">{text}</div>)}</div>
                    <p className="mt-4 text-xs leading-6 text-zinc-600">결과는 베팅 버튼을 누르는 순간 서버에서 한 번만 확정됩니다. 능력치가 높을수록 유리하지만 돌발 상황 때문에 항상 우승하는 것은 아닙니다.</p>
                  </div>

                  <div className="rounded-[28px] border border-violet-400/15 bg-gradient-to-b from-[#1a1230] to-[#110b1e] p-6">
                    <p className="text-xs font-black tracking-widest text-violet-300">BET SLIP</p>
                    <h2 className="mt-2 text-xl font-black">우승 왈왈이 선택</h2>
                    <div className="mt-5 rounded-2xl bg-black/20 p-4">{selectedDog ? <div className="flex items-center justify-between"><div><p className="font-black">{selectedDog.lane}번 {selectedDog.name}</p><p className="mt-1 text-xs text-zinc-500">{selectedDog.breed}</p></div><p className="text-2xl font-black text-amber-300">{selectedDog.odds.toFixed(2)}배</p></div> : <p className="py-2 text-center text-sm text-zinc-500">위 카드에서 한 마리를 선택하세요.</p>}</div>
                    <label className="mt-4 block text-xs font-bold text-zinc-400">베팅 도토리</label>
                    <input value={betAmount} onChange={(event) => setBetAmount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="최소 10" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-lg font-black outline-none transition focus:border-violet-400" />
                    <div className="mt-3 flex items-center justify-between text-sm"><span className="text-zinc-500">예상 당첨금</span><span className="font-black text-emerald-300">{expectedPayout.toLocaleString()}개</span></div>
                    <button onClick={placeBetAndRace} disabled={loading || !selectedDog || Number(betAmount) < 10} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-4 text-sm font-black shadow-[0_12px_35px_rgba(124,58,237,.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">베팅하고 레이스 시작</button>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
