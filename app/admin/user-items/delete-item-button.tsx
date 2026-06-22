"use client";

import { useState } from "react";

export default function DeleteItemButton({
  inventoryId,
  itemName,
}: {
  inventoryId: number;
  itemName: string;
}) {
  const [loading, setLoading] = useState(false);

  async function deleteItem() {
    if (loading) return;

    const ok = confirm(`${itemName} 아이템을 삭제할까요?`);
    if (!ok) return;

    setLoading(true);

    const res = await fetch("/api/admin/user-item-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inventoryId }),
    });

    const data = await res.json();

    alert(data.message || "처리되었습니다.");

    if (data.success) {
      location.reload();
    }

    setLoading(false);
  }

  return (
    <button
      onClick={deleteItem}
      disabled={loading}
      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500 disabled:opacity-50"
    >
      {loading ? "삭제 중..." : "삭제"}
    </button>
  );
}