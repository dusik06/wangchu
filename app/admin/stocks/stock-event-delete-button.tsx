"use client";

export default function StockEventDeleteButton({
  eventId,
}: {
  eventId: number;
}) {
  async function deleteEvent() {
    if (!confirm("이 뉴스 이벤트를 삭제할까요?")) return;

    const res = await fetch("/api/admin/stocks/events/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId }),
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
    <button
      onClick={deleteEvent}
      className="mt-3 rounded-lg bg-red-500 px-3 py-2 text-sm font-black text-white hover:bg-red-400"
    >
      이벤트 삭제
    </button>
  );
}