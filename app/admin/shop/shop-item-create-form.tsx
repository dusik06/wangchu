"use client";

import { useState } from "react";

type MediaType = "image" | "video";

export default function ShopItemCreateForm() {
  const [itemType, setItemType] = useState<"normal" | "signature">("normal");
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [itemImage, setItemImage] = useState("");
  const [itemAudio, setItemAudio] = useState("");
  const [itemVideo, setItemVideo] = useState("");
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
      if (mediaType === "image") {
        if (!itemImage.trim()) {
          alert("이미지 URL을 입력해주세요.");
          return;
        }

        if (!itemAudio.trim()) {
          alert("노래 URL을 입력해주세요.");
          return;
        }
      }

      if (mediaType === "video" && !itemVideo.trim()) {
        alert("영상 URL을 입력해주세요.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/shop/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType,
          itemName,
          price: Number(price),
          mediaType: itemType === "signature" ? mediaType : "image",
          itemImage:
            itemType === "signature" && mediaType === "image" ? itemImage : "",
          itemAudio:
            itemType === "signature" && mediaType === "image" ? itemAudio : "",
          itemVideo:
            itemType === "signature" && mediaType === "video" ? itemVideo : "",
          overlayText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "아이템 생성 실패");
        return;
      }

      alert("아이템이 생성되었습니다.");
      location.reload();
    } finally {
      setLoading(false);
    }
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
            placeholder="{nickname}님이 아이템을 사용했습니다!"
            className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
          />

          <div className="mt-2 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
            <p className="mb-2 font-bold text-yellow-300">사용 예시</p>
            <p>{`{nickname}님이 노래를 신청했습니다!`}</p>
            <p>{`{nickname}님의 시그 발동!`}</p>
            <p>{`{nickname}님이 영상을 재생했습니다!`}</p>
            <p className="mt-2 text-xs text-slate-400">
              ※ {"{nickname}"} 은 실제 사용자의 닉네임으로 자동 변경됩니다.
            </p>
          </div>
        </div>

        {itemType === "signature" && (
          <>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">재생 방식</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={`rounded-xl border px-4 py-3 font-black ${
                    mediaType === "image"
                      ? "border-cyan-300 bg-cyan-500 text-slate-950"
                      : "border-white/10 bg-slate-800 text-white"
                  }`}
                >
                  이미지 + 노래
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={`rounded-xl border px-4 py-3 font-black ${
                    mediaType === "video"
                      ? "border-violet-300 bg-violet-500 text-white"
                      : "border-white/10 bg-slate-800 text-white"
                  }`}
                >
                  영상
                </button>
              </div>
            </div>

            {mediaType === "image" ? (
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
            ) : (
              <div>
                <input
                  value={itemVideo}
                  onChange={(e) => setItemVideo(e.target.value)}
                  placeholder="영상 URL (MP4 권장)"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                />
                <p className="mt-2 text-xs text-slate-400">
                  영상 파일 안에 들어 있는 노래와 효과음이 함께 재생됩니다. 노래 URL은 필요 없습니다.
                </p>
              </div>
            )}
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
