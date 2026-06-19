"use client";

import { useState } from "react";

export default function ShopItemCreateForm() {
  const [itemType, setItemType] = useState<"normal" | "signature">("normal");
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [itemAudio, setItemAudio] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [loading, setLoading] = useState(false);

  async function createItem() {
    if (!itemName.trim()) {
      alert("아이템 이름을 입력해주세요.");
      return;
    }

    if (!price || Number(price) < 0) {
      alert("도토리 가격을 입력해주세요.");
      return;
    }

    if (itemType === "signature") {
      if (!itemImage.trim()) {
        alert("시그아이템은 이미지 URL이 필요합니다.");
        return;
      }

      if (!itemAudio.trim()) {
        alert("시그아이템은 노래 URL이 필요합니다.");
        return;
      }
    }

    setLoading(true);

    const res = await fetch("/api/admin/shop/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemType,
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
      alert(data.error || "아이템 생성 실패");
      return;
    }

    alert("아이템이 생성되었습니다.");
    location.reload();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
      <h2 className="mb-5 text-xl font-bold">새 아이템 등록</h2>

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setItemType("normal")}
          className={`rounded-2xl border px-5 py-4 text-left font-black ${
            itemType === "normal"
              ? "border-cyan-300 bg-cyan-500 text-slate-950"
              : "border-white/10 bg-slate-800 text-white"
          }`}
        >
          일반아이템
        </button>

        <button
          type="button"
          onClick={() => setItemType("signature")}
          className={`rounded-2xl border px-5 py-4 text-left font-black ${
            itemType === "signature"
              ? "border-pink-300 bg-pink-500 text-white"
              : "border-white/10 bg-slate-800 text-white"
          }`}
        >
          시그아이템
        </button>
      </div>

      <div className="grid gap-4">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="아이템 이름"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
        />

        <input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="가격 / 도토리"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
        />

        <div>
          <textarea
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="{nickname}님이 노래를 신청했습니다!"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white min-h-[120px]"
          />

          <div className="mt-2 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
            <p className="font-bold text-yellow-300 mb-2">사용 예시</p>
            <p>{`{nickname}님이 노래를 신청했습니다!`}</p>
            <p>{`{nickname}님의 시그 발동!`}</p>
            <p>{`{nickname}님이 폭죽을 터뜨렸습니다!`}</p>
            <p className="mt-2 text-xs text-slate-400">
              ※ {"{nickname}"} 은 실제 사용자의 닉네임으로 자동 변경됩니다.
            </p>
          </div>
        </div>

        {itemType === "signature" && (
          <>
            <input
              value={itemImage}
              onChange={(e) => setItemImage(e.target.value)}
              placeholder="이미지 URL"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            />

            <input
              value={itemAudio}
              onChange={(e) => setItemAudio(e.target.value)}
              placeholder="노래 URL"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
            />
          </>
        )}

        <button
          onClick={createItem}
          disabled={loading}
          className="rounded-xl bg-cyan-500 px-5 py-4 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "생성 중..." : "아이템 생성"}
        </button>
      </div>
    </section>
  );
}