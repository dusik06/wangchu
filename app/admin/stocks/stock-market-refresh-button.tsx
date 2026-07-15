"use client";

import { useState } from "react";

export default function StockMarketRefreshButton() {
  const [loading, setLoading] = useState(false);

  async function refreshMarket() {
    if (loading) return;
    if (!confirm("시장 가격을 지금 즉시 갱신할까요?")) return;

    setLoading(true);

    try {
      const response = await fetch("/api/stock/refresh", {
        method: "POST",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: "서버 응답을 읽을 수 없습니다.",
      }));

      alert(data.message || "시장 갱신 요청이 처리되었습니다.");

      if (response.ok && data.success) {
        window.location.reload();
      }
    } catch {
      alert("시장 갱신 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={refreshMarket}
      disabled={loading}
      className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-black text-black transition hover:bg-emerald-300 disabled:opacity-50"
    >
      {loading ? "시장 갱신 중..." : "시장 가격 즉시 갱신"}
    </button>
  );
}
