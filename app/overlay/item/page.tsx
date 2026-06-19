"use client";

import { useEffect, useRef, useState } from "react";

type AlertItem = {
  id: number;
  nickname: string;
  item_name: string;
  item_image: string | null;
  item_audio: string | null;
  overlay_text: string | null;
  message: string;
};

export default function ItemOverlayPage() {
  const [current, setCurrent] = useState<AlertItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentIdRef = useRef<number | null>(null);

  const outlineStyle = {
    WebkitTextStroke: "5px #000000",
    paintOrder: "stroke fill",
  } as React.CSSProperties;

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function getOverlayText(item: AlertItem) {
    if (item.overlay_text && item.overlay_text.trim()) {
      return item.overlay_text.replace(/\{nickname\}/g, item.nickname);
    }

    return `${item.nickname}님이 ${item.item_name} 아이템을 사용했습니다!`;
  }

  function renderColoredText(text: string) {
    const nickname = current?.nickname || "";

    const regex = new RegExp(
      `(${nickname})|(도토리\\s*[0-9,]+개)`,
      "g"
    );

    const parts = text.split(regex).filter(Boolean);

    return parts.map((part, index) => {
      if (part === nickname) {
        return (
          <span
            key={index}
            style={{
              color: "#8dff8d",
              ...outlineStyle,
            }}
          >
            {part}
          </span>
        );
      }

      if (/도토리\s*[0-9,]+개/.test(part)) {
        return (
          <span
            key={index}
            style={{
              color: "#ff2d2d",
              ...outlineStyle,
            }}
          >
            {part}
          </span>
        );
      }

      return (
        <span
          key={index}
          style={{
            color: "#ffffff",
            ...outlineStyle,
          }}
        >
          {part}
        </span>
      );
    });
  }

  async function markDone(id: number) {
    clearTimer();

    try {
      await fetch("/api/overlay/item-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        audio.src = "";
        audio.currentTime = 0;
        audio.volume = 0.2;
        audio.muted = false;
        audio.loop = false;

        setTimeout(() => {
          if (!audioRef.current) return;

          audioRef.current.src = nextItem.item_audio || "";
          audioRef.current.load();

          audioRef.current.play().catch((error) => {
            console.error("오디오 재생 실패:", error);
          });
        }, 300);
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
        <div
          className="flex flex-col items-center justify-center px-14 py-10"
          style={{
            fontFamily:
              "'Jua', 'BM JUA', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
          }}
        >
          {current.item_image && (
            <img
              src={current.item_image}
              alt={current.item_name}
              className="w-[300px] max-h-[300px] object-contain mb-6 rounded-2xl"
            />
          )}

          <div
            className="max-w-[1600px] whitespace-nowrap text-[58px] font-black text-center leading-[1.2]"
            style={{
              fontWeight: 1000,
            }}
          >
            {renderColoredText(getOverlayText(current))}
          </div>

          <div
            className="mt-5 text-[36px] font-black text-center max-w-[1400px] leading-[1.25]"
            style={{
              color: "#ffffff",
              fontWeight: 1000,
              WebkitTextStroke: "4px #000000",
              paintOrder: "stroke fill",
            }}
          >
            {current.message}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="auto"
        onEnded={() => {
          if (!currentIdRef.current) return;
          finish(currentIdRef.current);
        }}
      />
    </main>
  );
}