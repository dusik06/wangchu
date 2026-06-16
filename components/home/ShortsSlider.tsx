"use client";

import { useMemo, useState } from "react";

type ShortVideo = {
  videoId: string;
  title: string;
  thumbnail?: string;
};

export default function ShortsSlider({ videos }: { videos: ShortVideo[] }) {
  const shorts = useMemo(() => videos.slice(0, 10), [videos]);
  const [start, setStart] = useState(0);

  const visible = shorts.slice(start, start + 3);

  function prev() {
    setStart((value) => Math.max(0, value - 1));
  }

  function next() {
    setStart((value) => Math.min(Math.max(shorts.length - 3, 0), value + 1));
  }

  if (shorts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-5 text-sm text-zinc-400">
        최근 쇼츠를 불러오는 중입니다.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-black text-[#f7d36b]">최근 쇼츠</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={start === 0}
            className="h-8 w-8 rounded-full border border-[#4b3d24] bg-[#151925] text-[#f7d36b] disabled:opacity-30"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={next}
            disabled={start + 3 >= shorts.length}
            className="h-8 w-8 rounded-full border border-[#4b3d24] bg-[#151925] text-[#f7d36b] disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {visible.map((item) => (
          <a
            key={item.videoId}
            href={`https://www.youtube.com/watch?v=${item.videoId}`}
            target="_blank"
            className="group overflow-hidden rounded-2xl border border-[#2c2f3a] bg-[#151925]"
          >
            <div className="aspect-[9/16] bg-black">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl">
                  ▶
                </div>
              )}
            </div>

            <p className="line-clamp-2 min-h-[42px] px-3 py-2 text-xs font-bold text-zinc-200">
              {item.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}