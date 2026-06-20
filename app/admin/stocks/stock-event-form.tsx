"use client";

import { useState } from "react";

export default function StockEventForm({
  stocks,
}: {
  stocks: {
    id: number;
    stock_name: string;
    is_listed: number;
  }[];
}) {
  const listedStocks = stocks.filter((stock) => Number(stock.is_listed) === 1);

  const [stockId, setStockId] = useState(
    listedStocks.length ? String(listedStocks[0].id) : ""
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<"up" | "down">("up");
  const [eventRate, setEventRate] = useState("30");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [loading, setLoading] = useState(false);

  async function createEvent() {
    if (!stockId) {
      alert("주식을 선택해주세요.");
      return;
    }

    if (!eventTitle.trim()) {
      alert("뉴스 제목을 입력해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/stocks/events/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stockId: Number(stockId),
        eventTitle,
        eventType,
        eventRate: Number(eventRate),
        durationMinutes: Number(durationMinutes),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.success) {
      alert(data.message || "뉴스 이벤트 생성 실패");
      return;
    }

    alert("뉴스 이벤트 생성 완료");
    location.reload();
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
      <h2 className="mb-4 text-xl font-black">뉴스 이벤트 추가</h2>

      <div className="grid gap-3 md:grid-cols-5">
        <select
          value={stockId}
          onChange={(e) => setStockId(e.target.value)}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
        >
          {listedStocks.map((stock) => (
            <option key={stock.id} value={stock.id}>
              {stock.stock_name}
            </option>
          ))}
        </select>

        <input
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="뉴스 제목"
        />

        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as "up" | "down")}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
        >
          <option value="up">호재</option>
          <option value="down">악재</option>
        </select>

        <input
          value={eventRate}
          onChange={(e) => setEventRate(e.target.value.replace(/[^0-9]/g, ""))}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="추가 변동폭 %"
        />

        <input
          value={durationMinutes}
          onChange={(e) =>
            setDurationMinutes(e.target.value.replace(/[^0-9]/g, ""))
          }
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="지속 시간(분)"
        />
      </div>

      <button
        onClick={createEvent}
        disabled={loading}
        className="mt-4 rounded-xl bg-purple-500 px-5 py-4 font-black text-white hover:bg-purple-400 disabled:opacity-50"
      >
        {loading ? "생성 중..." : "뉴스 이벤트 생성"}
      </button>

      <p className="mt-3 text-sm text-zinc-400">
        예: 호재 +30% 30분 → 다음 가격 갱신 때 해당 종목 변동률에 추가됩니다.
      </p>
    </section>
  );
}