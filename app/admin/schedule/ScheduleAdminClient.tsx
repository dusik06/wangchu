"use client";

import { useMemo, useState } from "react";

type ScheduleItem = {
  id: number;
  schedule_date: string;
  schedule_time: string;
  title: string;
  description: string;
  is_important: boolean;
  is_offday: boolean;
};

type Props = {
  schedules: ScheduleItem[];
};

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDate = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0);
  const firstDay = firstDate.getDay();
  const totalDays = lastDate.getDate();

  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let day = 1; day <= totalDays; day++) days.push(day);

  return days;
}

export default function ScheduleAdminClient({ schedules }: Props) {
  const today = new Date();
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);

  const days = getCalendarDays(year, month);

  const scheduleMap = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};

    schedules.forEach((item) => {
      if (!map[item.schedule_date]) map[item.schedule_date] = [];
      map[item.schedule_date].push(item);
    });

    return map;
  }, [schedules]);

  const selectedSchedules = scheduleMap[selectedDate] || [];

  function moveMonth(type: "prev" | "next") {
    setEditing(null);

    if (type === "prev") {
      if (month === 1) {
        setYear(year - 1);
        setMonth(12);
      } else {
        setMonth(month - 1);
      }
    }

    if (type === "next") {
      if (month === 12) {
        setYear(year + 1);
        setMonth(1);
      } else {
        setMonth(month + 1);
      }
    }
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setEditing(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-yellow-400">
              📅 방송 일정 관리
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              날짜 클릭 → 일정 등록 / 기존 일정 클릭 → 수정·삭제
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-black hover:bg-slate-700"
          >
            관리자 홈
          </a>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-3xl bg-slate-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth("prev")}
                className="rounded-xl bg-slate-800 px-4 py-2 font-black hover:bg-slate-700"
              >
                이전
              </button>

              <h2 className="text-2xl font-black">
                {year}년 {month}월
              </h2>

              <button
                type="button"
                onClick={() => moveMonth("next")}
                className="rounded-xl bg-slate-800 px-4 py-2 font-black hover:bg-slate-700"
              >
                다음
              </button>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-2 text-center text-sm font-black text-slate-400">
              <div>일</div>
              <div>월</div>
              <div>화</div>
              <div>수</div>
              <div>목</div>
              <div>금</div>
              <div>토</div>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {days.map((day, index) => {
                if (!day) return <div key={index} className="min-h-[135px]" />;

                const key = formatDateKey(year, month, day);
                const items = scheduleMap[key] || [];
                const hasSchedule = items.length > 0;
                const hasOffday = items.some((item) => item.is_offday);
                const hasImportant = items.some((item) => item.is_important);
                const isSelected = selectedDate === key;
                const isToday = todayKey === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDate(key)}
                    className={`min-h-[135px] rounded-2xl border p-3 text-left transition hover:scale-105 ${
                      hasOffday
                        ? "border-slate-500 bg-slate-700"
                        : hasSchedule
                        ? "border-yellow-500 bg-yellow-950/50"
                        : "border-slate-700 bg-slate-800"
                    } ${isSelected ? "ring-4 ring-yellow-400" : ""} ${
                      isToday ? "outline outline-2 outline-white" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-lg font-black">{day}</span>
                      {hasImportant && <span>⭐</span>}
                    </div>

                    {hasSchedule ? (
                      <div className="space-y-1">
                        {items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="truncate rounded-lg bg-black/25 px-2 py-1 text-xs font-bold"
                          >
                            {item.is_offday
                              ? "휴방"
                              : `${item.schedule_time || ""} ${item.title}`}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-8 text-center text-xs text-slate-500">
                        클릭해서 등록
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-slate-900 p-6">
              <h2 className="mb-2 text-xl font-black text-yellow-400">
                {editing ? "일정 수정" : "일정 등록"}
              </h2>

              <p className="mb-5 rounded-xl bg-slate-800 px-4 py-3 text-lg font-black">
                {editing ? editing.schedule_date : selectedDate}
              </p>

              <form action="/api/admin/schedule" method="POST" key={editing?.id || selectedDate}>
                <input type="hidden" name="mode" value={editing ? "update" : "create"} />
                <input type="hidden" name="id" value={editing?.id || ""} />
                <input
                  type="hidden"
                  name="schedule_date"
                  value={editing ? editing.schedule_date : selectedDate}
                />

                <div className="space-y-4">
                  <input
                    type="time"
                    name="schedule_time"
                    defaultValue={editing?.schedule_time || ""}
                    className="w-full rounded-xl bg-slate-800 px-4 py-3"
                  />

                  <input
                    type="text"
                    name="title"
                    placeholder="방송 제목 / 휴방 사유"
                    required
                    defaultValue={editing?.title || ""}
                    className="w-full rounded-xl bg-slate-800 px-4 py-3"
                  />

                  <textarea
                    name="description"
                    placeholder="상세 내용 / 공지"
                    rows={5}
                    defaultValue={editing?.description || ""}
                    className="w-full rounded-xl bg-slate-800 px-4 py-3"
                  />

                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      name="is_important"
                      defaultChecked={editing?.is_important || false}
                    />
                    중요 일정 ⭐
                  </label>

                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      name="is_offday"
                      defaultChecked={editing?.is_offday || false}
                    />
                    휴방
                  </label>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-yellow-500 px-5 py-3 font-black text-black hover:bg-yellow-400"
                  >
                    {editing ? "수정 저장하기" : "이 날짜에 등록하기"}
                  </button>

                  {editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="w-full rounded-xl bg-slate-700 px-5 py-3 font-black hover:bg-slate-600"
                    >
                      새 일정 등록으로 돌아가기
                    </button>
                  )}
                </div>
              </form>

              {editing && (
                <form
                  action="/api/admin/schedule"
                  method="POST"
                  className="mt-3"
                >
                  <input type="hidden" name="mode" value="delete" />
                  <input type="hidden" name="id" value={editing.id} />

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-red-600 px-5 py-3 font-black hover:bg-red-500"
                  >
                    삭제하기
                  </button>
                </form>
              )}
            </div>

            <div className="rounded-3xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-black text-yellow-400">
                이 날짜 일정
              </h2>

              {selectedSchedules.length === 0 ? (
                <p className="text-sm text-slate-400">
                  아직 등록된 일정이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedSchedules.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEditing(item)}
                      className={`w-full rounded-2xl p-4 text-left hover:ring-2 hover:ring-yellow-400 ${
                        item.is_offday ? "bg-slate-700" : "bg-slate-800"
                      }`}
                    >
                      <p className="font-black">
                        {item.is_important ? "⭐ " : ""}
                        {item.is_offday ? "휴방" : item.title}
                      </p>

                      {item.schedule_time && !item.is_offday && (
                        <p className="mt-1 text-sm text-yellow-400">
                          ⏰ {item.schedule_time}
                        </p>
                      )}

                      {item.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                          {item.description}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-500">
                        클릭하면 수정 가능
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}