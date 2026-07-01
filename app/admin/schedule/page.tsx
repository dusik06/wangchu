import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const [admins]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    redirect("/");
  }

  const [schedules]: any = await db.query(`
    SELECT *
    FROM broadcast_schedules
    ORDER BY schedule_date ASC
  `);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-black text-yellow-400">
          📅 방송 일정 관리
        </h1>

        <form
          action="/api/admin/schedule"
          method="POST"
          className="mb-8 rounded-2xl bg-slate-900 p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="date"
              name="schedule_date"
              required
              className="rounded-xl bg-slate-800 px-4 py-3"
            />

            <input
              type="time"
              name="schedule_time"
              className="rounded-xl bg-slate-800 px-4 py-3"
            />

            <input
              type="text"
              name="title"
              placeholder="방송 제목"
              required
              className="rounded-xl bg-slate-800 px-4 py-3 md:col-span-2"
            />

            <textarea
              name="description"
              placeholder="공지 내용"
              rows={4}
              className="rounded-xl bg-slate-800 px-4 py-3 md:col-span-2"
            />

            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_important" />
              중요 일정 ⭐
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_offday" />
              휴방 😴
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black"
          >
            등록하기
          </button>
        </form>

        <div className="rounded-2xl bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-black">등록된 일정</h2>

          <div className="space-y-3">
            {schedules.map((item: any) => (
              <div
                key={item.id}
                className="rounded-xl bg-slate-800 px-4 py-4"
              >
                <p className="font-black">
                  {item.schedule_date} {item.schedule_time}
                </p>

                <p className="mt-1">{item.title}</p>

                {item.is_important === 1 && (
                  <p className="text-yellow-400">⭐ 중요 일정</p>
                )}

                {item.is_offday === 1 && (
                  <p className="text-gray-400">😴 휴방</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}