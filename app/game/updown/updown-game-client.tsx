"use client";

import { useEffect, useMemo, useState } from "react";

type Choice = "up" | "same" | "down";

type RoundResult = {
  success: boolean;
  message?: string;
  sessionId?: number;
  status?: "active" | "lost" | "cashed_out";
  startNumber?: number;
  resultNumber?: number;
  currentNumber?: number;
  choice?: Choice;
  isWin?: boolean;
  step?: number;
  betAmount?: number;
  accumulatedPayout?: number;
  displayMultiplier?: number;
  realWinRate?: number;
};

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function getCount(current: number, choice: Choice) {
  if (choice === "down") return current - 1;
  if (choice === "same") return 1;
  return 9 - current;
}

function getDisplayMultiplier(current: number, choice: Choice) {
  const count = getCount(current, choice);
  if (count <= 0) return 0;
  return Math.round((9 / count) * 100) / 100;
}

function choiceLabel(choice: Choice) {
  if (choice === "up") return "업";
  if (choice === "same") return "같음";
  return "다운";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function UpDownGameClient() {
  const [betAmount, setBetAmount] = useState("10");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentNumber, setCurrentNumber] = useState(5);
  const [selectedChoice, setSelectedChoice] = useState<Choice>("up");
  const [accumulatedPayout, setAccumulatedPayout] = useState(0);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"ready" | "active" | "lost" | "cashed_out">("ready");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightNumber, setHighlightNumber] = useState(5);
  const [message, setMessage] = useState("도토리를 걸고 업 / 같음 / 다운을 선택하세요.");
  const [myDotori, setMyDotori] = useState(0);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const multipliers = useMemo(() => {
    return {
      down: getDisplayMultiplier(currentNumber, "down"),
      same: getDisplayMultiplier(currentNumber, "same"),
      up: getDisplayMultiplier(currentNumber, "up"),
    };
  }, [currentNumber]);

  useEffect(() => {
    let alive = true;
  
    async function loadActiveGame() {
      try {
        const res = await fetch("/api/game/updown/status", {
          method: "GET",
          cache: "no-store",
        });
  
        const data = await res.json();
  
        if (!alive || !data.success || !data.hasActiveGame) return;
  
        setSessionId(Number(data.sessionId));
        setCurrentNumber(Number(data.currentNumber));
        setHighlightNumber(Number(data.currentNumber));
        setAccumulatedPayout(Number(data.accumulatedPayout));
        setStep(Number(data.step));
        setStatus("active");
        setMessage(
          `진행 중인 게임을 불러왔습니다. 현재 누적 당첨금 ${Number(
            data.accumulatedPayout || 0
          ).toLocaleString()} 도토리`
        );
      } catch {}
    }
  
    loadActiveGame();

    fetch("/api/user/me")
  .then((r) => r.json())
  .then((d) => {
    if (d.success) {
      setMyDotori(d.dotori);
    }
  });
  
    return () => {
      alive = false;
    };
  }, []);

  function getNextBounceNumber(now: number, direction: 1 | -1) {
    if (now >= 9) return { next: 8, direction: -1 as const };
    if (now <= 1) return { next: 2, direction: 1 as const };
    return { next: now + direction, direction };
  }

  function buildSmoothPath(start: number, result: number) {
    const path: number[] = [];
  
    let current = start;
    let direction: 1 | -1 = 1;
  
    if (current === 9) direction = -1;
  
    while (path.length < 35) {
      if (direction === 1) {
        if (current === 9) {
          direction = -1;
          current--;
        } else {
          current++;
        }
      } else {
        if (current === 1) {
          direction = 1;
          current++;
        } else {
          current--;
        }
      }
  
      path.push(current);
    }
  
    while (current !== result) {
      if (direction === 1) {
        if (current === 9) {
          direction = -1;
          current--;
        } else {
          current++;
        }
      } else {
        if (current === 1) {
          direction = 1;
          current++;
        } else {
          current--;
        }
      }
  
      path.push(current);
    }
  
    return path;
  }

  async function animateToResult(start: number, result: number) {
    const path = buildSmoothPath(start, result);

    for (let i = 0; i < path.length; i++) {
      setHighlightNumber(path[i]);

      const progress = i / Math.max(path.length - 1, 1);
      const delay =
35 +
Math.floor(progress * progress * progress * 220);

      await sleep(delay);
    }

    setHighlightNumber(result);

await sleep(120);

setHighlightNumber(0);

await sleep(60);

setHighlightNumber(result);

await sleep(220);
  }

  async function play(choice: Choice) {
    if (isPlaying || isLoading) return;

setIsLoading(true);

    const amount = Number(betAmount);

    if (status === "ready" && (!Number.isInteger(amount) || amount <= 0)) {
      setMessage("배팅 도토리를 정확히 입력해주세요.");
      return;
    }

    setIsPlaying(true);
    setSelectedChoice(choice);
    if (status === "ready") {
        setMyDotori((v) => v - amount);
      }
    setMessage(`${choiceLabel(choice)} 결과 확인 중...`);

    try {
      const url = status === "ready" ? "/api/game/updown/start" : "/api/game/updown/continue";

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          status === "ready"
            ? { betAmount: amount, choice }
            : { sessionId, choice }
        ),
      });

      const data: RoundResult = await res.json();

      if (!data.success) {
        setMessage(data.message || "게임 진행에 실패했습니다.");
        setIsPlaying(false);
        return;
      }

      setShowResult(false);
setLastResult(data);

await animateToResult(
        Number(data.startNumber || currentNumber),
        Number(data.resultNumber || currentNumber)
      );
      setShowResult(true);
      setCurrentNumber(data.currentNumber || data.resultNumber || currentNumber);
      setHighlightNumber(data.resultNumber || currentNumber);
      setAccumulatedPayout(data.accumulatedPayout || 0);
      setStep(data.step || step);
      setSessionId(data.sessionId || sessionId);

      if (data.status === "lost") {
        setStatus("lost");
        setMessage(`실패! 결과 숫자는 ${data.resultNumber}입니다.`);
      } else {
        setStatus("active");
        setMessage(`성공! 현재 누적 당첨금 ${Number(data.accumulatedPayout || 0).toLocaleString()} 도토리`);
      }
    } catch {
      setMessage("서버 오류가 발생했습니다.");
    } finally {
      setIsPlaying(false);
    }
  }

  async function cashout() {
    if (!sessionId || isPlaying) return;

    setIsPlaying(true);

    try {
      const res = await fetch("/api/game/updown/cashout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(data.message || "받기에 실패했습니다.");
        setIsPlaying(false);
        return;
      }
      setMyDotori((v) => v + Number(data.payout));
      setStatus("cashed_out");
      setMessage(`${Number(data.payout || 0).toLocaleString()} 도토리를 받았습니다.`);
    } catch {
      setMessage("서버 오류가 발생했습니다.");
    } finally {
        setIsPlaying(false);
        setIsLoading(false);
    }
  }

  function resetGame() {
    setSessionId(null);
    setCurrentNumber(5);
    setHighlightNumber(5);
    setSelectedChoice("up");
    setAccumulatedPayout(0);
    setStep(1);
    setStatus("ready");
    setLastResult(null);
    setMessage("도토리를 걸고 업 / 같음 / 다운을 선택하세요.");
  }

  const canPlayDown = multipliers.down > 0;
  const canPlayUp = multipliers.up > 0;

  return (
    <main className="min-h-screen bg-[#0b0718] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl border border-purple-500/20 bg-[#151027] p-6 shadow-2xl">
          <p className="text-sm font-semibold text-purple-300">왕츄 게임센터</p>
          <h1 className="mt-2 text-3xl font-black">업다운같음 게임</h1>
          <p className="mt-3 text-sm text-gray-300">
            숫자 1~9 중 현재 숫자를 기준으로 업 / 같음 / 다운을 맞히는 게임입니다.
            성공하면 당첨금을 받거나 엎어치기로 이어갈 수 있습니다.
          </p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#151027] p-6 shadow-2xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">현재 기준 숫자</p>
              <p className="text-4xl font-black text-purple-200">{currentNumber}</p>
            </div>

            <div className="rounded-xl bg-[#09090f] px-5 py-3 border border-white/10">
  <div className="text-xs text-gray-400">
    보유 도토리
  </div>

  <div className="text-2xl font-black text-yellow-300">
    {myDotori.toLocaleString()}
  </div>
</div>

            <div className="text-right">
              <p className="text-sm text-gray-400">진행 단계</p>
              <p className="text-2xl font-black">{status === "ready" ? "1차" : `${step}차`}</p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-9 gap-2">
            {numbers.map((num) => {
              const isCurrent = num === currentNumber;
              const isHighlight = num === highlightNumber;
              const isResult =
  showResult &&
  lastResult?.resultNumber === num;

              return (
                <div
                  key={num}
                  className={[
                    "flex aspect-square items-center justify-center rounded-2xl border text-xl font-black transition-all duration-150",
                    isResult
                      ? "scale-125 border-green-300 bg-green-500 text-white shadow-[0_0_45px_rgba(34,197,94,0.9)]"
                      : isHighlight
                      ? "scale-110 border-fuchsia-300 bg-fuchsia-500 text-white shadow-[0_0_30px_rgba(217,70,239,0.75)]"
                      : isCurrent
                      ? "border-purple-300 bg-purple-600/40 text-purple-100"
                      : "border-white/10 bg-[#09090f] text-gray-400",
                  ].join(" ")}
                >
                  {num}
                </div>
              );
            })}
          </div>

          {status === "ready" && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold text-gray-300">
                배팅 도토리
              </label>
              <input
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full rounded-2xl border border-white/10 bg-[#09090f] px-4 py-3 text-lg font-bold outline-none focus:border-purple-400"
                placeholder="배팅할 도토리"
              />
            </div>
          )}

          {status === "active" && (
            <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-200">현재 누적 당첨금</p>
              <p className="mt-1 text-3xl font-black text-emerald-300">
                {accumulatedPayout.toLocaleString()} 도토리
              </p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <button
              disabled={!canPlayDown || isPlaying || status === "lost" || status === "cashed_out"}
              onClick={() => play("down")}
              className="rounded-2xl border border-blue-400/20 bg-blue-500/15 px-5 py-5 text-left transition hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <p className="text-sm text-blue-200">DOWN</p>
              <p className="mt-1 text-2xl font-black">다운</p>
              <p className="mt-2 text-sm text-gray-300">{multipliers.down > 0 ? `${multipliers.down.toFixed(2)}배` : "불가"}</p>
            </button>

            <button
              disabled={isPlaying || isLoading || status === "lost" || status === "cashed_out"}
              onClick={() => play("same")}
              className="rounded-2xl border border-yellow-400/20 bg-yellow-500/15 px-5 py-5 text-left transition hover:bg-yellow-500/25 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <p className="text-sm text-yellow-200">SAME</p>
              <p className="mt-1 text-2xl font-black">같음</p>
              <p className="mt-2 text-sm text-gray-300">{multipliers.same.toFixed(2)}배</p>
            </button>

            <button
              disabled={!canPlayUp || isPlaying || status === "lost" || status === "cashed_out"}
              onClick={() => play("up")}
              className="rounded-2xl border border-pink-400/20 bg-pink-500/15 px-5 py-5 text-left transition hover:bg-pink-500/25 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <p className="text-sm text-pink-200">UP</p>
              <p className="mt-1 text-2xl font-black">업</p>
              <p className="mt-2 text-sm text-gray-300">{multipliers.up > 0 ? `${multipliers.up.toFixed(2)}배` : "불가"}</p>
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#09090f] p-4">
            <p className="text-sm text-gray-300">{message}</p>

            {showResult && lastResult && (
              <div className="mt-3 grid gap-2 text-sm text-gray-400 md:grid-cols-4">
                <p>선택: {lastResult.choice ? choiceLabel(lastResult.choice) : "-"}</p>
                <p>결과: {lastResult.resultNumber || "-"}</p>
                <p>배당: {lastResult.displayMultiplier?.toFixed(2) || "-"}배</p>
                <p>{lastResult.isWin ? "성공" : "실패"}</p>
              </div>
            )}
          </div>

          {status === "active" && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                disabled={isPlaying || isLoading}
                onClick={cashout}
                className="rounded-2xl bg-emerald-500 px-5 py-4 text-lg font-black text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                받기
              </button>

              <button
                disabled={isPlaying || isLoading}
                className="rounded-2xl border border-purple-400/30 bg-purple-500/20 px-5 py-4 text-lg font-black text-purple-100"
              >
                엎어치기는 위에서 다시 선택
              </button>
            </div>
          )}

          {(status === "lost" || status === "cashed_out") && (
            <button
              onClick={resetGame}
              className="mt-5 w-full rounded-2xl bg-white px-5 py-4 text-lg font-black text-[#151027] transition hover:bg-purple-100"
            >
              새 게임 시작
            </button>
          )}
        </section>
      </div>
    </main>
  );
}