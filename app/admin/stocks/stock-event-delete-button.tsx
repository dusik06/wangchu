"use client";

import { useState } from "react";

export default function StockEventDeleteButton({
  eventId,
}: {
  eventId: number;
}) {
  const [loading, setLoading] = useState(false);

  async function deleteEvent() {
    if (loading) {
      return;
    }

    const confirmed = confirm(
      "이 주식 이벤트를 삭제할까요?"
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/stocks/event-delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
          }),
        }
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = {
          success: false,
          message:
            "서버 응답을 읽을 수 없습니다.",
        };
      }

      if (!response.ok || !data?.success) {
        alert(
          data?.message ||
            "이벤트 삭제에 실패했습니다."
        );
        return;
      }

      alert(
        data.message ||
          "이벤트가 삭제되었습니다."
      );

      window.location.reload();
    } catch {
      alert(
        "이벤트 삭제 중 네트워크 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deleteEvent}
      disabled={loading}
      className="mt-4 w-full rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading
        ? "이벤트 삭제 중..."
        : "이벤트 삭제"}
    </button>
  );
}