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
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 mt-8">
      <h2 className="text-2xl font-bold mb-4">🏆 배팅 랭킹</h2>

      <div className="space-y-3">
        {ranking.map((user, index) => (
          <div
            key={user.user_id}
            className="flex justify-between bg-gray-50 rounded-2xl p-4"
          >
            <span>
              {index + 1}위 {user.nickname}
            </span>
            <span>{Number(user.total_bet).toLocaleString()}개</span>
          </div>
        ))}
      </div>
    </div>
  );
}
