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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    fetch("/api/game/dice/highlights", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;

        if (data.success) {
          setLogs(data.logs || []);
        }

        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const best = logs[0];

  return (
    <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-[#f7d36b]">게임 하이라이트</h2>
        <a
          href="/game"
          className="text-xs font-bold text-zinc-400 hover:text-[#f7d36b]"
        >
          전체 보기 〉
        </a>
      </div>

      {!best ? (
        <p className="rounded-2xl border border-[#2c2f3a] bg-[#151925] p-5 text-sm text-zinc-400">
          {!loaded ? "게임 하이라이트를 불러오는 중입니다." : "아직 3.8배 성공 기록이 없어요."}
        </p>
      ) : (
        <div className="rounded-2xl border border-[#6f5520] bg-gradient-to-br from-[#1b1720] to-[#10131b] p-5">
          <p className="text-sm font-bold text-zinc-400">오늘의 3.8배 성공</p>

          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f7d36b]/50 bg-[#2a2112] text-3xl">
              🏅
            </div>

            <div>
              <p className="text-xl font-black text-white">{best.nickname}</p>
              <p className="mt-1 text-sm text-zinc-300">
                {Number(best.bet_amount).toLocaleString()}개 배팅 성공
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-black/25 p-4 text-center">
            <p className="text-sm text-zinc-400">획득 도토리</p>
            <p className="text-2xl font-black text-[#f7d36b]">
              🌰 {Number(best.payout_amount).toLocaleString()}개
            </p>
          </div>
        </div>
      )}
    </div>
  );
}