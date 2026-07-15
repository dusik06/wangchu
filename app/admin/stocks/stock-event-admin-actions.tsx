"use client";

import { useState } from "react";

export default function StockEventAdminActions({
  eventId,
  eventTitle,
  currentlyActive,
}: {
  eventId: number;
  eventTitle: string;
  currentlyActive: boolean;
}) {
  const [loading, setLoading] = useState<"end" | "delete" | null>(null);

  async function run(url: string, type: "end" | "delete") {
    if (loading) return;

    const text =
      type === "end"
        ? `${eventTitle} 이벤트를 지금 종료할까요?`
        : `${eventTitle} 이벤트 기록을 완전히 삭제할까요?`;

    if (!confirm(text)) return;

    setLoading(type);

    try {
      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: "서버 응답을 읽을 수 없습니다.",
      }));

      alert(data.message || "요청이 처리되었습니다.");

      if (response.ok && data.success) {
        window.location.reload();
      }
    } catch {
      alert("요청 처리 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => run("/api/admin/stocks/event/end", "end")}
        disabled={loading !== null || !currentlyActive}
        className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white disabled:opacity-30"
      >
        {loading === "end" ? "종료 중..." : "즉시 종료"}
      </button>

      <button
        type="button"
        onClick={() => run("/api/admin/stocks/event/delete", "delete")}
        disabled={loading !== null}
        className="rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
      >
        {loading === "delete" ? "삭제 중..." : "기록 삭제"}
      </button>
    </div>
  );
}
