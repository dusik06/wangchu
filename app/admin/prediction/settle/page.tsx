"use client";

import { useEffect, useState } from "react";

type PredictionGame = {
  id: number;
  title: string;
  win_label: string;
  lose_label: string;
  status: string;
};

export default function PredictionSettlePage() {
  const [games, setGames] = useState<PredictionGame[]>([]);
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

  const settleGame = async (
    gameId: number,
    result: "WIN" | "LOSE"
  ) => {
    const ok = confirm("정말 정산하시겠습니까?");

    if (!ok) return;

    setLoading(true);

    const res = await fetch("/api/admin/prediction/settle", {
      method: "POST",
      body: JSON.stringify({
        gameId,
        result,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      alert("정산 완료");
      loadGames();
    } else {
      alert(data.message || "정산 실패");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <section className="mb-8 rounded-3xl bg-slate-900 p-6">
          <p className="mb-2 text-sm font-bold text-yellow-400">
            ADMIN SETTLE
          </p>

          <h1 className="text-3xl font-black">예측 결과 정산</h1>

          <p className="mt-3 text-sm text-slate-400">
            현재 열려있는 예측 게임의 결과를 선택하고 정산합니다.
          </p>
        </section>

        <div className="space-y-6">
          {games.length === 0 && (
            <div className="rounded-3xl bg-slate-900 p-8 text-center text-slate-400">
              정산할 예측이 없습니다.
            </div>
          )}

          {games.map((game) => (
            <section
              key={game.id}
              className="rounded-3xl bg-slate-900 p-6"
            >
              <h2 className="text-2xl font-black mb-4">
                {game.title}
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  disabled={loading}
                  onClick={() => settleGame(game.id, "WIN")}
                  className="cursor-pointer rounded-2xl bg-emerald-500 px-5 py-5 font-black text-white shadow-lg disabled:opacity-50"
                >
                  {game.win_label} 결과로 정산
                </button>

                <button
                  disabled={loading}
                  onClick={() => settleGame(game.id, "LOSE")}
                  className="cursor-pointer rounded-2xl bg-red-500 px-5 py-5 font-black text-white shadow-lg disabled:opacity-50"
                >
                  {game.lose_label} 결과로 정산
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}