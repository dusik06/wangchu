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
    if (start + 3 >= shorts.length) {
      setStart(0);
      return;
    }

    setStart((value) => value + 1);
  }

  return (
    <div className="rounded-[28px] border border-[#3b321f] bg-[#0d1018] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-black text-[#f7d36b]">최근 쇼츠</h3>

        <div className="flex gap-2">
          <button
            onClick={prev}
            className="h-9 w-9 rounded-full border border-[#4b3d24] text-[#f7d36b]"
          >
            ‹
          </button>

          <button
            onClick={next}
            className="h-9 w-9 rounded-full border border-[#4b3d24] text-[#f7d36b]"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {visible.map((item) => (
          <a
            key={item.videoId}
            href={`https://www.youtube.com/watch?v=${item.videoId}`}
            target="_blank"
            className="overflow-hidden rounded-2xl border border-[#2c2f3a] bg-[#151925]"
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              className="aspect-[9/16] w-full object-cover"
            />

            <p className="line-clamp-2 px-3 py-3 text-sm font-bold text-zinc-200">
              {item.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}