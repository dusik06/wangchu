import db from "@/lib/db";

export const dynamic = "force-dynamic";

function getKoreanDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return {
    year,
    month,
  };
}

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

  const days: any[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day++) {
    days.push(day);
  }

  return days;
}

export default async function SchedulePage() {
  const today = new Date();
  const { year, month } = getKoreanDate(today);

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;

  const [schedules]: any = await db.query(
    `
    SELECT *
    FROM broadcast_schedules
    WHERE schedule_date BETWEEN ? AND ?
    ORDER BY schedule_date ASC, schedule_time ASC
    `,
    [monthStart, monthEnd]
  );

  const scheduleMap: any = {};

  schedules.forEach((item: any) => {
    const key =
      typeof item.schedule_date === "string"
        ? item.schedule_date.slice(0, 10)
        : item.schedule_date.toISOString().slice(0, 10);

    if (!scheduleMap[key]) {
      scheduleMap[key] = [];
    }

    scheduleMap[key].push(item);
  });

  const days = getCalendarDays(year, month);
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const upcoming = schedules.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#05070d] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#f7d36b]">
              📅 방송 일정
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              일정이 있는 날짜는 금색, 휴방은 회색, 중요 일정은 ⭐로 표시됩니다.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-[#3b321f] bg-[#11131b] px-5 py-3 text-sm font-black hover:bg-[#2b2415]"
          >
            홈으로
          </a>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">
                {year}년 {month}월
              </h2>

              <div className="flex gap-2 text-xs font-bold">
                <span className="rounded-full bg-[#2b2415] px-3 py-1 text-[#f7d36b]">
                  일정
                </span>
                <span className="rounded-full bg-zinc-700 px-3 py-1 text-zinc-200">
                  휴방
                </span>
                <span className="rounded-full bg-yellow-500 px-3 py-1 text-black">
                  ⭐ 중요
                </span>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-2 text-center text-sm font-black text-zinc-400">
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
                if (!day) {
                  return <div key={index} className="min-h-[130px]" />;
                }

                const key = formatDateKey(year, month, day);
                const daySchedules = scheduleMap[key] || [];
                const hasSchedule = daySchedules.length > 0;
                const hasOffday = daySchedules.some(
                  (item: any) => item.is_offday === 1
                );
                const hasImportant = daySchedules.some(
                  (item: any) => item.is_important === 1
                );
                const isToday = key === todayKey;

                return (
                  <div
                    key={key}
                    className={`group relative min-h-[130px] rounded-2xl border p-3 transition-all duration-200 hover:z-20 hover:scale-110 ${
                      hasOffday
                        ? "border-zinc-600 bg-zinc-800"
                        : hasSchedule
                        ? "border-[#f7d36b] bg-[#19150d]"
                        : "border-[#222633] bg-[#0f121b]"
                    } ${isToday ? "ring-2 ring-white" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-lg font-black">{day}</span>
                      {hasImportant && <span>⭐</span>}
                    </div>

                    {hasSchedule ? (
                      <div className="space-y-1">
                        {daySchedules.slice(0, 2).map((item: any) => (
                          <div
                            key={item.id}
                            className="truncate rounded-lg bg-black/25 px-2 py-1 text-xs font-bold"
                          >
                            {item.is_offday === 1
                              ? "휴방"
                              : `${item.schedule_time || ""} ${item.title}`}
                          </div>
                        ))}

                        {daySchedules.length > 2 && (
                          <p className="text-xs text-zinc-400">
                            +{daySchedules.length - 2}개 더보기
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-8 text-center text-xs text-zinc-600">
                        일정 없음
                      </p>
                    )}

                    {hasSchedule && (
                      <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-72 rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 shadow-2xl group-hover:block">
                        <p className="mb-3 text-sm font-black text-[#f7d36b]">
                          {month}월 {day}일 상세
                        </p>

                        <div className="space-y-3">
                          {daySchedules.map((item: any) => (
                            <div
                              key={item.id}
                              className="rounded-xl bg-[#0b0d14] p-3"
                            >
                              <p className="font-black">
                                {item.is_important === 1 ? "⭐ " : ""}
                                {item.is_offday === 1 ? "휴방" : item.title}
                              </p>

                              {!item.is_offday && item.schedule_time && (
                                <p className="mt-1 text-sm text-[#f7d36b]">
                                  ⏰ {item.schedule_time}
                                </p>
                              )}

                              {item.description && (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
              <h2 className="mb-4 text-xl font-black text-[#f7d36b]">
                다가오는 일정
              </h2>

              {upcoming.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  등록된 일정이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((item: any) => {
                    const dateText =
                      typeof item.schedule_date === "string"
                        ? item.schedule_date.slice(5, 10)
                        : item.schedule_date.toISOString().slice(5, 10);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-4 ${
                          item.is_offday === 1
                            ? "bg-zinc-800"
                            : "bg-[#151925]"
                        }`}
                      >
                        <p className="text-sm font-black text-zinc-400">
                          {dateText}
                        </p>

                        <p className="mt-1 font-black">
                          {item.is_important === 1 ? "⭐ " : ""}
                          {item.is_offday === 1 ? "휴방" : item.title}
                        </p>

                        {!item.is_offday && item.schedule_time && (
                          <p className="mt-1 text-sm text-[#f7d36b]">
                            ⏰ {item.schedule_time}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
              <h2 className="mb-3 text-xl font-black text-[#f7d36b]">
                표시 기준
              </h2>

              <div className="space-y-2 text-sm text-zinc-300">
                <p>금색 날짜: 방송 일정 있음</p>
                <p>회색 날짜: 휴방</p>
                <p>⭐ 표시: 중요 일정</p>
                <p>흰색 테두리: 오늘</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}