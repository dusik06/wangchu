"use client";

import { useEffect, useRef, useState } from "react";

type SongItem = {
  id: number;
  nickname: string;
  title: string;
  audio_url: string;
};

export default function SongOverlayPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<SongItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function fetchNextSong() {
    if (isPlaying) return;

    try {
      const res = await fetch("/api/overlay/song-next", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.item) return;

      setCurrent(data.item);
      setIsPlaying(true);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = data.item.audio_url;
          audioRef.current.volume = 1;
          audioRef.current.play().catch((error) => {
            console.error("audio play error", error);
          });
        }
      }, 300);
    } catch (error) {
      console.error(error);
    }
  }

  async function completeSong(id: number) {
    try {
      await fetch("/api/overlay/song-done", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setCurrent(null);
      setIsPlaying(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      fetchNextSong();
    }, 2000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <main className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center">
      {current && (
        <div className="rounded-3xl bg-black/75 border border-white/20 px-10 py-8 text-center text-white shadow-2xl">
          <div className="text-2xl font-bold text-yellow-300 mb-3">
            🎵 노래재생권 사용!
          </div>

          <div className="text-xl font-bold mb-2">
            {current.nickname}님이 노래를 재생했습니다
          </div>

          <div className="text-lg text-zinc-200">
            {current.title}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => {
          if (current) {
            completeSong(current.id);
          }
        }}
      />
    </main>
  );
}