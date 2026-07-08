"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Mission = {
  id: number;
  title: string;
  image_url: string | null;
  goal_dotori: number;
  current_dotori: number;
};

type OverlayQueueItem = {
  id: number;
  type: "item" | "mission";
  alert_type?: "support" | "complete" | null;
  nickname: string;
  title: string;
  item_image: string | null;
  item_audio: string | null;
  overlay_text: string | null;
  message: string;
  dotori_amount?: number;
};

type EngineResponse = {
  success: boolean;
  command:
    | "play"
    | "playing"
    | "observe"
    | "none"
    | "skip"
    | "refresh"
    | "replay"
    | "locked"
    | "error"
    | "missing-client";
  item: OverlayQueueItem | null;
  mission: Mission | null;
  isOwner?: boolean;
};

export default function Page() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [currentItem, setCurrentItem] = useState<OverlayQueueItem | null>(null);
  const [visible, setVisible] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clientIdRef = useRef("");
  const isOwnerRef = useRef(false);
  const currentItemRef = useRef<OverlayQueueItem | null>(null);
  const playingKeyRef = useRef<string | null>(null);
  const doneKeyRef = useRef<string | null>(null);
  const engineBusyRef = useRef(false);
  const mountedRef = useRef(false);

  const outlineStyle: CSSProperties = {
    WebkitTextStroke: "9px #000000",
    paintOrder: "stroke fill",
  };

  function makeClientId() {
    if (typeof window === "undefined") return "";

    const saved = window.localStorage.getItem("wangchu_overlay_engine_client_id");

    if (saved) return saved;

    const next = `engine-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 12)}`;

    window.localStorage.setItem("wangchu_overlay_engine_client_id", next);

    return next;
  }

  function getItemKey(item: OverlayQueueItem) {
    return `${item.type}-${item.id}`;
  }

  function clearPlayTimer() {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }

  function clearHideTimer() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }

  function stopAudio() {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {}
  }

  function closeStream() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  function clearCurrentItem() {
    clearPlayTimer();
    clearHideTimer();
    stopAudio();

    playingKeyRef.current = null;
    currentItemRef.current = null;
    doneKeyRef.current = null;

    setVisible(false);

    hideTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setCurrentItem(null);
    }, 350);
  }

  async function markDone(item: OverlayQueueItem) {
    const key = getItemKey(item);

    if (doneKeyRef.current === key) return;

    doneKeyRef.current = key;
    clearPlayTimer();

    if (!isOwnerRef.current) {
      clearCurrentItem();
      return;
    }

    try {
      await fetch("/api/overlay/engine-done", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          clientId: clientIdRef.current,
        }),
      });
    } catch (error) {
      console.error(error);
    }

    clearCurrentItem();
  }

  function finishAfterAudio(item: OverlayQueueItem) {
    const key = getItemKey(item);

    if (doneKeyRef.current === key) return;

    clearPlayTimer();

    playTimerRef.current = setTimeout(() => {
      markDone(item);
    }, 1800);
  }

  function playQueueItem(item: OverlayQueueItem, replay: boolean) {
    const key = getItemKey(item);

    if (!replay && playingKeyRef.current === key) return;

    clearPlayTimer();
    clearHideTimer();
    stopAudio();

    playingKeyRef.current = key;
    doneKeyRef.current = null;
    currentItemRef.current = item;

    setCurrentItem(item);

    setTimeout(() => {
      if (!mountedRef.current) return;
      setVisible(true);
    }, 50);

    if (item.type === "mission") {
      playTimerRef.current = setTimeout(() => {
        markDone(item);
      }, item.alert_type === "complete" ? 6500 : 4500);

      return;
    }

    if (item.item_audio && audioRef.current) {
      const audio = audioRef.current;

      audio.volume = 0.6;
      audio.muted = false;
      audio.loop = false;

      setTimeout(() => {
        if (!mountedRef.current || !audioRef.current) return;

        audioRef.current.src = item.item_audio || "";
        audioRef.current.load();

        audioRef.current.play().catch((error) => {
          console.error("오디오 재생 실패:", error);

          playTimerRef.current = setTimeout(() => {
            markDone(item);
          }, 10000);
        });
      }, 250);

      return;
    }

    playTimerRef.current = setTimeout(() => {
      markDone(item);
    }, 10000);
  }

  async function fetchEngine() {
    if (!clientIdRef.current) return;
    if (engineBusyRef.current) return;

    engineBusyRef.current = true;

    try {
      const res = await fetch(
        `/api/overlay/engine?clientId=${encodeURIComponent(
          clientIdRef.current
        )}`,
        { cache: "no-store" }
      );

      const data: EngineResponse = await res.json();

      if (!mountedRef.current) return;
      if (!data.success) return;

      isOwnerRef.current = Boolean(data.isOwner);
      setMission(data.mission || null);

      if (data.command === "refresh") {
        window.location.reload();
        return;
      }

      if (data.command === "skip") {
        clearCurrentItem();
        return;
      }

      if (data.command === "locked") {
        return;
      }

      if (data.command === "none") {
        if (currentItemRef.current) {
          clearCurrentItem();
        }

        return;
      }

      if (data.command === "replay" && data.item) {
        playQueueItem(data.item, true);
        return;
      }

      if (
        (data.command === "play" ||
          data.command === "playing" ||
          data.command === "observe") &&
        data.item
      ) {
        playQueueItem(data.item, false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      engineBusyRef.current = false;
    }
  }

  function startBackupLoop() {
    if (backupTimerRef.current) {
      clearInterval(backupTimerRef.current);
      backupTimerRef.current = null;
    }

    fetchEngine();

    backupTimerRef.current = setInterval(() => {
      fetchEngine();
    }, 8000);
  }

  function startStream() {
    closeStream();
    clearReconnectTimer();

    if (!clientIdRef.current) return;

    try {
      const source = new EventSource(
        `/api/overlay/stream?clientId=${encodeURIComponent(clientIdRef.current)}`
      );

      source.onopen = () => {
        fetchEngine();
      };

      source.onmessage = () => {
        fetchEngine();
      };

      source.onerror = () => {
        closeStream();

        reconnectTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          startStream();
        }, 3000);
      };

      eventSourceRef.current = source;
    } catch (error) {
      console.error(error);
    }
  }

  function getOverlayText(item: OverlayQueueItem) {
    if (item.type === "mission") {
      if (item.alert_type === "complete") {
        return `미션 달성!\n${item.title}\n도토리 목표를 달성했습니다!`;
      }

      return `${item.nickname}님이 미션에 도토리 ${Number(
        item.dotori_amount || 0
      ).toLocaleString()}개를 지원했습니다.`;
    }

    if (item.overlay_text && item.overlay_text.trim()) {
      return item.overlay_text.replace(/\{nickname\}/g, item.nickname);
    }

    return `${item.nickname}님이 ${item.title} 아이템을 사용했습니다!`;
  }

  function splitOverlayLines(text: string) {
    const match = text.match(/^(.*?도토리\s*[0-9,]+개)를?\s*(.*)$/);

    if (!match) {
      return {
        firstLine: text,
        secondLine: "",
      };
    }

    return {
      firstLine: `${match[1]}를`,
      secondLine: match[2] || "사용했습니다.",
    };
  }

  function renderColoredText(text: string) {
    const nickname = currentItem?.nickname || "";
    const safeNickname = nickname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${safeNickname})|(도토리\\s*[0-9,]+개)`, "g");
    const parts = text.split(regex).filter(Boolean);

    return parts.map((part, index) => {
      if (part === nickname) {
        return (
          <span key={index} style={{ color: "#8dff8d", ...outlineStyle }}>
            {part}
          </span>
        );
      }

      if (/도토리\s*[0-9,]+개/.test(part)) {
        return (
          <span key={index} style={{ color: "#ff2d2d", ...outlineStyle }}>
            {part}
          </span>
        );
      }

      return (
        <span key={index} style={{ color: "#ffffff", ...outlineStyle }}>
          {part}
        </span>
      );
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    clientIdRef.current = makeClientId();

    startBackupLoop();
    startStream();

    return () => {
      mountedRef.current = false;

      if (backupTimerRef.current) {
        clearInterval(backupTimerRef.current);
        backupTimerRef.current = null;
      }

      closeStream();
      clearReconnectTimer();
      clearPlayTimer();
      clearHideTimer();
      stopAudio();
    };
  }, []);

  const goal = mission ? Math.max(Number(mission.goal_dotori || 0), 1) : 1;
  const current = mission ? Math.max(Number(mission.current_dotori || 0), 0) : 0;
  const percent = mission ? Math.min(100, (current / goal) * 100) : 0;

  const overlayText = currentItem ? getOverlayText(currentItem) : "";
  const overlayLines = splitOverlayLines(overlayText);

  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: transparent !important;
          overflow: hidden;
        }

        body {
          background-color: transparent !important;
        }

        @keyframes missionPopIn {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.88);
          }
          70% {
            opacity: 1;
            transform: translateY(-6px) scale(1.04);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes missionGlow {
          0%,
          100% {
            filter: drop-shadow(0 0 18px rgba(96, 165, 250, 0.65));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(250, 204, 21, 0.95));
          }
        }
      `}</style>

      <main className="h-screen w-screen overflow-hidden bg-transparent pointer-events-none">
        {currentItem && currentItem.type === "mission" && (
          <div className="flex h-screen w-screen items-center justify-center">
            <div
              className={[
                "rounded-[34px] border border-white/20 bg-black/75 px-16 py-12 text-center backdrop-blur transition-all duration-500",
                visible ? "opacity-100 scale-100" : "opacity-0 scale-90",
              ].join(" ")}
              style={{
                animation: visible
                  ? "missionPopIn 520ms ease-out, missionGlow 1.8s ease-in-out infinite"
                  : undefined,
              }}
            >
              {currentItem.alert_type === "complete" ? (
                <>
                  <div
                    className="mb-5 text-[54px] font-black"
                    style={{
                      color: "#facc15",
                      WebkitTextStroke: "8px #000000",
                      paintOrder: "stroke fill",
                    }}
                  >
                    미션 달성!
                  </div>

                  <div
                    className="mb-5 text-[42px] font-black"
                    style={{
                      color: "#ffffff",
                      WebkitTextStroke: "8px #000000",
                      paintOrder: "stroke fill",
                    }}
                  >
                    {currentItem.title}
                  </div>

                  <div
                    className="text-[42px] font-black"
                    style={{
                      color: "#8dff8d",
                      WebkitTextStroke: "8px #000000",
                      paintOrder: "stroke fill",
                    }}
                  >
                    도토리 목표를 달성했습니다!
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="mb-4 text-[46px] font-black"
                    style={{
                      color: "#ffffff",
                      WebkitTextStroke: "8px #000000",
                      paintOrder: "stroke fill",
                    }}
                  >
                    <span style={{ color: "#8dff8d" }}>
                      {currentItem.nickname}
                    </span>
                    님이
                  </div>

                  <div
                    className="mb-4 text-[42px] font-black"
                    style={{
                      color: "#ffffff",
                      WebkitTextStroke: "8px #000000",
                      paintOrder: "stroke fill",
                    }}
                  >
                    미션에
                  </div>

                  <div
                    className="mb-4 text-[52px] font-black"
                    style={{
                      color: "#ff2d2d",
                      WebkitTextStroke: "8px #000000",
                      paintOrder: "stroke fill",
                    }}
                  >
                    도토리{" "}
                    {Number(currentItem.dotori_amount || 0).toLocaleString()}개를
                  </div>

                  <div
                    className="text-[42px] font-black"
                    style={{
                      color: "#ffffff",
                      WebkitTextStroke: "8px #000000",
                      paintOrder: "stroke fill",
                    }}
                  >
                    지원했습니다.
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {currentItem && currentItem.type === "item" && (
          <div
            className={[
              "flex h-screen w-screen items-center justify-center bg-transparent transition-all duration-500",
              visible ? "opacity-100 scale-100" : "opacity-0 scale-90",
            ].join(" ")}
            style={{
              fontFamily:
                "'Jua', 'BM JUA', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
            }}
          >
            <div className="flex flex-col items-center justify-center px-14 py-10">
              {currentItem.item_image && (
                <img
                  src={currentItem.item_image}
                  alt={currentItem.title}
                  loading="eager"
                  decoding="async"
                  className="mb-6 max-h-[300px] w-[300px] rounded-2xl object-contain"
                />
              )}

              <div
                className="text-center text-[54px] font-black leading-[1.25]"
                style={{ fontWeight: 1000 }}
              >
                <div>{renderColoredText(overlayLines.firstLine)}</div>
                <div>{renderColoredText(overlayLines.secondLine)}</div>
              </div>

              {currentItem.message && (
                <div
                  className="mt-5 max-w-[1400px] text-center text-[36px] font-black leading-[1.25]"
                  style={{
                    color: "#ffffff",
                    fontWeight: 1000,
                    WebkitTextStroke: "8px #000000",
                    paintOrder: "stroke fill",
                  }}
                >
                  {currentItem.message}
                </div>
              )}
            </div>
          </div>
        )}

{!currentItem && mission && (
  <div className="absolute top-10 left-1/2 flex -translate-x-1/2 items-center gap-4">
            {mission.image_url && mission.image_url.trim() && (
              <img
              src={mission.image_url}
              alt={mission.title}
              loading="eager"
              decoding="async"
              className="h-[76px] w-[76px] rounded-lg object-cover"
            />
            )}

            <div className="flex flex-col gap-2">
            <div className="text-[34px] font-black text-white [text-shadow:3px_3px_4px_rgba(0,0,0,1)]">
                {mission.title}
              </div>

              <div className="relative h-[58px] w-[900px] overflow-hidden border-4 border-[#d1d5db] bg-[#111827] shadow-[0_4px_14px_rgba(0,0,0,0.75)]">
                <div
                  className="absolute left-0 top-0 h-full bg-[#5b8fee] transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />

<div className="relative z-10 grid h-full grid-cols-2 items-center px-7 text-[34px] font-black text-white [text-shadow:3px_3px_4px_rgba(0,0,0,1)]">
                  <div className="text-left">{current.toLocaleString()}</div>
                  <div className="text-right">{goal.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <audio
          ref={audioRef}
          preload="auto"
          onEnded={() => {
            if (!currentItemRef.current) return;
            finishAfterAudio(currentItemRef.current);
          }}
        />
      </main>
    </>
  );
}