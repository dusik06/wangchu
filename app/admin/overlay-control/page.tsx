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

type QueueItem = {
  id: number;
  type: "item" | "song";
  nickname: string;
  title: string;
  status: string;
  created_at: string;
};

type QueueLog = QueueItem & {
    played_at: string | null;
  };

type EditForm = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  goalDotori: string;
};

export default function Page() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [playing, setPlaying] = useState<QueueItem | null>(null);
  const [waiting, setWaiting] = useState<QueueItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<QueueLog[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [goalDotori, setGoalDotori] = useState("");
  const [loading, setLoading] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  async function loadMissions() {
    const res = await fetch("/api/admin/broadcast-missions", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setMissions(data.missions || []);
    }
  }

  async function loadQueue() {
    const res = await fetch("/api/admin/overlay-queue", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setPlaying(data.playing || null);
      setWaiting(data.waiting || []);
      setRecentLogs(data.recentLogs || []);
    }
  }

  async function refreshAll() {
    await Promise.all([loadMissions(), loadQueue()]);
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

  async function updateMission() {
    if (!editForm) return;

    if (!editForm.title.trim()) {
      alert("미션 제목을 입력해줘.");
      return;
    }

    if (Number(editForm.goalDotori || 0) <= 0) {
      alert("목표 도토리를 입력해줘.");
      return;
    }

    const res = await fetch("/api/admin/broadcast-missions/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        missionId: editForm.id,
        title: editForm.title,
        description: editForm.description,
        imageUrl: editForm.imageUrl,
        goalDotori: Number(editForm.goalDotori || 0),
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "수정 실패");
      return;
    }

    setEditForm(null);
    await loadMissions();
  }

  async function completeMission(missionId: number) {
    if (!confirm("이 미션을 완료 처리할까? OBS에서는 내려가고 지난 미션으로 이동해.")) {
      return;
    }

    const res = await fetch("/api/admin/broadcast-missions/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ missionId }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "완료 처리 실패");
      return;
    }

    await loadMissions();
  }

  async function deleteMission(missionId: number) {
    if (!confirm("이 미션을 삭제 처리할까? 유저 페이지 진행 목록에서는 사라져.")) {
      return;
    }

    const res = await fetch("/api/admin/broadcast-missions/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ missionId }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "삭제 실패");
      return;
    }

    await loadMissions();
  }

  async function queueControl(command: string, item?: QueueItem) {
    const res = await fetch("/api/admin/overlay-queue/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        targetType: item?.type || null,
        targetId: item?.id || null,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "명령 실패");
      return;
    }

    await loadQueue();
  }

  function openEdit(mission: Mission) {
    setEditForm({
      id: mission.id,
      title: mission.title,
      description: mission.description || "",
      imageUrl: mission.image_url || "",
      goalDotori: String(mission.goal_dotori || ""),
    });
  }
  function formatTime(value: string | null) {
    if (!value) return "-";
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) return "-";
  
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
  
    return `${hour}:${minute}:${second}`;
  }

  function typeLabel(type: string) {
    if (type === "song") return "시그";
    return "아이템";
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const activeMissions = missions.filter((mission) => mission.status === "active");
  const selected = activeMissions.find((mission) => Number(mission.is_selected) === 1);

  return (
    <main className="min-h-screen bg-[#0b0718] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black">통합 OBS 컨트롤러</h1>
          <p className="mt-2 text-sm text-white/60">
            OBS 링크 하나로 미션, 아이템, 시그를 통합 관리합니다.
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
            <div className="text-sm text-white/50">현재 재생</div>
            <div className="mt-2 text-xl font-black">
              {playing ? `${typeLabel(playing.type)} · ${playing.title}` : "없음"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <div className="text-sm text-white/50">대기열</div>
            <div className="mt-2 text-xl font-black">{waiting.length}개</div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151027] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">아이템 / 시그 컨트롤</h2>

            <button
              onClick={() => queueControl("refresh")}
              className="rounded-xl bg-zinc-700 px-4 py-2 text-sm font-black hover:bg-zinc-600"
            >
              OBS 새로고침
            </button>
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-[#09090f] p-4">
            <div className="mb-2 text-sm text-white/50">현재 재생중</div>

            {playing ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black">
                    [{typeLabel(playing.type)}] {playing.title}
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    {playing.nickname}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => queueControl("replay", playing)}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-black hover:bg-purple-500"
                  >
                    다시재생
                  </button>

                  <button
                    onClick={() => queueControl("skip")}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black hover:bg-red-500"
                  >
                    스킵
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-white/50">현재 재생중인 아이템/시그가 없습니다.</div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#09090f] text-white/60">
                <tr>
                  <th className="px-4 py-3">순서</th>
                  <th className="px-4 py-3">종류</th>
                  <th className="px-4 py-3">사용자</th>
                  <th className="px-4 py-3">내용</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>

              <tbody>
                {waiting.map((item, index) => (
                  <tr key={`${item.type}-${item.id}`} className="border-t border-white/10">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">{typeLabel(item.type)}</td>
                    <td className="px-4 py-3 font-bold">{item.nickname}</td>
                    <td className="px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => queueControl("replay", item)}
                        className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-black hover:bg-purple-500"
                      >
                        바로재생
                      </button>
                    </td>
                  </tr>
                ))}

                {waiting.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                      대기 중인 아이템/시그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151027] p-5">
          <h2 className="mb-4 text-xl font-black">최근 사용 로그</h2>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#09090f] text-white/60">
                <tr>
                  <th className="px-4 py-3">시간</th>
                  <th className="px-4 py-3">종류</th>
                  <th className="px-4 py-3">사용자</th>
                  <th className="px-4 py-3">내용</th>
                  <th className="px-4 py-3">상태</th>
                </tr>
              </thead>

              <tbody>
                {recentLogs.map((item) => (
                  <tr key={`log-${item.type}-${item.id}`} className="border-t border-white/10">
                    <td className="px-4 py-3">{formatTime(item.played_at)}</td>
                    <td className="px-4 py-3">{typeLabel(item.type)}</td>
                    <td className="px-4 py-3 font-bold">{item.nickname}</td>
                    <td className="px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3">
                      {item.status === "skipped" ? "스킵됨" : "재생완료"}
                    </td>
                  </tr>
                ))}

                {recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                      최근 사용 로그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
            placeholder="이미지 URL 선택사항"
            className="mt-3 w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="미션 설명 - 홈페이지에서만 표시됨"
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
            <h2 className="text-xl font-black">진행 미션 목록</h2>

            <button
              onClick={() => selectMission(0)}
              className="rounded-xl bg-zinc-700 px-4 py-2 text-sm font-black hover:bg-zinc-600"
            >
              미션 선택 해제 / OBS 투명
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#09090f] text-white/60">
                <tr>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">진행</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>

              <tbody>
                {activeMissions.map((mission) => {
                  const goal = Math.max(Number(mission.goal_dotori || 0), 1);
                  const current = Math.max(Number(mission.current_dotori || 0), 0);
                  const percent = Math.min(100, Math.floor((current / goal) * 100));

                  return (
                    <tr key={mission.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        {Number(mission.is_selected) === 1 ? "방송 표시중" : "대기"}
                      </td>

                      <td className="px-4 py-3 font-bold">{mission.title}</td>

                      <td className="px-4 py-3">
                        {current.toLocaleString()} / {goal.toLocaleString()} ({percent}%)
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => selectMission(mission.id)}
                            className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-black hover:bg-purple-500"
                          >
                            방송에 띄우기
                          </button>

                          <button
                            onClick={() => openEdit(mission)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black hover:bg-blue-500"
                          >
                            수정
                          </button>

                          <button
                            onClick={() => completeMission(mission.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black hover:bg-emerald-500"
                          >
                            완료
                          </button>

                          <button
                            onClick={() => deleteMission(mission.id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black hover:bg-red-500"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {activeMissions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-white/50">
                      진행 중인 미션이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#151027] p-6 shadow-2xl">
              <h2 className="mb-4 text-2xl font-black">미션 수정</h2>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev
                    )
                  }
                  placeholder="미션 제목"
                  className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
                />

                <input
                  value={editForm.goalDotori}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, goalDotori: e.target.value } : prev
                    )
                  }
                  placeholder="목표 도토리"
                  type="number"
                  className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
                />
              </div>

              <input
                value={editForm.imageUrl}
                onChange={(e) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, imageUrl: e.target.value } : prev
                  )
                }
                placeholder="이미지 URL 선택사항"
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
              />

              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev
                  )
                }
                placeholder="미션 설명 - 홈페이지에서만 표시됨"
                className="mt-3 min-h-[100px] w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 outline-none"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditForm(null)}
                  className="rounded-xl bg-zinc-700 px-5 py-3 font-black hover:bg-zinc-600"
                >
                  취소
                </button>

                <button
                  onClick={updateMission}
                  className="rounded-xl bg-purple-600 px-5 py-3 font-black hover:bg-purple-500"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}