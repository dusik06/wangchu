"use client";

import { useEffect, useState } from "react";

type MainTab = "dotori" | "game" | "stock";
type StockTab = "realtime" | "profit";

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

type StockRank = {
  user_id: number;
  nickname: string;
  profit_amount: number;
  profit_rate?: number;
};

function rankIcon(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}위`;
}

function profitClass(value: number) {
  if (value > 0) return "text-red-400";
  if (value < 0) return "text-blue-400";
  return "text-zinc-400";
}

export default function GameRanking({
  dotoriRanking = [],
}: {
  dotoriRanking?: DotoriRank[];
}) {
  const [tab, setTab] = useState<MainTab>("dotori");
  const [stockTab, setStockTab] = useState<StockTab>("realtime");
  const [gameRanking, setGameRanking] = useState<GameRank[]>([]);
  const [stockRealtimeRanking, setStockRealtimeRanking] = useState<StockRank[]>(
    []
  );
  const [stockProfitRanking, setStockProfitRanking] = useState<StockRank[]>([]);

  useEffect(() => {
    fetch("/api/game/dice/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGameRanking((data.ranking || []).slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/stock/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStockRealtimeRanking((data.realtime || []).slice(0, 5));
          setStockProfitRanking((data.profit || []).slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  const normalCurrent =
    tab === "dotori"
      ? dotoriRanking.slice(0, 5).map((user) => ({
          id: user.id,
          nickname: user.nickname,
          score: user.dotori,
          label: "보유",
        }))
      : gameRanking.slice(0, 5).map((user) => ({
          id: user.user_id,
          nickname: user.nickname,
          score: user.total_bet,
          label: "누적 배팅",
        }));

  const stockCurrent =
    stockTab === "realtime" ? stockRealtimeRanking : stockProfitRanking;

  return (
    <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#f7d36b]">랭킹</h2>
        <span className="text-xs font-bold text-zinc-500">TOP 5</span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-black/30 p-1">
        <button
          onClick={() => setTab("dotori")}
          className={`rounded-xl px-2 py-3 text-xs font-black ${
            tab === "dotori" ? "bg-[#f7d36b] text-black" : "text-zinc-400"
          }`}
        >
          도토리
        </button>

        <button
          onClick={() => setTab("game")}
          className={`rounded-xl px-2 py-3 text-xs font-black ${
            tab === "game" ? "bg-[#f7d36b] text-black" : "text-zinc-400"
          }`}
        >
          게임
        </button>

        <button
          onClick={() => setTab("stock")}
          className={`rounded-xl px-2 py-3 text-xs font-black ${
            tab === "stock" ? "bg-[#f7d36b] text-black" : "text-zinc-400"
          }`}
        >
          주식
        </button>
      </div>

      {tab === "stock" && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-[#2c2f3a] bg-[#151925] p-1">
          <button
            onClick={() => setStockTab("realtime")}
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              stockTab === "realtime"
                ? "bg-purple-500 text-white"
                : "text-zinc-400"
            }`}
          >
            실시간
          </button>

          <button
            onClick={() => setStockTab("profit")}
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              stockTab === "profit"
                ? "bg-emerald-500 text-black"
                : "text-zinc-400"
            }`}
          >
            수익
          </button>
        </div>
      )}

      {tab !== "stock" ? (
        <div className="space-y-2">
          {normalCurrent.length === 0 ? (
            <p className="rounded-2xl border border-[#2c2f3a] bg-[#151925] p-4 text-sm text-zinc-400">
              랭킹 데이터가 없습니다.
            </p>
          ) : (
            normalCurrent.map((user, index) => (
              <div
                key={`${tab}-${user.id}`}
                className="flex items-center justify-between rounded-2xl border border-[#2c2f3a] bg-[#151925] px-4 py-3"
              >
                <div>
                  <p className="font-black">
                    {rankIcon(index)} {user.nickname}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{user.label}</p>
                </div>

                <span className="font-black text-[#f7d36b]">
                  {Number(user.score).toLocaleString()}개
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {stockCurrent.length === 0 ? (
            <p className="rounded-2xl border border-[#2c2f3a] bg-[#151925] p-4 text-sm text-zinc-400">
              주식 랭킹 데이터가 없습니다.
            </p>
          ) : (
            stockCurrent.map((user, index) => (
              <div
                key={`${stockTab}-${user.user_id}`}
                className="rounded-2xl border border-[#2c2f3a] bg-[#151925] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">
                    {rankIcon(index)} {user.nickname}
                  </p>

                  <p
                    className={`text-right font-black ${profitClass(
                      user.profit_amount
                    )}`}
                  >
                    {user.profit_amount > 0 ? "+" : ""}
                    {Number(user.profit_amount).toLocaleString()}개
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {stockTab === "realtime"
                      ? "현재 보유 평가손익"
                      : "누적 실현 수익"}
                  </span>

                  {stockTab === "realtime" && (
                    <span
                      className={profitClass(Number(user.profit_amount || 0))}
                    >
                      {Number(user.profit_rate || 0) > 0 ? "+" : ""}
                      {Number(user.profit_rate || 0)}%
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}