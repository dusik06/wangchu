"use client";

import { useEffect, useRef, useState } from "react";

type AlertItem = {
  id: number;
  stock_id: number;
  stock_name: string;
  event_title: string;
  event_rate: number;
  created_at_kst: string;
};

const STORAGE_KEY = "wangchu_seen_stock_auto_event_id";

export default function StockMarketGlobalAlert() {
  const [item, setItem] = useState<AlertItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/stock/alerts", { cache: "no-store" });
        const data = await res.json();
        if (!active || !data.success || !Array.isArray(data.alerts)) return;

        const seen = Number(localStorage.getItem(STORAGE_KEY) || 0);
        const newest = data.alerts.find((alert: AlertItem) => Number(alert.id) > seen);
        if (!newest) return;

        setItem(newest);
        localStorage.setItem(STORAGE_KEY, String(newest.id));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setItem(null), 12000);
      } catch {
        // 알림 실패가 페이지 사용을 막지 않도록 무시
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!item) return null;

  const rate = Number(item.event_rate || 0);

  return (
    <div className="fixed left-1/2 top-5 z-[9999] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
      <div className="overflow-hidden rounded-3xl border border-yellow-300/40 bg-[#17101f]/95 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl">
        <div className="h-1 w-full bg-gradient-to-r from-yellow-300 via-red-400 to-yellow-300" />
        <div className="flex items-start gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-300/15 text-2xl">🚨</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-[0.18em] text-yellow-300">주식시장 속보</p>
            <h2 className="mt-1 truncate text-lg font-black text-white">{item.stock_name} 자동 호재 발생</h2>
            <p className="mt-1 text-sm text-zinc-300">주가가 <strong className="text-red-300">+{rate.toFixed(2)}%</strong> 상승했습니다.</p>
            <p className="mt-2 text-xs text-zinc-500">{item.created_at_kst}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <a href="/stock" className="rounded-xl bg-yellow-300 px-3 py-2 text-xs font-black text-black">주식 보기</a>
            <button onClick={() => setItem(null)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-zinc-300">닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
