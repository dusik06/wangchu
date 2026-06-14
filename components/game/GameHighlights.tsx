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
    <div className="rounded-3xl border border-white/10 bg-[#151027] p-6 text-white">
      <h2 className="mb-4 text-2xl font-black text-pink-300">
        🔥 게임 현황
      </h2>

      <div className="space-y-3">
        {logs.length === 0 && (
          <p className="text-zinc-400">아직 4.5배 성공 기록이 없어요.</p>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-2xl border border-pink-400/20 bg-white/10 p-4 font-semibold text-zinc-100"
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