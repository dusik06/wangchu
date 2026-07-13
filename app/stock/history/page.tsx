import db from "@/lib/db";

export const dynamic = "force-dynamic";

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString();
}

function formatRate(value: unknown) {
  const rate = Number(value || 0);

  return `${rate > 0 ? "+" : ""}${rate.toFixed(2)}%`;
}

function formatDate(value: unknown) {
  const text = String(value || "").slice(0, 19).replace("T", " ");
  return text || "-";
}

export default async function StockHistoryPage() {
  const [seasonRows]: any = await db.query(
    `
    SELECT
      id,
      season_no,
      title,
      currency_name,
      base_prize,
      entry_fee_prize,
      fee_prize,
      winner_nickname,
      winner_profit_rate,
      winner_prize_amount,
      starts_at,
      ends_at,
      settled_at
    FROM stock_seasons
    WHERE status = 'ended'
    ORDER BY season_no DESC, id DESC
    LIMIT 30
    `
  );

  const seasons = [];

  for (const season of seasonRows) {
    const [rewardRows]: any = await db.query(
      `
      SELECT
        rank_no,
        nickname_snapshot,
        profit_rate,
        prize_rate,
        prize_amount
      FROM stock_season_rewards
      WHERE season_id = ?
      ORDER BY rank_no ASC
      `,
      [season.id]
    );

    seasons.push({
      ...season,
      rewards: rewardRows,
    });
  }

  return (
    <main className="min-h-screen bg-[#070914] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-yellow-300">
              SEASON HISTORY
            </p>

            <h1 className="mt-2 text-3xl font-black">
              지난 주식 시즌
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              역대 시즌 우승자와 최종 보상 기록입니다.
            </p>
          </div>

          <a
            href="/stock"
            className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-black transition hover:bg-slate-700"
          >
            현재 시즌으로
          </a>
        </header>

        {seasons.length === 0 ? (
          <section className="rounded-3xl border border-white/10 bg-[#101321] p-10 text-center text-zinc-400">
            아직 종료된 주식 시즌이 없습니다.
          </section>
        ) : (
          <div className="space-y-5">
            {seasons.map((season: any) => {
              const totalPrize =
                Number(season.base_prize || 0) +
                Number(season.entry_fee_prize || 0) +
                Number(season.fee_prize || 0);

              return (
                <section
                  key={season.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#101321]"
                >
                  <div className="border-b border-white/10 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="mt-2 text-2xl font-black">
                          {season.title}
                        </h2>

                        <p className="mt-2 text-xs text-zinc-500">
                          {formatDate(season.starts_at)} ~{" "}
                          {formatDate(season.ends_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-yellow-300/15 bg-yellow-300/5 px-5 py-4 text-right">
                        <p className="text-xs text-zinc-500">
                          최종 총상금
                        </p>

                        <p className="mt-1 text-xl font-black text-yellow-300">
                          {formatNumber(totalPrize)} 도토리
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-3">
                    {[1, 2, 3].map((rank) => {
                      const reward = season.rewards.find(
                        (item: any) => Number(item.rank_no) === rank
                      );

                      return (
                        <div
                          key={rank}
                          className={`rounded-2xl border p-5 ${
                            rank === 1
                              ? "border-yellow-300/20 bg-yellow-300/10"
                              : "border-white/10 bg-black/20"
                          }`}
                        >
                          <p className="text-xs font-black text-zinc-500">
                            {rank}등
                          </p>

                          <p className="mt-2 text-lg font-black">
                            {reward?.nickname_snapshot || "수상자 없음"}
                          </p>

                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">
                                최종 수익률
                              </span>
                              <strong
                                className={
                                  Number(reward?.profit_rate || 0) >= 0
                                    ? "text-red-400"
                                    : "text-blue-400"
                                }
                              >
                                {reward
                                  ? formatRate(reward.profit_rate)
                                  : "-"}
                              </strong>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-zinc-500">
                                지급 보상
                              </span>
                              <strong className="text-yellow-300">
                                {reward
                                  ? `${formatNumber(
                                      reward.prize_amount
                                    )} 도토리`
                                  : "-"}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
