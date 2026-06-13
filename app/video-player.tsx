"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export default function VideoPlayer({
  videos,
}: {
  videos: { videoId: string; title: string }[];
}) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!videos.length) return;

    function createPlayer() {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videos[currentIndex].videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          playsinline: 1,
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              setCurrentIndex((prev) =>
                prev + 1 >= videos.length ? 0 : prev + 1
              );
            }
          },
        },
      });
    }

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      window.onYouTubeIframeAPIReady = createPlayer;
    } else {
      createPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (playerRef.current && videos[currentIndex]) {
      playerRef.current.loadVideoById(videos[currentIndex].videoId);
    }
  }, [currentIndex, videos]);

  if (!videos.length) {
    return (
      <div className="bg-black rounded-2xl overflow-hidden aspect-[9/16] flex items-center justify-center">
        영상 없음
      </div>
    );
  }

  return (
    <div className="bg-black rounded-2xl overflow-hidden aspect-[9/16]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}