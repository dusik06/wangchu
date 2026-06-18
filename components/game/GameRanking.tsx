"use client";

import { useEffect, useState } from "react";

type GameRank = {
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
  const [tab, setTab] = useState<"dotori" | "game">("dotori");
  const [gameRanking, setGameRanking] = useState<GameRank[]>([]);

  useEffect(() => {
    fetch("/api/game/dice/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGameRanking((data.ranking || []).slice(0, 5));
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
      : gameRanking.slice(0, 5).map((user) => ({
          id: user.user_id,
          nickname: user.nickname,
          score: user.total_bet,
        }));

  return (
    <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
      <h2 className="mb-4 text-xl font-black text-[#f7d36b]">랭킹</h2>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1">
        <button
          onClick={() => setTab("dotori")}
          className={`rounded-xl px-3 py-3 text-sm font-black ${
            tab === "dotori"
              ? "bg-[#f7d36b] text-black"
              : "text-zinc-400"
          }`}
        >
          도토리랭킹
        </button>

        <button
          onClick={() => setTab("game")}
          className={`rounded-xl px-3 py-3 text-sm font-black ${
            tab === "game"
              ? "bg-[#f7d36b] text-black"
              : "text-zinc-400"
          }`}
        >
          게임랭킹
        </button>
      </div>

      <div className="space-y-2">
        {current.map((user, index) => (
          <div
            key={`${tab}-${user.id}`}
            className="flex items-center justify-between rounded-2xl border border-[#2c2f3a] bg-[#151925] px-4 py-3"
          >
            <span className="font-black">
              {index + 1}위 {user.nickname}
            </span>

            <span className="font-black text-[#f7d36b]">
              {Number(user.score).toLocaleString()}개
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}