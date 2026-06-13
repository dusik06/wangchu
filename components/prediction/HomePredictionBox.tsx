"use client";

import { useEffect, useState } from "react";

type PredictionGame = {
  id: number;
  title: string;
  win_label: string;
  lose_label: string;
  win_odds: number;
  lose_odds: number;
  status: string;
};

export default function HomePredictionBox() {
  const [games, setGames] = useState<PredictionGame[]>([]);

  useEffect(() => {
    fetch("/api/prediction/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const openGames = data.games
            .filter((game: PredictionGame) => game.status === "OPEN")
            .slice(0, 3);

          setGames(openGames);
        }
      });
  }, []);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#151027] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">📊 승패 예측</h2>

        <a
          href="/prediction"
          className="cursor-pointer rounded-full bg-purple-500 px-4 py-2 text-sm font-black transition hover:bg-purple-400"
        >
          참여하기
        </a>
      </div>

      <div className="space-y-3">
        {games.length === 0 ? (
          <p className="rounded-2xl bg-white/5 p-4 text-sm text-zinc-400">
            현재 진행중인 예측이 없습니다.
          </p>
        ) : (
          games.map((game) => (
            <a
              key={game.id}
              href="/prediction"
              className="block cursor-pointer rounded-2xl bg-white/5 p-4 transition hover:bg-white/10"
            >
              <p className="line-clamp-1 font-black">{game.title}</p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-emerald-500/15 px-3 py-2 text-emerald-300">
                  {game.win_label} {Number(game.win_odds).toFixed(1)}배
                </div>

                <div className="rounded-xl bg-red-500/15 px-3 py-2 text-red-300">
                  {game.lose_label} {Number(game.lose_odds).toFixed(1)}배
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}