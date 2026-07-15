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


function DogRunner({
  dog,
  running,
  effect,
  rank,
}: {
  dog: DogEntry;
  running: boolean;
  effect?: string;
  rank: number;
}) {
  const color = DOG_COLORS[dog.lane - 1] || DOG_COLORS[0];
  const stumble = effect === "mistake";
  const boost = effect === "surge" || effect === "sprint";
  const isLeader = rank === 1;

  return (
    <div className={`dog-runner relative h-[68px] w-[104px] origin-bottom ${running ? "is-running" : ""} ${boost ? "is-boosting" : ""} ${stumble ? "is-stumbling" : ""}`}>
      {isLeader && running ? (
        <div className="absolute -top-5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-200/30 bg-amber-300/15 px-2 py-0.5 text-[9px] font-black text-amber-200 shadow-[0_0_18px_rgba(251,191,36,.3)]">
          선두
        </div>
      ) : null}

      <svg viewBox="0 0 150 94" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`fur-${dog.lane}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="0.58" stopColor={color} />
            <stop offset="1" stopColor="#3c2a2a" stopOpacity="0.42" />
          </linearGradient>
          <filter id={`soft-${dog.lane}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        <g className="dog-body">
          <ellipse cx="69" cy="50" rx="40" ry="24" fill={`url(#fur-${dog.lane})`} />
          <ellipse cx="73" cy="57" rx="30" ry="14" fill="#fff" opacity={dog.lane === 5 ? 0.72 : 0.13} />

          <g className="dog-head">
            <circle cx="111" cy="39" r="23" fill={`url(#fur-${dog.lane})`} />
            <path d="M97 23 L96 4 L110 20Z" fill={color} />
            <path d="M112 19 L123 3 L126 26Z" fill={color} />
            <path d="M100 21 L100 10 L107 20Z" fill="#f2a0a0" opacity="0.72" />
            <path d="M116 18 L122 9 L122 23Z" fill="#f2a0a0" opacity="0.72" />
            <ellipse cx="128" cy="45" rx="14" ry="10" fill="#efd4b6" />
            <circle cx="115" cy="34" r="3.2" fill="#0e0b12" />
            <circle cx="116" cy="33" r="0.9" fill="#fff" />
            <circle cx="139" cy="43" r="3.2" fill="#111" />
            <path d="M132 51 Q137 57 143 51" fill="none" stroke="#251b20" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M103 48 Q108 53 114 49" fill="none" stroke="#5b3030" strokeWidth="1.8" opacity=".45" />
          </g>

          <g className="dog-tail">
            <path d="M33 48 C16 44, 10 29, 22 18 C28 13, 33 19, 29 24 C23 31, 29 35, 38 36"
              fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" />
          </g>

          <g className="dog-legs dog-legs-a">
            <path d="M48 65 L35 86" stroke={color} strokeWidth="10" strokeLinecap="round" />
            <path d="M80 66 L92 86" stroke={color} strokeWidth="10" strokeLinecap="round" />
          </g>
          <g className="dog-legs dog-legs-b">
            <path d="M61 66 L67 88" stroke={color} strokeWidth="10" strokeLinecap="round" />
            <path d="M92 62 L108 80" stroke={color} strokeWidth="10" strokeLinecap="round" />
          </g>

          <ellipse cx="36" cy="88" rx="10" ry="3" fill="#1b1111" opacity=".42" />
          <ellipse cx="67" cy="89" rx="10" ry="3" fill="#1b1111" opacity=".42" />
          <ellipse cx="93" cy="88" rx="10" ry="3" fill="#1b1111" opacity=".42" />
          <ellipse cx="109" cy="82" rx="10" ry="3" fill="#1b1111" opacity=".42" />
        </g>
      </svg>

      <div className="absolute -bottom-1 left-1/2 h-2.5 w-[72px] -translate-x-1/2 rounded-full bg-black/45 blur-[3px]" />

      {running ? (
        <>
          <span className="dust dust-1" />
          <span className="dust dust-2" />
          <span className="dust dust-3" />
        </>
      ) : null}

      {boost ? (
        <>
          <div className="absolute -left-16 top-7 h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-white blur-[1px]" />
          <div className="absolute -left-12 top-10 h-0.5 w-12 rounded-full bg-gradient-to-r from-transparent to-orange-300 opacity-80" />
        </>
      ) : null}

      {stumble ? <div className="absolute -right-2 -top-3 text-xl">💫</div> : null}
    </div>
  );
}


function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(value: number) {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 화면 이동은 서버 progressFrames에 의존하지 않는다.
 * 최종 순위, 능력치, 이벤트와 경과시간으로 브라우저에서 직접 계산하므로
 * 응답 프레임 일부가 누락되거나 키 형식이 달라도 6마리 모두 반드시 달린다.
 */
function calculateVisualProgress(
  result: RaceResult | null,
  entries: DogEntry[],
  elapsed: number
) {
  const output: Record<number, number> = {};
  if (!result || !entries.length) return output;

  const phase = clamp01(elapsed / Math.max(1, result.durationMs));
  const base = easeInOutCubic(phase);

  for (const dog of entries) {
    const rankIndex = Math.max(0, result.ranking.indexOf(dog.lane));
    const finishTarget = rankIndex === 0 ? 1 : 0.982 - rankIndex * 0.011;

    const speedBias = (dog.speed - 78) / 650;
    const staminaBias = (dog.stamina - 78) / 850;
    const sprintBias = (dog.sprint - 78) / 520;

    const earlyShape = Math.sin(Math.PI * clamp01(phase / 0.52)) * speedBias;
    const midShape = Math.sin(Math.PI * clamp01((phase - 0.18) / 0.64)) * staminaBias;
    const lateShape = easeInOutCubic(clamp01((phase - 0.66) / 0.34)) * sprintBias;

    // 레인마다 다른 파형으로 초중반 추월을 만든다. 시작과 결승에서는 0으로 사라진다.
    const raceFade = Math.sin(Math.PI * phase);
    const wave =
      Math.sin(phase * Math.PI * 4.4 + dog.lane * 1.17) * 0.024 * raceFade +
      Math.sin(phase * Math.PI * 8.2 + dog.lane * 0.61) * 0.011 * raceFade;

    let eventOffset = 0;
    for (const event of result.events) {
      if (event.lane !== dog.lane || elapsed < event.at) continue;
      const age = elapsed - event.at;

      if (event.type === "mistake" && age < 1350) {
        eventOffset -= (1 - age / 1350) * 0.055 * event.intensity;
      }
      if ((event.type === "surge" || event.type === "sprint") && age < 1800) {
        eventOffset += (1 - age / 1800) * 0.042 * event.intensity;
      }
    }

    // 최종 순위는 마지막 30% 구간에서만 서서히 반영한다.
    const finalOrderPull = easeInOutCubic(clamp01((phase - 0.69) / 0.31));
    const rankAdjustment = (0.018 - rankIndex * 0.0075) * finalOrderPull;

    // 출발 후 즉시 움직이고, 98% 시점에 결승선 근처까지 도달한다.
    const minimumRun = phase * 0.72;
    let value =
      base * finishTarget +
      earlyShape +
      midShape +
      lateShape +
      wave +
      eventOffset +
      rankAdjustment;

    value = Math.max(value, minimumRun);
    output[dog.lane] = clamp01(Math.min(finishTarget, value));
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

  const progress = useMemo(() => calculateVisualProgress(playData?.result || null, entries, elapsed), [playData, entries, elapsed]);

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
                    const x = 5 + laneProgress * 82;
                    const rank = liveRanking.findIndex((item) => item.lane === dog.lane) + 1;
                    return (
                      <div key={dog.lane} className="race-lane relative h-[92px] border-b border-white/10 last:border-b-0">
                        <div className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 text-sm font-black ring-1 ring-white/15">{dog.lane}</div>
                        <div className="absolute right-2 top-2 z-10 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-black text-zinc-200">현재 {rank}위</div>
                        <div
                          className="absolute bottom-1 z-20 will-change-[left,transform]"
                          style={{
                            left: `${x}%`,
                            transform: "translateX(-50%)",
                            transition: raceState === "running" ? "left 55ms linear" : "none",
                          }}
                        >
                          <DogRunner dog={dog} running={raceState === "running"} effect={currentEffects[dog.lane]} rank={rank} />
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
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/25"><DogRunner dog={dog} running={false} rank={0} /></div>
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
      <style jsx global>{`
        @keyframes dogBodyRun {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-5px) rotate(1.2deg); }
        }
        @keyframes dogHeadRun {
          0%, 100% { transform: translate(0, 0) rotate(-1deg); }
          50% { transform: translate(1px, -2px) rotate(2deg); }
        }
        @keyframes dogLegA {
          0%, 100% { transform: rotate(18deg); transform-origin: 54px 65px; }
          50% { transform: rotate(-22deg); transform-origin: 54px 65px; }
        }
        @keyframes dogLegB {
          0%, 100% { transform: rotate(-19deg); transform-origin: 77px 64px; }
          50% { transform: rotate(23deg); transform-origin: 77px 64px; }
        }
        @keyframes dogTailRun {
          0%, 100% { transform: rotate(-7deg); transform-origin: 35px 46px; }
          50% { transform: rotate(12deg); transform-origin: 35px 46px; }
        }
        @keyframes dustFly {
          0% { transform: translate(0, 0) scale(.3); opacity: 0; }
          20% { opacity: .62; }
          100% { transform: translate(-40px, -13px) scale(1.4); opacity: 0; }
        }
        @keyframes stumbleDog {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          30% { transform: rotate(12deg) translateY(4px); }
          60% { transform: rotate(-7deg) translateY(1px); }
        }
        .dog-runner.is-running .dog-body { animation: dogBodyRun .24s ease-in-out infinite; }
        .dog-runner.is-running .dog-head { animation: dogHeadRun .24s ease-in-out infinite; }
        .dog-runner.is-running .dog-legs-a { animation: dogLegA .22s linear infinite; }
        .dog-runner.is-running .dog-legs-b { animation: dogLegB .22s linear infinite; }
        .dog-runner.is-running .dog-tail { animation: dogTailRun .18s ease-in-out infinite; }
        .dog-runner.is-boosting { filter: drop-shadow(0 0 16px rgba(251,191,36,.55)); }
        .dog-runner.is-boosting .dog-body { animation-duration: .16s; }
        .dog-runner.is-boosting .dog-legs-a,
        .dog-runner.is-boosting .dog-legs-b { animation-duration: .14s; }
        .dog-runner.is-stumbling { animation: stumbleDog .58s ease-in-out; }
        .dust {
          position: absolute;
          left: 2px;
          bottom: 5px;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: rgba(222,184,135,.6);
          filter: blur(1px);
          animation: dustFly .62s linear infinite;
        }
        .dust-2 { width: 6px; height: 6px; animation-delay: .18s; bottom: 11px; }
        .dust-3 { width: 12px; height: 7px; animation-delay: .35s; bottom: 2px; }
        .race-lane {
          background:
            linear-gradient(180deg, rgba(255,255,255,.025), transparent 40%),
            repeating-linear-gradient(90deg, transparent 0 78px, rgba(255,255,255,.055) 79px 80px);
          box-shadow: inset 0 -1px rgba(0,0,0,.18);
        }
      `}</style>

    </main>
  );
}
