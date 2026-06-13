"use client";

import { useEffect, useState } from "react";

type Highlight = {
  id: number;
  nickname: string;
  bet_amount: number;
  payout_amount: number;
};

export default function GameHighlights() {
  const [logs, setLogs] = useState<Highlight[]>([]);

  useEffect(() => {
    fetch("/api/game/dice/highlights")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.logs);
        }
      });
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 mt-8">
      <h2 className="text-2xl font-bold mb-4">🔥 게임 현황</h2>

      <div className="space-y-3">
        {logs.length === 0 && (
          <p className="text-gray-400">아직 4.5배 성공 기록이 없어요.</p>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-yellow-50 rounded-2xl p-4 font-semibold"
          >
            🎉 {log.nickname}님{" "}
            {Number(log.bet_amount).toLocaleString()}개 배팅 →{" "}
            {Number(log.payout_amount).toLocaleString()} 도토리 획득!
          </div>
        ))}
      </div>
    </div>
  );
}