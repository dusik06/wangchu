"use client";

import { useState } from "react";

export default function InventoryUseButton({
  inventoryId,
  itemName,
  itemCount,
}: {
  inventoryId: number;
  itemName: string;
  itemCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function useItem() {
    if (!message.trim()) {
      alert("메세지를 적어주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/items/use-alert-item", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inventoryId,
        message,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      alert(data.error || "아이템 사용 실패");
      return;
    }

    alert("아이템을 사용했습니다.");
    location.reload();
  }

  if (itemCount <= 0) {
    return null;
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 font-bold"
        >
          사용하기
        </button>
      ) : (
        <div className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={80}
            placeholder="메세지를 적어주세요"
            className="w-full h-24 rounded-xl bg-black/40 border border-white/10 p-3 text-white outline-none"
          />

          <div className="flex gap-2">
            <button
              onClick={useItem}
              disabled={loading}
              className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 font-bold disabled:opacity-50"
            >
              {loading ? "사용 중..." : "전송"}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl bg-zinc-700 hover:bg-zinc-600 px-4 py-3 font-bold"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}