"use client";

import { useEffect, useState } from "react";

type PredictionGame = {
  id: number;
  title: string;
  description: string | null;
  win_label: string;
  lose_label: string;
  win_odds: number;
  lose_odds: number;
  status: "OPEN" | "SETTLED";
  result: "WIN" | "LOSE" | null;
  my_choice: "WIN" | "LOSE" | null;
  my_bet_amount: number | null;
  my_bet_status: "BET" | "WIN" | "LOSE" | null;
  my_payout_amount: number | null;
};

export default function PredictionPage() {
  const [games, setGames] = useState<PredictionGame[]>([]);
  const [betAmount, setBetAmount] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<"WIN" | "LOSE" | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGames = async () => {
    const res = await fetch("/api/prediction/list");
    const data = await res.json();

    if (data.success) {
      setGames(data.games);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const submitBet = async () => {
    if (!selectedGameId || !selectedChoice || !betAmount) {
      alert("배팅 정보를 입력해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/prediction/bet", {
      method: "POST",
      body: JSON.stringify({
        gameId: selectedGameId,
        choice: selectedChoice,
        betAmount: Number(betAmount),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert("배팅 완료");
      setBetAmount("");
      setSelectedChoice(null);
      setSelectedGameId(null);
      loadGames();
    } else {
      alert(data.message || "배팅 실패");
    }
  };

  const openGames = games.filter((g) => g.status === "OPEN");
  const historyGames = games.filter((g) => g.status === "SETTLED");

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">

        {/* 진행중 */}
        <section className="mb-8 rounded-3xl bg-slate-900 p-6">
          <h1 className="text-3xl font-black">📊 진행중인 예측</h1>
        </section>

        <div className="space-y-6 mb-14">
          {openGames.map((game) => (
            <section key={game.id} className="rounded-3xl bg-slate-900 p-6 space-y-5">
              <h2 className="text-2xl font-black">{game.title}</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setSelectedChoice("WIN");
                  }}
                  className="cursor-pointer rounded-2xl bg-emerald-500 px-5 py-5 font-black"
                >
                  {game.win_label} ({game.win_odds}배)
                </button>

                <button
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setSelectedChoice("LOSE");
                  }}
                  className="cursor-pointer rounded-2xl bg-red-500 px-5 py-5 font-black"
                >
                  {game.lose_label} ({game.lose_odds}배)
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="배팅 도토리 입력"
                  className="rounded-2xl bg-slate-800 px-5 py-4 outline-none"
                />

                <button
                  onClick={submitBet}
                  disabled={loading}
                  className="cursor-pointer rounded-2xl bg-purple-500 px-5 py-4 font-black"
                >
                  배팅하기
                </button>
              </div>
            </section>
          ))}
        </div>

        {/* 기록 */}
        <section className="mb-8 rounded-3xl bg-slate-900 p-6">
          <h1 className="text-3xl font-black">📜 지난 예측 결과</h1>
        </section>

        <div className="space-y-5">
          {historyGames.map((game) => (
            <section key={game.id} className="rounded-3xl bg-slate-900 p-6">
              <h2 className="text-xl font-black mb-4">{game.title}</h2>

              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-sm text-slate-400">최종 결과</p>

                <p className="mt-2 text-2xl font-black text-yellow-400">
                  {game.result === "WIN"
                    ? game.win_label
                    : game.lose_label}
                </p>

                {game.my_choice && (
                  <>
                    <p className="mt-4 text-sm text-slate-400">내 선택</p>

                    <p className="font-bold">
                      {game.my_choice === "WIN"
                        ? game.win_label
                        : game.lose_label}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      배팅: {Number(game.my_bet_amount).toLocaleString()}개
                    </p>

                    <p
                      className={`mt-3 text-xl font-black ${
                        game.my_bet_status === "WIN"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {game.my_bet_status === "WIN"
                        ? `🎉 ${Number(game.my_payout_amount).toLocaleString()}개 획득`
                        : "❌ 실패"}
                    </p>
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}