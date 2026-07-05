"use client";

import { useEffect, useState } from "react";

type Mission = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  goal_dotori: number;
  current_dotori: number;
  status: string;
  is_selected?: number;
};

export default function BroadcastMissionCard({ isAdmin }: { isAdmin: boolean }) {
  const [mission, setMission] = useState<Mission | null>(null);

  async function loadMission() {
    try {
      const res = await fetch("/api/overlay/live-state", {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success && data.mission) {
        setMission(data.mission);
      } else {
        setMission(null);
      }
    } catch {
      setMission(null);
    }
  }

  useEffect(() => {
    loadMission();
  }, []);

  const goal = Math.max(Number(mission?.goal_dotori || 0), 1);
  const current = Math.max(Number(mission?.current_dotori || 0), 0);
  const percent = mission ? Math.min(100, Math.floor((current / goal) * 100)) : 0;

  return (
    <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#f7d36b]">📢 방송 미션</h2>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <a
              href="/admin/overlay-control"
              className="rounded-lg bg-[#2b2415] px-3 py-2 text-xs font-black text-[#f7d36b] hover:bg-[#3b321f]"
            >
              관리
            </a>
          )}

          <a
            href="/missions"
            className="text-xs font-bold text-zinc-400 hover:text-[#f7d36b]"
          >
            지원하기 〉
          </a>
        </div>
      </div>

      {!mission ? (
        <p className="rounded-2xl border border-[#2c2f3a] bg-[#151925] p-5 text-sm text-zinc-400">
          현재 진행중인 방송 미션이 없습니다.
        </p>
      ) : (
        <a
          href="/missions"
          className="block rounded-2xl border border-[#2c2f3a] bg-[#151925] p-4 hover:border-[#f7d36b]/60"
        >
          <div className="flex gap-4">
            {mission.image_url && mission.image_url.trim() && (
              <img
                src={mission.image_url}
                alt={mission.title}
                className="h-[90px] w-[90px] rounded-2xl object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black text-white">
                {mission.title}
              </p>

              <div className="mt-3 h-5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#5b8fee] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-sm font-black text-zinc-300">
                <span>{current.toLocaleString()}</span>
                <span>{goal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}