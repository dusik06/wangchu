"use client";

import { useState } from "react";

export default function ShopItemCreateForm() {
  const [itemType, setItemType] = useState<"normal" | "signature">("normal");
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [itemAudio, setItemAudio] = useState("");
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
          1번 일반아이템
          <p className="mt-1 text-sm font-normal opacity-80">
            이름과 도토리 가격만 등록
          </p>
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
          2번 시그아이템
          <p className="mt-1 text-sm font-normal opacity-80">
            이미지 URL + 노래 URL 필수
          </p>
        </button>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-300">
            아이템 이름
          </label>
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="예: 노래재생권"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-300">
            가격 / 도토리
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="예: 100"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
          />
        </div>

        {itemType === "signature" && (
          <>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                이미지 URL
              </label>
              <input
                value={itemImage}
                onChange={(e) => setItemImage(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                노래 URL
              </label>
              <input
                value={itemAudio}
                onChange={(e) => setItemAudio(e.target.value)}
                placeholder="https://...mp3"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              />
            </div>
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