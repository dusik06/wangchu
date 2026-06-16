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
  const currentIdRef = useRef<number | null>(null);

  function clearFallbackTimer() {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  async function markDone(id: number) {
    clearFallbackTimer();

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

  function finishAfterAudioEnd(id: number) {
    clearFallbackTimer();

    fallbackTimerRef.current = setTimeout(() => {
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
      clearFallbackTimer();

      if (nextItem.item_audio && audioRef.current) {
        const audio = audioRef.current;

        audio.pause();
        audio.currentTime = 0;
        audio.src = nextItem.item_audio;
        audio.volume = 1;

        try {
          await audio.play();

          // 노래가 정상 재생되면 화면은 절대 시간으로 먼저 끄지 않음.
          // 오직 audio onEnded에서만 종료 처리.
        } catch (error) {
          console.error("오디오 재생 실패:", error);

          // 진짜로 오디오 재생이 실패했을 때만 기본 15초 표시 후 종료.
          fallbackTimerRef.current = setTimeout(() => {
            markDone(nextItem.id);
          }, 15000);
        }
      } else {
        // 노래 없는 아이템은 10초 표시.
        fallbackTimerRef.current = setTimeout(() => {
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
      clearFallbackTimer();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
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
            className="text-4xl font-black text-center"
            style={{
              color: "white",
              WebkitTextStroke: "3px black",
              textShadow:
                "3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
            }}
          >
            <span
              style={{
                color: "#ff4fd8",
                WebkitTextStroke: "3px black",
                textShadow:
                  "3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
              }}
            >
              {current.nickname}
            </span>
            님이 홈페이지에서 도토리를 사용했습니다!
          </div>

          <div
            className="mt-4 text-3xl font-black text-center max-w-[900px]"
            style={{
              color: "white",
              WebkitTextStroke: "2px black",
              textShadow:
                "2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000",
            }}
          >
            {current.message}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => {
          if (currentIdRef.current) {
            finishAfterAudioEnd(currentIdRef.current);
          }
        }}
        onError={() => {
          if (currentIdRef.current) {
            fallbackTimerRef.current = setTimeout(() => {
              if (currentIdRef.current) {
                markDone(currentIdRef.current);
              }
            }, 15000);
          }
        }}
      />
    </main>
  );
}