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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentIdRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function markDone(id: number) {
    clearTimer();

    try {
      await fetch("/api/overlay/item-done", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error(error);
    }

    currentIdRef.current = null;
    setCurrent(null);
    setIsPlaying(false);
  }

  function finish(id: number) {
    clearTimer();

    timerRef.current = setTimeout(() => {
      markDone(id);
    }, 3000);
  }

  async function fetchNext() {
    if (isPlaying || currentIdRef.current) return;

    try {
      const res = await fetch("/api/overlay/item-next", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.item) return;

      const nextItem: AlertItem = data.item;

      setCurrent(nextItem);
      setIsPlaying(true);
      currentIdRef.current = nextItem.id;
      clearTimer();

      if (nextItem.item_audio && audioRef.current) {
        const audio = audioRef.current;

        audio.pause();
        audio.currentTime = 0;
        audio.src = nextItem.item_audio;
        audio.volume = 1;
        audio.loop = false;

        audio.play().catch((error) => {
          console.error("오디오 재생 promise 실패. OBS에서는 실제로 재생될 수 있음:", error);
        });
      } else {
        timerRef.current = setTimeout(() => {
          markDone(nextItem.id);
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
      clearTimer();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [isPlaying]);

  return (
    <main className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center pointer-events-none">
      {current && (
        <div className="flex flex-col items-center justify-center px-14 py-10">
          {current.item_image && (
            <img
              src={current.item_image}
              alt={current.item_name}
              className="w-[400px] max-h-[400px] object-contain mb-8 rounded-2xl"
            />
          )}

          <div
            className="text-[82px] font-black text-center leading-[1.08]"
            style={{
              color: "white",
              fontWeight: 1000,
              WebkitTextStroke: "4px black",
              textShadow:
                "5px 5px 0 #000, -5px 5px 0 #000, 5px -5px 0 #000, -5px -5px 0 #000",
            }}
          >
            <span
              style={{
                color: "#39ff14",
                fontWeight: 1000,
                WebkitTextStroke: "4px black",
                textShadow:
                  "5px 5px 0 #000, -5px 5px 0 #000, 5px -5px 0 #000, -5px -5px 0 #000",
              }}
            >
              {current.nickname}
            </span>
            님이
            <br />
            홈페이지에서 도토리를 사용했습니다!
          </div>

          <div
            className="mt-8 text-[72px] font-black text-center max-w-[1300px] leading-[1.08]"
            style={{
              color: "#ffffff",
              fontWeight: 1000,
              WebkitTextStroke: "3px black",
              textShadow:
                "4px 4px 0 #000, -4px 4px 0 #000, 4px -4px 0 #000, -4px -4px 0 #000",
            }}
          >
            {current.message}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => {
          const audio = audioRef.current;

          if (!audio || !currentIdRef.current) return;

          const duration = Number(audio.duration) || 0;
          const currentTime = Number(audio.currentTime) || 0;

          if (duration > 0 && currentTime + 1 < duration) {
            return;
          }

          finish(currentIdRef.current);
        }}
      />
    </main>
  );
}