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

export default function Page() {
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [pastMissions, setPastMissions] = useState<Mission[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function loadMissions() {
    const res = await fetch("/api/missions", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setActiveMissions(data.activeMissions || []);
      setPastMissions(data.pastMissions || []);
    }
  }

  async function supportMission(missionId: number) {
    const amount = Number(amounts[missionId] || 0);

    if (amount <= 0) {
      alert("지원할 도토리를 입력해줘.");
      return;
    }

    setLoadingId(missionId);

    try {
      const res = await fetch("/api/missions/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          missionId,
          amount,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "지원 실패");
        return;
      }

      setAmounts((prev) => ({
        ...prev,
        [missionId]: "",
      }));

      await loadMissions();
    } finally {
      setLoadingId(null);
    }
  }

  useEffect(() => {
    loadMissions();

    const timer = setInterval(() => {
      loadMissions();
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#0b0718] px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black">방송 미션</h1>
          <p className="mt-2 text-sm text-white/60">
            도토리로 방송 미션을 함께 달성할 수 있습니다.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-black">진행 중인 미션</h2>

          <div className="grid gap-5">
            {activeMissions.map((mission) => {
              const goal = Math.max(Number(mission.goal_dotori || 0), 1);
              const current = Math.max(Number(mission.current_dotori || 0), 0);
              const percent = Math.min(100, Math.floor((current / goal) * 100));

              return (
                <div
                  key={mission.id}
                  className="rounded-3xl border border-white/10 bg-[#151027] p-5 shadow-xl"
                >
                  <div className="flex gap-5">
                    {mission.image_url && mission.image_url.trim() && (
                      <img
                        src={mission.image_url}
                        alt={mission.title}
                        className="h-[120px] w-[120px] rounded-2xl object-cover"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        {Number(mission.is_selected) === 1 && (
                          <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black">
                            방송 표시중
                          </span>
                        )}

                        <h3 className="text-2xl font-black">
                          {mission.title}
                        </h3>
                      </div>

                      {mission.description && (
                        <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-white/70">
                          {mission.description}
                        </p>
                      )}

                      <div className="mb-2 h-5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mb-4 flex justify-between text-sm font-black text-white/80">
                        <span>{current.toLocaleString()} 도토리</span>
                        <span>{goal.toLocaleString()} 도토리</span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={amounts[mission.id] || ""}
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [mission.id]: e.target.value,
                            }))
                          }
                          type="number"
                          placeholder="지원할 도토리"
                          className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
                        />

                        <button
                          onClick={() => supportMission(mission.id)}
                          disabled={loadingId === mission.id}
                          className="shrink-0 rounded-xl bg-purple-600 px-5 py-3 font-black hover:bg-purple-500 disabled:opacity-50"
                        >
                          지원하기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {activeMissions.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-[#151027] p-10 text-center text-white/50">
                현재 진행 중인 미션이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-black">지난 미션</h2>

          <div className="grid gap-3">
            {pastMissions.map((mission) => {
              const goal = Math.max(Number(mission.goal_dotori || 0), 1);
              const current = Math.max(Number(mission.current_dotori || 0), 0);

              return (
                <div
                  key={mission.id}
                  className="rounded-2xl border border-white/10 bg-[#151027] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-black">{mission.title}</div>
                      <div className="mt-1 text-sm text-white/50">
                        {current.toLocaleString()} / {goal.toLocaleString()} 도토리
                      </div>
                    </div>

                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                      완료
                    </div>
                  </div>
                </div>
              );
            })}

            {pastMissions.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#151027] p-8 text-center text-white/50">
                지난 미션이 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}