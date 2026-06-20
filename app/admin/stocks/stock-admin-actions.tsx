"use client";

import { useState } from "react";

export default function StockAdminActions({
  stock,
}: {
  stock: {
    id: number;
    stock_name: string;
    current_price: number;
    normal_rate: number;
    special_chance: number;
    special_rate: number;
    is_listed: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const [stockName, setStockName] = useState(stock.stock_name);
  const [currentPrice, setCurrentPrice] = useState(String(stock.current_price));
  const [normalRate, setNormalRate] = useState(String(stock.normal_rate));
  const [specialChance, setSpecialChance] = useState(String(stock.special_chance));
  const [specialRate, setSpecialRate] = useState(String(stock.special_rate));
  const [loading, setLoading] = useState(false);

  async function updateStock() {
    setLoading(true);

    const res = await fetch("/api/admin/stocks/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stockId: stock.id,
        stockName,
        currentPrice: Number(currentPrice),
        normalRate: Number(normalRate),
        specialChance: Number(specialChance),
        specialRate: Number(specialRate),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.success) {
      alert(data.message || "수정 실패");
      return;
    }

    alert("수정 완료");
    location.reload();
  }

  async function delistStock() {
    if (!confirm(`${stock.stock_name}을 상장폐지할까요?`)) return;

    const res = await fetch("/api/admin/stocks/delist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stockId: stock.id }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "상장폐지 실패");
      return;
    }

    alert("상장폐지 완료");
    location.reload();
  }

  async function deleteStock() {
    if (!confirm(`${stock.stock_name}과 관련 기록을 모두 삭제할까요?`)) return;

    const res = await fetch("/api/admin/stocks/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stockId: stock.id }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "삭제 실패");
      return;
    }

    alert("삭제 완료");
    location.reload();
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-slate-950 hover:bg-cyan-400"
      >
        수정하기
      </button>

      {open && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <input
            value={stockName}
            onChange={(e) => setStockName(e.target.value)}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white"
            placeholder="주식 이름"
          />

          <input
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white"
            placeholder="현재 가격"
          />

          <input
            value={normalRate}
            onChange={(e) => setNormalRate(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white"
            placeholder="일반 변동폭 %"
          />

          <input
            value={specialChance}
            onChange={(e) => setSpecialChance(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white"
            placeholder="특수 확률 %"
          />

          <input
            value={specialRate}
            onChange={(e) => setSpecialRate(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white"
            placeholder="특수 변동폭 %"
          />

          <button
            onClick={updateStock}
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-slate-950"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      )}

      {stock.is_listed ? (
        <button
          onClick={delistStock}
          className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white hover:bg-orange-400"
        >
          상장폐지
        </button>
      ) : null}

      <button
        onClick={deleteStock}
        className="w-full rounded-xl bg-red-500 px-4 py-3 font-black text-white hover:bg-red-400"
      >
        완전 삭제
      </button>
    </div>
  );
}