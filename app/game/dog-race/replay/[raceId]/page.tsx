import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export default async function DogRaceReplayPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const { raceId } = await params;
  const id = Number(raceId || 0);

  const [users]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );
  if (!users.length || !id) redirect("/game/dog-race/history");

  const [races]: any = await db.query(
    `
    SELECT r.*
    FROM dog_races r
    LEFT JOIN dog_race_bets b ON b.race_id = r.id AND b.user_id = ?
    WHERE r.id = ? AND (b.id IS NOT NULL OR ? = 'admin')
    LIMIT 1
    `,
    [users[0].id, id, users[0].role]
  );
  if (!races.length) redirect("/game/dog-race/history");

  const [entries]: any = await db.query(
    "SELECT * FROM dog_race_entries WHERE race_id = ? ORDER BY finish_rank ASC, lane_no ASC",
    [id]
  );
  const [logs]: any = await db.query(
    "SELECT * FROM dog_race_logs WHERE race_id = ? ORDER BY event_time_ms ASC, id ASC",
    [id]
  );

  return (
    <main className="min-h-screen bg-[#0b0718] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-purple-300">RACE REPLAY</p>
            <h1 className="text-3xl font-black">경기 #{id} 리플레이 기록</h1>
          </div>
          <a href="/game/dog-race/history" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">기록 목록</a>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#151027] p-6">
          <h2 className="text-xl font-black">최종 순위</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {entries.map((entry: any) => (
              <div key={entry.id} className={`rounded-xl border p-4 ${entry.finish_rank === 1 ? "border-yellow-300/50 bg-yellow-300/10" : "border-white/10 bg-black/15"}`}>
                <p className="text-sm text-white/45">{entry.finish_rank || "-"}위 · {entry.lane_no}번</p>
                <p className="mt-1 text-lg font-black">{entry.dog_name}</p>
                <p className="text-sm text-white/55">{entry.dog_breed} · {Number(entry.odds).toFixed(2)}배</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#151027] p-6">
          <h2 className="text-xl font-black">중계 타임라인</h2>
          <div className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <p className="text-white/45">저장된 중계 기록이 없습니다.</p>
            ) : logs.map((log: any) => (
              <div key={log.id} className="flex gap-4 rounded-xl bg-black/15 p-4">
                <span className="w-16 shrink-0 text-sm font-black text-purple-300">{(Number(log.event_time_ms) / 1000).toFixed(1)}초</span>
                <p>{log.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
