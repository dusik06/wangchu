import db from "@/lib/db";
import { getServerSession } from "next-auth";
import LotteryEntryForm from "./lottery-entry-form";

export const dynamic = "force-dynamic";

export default async function LotteryPage() {
  const session = await getServerSession();

  let currentUser: any = null;
  let myEntries: any[] = [];

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT id, nickname, dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    currentUser = users[0] || null;
  }

  const [rounds]: any = await db.query(`
    SELECT *
    FROM lottery_rounds
    WHERE status = 'OPEN'
    ORDER BY id DESC
    LIMIT 1
  `);

  const round = rounds[0] || null;

  if (currentUser && round) {
    const [entries]: any = await db.query(
      `
      SELECT *
      FROM lottery_entries
      WHERE round_id = ?
      AND user_id = ?
      ORDER BY id DESC
      `,
      [round.id, currentUser.id]
    );

    myEntries = entries;
  }

  const [lastWinners]: any = await db.query(`
    SELECT *
    FROM lottery_winners
    ORDER BY id DESC
    LIMIT 10
  `);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-black text-yellow-400">
          🎟 도토리 로또
        </h1>

        {round && (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-900 p-5">
                {round.round_number}회차
              </div>

              <div className="rounded-2xl bg-slate-900 p-5">
                {Number(round.total_reward).toLocaleString()} 도토리
              </div>

              <div className="rounded-2xl bg-slate-900 p-5">
                참가비 50도토리
              </div>

              <div className="rounded-2xl bg-slate-900 p-5">
                {currentUser
                  ? `${Number(currentUser.dotori).toLocaleString()}개`
                  : "로그인 필요"}
              </div>
            </section>

            <section className="mb-6 rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-black text-yellow-300">
                📜 로또 룰 설명
              </h2>

              <div className="space-y-2 text-sm text-slate-300">
                <p>• 1~30 숫자 중 5개 선택</p>
                <p>• 참가비 1회 50도토리</p>
                <p>• 여러 번 참여 가능</p>
                <p>• 1등 (5개 일치) = 총상금 70%</p>
                <p>• 2등 (4개 일치) = 총상금 20%</p>
                <p>• 3등 (3개 일치) = 총상금 10%</p>
                <p>• 당첨자 없으면 해당 등수 상금 이월</p>
                <p>• 매주 수요일 / 일요일 관리자 직접 추첨</p>
              </div>
            </section>

            <section className="mb-6 rounded-2xl bg-slate-900 p-6">
              <LotteryEntryForm roundId={round.id} />
            </section>

            <section className="mb-6 rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-black">내 참여 번호</h2>

              {myEntries.length === 0 ? (
                <p className="text-slate-400">참여 기록 없음</p>
              ) : (
                <div className="space-y-3">
                  {myEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl bg-slate-800 px-4 py-3"
                    >
                      {entry.numbers}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-black">이전 당첨 기록</h2>

              {lastWinners.length === 0 ? (
                <p className="text-slate-400">아직 당첨 기록이 없습니다.</p>
              ) : (
                lastWinners.map((winner: any) => (
                  <div
                    key={winner.id}
                    className="mb-2 flex justify-between rounded-xl bg-slate-800 px-4 py-3"
                  >
                    <span>
                      {winner.nickname} · {winner.rank_position}등
                    </span>
                    <span>
                      {Number(winner.reward_amount).toLocaleString()} 도토리
                    </span>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}