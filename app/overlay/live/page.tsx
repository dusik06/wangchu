"use client";

import { useEffect, useState } from "react";

type Mission = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  goal_dotori: number;
  current_dotori: number;
};

export default function Page() {
  const [mission, setMission] = useState<Mission | null>(null);

  async function loadState() {
    try {
      const res = await fetch("/api/overlay/live-state", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        setMission(null);
        return;
      }

      setMission(data.mission || null);
    } catch (error) {
      console.error(error);
      setMission(null);
    }
  }

  useEffect(() => {
    loadState();

    const timer = setInterval(() => {
      loadState();
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  if (!mission) {
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
        `}</style>

        <main className="w-screen h-screen bg-transparent" />
      </>
    );
  }

  const goal = Math.max(Number(mission.goal_dotori || 0), 1);
  const current = Math.max(Number(mission.current_dotori || 0), 0);
  const percent = Math.min(100, Math.floor((current / goal) * 100));

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
      `}</style>

      <main className="w-screen h-screen bg-transparent overflow-hidden pointer-events-none">
        <div className="absolute bottom-10 left-1/2 w-[760px] -translate-x-1/2 rounded-[28px] border border-white/20 bg-black/70 px-7 py-5 text-white shadow-[0_0_40px_rgba(168,85,247,0.45)] backdrop-blur">
          <div className="flex items-center gap-5">
            {mission.image_url && (
              <img
                src={mission.image_url}
                alt={mission.title}
                className="h-[96px] w-[96px] rounded-2xl object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-1 truncate text-2xl font-black">
                {mission.title}
              </div>

              {mission.description && (
                <div className="mb-3 line-clamp-2 text-sm font-bold text-white/70">
                  {mission.description}
                </div>
              )}

              <div className="mb-2 h-5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm font-black">
                <span>{percent}%</span>
                <span>
                  {current.toLocaleString()} / {goal.toLocaleString()} 도토리
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}