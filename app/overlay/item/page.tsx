"use client";

import { useEffect, useRef, useState } from "react";

type AlertItem = {
  id: number;
  nickname: string;
  item_name: string;
  item_image: string | null;
  item_audio: string | null;
  message: string;
};

export default function ItemOverlayPage() {
  const [current, setCurrent] = useState<AlertItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  async function markDone(id: number) {
    await fetch("/api/overlay/item-done", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    setCurrent(null);
    setIsPlaying(false);
  }

  async function finishAfterDelay(id: number) {
    setTimeout(() => {
      markDone(id);
    }, 3000);
  }

  async function fetchNext() {
    if (isPlaying) return;

    try {
      const res = await fetch("/api/overlay/item-next", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.item) return;

      setCurrent(data.item);
      setIsPlaying(true);

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }

      if (data.item.item_audio && audioRef.current) {
        audioRef.current.src = data.item.item_audio;
        audioRef.current.volume = 1;

        audioRef.current.play().catch(() => {
          fallbackTimerRef.current = setTimeout(() => {
            finishAfterDelay(data.item.id);
          }, 10000);
        });
      } else {
        fallbackTimerRef.current = setTimeout(() => {
          finishAfterDelay(data.item.id);
        }, 10000);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    const timer = setInterval(fetchNext, 2000);

    return () => {
      clearInterval(timer);

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <main className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center pointer-events-none">
      {current && (
        <div className="flex flex-col items-center justify-center">
          {current.item_image && (
            <img
              src={current.item_image}
              alt={current.item_name}
              className="w-[280px] object-contain mb-4"
            />
          )}

          <div
            className="text-4xl font-black text-white text-center"
            style={{
              WebkitTextStroke: "3px black",
            }}
          >
            <span className="text-pink-400">{current.nickname}</span>
            님이 홈페이지에서 도토리를 사용했습니다!
          </div>

          <div
            className="mt-4 text-3xl font-black text-white text-center max-w-[900px]"
            style={{
              WebkitTextStroke: "2px black",
            }}
          >
            {current.message}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => {
          if (current) {
            finishAfterDelay(current.id);
          }
        }}
      />
    </main>
  );
}