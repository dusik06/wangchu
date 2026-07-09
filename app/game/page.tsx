"use client";

import { useEffect, useState } from "react";
import GameHighlights from "@/components/game/GameHighlights";
import GameRanking from "@/components/game/GameRanking";
import PolicyNotice from "@/components/PolicyNotice";

const diceFaces: Record<number, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDicePath(finalDice: number) {
  const path: number[] = [];
  let last = 0;

  for (let i = 0; i < 22; i++) {
    let next = Math.floor(Math.random() * 6) + 1;

    if (next === last) {
      next = next >= 6 ? 1 : next + 1;
    }

    path.push(next);
    last = next;
  }

  if (path[path.length - 1] !== finalDice) {
    path.push(finalDice);
  }

  return path;
}

export default function GamePage() {
  const [dotori, setDotori] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [choice, setChoice] = useState<"ODD" | "EVEN" | null>(null);
  const [doubleChoice, setDoubleChoice] = useState<"ODD" | "EVEN" | null>(null);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const [dice, setDice] = useState<number | null>(null);
  const [firstWin, setFirstWin] = useState<boolean | null>(null);
  const [doubleMode, setDoubleMode] = useState(false);
  const [showResult, setShowResult] = useState(false);
const [diceShake, setDiceShake] = useState(false);
const [resultType, setResultType] = useState<"win" | "lose" | null>(null);


const rollDiceToResult = async (finalDice: number) => {
  setRolling(true);
  setShowResult(false);
  setDiceShake(false);
  setResultType(null);

  const path = buildDicePath(finalDice);

  for (let i = 0; i < path.length; i++) {
    setDice(path[i]);

    const progress = i / Math.max(path.length - 1, 1);
    const delay = 45 + Math.floor(progress * progress * progress * 210);

    await sleep(delay);
  }

  setDice(finalDice);
  setDiceShake(true);

  await sleep(180);

  setDiceShake(false);
  setRolling(false);
  setShowResult(true);
};

  const loadBalance = async () => {
    const res = await fetch("/api/game/dice/balance");
    const data = await res.json();

    if (data.success) {
      setDotori(data.dotori);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const startGame = async () => {
    if (!betAmount || !choice || loading) return;

    setLoading(true);
    setRolling(true);
setDice(null);
setFirstWin(null);
setGameId(null);
setDoubleMode(false);
setDoubleChoice(null);
setShowResult(false);
setResultType(null);

    const res = await fetch("/api/game/dice/start", {
      method: "POST",
      body: JSON.stringify({
        choice,
        betAmount: Number(betAmount),
      }),
    });

    const data = await res.json();

    if (data.success) {
      await rollDiceToResult(Number(data.dice));
    
      setGameId(data.gameId);
      setDice(data.dice);
      setFirstWin(data.firstWin);
      setResultType(data.firstWin ? "win" : "lose");
    
      await loadBalance();
    } else {
      alert(data.message || "게임을 시작할 수 없습니다.");
    }
    
    setLoading(false);
  };

  const cashout = async () => {
    if (!gameId) return;

    const res = await fetch("/api/game/dice/cashout", {
      method: "POST",
      body: JSON.stringify({ gameId }),
    });

    const data = await res.json();

    if (data.success) {
      alert(`🎉 ${data.payoutAmount.toLocaleString()} 도토리 획득!`);
      await loadBalance();
      location.reload();
    } else {
      alert(data.message || "수령에 실패했습니다.");
    }
  };

  const doubleGame = async () => {
    if (!gameId || !doubleChoice) {
      alert("엎기에서 홀/짝을 선택해주세요.");
      return;
    }

    setDoubleMode(true);
setRolling(true);
setShowResult(false);
setResultType(null);

    const res = await fetch("/api/game/dice/double", {
      method: "POST",
      body: JSON.stringify({ gameId, doubleChoice }),
    });

    const data = await res.json();

    await rollDiceToResult(Number(data.dice));

setDice(data.dice);
setResultType(data.doubleWin ? "win" : "lose");

if (data.doubleWin) {
  alert(
    `🎉 성공! ${Number(betAmount).toLocaleString()}개 배팅 → ${data.payoutAmount.toLocaleString()} 도토리 획득!`
  );
} else {
  alert("아쉽네요... 엎기에 실패했어요.");
}

await loadBalance();
location.reload();
  };

  const expectedCashout = betAmount ? Math.floor(Number(betAmount) * 1.9) : 0;
  const expectedDouble = betAmount ? Math.floor(Number(betAmount) * 4.5) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf0] via-white to-[#fff7df] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 rounded-[28px] border border-yellow-100 bg-white/90 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <p className="mb-2 text-sm font-bold text-yellow-600">WANGCHU GAME</p>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-zinc-900">
                🎲 주사위 홀짝 게임
              </h1>
              <p className="mt-3 text-zinc-500">
                도토리를 걸고 주사위의 홀/짝을 맞혀보세요.
              </p>
            </div>

            <div className="rounded-2xl bg-yellow-50 px-5 py-4 text-right">
              <p className="text-xs font-bold text-yellow-600">보유 도토리</p>
              <p className="text-2xl font-black text-yellow-700">
                {dotori === null
                  ? "불러오는 중..."
                  : `${dotori.toLocaleString()}개`}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-yellow-100 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.07)]">
              <div className="mb-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-bold text-zinc-400">1차 성공</p>
                  <p className="mt-1 text-2xl font-black text-zinc-900">1.9배</p>
                </div>

                <div className="rounded-2xl bg-yellow-50 p-4">
                  <p className="text-xs font-bold text-yellow-600">엎기 성공</p>
                  <p className="mt-1 text-2xl font-black text-yellow-700">3.8배</p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs font-bold text-red-500">실패 시</p>
                  <p className="mt-1 text-2xl font-black text-red-600">0개</p>
                </div>
              </div>

              <div className="flex flex-col items-center rounded-[26px] bg-gradient-to-b from-zinc-950 to-zinc-800 px-6 py-10 text-white">
              <div className="relative flex h-48 w-48 items-center justify-center">
  <div
    className={[
      "absolute inset-0 rounded-[42px] blur-2xl transition-all duration-300",
      resultType === "win" && showResult
        ? "bg-emerald-400/50"
        : resultType === "lose" && showResult
        ? "bg-red-500/40"
        : rolling
        ? "bg-yellow-400/40"
        : "bg-white/10",
    ].join(" ")}
  />

  <div
    className={[
      "relative flex h-44 w-44 items-center justify-center rounded-[34px] border border-white/70 bg-white text-[104px] font-black leading-none text-zinc-950 shadow-2xl transition-all duration-150",
      rolling ? "scale-110 rotate-6" : "scale-100 rotate-0",
      diceShake ? "scale-125 -rotate-3" : "",
      resultType === "win" && showResult
        ? "border-emerald-300 shadow-[0_0_45px_rgba(52,211,153,0.75)]"
        : "",
      resultType === "lose" && showResult
        ? "border-red-300 shadow-[0_0_45px_rgba(248,113,113,0.65)]"
        : "",
    ].join(" ")}
  >
    {dice ? diceFaces[dice] : "🎲"}
  </div>
</div>

                <p className="mt-5 text-sm font-bold text-yellow-300">
                {rolling
  ? "주사위가 굴러가는 중..."
  : showResult && dice
  ? `주사위 눈: ${dice} · ${dice % 2 === 0 ? "짝" : "홀"}`
  : "홀/짝을 선택하고 주사위를 던져보세요"}
                </p>

                {showResult && firstWin === false && !rolling && (
                  <div className="mt-5 rounded-2xl bg-white/10 px-5 py-3 text-center">
                    <p className="font-black text-red-200">아쉽네요...</p>
                    <p className="text-sm text-zinc-300">
                      다음 주사위는 맞힐 수 있어요.
                    </p>
                  </div>
                )}

{showResult && firstWin === true && !doubleMode && (
                  <div className="mt-6 w-full max-w-xl rounded-3xl bg-white p-5 text-zinc-900">
                    <p className="text-center text-xl font-black">🎉 1차 성공!</p>
                    <p className="mt-2 text-center text-sm text-zinc-500">
                      지금 받으면 {expectedCashout.toLocaleString()} 도토리,
                      엎기에 성공하면 {expectedDouble.toLocaleString()} 도토리!
                    </p>

                    <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
                      <p className="mb-3 text-center text-sm font-black text-zinc-700">
                        엎기에서 다시 맞힐 홀/짝을 선택하세요
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setDoubleChoice("ODD")}
                          className={`cursor-pointer rounded-2xl px-5 py-4 font-black ${
                            doubleChoice === "ODD"
                              ? "bg-zinc-950 text-white"
                              : "bg-white text-zinc-700"
                          }`}
                        >
                          홀
                        </button>

                        <button
                          onClick={() => setDoubleChoice("EVEN")}
                          className={`cursor-pointer rounded-2xl px-5 py-4 font-black ${
                            doubleChoice === "EVEN"
                              ? "bg-zinc-950 text-white"
                              : "bg-white text-zinc-700"
                          }`}
                        >
                          짝
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={cashout}
                        className="cursor-pointer rounded-2xl bg-emerald-500 px-5 py-4 font-black text-white shadow-lg"
                      >
                        1.9배 받기
                      </button>

                      <button
                        onClick={doubleGame}
                        className="cursor-pointer rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-4 font-black text-white shadow-lg"
                      >
                        엎어서 3.8배 도전
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_180px]">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setChoice("ODD")}
                    disabled={loading || firstWin === true}
                    className={`cursor-pointer rounded-2xl px-5 py-4 font-black ${
                      choice === "ODD"
                        ? "bg-zinc-950 text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    홀
                  </button>

                  <button
                    onClick={() => setChoice("EVEN")}
                    disabled={loading || firstWin === true}
                    className={`cursor-pointer rounded-2xl px-5 py-4 font-black ${
                      choice === "EVEN"
                        ? "bg-zinc-950 text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    짝
                  </button>
                </div>

                <input
                  type="number"
                  min="1"
                  placeholder="배팅 도토리 입력"
                  value={betAmount}
                  disabled={loading || firstWin === true}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-center font-bold outline-none focus:border-yellow-400"
                />

                <button
                  onClick={startGame}
                  disabled={loading || firstWin === true}
                  className="cursor-pointer rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
                >
                  주사위 던지기
                </button>
              </div>
            </div>

            <GameHighlights />
            <PolicyNotice />
          </div>

          <aside className="space-y-6">
            <GameRanking />
          </aside>
        </section>
      </div>
    </main>
  );
}