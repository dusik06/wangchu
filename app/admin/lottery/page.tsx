import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLotteryPage() {
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

  let [rounds]: any = await db.query(
    `
    SELECT *
    FROM lottery_rounds
    WHERE status = 'OPEN'
    ORDER BY id DESC
    LIMIT 1
    `
  );

  if (!rounds.length) {
    const [lastRound]: any = await db.query(
      `
      SELECT *
      FROM lottery_rounds
      ORDER BY id DESC
      LIMIT 1
      `
    );

    const nextRound = lastRound.length ? lastRound[0].round_number + 1 : 1;
    const carryOver = lastRound.length ? lastRound[0].carry_over_reward : 0;

    await db.query(
      `
      INSERT INTO lottery_rounds (
        round_number,
        base_reward,
        carry_over_reward,
        participant_reward_total,
        total_reward,
        draw_date,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())
      `,
      [
        nextRound,
        100,
        carryOver,
        0,
        100 + carryOver,
      ]
    );

    [rounds] = await db.query(
      `
      SELECT *
      FROM lottery_rounds
      WHERE status = 'OPEN'
      ORDER BY id DESC
      LIMIT 1
      `
    );
  }

  const round = rounds[0];

  const [entries]: any = await db.query(
    `
    SELECT *
    FROM lottery_entries
    WHERE round_id = ?
    ORDER BY id DESC
    `,
    [round.id]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black text-yellow-400 mb-6">
          🎟 로또 관리
        </h1>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-slate-400">현재 회차</p>
            <h2 className="text-2xl font-black">{round.round_number}회차</h2>
          </div>

          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-slate-400">현재 상금</p>
            <h2 className="text-2xl font-black text-green-400">
              {Number(round.total_reward).toLocaleString()} 도토리
            </h2>
          </div>

          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-slate-400">이월금</p>
            <h2 className="text-2xl font-black text-pink-400">
              {Number(round.carry_over_reward).toLocaleString()}
            </h2>
          </div>

          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-slate-400">참여자</p>
            <h2 className="text-2xl font-black">
              {entries.length}명
            </h2>
          </div>
        </div>

        <form
          action="/api/admin/lottery/draw"
          method="POST"
          className="rounded-2xl bg-slate-900 p-6 mb-8"
        >
          <h2 className="text-xl font-black mb-4">당첨 번호 입력</h2>

          <input type="hidden" name="roundId" value={round.id} />

          <div className="grid grid-cols-5 gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <input
                key={n}
                name={`number${n}`}
                type="number"
                min="1"
                max="30"
                required
                className="rounded-xl bg-slate-800 px-4 py-3 text-center"
              />
            ))}
          </div>

          <button
            type="submit"
            className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black"
          >
            정산하기
          </button>
        </form>

        <div className="rounded-2xl bg-slate-900 p-6">
          <h2 className="text-xl font-black mb-4">참여자 목록</h2>

          <div className="space-y-3">
            {entries.map((entry: any) => (
              <div
                key={entry.id}
                className="rounded-xl bg-slate-800 px-4 py-3 flex justify-between"
              >
                <span>{entry.nickname}</span>
                <span>{entry.numbers}</span>
              </div>
            ))}

            {entries.length === 0 && (
              <p className="text-slate-400">참여자가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}