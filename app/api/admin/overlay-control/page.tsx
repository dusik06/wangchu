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
  is_selected: number;
};

export default function Page() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [goalDotori, setGoalDotori] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadMissions() {
    const res = await fetch("/api/admin/broadcast-missions", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setMissions(data.missions || []);
    }
  }

  async function createMission() {
    if (!title.trim()) {
      alert("미션 제목을 입력해줘.");
      return;
    }

    if (Number(goalDotori || 0) <= 0) {
      alert("목표 도토리를 입력해줘.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/broadcast-missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          goalDotori: Number(goalDotori || 0),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "등록 실패");
        return;
      }

      setTitle("");
      setDescription("");
      setImageUrl("");
      setGoalDotori("");

      await loadMissions();
    } finally {
      setLoading(false);
    }
  }

  async function selectMission(missionId: number) {
    const res = await fetch("/api/admin/broadcast-missions/select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ missionId }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "선택 실패");
      return;
    }

    await loadMissions();
  }

  useEffect(() => {
    loadMissions();

    const timer = setInterval(() => {
      loadMissions();
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const selected = missions.find((mission) => Number(mission.is_selected) === 1);

  return (
    <main className="min-h-screen bg-[#0b0718] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black">통합 OBS 컨트롤러</h1>
          <p className="mt-2 text-sm text-white/60">
            OBS 링크는 하나만 사용합니다. 미션을 선택하지 않으면 화면은 완전 투명입니다.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151027] p-5">
          <div className="text-sm text-white/50">OBS 통합 주소</div>
          <div className="mt-2 rounded-xl bg-[#09090f] px-4 py-3 font-bold text-purple-200">
          https://www.xn--9l5bo4l.com/overlay/live
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <div className="text-sm text-white/50">현재 방송 미션</div>
            <div className="mt-2 text-xl font-black">
              {selected ? selected.title : "선택 안 됨"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <div className="text-sm text-white/50">화면 상태</div>
            <div className="mt-2 text-xl font-black">
              {selected ? "미션 표시 중" : "투명 상태"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <div className="text-sm text-white/50">등록 미션</div>
            <div className="mt-2 text-xl font-black">{missions.length}개</div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151027] p-5">
          <h2 className="mb-4 text-xl font-black">미션 등록</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="미션 제목"
              className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
            />

            <input
              value={goalDotori}
              onChange={(e) => setGoalDotori(e.target.value)}
              placeholder="목표 도토리"
              type="number"
              className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
            />
          </div>

          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="이미지 URL"
            className="mt-3 w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="미션 설명"
            className="mt-3 min-h-[90px] w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
          />

          <button
            onClick={createMission}
            disabled={loading}
            className="mt-3 rounded-xl bg-purple-600 px-5 py-3 font-black hover:bg-purple-500 disabled:opacity-50"
          >
            미션 등록
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151027] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">미션 목록</h2>

            <button
              onClick={() => selectMission(0)}
              className="rounded-xl bg-zinc-700 px-4 py-2 text-sm font-black hover:bg-zinc-600"
            >
              미션 선택 해제 / 투명
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#09090f] text-white/60">
                <tr>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">진행</th>
                  <th className="px-4 py-3">표시</th>
                </tr>
              </thead>

              <tbody>
                {missions.map((mission) => {
                  const goal = Math.max(Number(mission.goal_dotori || 0), 1);
                  const current = Math.max(Number(mission.current_dotori || 0), 0);
                  const percent = Math.min(100, Math.floor((current / goal) * 100));

                  return (
                    <tr key={mission.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        {Number(mission.is_selected) === 1 ? "방송 표시중" : mission.status}
                      </td>

                      <td className="px-4 py-3 font-bold">{mission.title}</td>

                      <td className="px-4 py-3">
                        {current.toLocaleString()} / {goal.toLocaleString()} 도토리 ({percent}%)
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => selectMission(mission.id)}
                          className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-black hover:bg-purple-500"
                        >
                          방송에 띄우기
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {missions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-white/50">
                      등록된 미션이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}