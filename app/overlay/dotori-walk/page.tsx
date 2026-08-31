"use client";

import { useEffect, useRef, useState } from "react";

const DING = "/sounds/mission-support.mp3";

type WalkState = {
  plus_dotori?: number | string;
  minus_dotori?: number | string;
  total_used?: number | string;
  font_color?: string;
  plus_color?: string;
  minus_color?: string;
  outline_color?: string;
  outline_width?: number | string;
  distance_size?: number | string;
  total_size?: number | string;
  sub_size?: number | string;
  plus_song_url?: string | null;
  minus_song_url?: string | null;
};

type WalkAlert = {
  id: number;
  direction: "plus" | "minus";
  dotori_amount: number;
  nickname: string;
};

export default function DotoriWalkOverlay() {
  const [state, setState] = useState<WalkState | null>(null);
  const [currentAlert, setCurrentAlert] = useState<WalkAlert | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);

  const stateRef = useRef<WalkState | null>(null);
  const lastIdRef = useRef(0);
  const queuedIdsRef = useRef<Set<number>>(new Set());
  const playedIdsRef = useRef<Set<number>>(new Set());
  const pollingRef = useRef(false);
  const queueRef = useRef<WalkAlert[]>([]);
  const processingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {}
  };

  const finishCurrent = (delay = 0) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setAlertVisible(false);

      timerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setCurrentAlert(null);
        processingRef.current = false;
        processNext();
      }, 300);
    }, delay);
  };

  const playSource = (src: string, onEnded: () => void, onError: () => void) => {
    const audio = audioRef.current;
    if (!audio) {
      onError();
      return;
    }

    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.volume = 1;
      audio.muted = false;
      audio.loop = false;
      audio.src = src;
      audio.onended = onEnded;
      audio.onerror = onError;
      audio.load();
      audio.play().catch(onError);
    } catch {
      onError();
    }
  };

  const processNext = () => {
    if (processingRef.current || !mountedRef.current) return;
    const alert = queueRef.current.shift();
    if (!alert) return;

    queuedIdsRef.current.delete(alert.id);
    if (playedIdsRef.current.has(alert.id)) {
      setTimeout(processNext, 0);
      return;
    }
    playedIdsRef.current.add(alert.id);

    processingRef.current = true;
    setCurrentAlert(alert);
    setAlertVisible(true);

    const amount = Number(alert.dotori_amount || 0);

    // 1,000개 미만: 기존 미션 띠링 + 문구 5초 유지
    if (amount < 1000) {
      playSource(DING, () => {}, () => {});
      finishCurrent(5000);
      return;
    }

    // 1,000개 이상: + / - 전용 노래를 끝까지 재생하고, 끝난 뒤 2초 더 유지
    const latestState = stateRef.current;
    const songUrl = String(
      alert.direction === "plus"
        ? latestState?.plus_song_url || ""
        : latestState?.minus_song_url || ""
    ).trim();

    if (!songUrl) {
      // URL이 비어 있으면 방송이 멈추지 않도록 띠링으로 대체
      playSource(DING, () => {}, () => {});
      finishCurrent(5000);
      return;
    }

    playSource(
      songUrl,
      () => finishCurrent(2000),
      () => {
        // 링크 재생 실패 시에도 다음 알림이 막히지 않도록 5초 표시 후 진행
        finishCurrent(5000);
      }
    );
  };

  useEffect(() => {
    mountedRef.current = true;
    let alive = true;

    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const response = await fetch(`/api/dotori-walk?after=${lastIdRef.current}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!alive || !data.success) return;

        setState(data.state);
        stateRef.current = data.state;

        if (lastIdRef.current === 0) {
          // 오버레이를 처음 켰을 때 과거 알림은 재생하지 않음
          lastIdRef.current = Number(data.latest_id || 0);
          return;
        }

        if (Array.isArray(data.alerts) && data.alerts.length > 0) {
          const alerts = data.alerts.map((item: any) => ({
            id: Number(item.id),
            direction: item.direction === "minus" ? "minus" : "plus",
            dotori_amount: Number(item.dotori_amount || 0),
            nickname: String(item.nickname || "익명"),
          })) as WalkAlert[];

          const uniqueAlerts = alerts.filter((item) => {
            if (!item.id || item.id <= lastIdRef.current) return false;
            if (queuedIdsRef.current.has(item.id) || playedIdsRef.current.has(item.id)) return false;
            queuedIdsRef.current.add(item.id);
            return true;
          });

          if (alerts.length > 0) {
            lastIdRef.current = Math.max(
              lastIdRef.current,
              ...alerts.map((item) => item.id)
            );
          }

          if (uniqueAlerts.length > 0) {
            queueRef.current.push(...uniqueAlerts);
            setTimeout(processNext, 0);
          }
        }
      } catch (error) {
        console.error("도토리 국토대장정 오버레이 갱신 실패:", error);
      } finally {
        pollingRef.current = false;
      }
    };

    poll();
    const pollTimer = setInterval(poll, 1000);

    return () => {
      alive = false;
      mountedRef.current = false;
      clearInterval(pollTimer);
      clearTimer();
      stopAudio();
    };
  }, []);

  if (!state) {
    return <main style={{ background: "transparent" }} />;
  }

  const plus = Number(state.plus_dotori || 0);
  const minus = Number(state.minus_dotori || 0);
  const meters = (plus - minus) / 10;
  const outlineWidth = Math.max(0, Number(state.outline_width || 0));
  const outlineColor = state.outline_color || "#000000";


  const cleanOutline = (fontSize: number) => {
    // PRISM/모바일 Chromium에서 굵은 text-stroke가 한글을 겹쳐 보이게 하는 문제 방지
    // 설정값은 유지하되 실제 렌더링은 글자 크기에 맞춰 안전한 두께로 제한한다.
    const safeWidth = Math.min(outlineWidth, Math.max(0.6, fontSize * 0.028));
    return outlineWidth > 0
      ? {
          WebkitTextStroke: `${safeWidth}px ${outlineColor}`,
          WebkitTextStrokeWidth: `${safeWidth}px`,
          WebkitTextStrokeColor: outlineColor,
          paintOrder: "stroke fill" as const,
          }
      : {
          WebkitTextStroke: "0 transparent",
          };
  };

  const formatDistance = (m: number) => {
    const sign = m < 0 ? "-" : "";
    const absolute = Math.abs(m);
    if (absolute >= 1000) return `${sign}${(absolute / 1000).toFixed(2)} KM`;
    return `${sign}${absolute.toLocaleString()} M`;
  };

  const alertAmount = Number(currentAlert?.dotori_amount || 0);
  const alertMeters = alertAmount / 10;
  const isPlus = currentAlert?.direction === "plus";
  const alertColor = isPlus ? state.plus_color || "#67E8F9" : state.minus_color || "#FB7185";

  return (
    <main
      style={{
        background: "transparent",
        backgroundColor: "rgba(0,0,0,0)",
        color: state.font_color || "#FFFFFF",
        fontFamily: "'Jua', 'BM JUA', 'Noto Sans KR', 'Malgun Gothic', Arial, sans-serif",
        padding: 12,
        textAlign: "center",
        fontWeight: 900,
        minHeight: 0,
      }}
    >
      <style>{`
        html, body, body > div, #__next, [data-nextjs-scroll-focus-boundary] {
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          background-color: rgba(0,0,0,0) !important;
        }
        body > header, body > nav, body > footer,
        body > div > header, body > div > nav, body > div > footer {
          display: none !important;
        }
        * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }
      `}</style>

      <audio ref={audioRef} preload="auto" playsInline />

      {currentAlert ? (
        <div
          style={{
            opacity: alertVisible ? 1 : 0,
            transform: alertVisible ? "scale(1)" : "scale(.96)",
            transition: "opacity .25s ease, transform .25s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px 12px",
          }}
        >
          <div
            style={{
              fontSize: Math.max(30, Number(state.total_size || 30) + 8),
              lineHeight: 1.25,
              wordBreak: "keep-all",
              ...cleanOutline(Math.max(30, Number(state.total_size || 30) + 8)),
            }}
          >
            <span style={{ color: "#FFFFFF" }}>{currentAlert.nickname}</span>
            <span style={{ color: "#FFFFFF" }}>님이 </span>
            <span style={{ color: alertColor }}>{isPlus ? "플러스" : "마이너스"}</span>
            <span style={{ color: "#FFFFFF" }}>에</span>
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: Math.max(42, Number(state.distance_size || 72) * 0.72),
              lineHeight: 1.08,
              color: alertColor,
              ...cleanOutline(Math.max(42, Number(state.distance_size || 72) * 0.72)),
            }}
          >
            도토리 {alertAmount.toLocaleString()}개
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: Math.max(30, Number(state.total_size || 30) + 8),
              lineHeight: 1.2,
              color: "#FFFFFF",
              ...cleanOutline(Math.max(30, Number(state.total_size || 30) + 8)),
            }}
          >
            사용했습니다.
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: Math.max(24, Number(state.sub_size || 26)),
              color: alertColor,
              ...cleanOutline(Math.max(24, Number(state.sub_size || 26))),
            }}
          >
            {isPlus ? "+" : "-"}{formatDistance(alertMeters)}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: Math.max(16, Number(state.total_size || 30) * 0.72), ...cleanOutline(Math.max(16, Number(state.total_size || 30) * 0.72)) }}>
            총 이동해야 하는 거리
          </div>
          <div
            style={{
              fontSize: Number(state.distance_size || 72),
              lineHeight: 1.05,
              marginTop: 4,
              ...cleanOutline(Number(state.distance_size || 72)),
            }}
          >
            {formatDistance(meters)}
          </div>
          <div style={{ fontSize: Number(state.total_size || 30), marginTop: 12, ...cleanOutline(Number(state.total_size || 30)) }}>
            총 사용 도토리 {Number(state.total_used || 0).toLocaleString()}개
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 28,
              flexWrap: "wrap",
              fontSize: Number(state.sub_size || 26),
              marginTop: 10,
            }}
          >
            <span style={{ color: state.plus_color || "#67E8F9", ...cleanOutline(Number(state.sub_size || 26)) }}>
              +거리 {formatDistance(plus / 10)}
            </span>
            <span style={{ color: state.minus_color || "#FB7185", ...cleanOutline(Number(state.sub_size || 26)) }}>
              -거리 {formatDistance(minus / 10)}
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
