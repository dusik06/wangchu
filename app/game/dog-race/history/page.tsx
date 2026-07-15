import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

function formatKst(value: any) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(/\. /g, ".").replace(".", "");
}

export default async function DogRaceHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [users]: any = await db.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );
  if (!users.length) redirect("/");

  const [rows]: any = await db.query(
    `
    SELECT b.*, r.winner_lane, e.dog_name AS selected_dog_name
    FROM dog_race_bets b
    INNER JOIN dog_races r ON r.id = b.race_id
    LEFT JOIN dog_race_entries e
      ON e.race_id = b.race_id AND e.lane_no = b.selected_lane
    WHERE b.user_id = ?
    ORDER BY b.id DESC
    LIMIT 50
    `,
    [users[0].id]
  );

  return (
    <main className="min-h-screen bg-[#0b0718] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-purple-300">WANGCHU DOG RACE</p>
            <h1 className="mt-1 text-3xl font-black">내 왈왈이경주 기록</h1>
          </div>
          <a href="/game/dog-race" className="rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-sm font-bold">
            게임으로 돌아가기
          </a>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151027]">
          {rows.length === 0 ? (
            <div className="p-10 text-center text-white/55">아직 참여한 경기가 없습니다.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {rows.map((row: any) => {
                const win = row.status === "win";
                return (
                  <div key={row.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${win ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                          {win ? "적중" : "미적중"}
                        </span>
                        <strong>{row.selected_lane}번 {row.selected_dog_name || "왈왈이"}</strong>
                        <span className="text-sm text-white/45">우승 {row.winner_lane}번</span>
                      </div>
                      <p className="mt-2 text-sm text-white/45">{formatKst(row.created_at)}</p>
                    </div>
                    <div className="text-sm md:text-right">
                      <p className="text-white/45">베팅</p>
                      <p className="font-black">{Number(row.bet_amount).toLocaleString()} 도토리 · {Number(row.odds).toFixed(2)}배</p>
                    </div>
                    <div className="flex items-center gap-3 md:justify-end">
                      <div className="text-right">
                        <p className="text-white/45 text-sm">지급</p>
                        <p className={`font-black ${win ? "text-emerald-300" : "text-white/65"}`}>{Number(row.payout_amount).toLocaleString()} 도토리</p>
                      </div>
                      <a href={`/game/dog-race/replay/${row.race_id}`} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15">리플레이</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
