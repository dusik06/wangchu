import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export default async function AdminDogRacePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [admins]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );
  if (!admins.length || admins[0].role !== "admin") redirect("/");

  const [summary]: any = await db.query(`
    SELECT
      COUNT(*) AS race_count,
      IFNULL(SUM(total_bet_amount), 0) AS total_bet,
      IFNULL(SUM(total_payout_amount), 0) AS total_payout
    FROM dog_races
    WHERE status = 'finished'
  `);

  const [settings]: any = await db.query(
    "SELECT * FROM dog_race_settings WHERE id = 1 LIMIT 1"
  );

  const [races]: any = await db.query(`
    SELECT
      r.id, r.race_code, r.winner_lane, r.status, r.created_at,
      r.total_bet_amount, r.total_payout_amount,
      u.nickname,
      COUNT(b.id) AS bet_count
    FROM dog_races r
    LEFT JOIN users u ON u.id = r.created_by_user_id
    LEFT JOIN dog_race_bets b ON b.race_id = r.id
    GROUP BY r.id
    ORDER BY r.id DESC
    LIMIT 50
  `);

  return (
    <main className="min-h-screen bg-[#0b0718] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-purple-300">ADMIN</p>
            <h1 className="text-3xl font-black">왈왈이경주 관리</h1>
          </div>
          <a href="/admin" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">관리자 홈</a>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <p className="text-white/45">완료 경기</p>
            <p className="mt-2 text-3xl font-black">{Number(summary[0]?.race_count || 0).toLocaleString()}건</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <p className="text-white/45">총 베팅</p>
            <p className="mt-2 text-3xl font-black">{Number(summary[0]?.total_bet || 0).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <p className="text-white/45">총 지급</p>
            <p className="mt-2 text-3xl font-black">{Number(summary[0]?.total_payout || 0).toLocaleString()}</p>
          </div>
        </div>

        <form action="/api/admin/dog-race/settings" method="post" className="mt-5 rounded-2xl border border-white/10 bg-[#151027] p-6">
          <h2 className="text-xl font-black">운영 설정</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="text-sm text-white/60">최소 베팅
              <input name="minBet" type="number" defaultValue={settings[0]?.min_bet || 10} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-white/60">최대 베팅
              <input name="maxBet" type="number" defaultValue={settings[0]?.max_bet || 10000} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-white/60">배당 반영률
              <input name="payoutRate" type="number" step="0.01" defaultValue={settings[0]?.payout_rate || 0.92} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" />
            </label>
            <label className="text-sm text-white/60">게임 상태
              <select name="isActive" defaultValue={String(settings[0]?.is_active ?? 1)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white">
                <option value="1">운영</option>
                <option value="0">점검</option>
              </select>
            </label>
          </div>
          <button className="mt-4 rounded-xl bg-purple-500 px-5 py-3 font-black hover:bg-purple-400">설정 저장</button>
        </form>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#151027]">
          <div className="border-b border-white/10 p-5"><h2 className="text-xl font-black">최근 경기</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-black/20 text-white/50">
                <tr><th className="p-4 text-left">경기</th><th className="p-4 text-left">유저</th><th className="p-4">우승</th><th className="p-4">베팅 수</th><th className="p-4">총 베팅</th><th className="p-4">총 지급</th><th className="p-4">보기</th></tr>
              </thead>
              <tbody>
                {races.map((race: any) => (
                  <tr key={race.id} className="border-t border-white/10">
                    <td className="p-4 font-black">#{race.id}</td>
                    <td className="p-4">{race.nickname || "-"}</td>
                    <td className="p-4 text-center">{race.winner_lane || "-"}번</td>
                    <td className="p-4 text-center">{race.bet_count}</td>
                    <td className="p-4 text-center">{Number(race.total_bet_amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-center">{Number(race.total_payout_amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-center"><a href={`/game/dog-race/replay/${race.id}`} className="rounded-lg bg-white/10 px-3 py-2 font-bold">리플레이</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
