import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";

function formatKst(value: any) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

function cleanReason(reason: string | null) {
  if (!reason || reason.includes("???")) return "도토리 변동";
  return reason;
}

export default async function DotoriHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [users]: any = await db.query(
    "SELECT id, nickname, dotori FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];
  if (!user) redirect("/");

  const [logs]: any = await db.query(
    `
      SELECT id, amount, reason, created_at
      FROM dotori_logs
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 50
    `,
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-purple-300">MY DOTORI</p>
            <h1 className="text-3xl font-black">최근 도토리 내역</h1>
            <p className="mt-2 text-sm text-zinc-400">최근 50건의 지급·사용 내역을 확인할 수 있습니다.</p>
          </div>
          <Link href="/mypage" className="rounded-xl border border-white/10 bg-[#151522] px-4 py-2 text-sm font-bold hover:bg-[#1c1c2b]">
            마이페이지로
          </Link>
        </div>

        <section className="mb-5 rounded-2xl border border-purple-400/20 bg-[#151027] p-5">
          <p className="text-sm text-zinc-400">현재 보유 도토리</p>
          <p className="mt-1 text-3xl font-black text-yellow-300">{Number(user.dotori || 0).toLocaleString()}개</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151522]">
          {logs.length ? (
            <div className="divide-y divide-white/5">
              {logs.map((log: any) => {
                const amount = Number(log.amount || 0);
                const plus = amount > 0;
                return (
                  <div key={log.id} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 sm:grid-cols-[150px_1fr_170px] sm:items-center sm:px-5">
                    <div className={`text-lg font-black ${plus ? "text-emerald-400" : amount < 0 ? "text-rose-400" : "text-zinc-300"}`}>
                      {plus ? "+" : ""}{amount.toLocaleString()}개
                    </div>
                    <div className="col-span-2 text-sm font-medium text-zinc-200 sm:col-span-1">
                      {cleanReason(log.reason)}
                    </div>
                    <div className="col-span-2 text-xs text-zinc-500 sm:col-span-1 sm:text-right">
                      {formatKst(log.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-16 text-center text-zinc-400">아직 도토리 내역이 없습니다.</div>
          )}
        </section>
      </div>
    </main>
  );
}
