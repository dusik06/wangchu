"use client";

import { useEffect, useState } from "react";

type Rank = {
  user_id: number;
  nickname: string;
  total_bet: number;
};

export default function GameRanking() {
  const [ranking, setRanking] = useState<Rank[]>([]);

  useEffect(() => {
    fetch("/api/game/dice/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRanking(data.ranking);
        }
      });
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#151027] p-6 text-white">
      <h2 className="mb-4 text-2xl font-black text-yellow-400">
        🏆 배팅 랭킹
      </h2>

      <div className="space-y-3">
        {ranking.length === 0 && (
          <p className="text-zinc-400">아직 랭킹 데이터가 없습니다.</p>
        )}

        {ranking.map((user, index) => (
          <div
            key={user.user_id}
            className="flex justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <span className="font-semibold text-zinc-100">
              {index + 1}위 {user.nickname}
            </span>

            <span className="font-bold text-pink-300">
              {Number(user.total_bet).toLocaleString()}개
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}