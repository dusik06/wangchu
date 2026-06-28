import db from "@/lib/db";
import { getServerSession } from "next-auth";
import LotteryEntryForm from "./lottery-entry-form";

export const dynamic = "force-dynamic";

export default async function LotteryPage() {
  const session = await getServerSession();

  let currentUser: any = null;
  let myEntry: any = null;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT id, nickname, dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    currentUser = users[0] || null;
  }

  const [rounds]: any = await db.query(
    `
    SELECT *
    FROM lottery_rounds
    WHERE status = 'OPEN'
    ORDER BY id DESC
    LIMIT 1
    `
  );

  const round = rounds[0] || null;

  if (currentUser && round) {
    const [entries]: any = await db.query(
      `
      SELECT *
      FROM lottery_entries
      WHERE round_id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [round.id, currentUser.id]
    );

    myEntry = entries[0] || null;
  }

  const [lastWinners]: any = await db.query(
    `
    SELECT *
    FROM lottery_winners
    ORDER BY id DESC
    LIMIT 10
    `
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-black text-yellow-400">
          🎟 도토리 로또
        </h1>

        {!round ? (
          <div className="rounded-2xl bg-slate-900 p-8 text-slate-400">
            현재 진행 중인 로또 회차가 없습니다.
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-900 p-5">
                <p className="text-sm text-slate-400">현재 회차</p>
                <p className="mt-2 text-2xl font-black">
                  {round.round_number}회차
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-5">
                <p className="text-sm text-slate-400">현재 누적 상금</p>
                <p className="mt-2 text-2xl font-black text-yellow-300">
                  {Number(round.total_reward).toLocaleString()} 도토리
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-5">
                <p className="text-sm text-slate-400">참가비</p>
                <p className="mt-2 text-2xl font-black text-pink-400">
                  50 도토리
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-5">
                <p className="text-sm text-slate-400">내 도토리</p>
                <p className="mt-2 text-2xl font-black text-green-400">
                  {currentUser
                    ? `${Number(currentUser.dotori).toLocaleString()}개`
                    : "로그인 필요"}
                </p>
              </div>
            </section>

            <section className="mb-6 rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-black">번호 선택</h2>

              {!currentUser ? (
                <p className="text-slate-400">
                  로그인 후 로또에 참여할 수 있습니다.
                </p>
              ) : myEntry ? (
                <div className="rounded-xl bg-slate-800 p-5">
                  <p className="text-sm text-slate-400">내가 선택한 번호</p>
                  <p className="mt-2 text-2xl font-black text-yellow-300">
                    {myEntry.numbers}
                  </p>
                  <p className="mt-3 text-sm text-slate-400">
                    한 회차에는 한 번만 참여할 수 있습니다.
                  </p>
                </div>
              ) : (
                <LotteryEntryForm roundId={round.id} />
              )}
            </section>

            <section className="rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-black">최근 당첨 기록</h2>

              {lastWinners.length === 0 ? (
                <p className="text-slate-400">아직 당첨 기록이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {lastWinners.map((winner: any) => (
                    <div
                      key={winner.id}
                      className="flex justify-between rounded-xl bg-slate-800 px-4 py-3"
                    >
                      <span>
                        {winner.nickname} · {winner.rank_position}등
                      </span>
                      <span className="font-black text-yellow-300">
                        {Number(winner.reward_amount).toLocaleString()} 도토리
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}