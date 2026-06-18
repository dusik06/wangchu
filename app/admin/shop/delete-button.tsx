"use client";

import { useState } from "react";

export default function DeleteButton({
  itemId,
  itemName,
}: {
  itemId: number;
  itemName: string;
}) {
  const [loading, setLoading] = useState(false);

  async function removeItem() {
    if (!confirm(`${itemName} 아이템을 삭제할까요?`)) {
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/shop/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "삭제 실패");
      return;
    }

    alert("아이템 삭제 완료");
    location.reload();
  }

  return (
    <button
      onClick={removeItem}
      disabled={loading}
      className="mt-4 w-full rounded-xl bg-red-500 px-4 py-3 font-black text-white hover:bg-red-400 disabled:opacity-50"
    >
      {loading ? "삭제 중..." : "아이템 삭제"}
    </button>
  );
}