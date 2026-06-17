"use client";

import { useEffect, useRef, useState } from "react";

type Video = {
  videoId: string;
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export default function VideoPlayer({ videos }: { videos: Video[] }) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };
  }, []);

  useEffect(() => {
    if (!apiReady || !containerRef.current || !videos || videos.length === 0) {
      return;
    }

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: videos[currentIndex].videoId,
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          event.target.mute();
          event.target.playVideo();
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            setCurrentIndex((prev) => {
              const next = prev + 1;
              return next >= videos.length ? 0 : next;
            });
          }
        },
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [apiReady, currentIndex, videos]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [videos]);

  if (!videos || videos.length === 0) {
    return (
      <div className="flex h-full min-h-[540px] items-center justify-center rounded-[28px] bg-black text-zinc-400">
        영상 없음
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] bg-black">
      <div className="h-[540px] w-full scale-[1.15]">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}