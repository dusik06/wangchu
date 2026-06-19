"use client";

import { useState } from "react";

export default function ShopItemEditForm({
  item,
}: {
  item: {
    id: number;
    item_name: string;
    item_type: string;
    price: number;
    item_image: string | null;
    item_audio: string | null;
    overlay_text?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState(item.item_name || "");
  const [price, setPrice] = useState(String(item.price || 0));
  const [itemImage, setItemImage] = useState(item.item_image || "");
  const [itemAudio, setItemAudio] = useState(item.item_audio || "");
  const [overlayText, setOverlayText] = useState(item.overlay_text || "");
  const [loading, setLoading] = useState(false);

  async function updateItem() {
    if (!itemName.trim()) {
      alert("아이템 이름을 입력해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/shop/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId: item.id,
        itemName,
        price: Number(price),
        itemImage,
        itemAudio,
        overlayText,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "수정 실패");
      return;
    }

    alert("아이템 수정 완료");
    location.reload();
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-blue-500 px-4 py-3 font-black text-white hover:bg-blue-400"
        >
          수정하기
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            placeholder="아이템 이름"
          />

          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            placeholder="가격"
          />

          <input
            value={itemImage}
            onChange={(e) => setItemImage(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            placeholder="이미지 URL"
          />

          <input
            value={itemAudio}
            onChange={(e) => setItemAudio(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            placeholder="노래 URL"
          />

          <textarea
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            className="min-h-[100px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            placeholder="{nickname}님이 아이템을 사용했습니다!"
          />

          <p className="text-xs text-slate-400">
            {"{nickname}"} 은 실제 사용자의 닉네임으로 자동 변경됩니다.
          </p>

          <div className="flex gap-2">
            <button
              onClick={updateItem}
              disabled={loading}
              className="flex-1 rounded-xl bg-blue-500 px-4 py-3 font-black text-white hover:bg-blue-400 disabled:opacity-50"
            >
              {loading ? "수정 중..." : "저장"}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl bg-slate-700 px-4 py-3 font-black text-white hover:bg-slate-600"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}