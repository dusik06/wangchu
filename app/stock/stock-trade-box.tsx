"use client";

import { useState } from "react";

export default function StockTradeBox({ stockId }: { stockId: number }) {
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);

  async function trade(type: "buy" | "sell") {
    const q = Math.floor(Number(quantity));

    if (!q || q <= 0) {
      alert("수량을 입력해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/stock/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stockId,
        quantity: q,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.success) {
      alert(data.message || "거래 실패");
      return;
    }

    alert(data.message);
    location.reload();
  }

  return (
    <div className="mt-5 space-y-3">
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
        placeholder="수량"
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => trade("buy")}
          disabled={loading}
          className="rounded-xl bg-red-500 px-4 py-3 font-black text-white hover:bg-red-400 disabled:opacity-50"
        >
          매수
        </button>

        <button
          onClick={() => trade("sell")}
          disabled={loading}
          className="rounded-xl bg-blue-500 px-4 py-3 font-black text-white hover:bg-blue-400 disabled:opacity-50"
        >
          매도
        </button>
      </div>
    </div>
  );
}