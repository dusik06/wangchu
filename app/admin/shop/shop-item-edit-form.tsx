"use client";

import { useState } from "react";

type MediaType = "image" | "video";

export default function ShopItemEditForm({
  item,
}: {
  item: {
    id: number;
    item_name: string;
    item_type: string;
    price: number;
    media_type?: MediaType | null;
    item_image: string | null;
    item_audio: string | null;
    item_video?: string | null;
    overlay_text?: string | null;
  };
}) {
  const initialMediaType: MediaType =
    item.media_type === "video" || item.item_video ? "video" : "image";

  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState(item.item_name || "");
  const [price, setPrice] = useState(String(item.price || 0));
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType);
  const [itemImage, setItemImage] = useState(item.item_image || "");
  const [itemAudio, setItemAudio] = useState(item.item_audio || "");
  const [itemVideo, setItemVideo] = useState(item.item_video || "");
  const [overlayText, setOverlayText] = useState(item.overlay_text || "");
  const [loading, setLoading] = useState(false);

  async function updateItem() {
    if (!itemName.trim()) {
      alert("아이템 이름을 입력해주세요.");
      return;
    }

    if (item.item_type === "signature") {
      if (mediaType === "image" && (!itemImage.trim() || !itemAudio.trim())) {
        alert("이미지형 시그는 이미지 URL과 노래 URL이 필요합니다.");
        return;
      }

      if (mediaType === "video" && !itemVideo.trim()) {
        alert("영상 URL을 입력해주세요.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/shop/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: item.id,
          itemName,
          price: Number(price),
          mediaType,
          itemImage: mediaType === "image" ? itemImage : "",
          itemAudio: mediaType === "image" ? itemAudio : "",
          itemVideo: mediaType === "video" ? itemVideo : "",
          overlayText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "수정 실패");
        return;
      }

      alert("아이템 수정 완료");
      location.reload();
    } finally {
      setLoading(false);
    }
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

          {item.item_type === "signature" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={`rounded-xl border px-3 py-3 font-black ${
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
                  className={`rounded-xl border px-3 py-3 font-black ${
                    mediaType === "video"
                      ? "border-violet-300 bg-violet-500 text-white"
                      : "border-white/10 bg-slate-800 text-white"
                  }`}
                >
                  영상
                </button>
              </div>

              {mediaType === "image" ? (
                <>
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
                </>
              ) : (
                <input
                  value={itemVideo}
                  onChange={(e) => setItemVideo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white"
                  placeholder="영상 URL (MP4 권장)"
                />
              )}
            </>
          )}

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
