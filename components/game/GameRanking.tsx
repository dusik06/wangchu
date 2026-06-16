"use client";

import { useEffect, useState } from "react";

type BettingRank = {
  user_id: number;
  nickname: string;
  total_bet: number;
};

type DotoriRank = {
  id: number;
  nickname: string;
  dotori: number;
};

export default function GameRanking({
  dotoriRanking = [],
}: {
  dotoriRanking?: DotoriRank[];
}) {
  const [tab, setTab] = useState<"dotori" | "betting">("dotori");
  const [bettingRanking, setBettingRanking] = useState<BettingRank[]>([]);

  useEffect(() => {
    fetch("/api/game/dice/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBettingRanking((data.ranking || []).slice(0, 5));
        }
      });
  }, []);

  const current =
    tab === "dotori"
      ? dotoriRanking.slice(0, 5).map((user) => ({
          id: user.id,
          nickname: user.nickname,
          score: user.dotori,
        }))
      : bettingRanking.slice(0, 5).map((user) => ({
          id: user.user_id,
          nickname: user.nickname,
          score: user.total_bet,
        }));

  return (
    <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
      <h2 className="mb-4 text-xl font-black text-[#f7d36b]">랭킹</h2>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1">
        <button
          type="button"
          onClick={() => setTab("dotori")}
          className={`rounded-xl px-3 py-3 text-sm font-black ${
            tab === "dotori"
              ? "bg-[#f7d36b] text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          도토리랭킹
        </button>

        <button
          type="button"
          onClick={() => setTab("betting")}
          className={`rounded-xl px-3 py-3 text-sm font-black ${
            tab === "betting"
              ? "bg-[#f7d36b] text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          배팅랭킹
        </button>
      </div>

      {current.length >= 3 && (
        <div className="mb-5 grid grid-cols-3 items-end gap-2 text-center">
          <div className="rounded-2xl border border-[#3b321f] bg-[#151925] p-3">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#242937]">
              🥈
            </div>
            <p className="truncate text-sm font-black">{current[1].nickname}</p>
            <p className="mt-1 text-xs text-[#f7d36b]">
              {Number(current[1].score).toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#f7d36b]/60 bg-[#201a12] p-4">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#3a2b11] text-2xl">
              👑
            </div>
            <p className="truncate text-base font-black">{current[0].nickname}</p>
            <p className="mt-1 text-sm text-[#f7d36b]">
              {Number(current[0].score).toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#3b321f] bg-[#151925] p-3">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#242937]">
              🥉
            </div>
            <p className="truncate text-sm font-black">{current[2].nickname}</p>
            <p className="mt-1 text-xs text-[#f7d36b]">
              {Number(current[2].score).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {current.length === 0 ? (
          <p className="rounded-2xl border border-[#2c2f3a] bg-[#151925] p-4 text-sm text-zinc-400">
            아직 랭킹 데이터가 없습니다.
          </p>
        ) : (
          current.map((user, index) => (
            <div
              key={`${tab}-${user.id}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-[#2c2f3a] bg-[#151925] px-4 py-3"
            >
              <span className="font-black text-zinc-100">
                {index + 1}위 {user.nickname}
              </span>

              <span className="font-black text-[#f7d36b]">
                {Number(user.score).toLocaleString()}개
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}