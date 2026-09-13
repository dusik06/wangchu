"use client";

import { subscribeOverlayEvents } from "@/lib/overlay-realtime-client";
import { useEffect, useState } from "react";

type DoganiPlayer = {
  id: number;
  name: string;
  amount: number;
};

export default function DoganiGameOverlay() {
  const [players, setPlayers] = useState<DoganiPlayer[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/dogani-game?t=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (active) setPlayers(json.players || []);
      } catch {}
    }

    void load();
    const unsubscribe = subscribeOverlayEvents(() => { void load(); }, () => { void load(); });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (players.length === 0) {
    return (
      <>
        <TransparentPageStyle />
        <main aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      <TransparentPageStyle />
      <main
        style={{
          width: "100%",
          minHeight: "100vh",
          margin: 0,
          padding: "8px",
          background: "rgba(0,0,0,0)",
          color: "#fff",
          fontFamily:
            'Pretendard, "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxSizing: "border-box",
        }}
      >
        <section
          style={{
            width: "min(760px, 100%)",
            margin: 0,
            overflow: "hidden",
            borderRadius: 12,
            background: "rgba(13, 8, 18, 0.82)",
            border: "1px solid rgba(255,255,255,.13)",
            boxShadow: "0 8px 28px rgba(0,0,0,.28)",
            WebkitBackdropFilter: "blur(4px)",
            backdropFilter: "blur(4px)",
          }}
        >
          <header
            style={{
              padding: "9px 14px 8px",
              textAlign: "center",
              fontSize: "clamp(16px, 3.5vw, 24px)",
              lineHeight: 1.2,
              fontWeight: 950,
              color: "#fff4e8",
              background:
                "linear-gradient(90deg, rgba(207,55,55,.92), rgba(240,106,67,.94), rgba(207,55,55,.92))",
              borderBottom: "1px solid rgba(255,255,255,.18)",
              textShadow: "0 1px 2px rgba(0,0,0,.45)",
            }}
          >
            도가니 게임
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 0,
            }}
          >
            {players.map((player, index) => (
              <div
                key={player.id}
                style={{
                  minWidth: 0,
                  minHeight: 48,
                  display: "grid",
                  gridTemplateColumns: "14px minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRight: index % 2 === 0 ? "1px solid rgba(255,255,255,.10)" : "none",
                  borderBottom: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(6, 6, 12, .58)",
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#ff335b",
                    boxShadow: "0 0 8px rgba(255,51,91,.9)",
                  }}
                />
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "clamp(14px, 3vw, 20px)",
                    fontWeight: 900,
                    textShadow: "0 1px 2px rgba(0,0,0,.65)",
                  }}
                >
                  {player.name}
                </span>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "clamp(14px, 3vw, 20px)",
                    fontWeight: 950,
                    color: "#f0a338",
                    fontVariantNumeric: "tabular-nums",
                    textShadow: "0 1px 2px rgba(0,0,0,.65)",
                  }}
                >
                  {Math.trunc(player.amount).toLocaleString("ko-KR")}원
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function TransparentPageStyle() {
  return (
    <style jsx global>{`
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 100% !important;
        background: transparent !important;
        background-color: rgba(0, 0, 0, 0) !important;
      }

      body,
      body > div,
      #__next,
      [data-nextjs-scroll-focus-boundary] {
        background: transparent !important;
        background-color: rgba(0, 0, 0, 0) !important;
      }

      body > header,
      body > nav,
      body > footer,
      body > div > header,
      body > div > nav,
      body > div > footer {
        display: none !important;
      }

      * {
        box-sizing: border-box;
      }
    `}</style>
  );
}
