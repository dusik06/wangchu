"use client";

import { useEffect, useState } from "react";

type PredictionGame = {
  id: number;
  title: string;
  description?: string | null;
  win_label: string;
  lose_label: string;
  win_odds: number;
  lose_odds: number;
  min_bet: number;
  max_bet: number;
  betting_deadline: string;
};

export default function PredictionPage() {
  const [games, setGames] = useState<PredictionGame[]>([]);
  const [betAmount, setBetAmount] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<"WIN" | "LOSE" | null>(
    null
  );
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
      alert("선택과 배팅 금액을 입력해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/prediction/bet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: selectedGameId,
        choice: selectedChoice,
        betAmount: Number(betAmount),
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      alert("예측 배팅 완료!");

      setBetAmount("");
      setSelectedChoice(null);
      setSelectedGameId(null);

      loadGames();
    } else {
      alert(data.message || "배팅 실패");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-3xl bg-slate-900 p-6">
          <p className="mb-2 text-sm font-bold text-indigo-400">
            PREDICTION GAME
          </p>

          <h1 className="text-3xl font-black">승패 예측</h1>

          <p className="mt-3 text-sm text-slate-400">
            진행중인 예측에 도토리를 배팅하고 결과를 기다려보세요.
          </p>
        </section>

        <div className="space-y-6">
          {games.length === 0 && (
            <div className="rounded-3xl bg-slate-900 p-8 text-center text-slate-400">
              현재 진행중인 예측이 없습니다.
            </div>
          )}

          {games.map((game) => (
            <section
              key={game.id}
              className="space-y-5 rounded-3xl bg-slate-900 p-6"
            >
              <div>
                <h2 className="text-2xl font-black">{game.title}</h2>

                {game.description && (
                  <p className="mt-3 text-slate-400">{game.description}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setSelectedChoice("WIN");
                  }}
                  className={`cursor-pointer rounded-2xl px-5 py-5 font-black ${
                    selectedGameId === game.id && selectedChoice === "WIN"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800"
                  }`}
                >
                  {game.win_label} ({game.win_odds}배)
                </button>

                <button
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setSelectedChoice("LOSE");
                  }}
                  className={`cursor-pointer rounded-2xl px-5 py-5 font-black ${
                    selectedGameId === game.id && selectedChoice === "LOSE"
                      ? "bg-red-500 text-white"
                      : "bg-slate-800"
                  }`}
                >
                  {game.lose_label} ({game.lose_odds}배)
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`${game.min_bet} ~ ${game.max_bet}`}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
                />

                <button
                  onClick={submitBet}
                  disabled={loading}
                  className="cursor-pointer rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? "배팅 중..." : "배팅하기"}
                </button>
              </div>

              <div className="text-sm text-slate-400">
                마감시간:{" "}
                {new Date(game.betting_deadline).toLocaleString("ko-KR")}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}