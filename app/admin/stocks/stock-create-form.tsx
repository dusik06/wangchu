"use client";

import { useState } from "react";

export default function StockCreateForm() {
  const [stockName, setStockName] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [normalRate, setNormalRate] = useState("5");
  const [specialChance, setSpecialChance] = useState("5");
  const [specialRate, setSpecialRate] = useState("20");
  const [loading, setLoading] = useState(false);

  async function createStock() {
    if (!stockName.trim()) {
      alert("주식 이름을 입력해주세요.");
      return;
    }

    if (!currentPrice || Number(currentPrice) < 0) {
      alert("현재 가격을 입력해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/stocks/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      alert(data.message || "주식 생성 실패");
      return;
    }

    alert("주식 생성 완료");
    location.reload();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
      <h2 className="mb-4 text-xl font-black">새 주식 추가</h2>

      <div className="grid gap-3 md:grid-cols-5">
        <input
          value={stockName}
          onChange={(e) => setStockName(e.target.value)}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="주식 이름"
        />

        <input
          value={currentPrice}
          onChange={(e) => setCurrentPrice(e.target.value.replace(/[^0-9]/g, ""))}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="현재 가격"
        />

        <input
          value={normalRate}
          onChange={(e) => setNormalRate(e.target.value.replace(/[^0-9]/g, ""))}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="일반 변동폭 %"
        />

        <input
          value={specialChance}
          onChange={(e) => setSpecialChance(e.target.value.replace(/[^0-9]/g, ""))}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="특수 확률 %"
        />

        <input
          value={specialRate}
          onChange={(e) => setSpecialRate(e.target.value.replace(/[^0-9]/g, ""))}
          className="rounded-xl bg-black/40 px-4 py-3 text-white"
          placeholder="특수 변동폭 %"
        />
      </div>

      <button
        onClick={createStock}
        disabled={loading}
        className="mt-4 rounded-xl bg-cyan-500 px-5 py-4 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {loading ? "생성 중..." : "주식 생성"}
      </button>

      <p className="mt-3 text-sm text-zinc-400">
        가격은 정수 도토리만 사용합니다. 가격이 0 이하가 되면 자동 상장폐지됩니다.
      </p>
    </section>
  );
}