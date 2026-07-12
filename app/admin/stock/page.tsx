import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockCreateForm from "../stocks/stock-create-form";
import StockAdminActions from "../stocks/stock-admin-actions";
import StockEventForm from "../stocks/stock-event-form";
import StockEventDeleteButton from "../stocks/stock-event-delete-button";
import StockSeasonManager from "./stock-season-manager";

export const dynamic = "force-dynamic";

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: any) {
  if (!value) return "-";

  return String(value).slice(0, 16).replace("T", " ");
}

export default async function AdminStockPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  const [adminRows]: any = await db.query(
    `
    SELECT id, role
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [session.user.email]
  );

  const admin = adminRows[0];

  if (!admin || admin.role !== "admin") {
    redirect("/");
  }

  const [activeSeasonRows]: any = await db.query(`
    SELECT *
    FROM stock_seasons
    WHERE status IN ('ready', 'active')
    ORDER BY id DESC
    LIMIT 1
  `);

  const activeSeason = activeSeasonRows[0] || null;

  const [participantCountRows]: any = activeSeason
    ? await db.query(
        `
        SELECT
          COUNT(*) AS participant_count,
          SUM(
            CASE
              WHEN trade_count >= ? THEN 1
              ELSE 0
            END
          ) AS qualified_count
        FROM stock_season_participants
        WHERE season_id = ?
        `,
        [
          Number(activeSeason.min_trade_count || 0),
          activeSeason.id,
        ]
      )
    : [[{ participant_count: 0, qualified_count: 0 }]];

  const participantCount = Number(
    participantCountRows[0]?.participant_count || 0
  );

  const qualifiedCount = Number(
    participantCountRows[0]?.qualified_count || 0
  );

  const [seasonHistory]: any = await db.query(`
    SELECT *
    FROM stock_seasons
    WHERE status = 'ended'
    ORDER BY season_no DESC
    LIMIT 20
  `);

  const [stocks]: any = await db.query(`
    SELECT *
    FROM stock_items
    ORDER BY is_listed DESC, id DESC
  `);

  const [events]: any = await db.query(`
    SELECT
      e.*,
      s.stock_name
    FROM stock_events e
    LEFT JOIN stock_items s
      ON s.id = e.stock_id
    ORDER BY e.id DESC
    LIMIT 30
  `);

  const [delistLogs]: any = await db.query(`
    SELECT *
    FROM stock_delist_logs
    ORDER BY id DESC
    LIMIT 30
  `);

  return (
    <main className="min-h-screen bg-[#070914] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-yellow-300">
              WANGCHU STOCK ADMIN
            </p>

            <h1 className="mt-2 text-3xl font-black">
              주식시장 관리
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              모든 시즌 시간과 시장 운영시간은 한국시간 기준입니다.
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-black transition hover:bg-slate-700"
          >
            관리자 홈
          </a>
        </header>

        <StockSeasonManager
          activeSeason={activeSeason}
          participantCount={participantCount}
          qualifiedCount={qualifiedCount}
        />

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#101321] p-6">
          <h2 className="text-xl font-black">지난 시즌 기록</h2>

          {seasonHistory.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              종료된 시즌 기록이 없습니다.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {seasonHistory.map((season: any) => {
                const totalPrize =
                  Number(season.base_prize || 0) +
                  Number(season.entry_fee_prize || 0) +
                  Number(season.fee_prize || 0);

                return (
                  <article
                    key={season.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-500">
                          SEASON {season.season_no}
                        </p>

                        <h3 className="mt-1 text-xl font-black">
                          {season.title}
                        </h3>
                      </div>

                      <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-black">
                        종료
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-zinc-400">
                      {formatDate(season.starts_at)} ~{" "}
                      {formatDate(season.ends_at)}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-black/30 p-3">
                        <p className="text-xs text-zinc-500">총상금</p>
                        <p className="mt-1 font-black text-yellow-300">
                          {formatNumber(totalPrize)} 도토리
                        </p>
                      </div>

                      <div className="rounded-xl bg-black/30 p-3">
                        <p className="text-xs text-zinc-500">전용 화폐</p>
                        <p className="mt-1 font-black">
                          {season.currency_name}
                        </p>
                      </div>
                    </div>

                    {season.winner_nickname ? (
                      <div className="mt-4 rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-4">
                        <p className="text-xs font-bold text-yellow-200">
                          시즌 우승자
                        </p>

                        <p className="mt-1 text-lg font-black text-white">
                          {season.winner_nickname}
                        </p>

                        <p className="mt-1 text-sm text-yellow-200">
                          {Number(season.winner_profit_rate) >= 0
                            ? "+"
                            : ""}
                          {season.winner_profit_rate}% ·{" "}
                          {formatNumber(
                            season.winner_prize_amount
                          )}{" "}
                          도토리
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-black/30 p-3 text-sm text-zinc-500">
                        보상 조건을 충족한 우승자가 없습니다.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="min-w-0">
            <StockCreateForm />
          </div>

          <div className="min-w-0">
            <StockEventForm stocks={stocks} />
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#101321] p-6">
          <h2 className="text-xl font-black">등록된 주식</h2>

          {stocks.length === 0 ? (
            <p className="mt-4 text-zinc-400">
              등록된 주식이 없습니다.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stocks.map((stock: any) => (
                <article
                  key={stock.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black">
                      {stock.stock_name}
                    </h3>

                    {Number(stock.is_listed) === 1 ? (
                      <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                        상장중
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black">
                        상장폐지
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-2xl font-black text-yellow-300">
                    {formatNumber(stock.current_price)} 도토리
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-black/30 p-3">
                      <p className="text-xs text-zinc-500">일반 변동</p>
                      <p className="mt-1 font-black">
                        ±{stock.normal_rate}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-black/30 p-3">
                      <p className="text-xs text-zinc-500">특수 확률</p>
                      <p className="mt-1 font-black">
                        {stock.special_chance}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-black/30 p-3">
                      <p className="text-xs text-zinc-500">특수 변동</p>
                      <p className="mt-1 font-black">
                        ±{stock.special_rate}%
                      </p>
                    </div>
                  </div>

                  <StockAdminActions stock={stock} />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#101321] p-6">
          <h2 className="text-xl font-black">최근 뉴스 이벤트</h2>

          {events.length === 0 ? (
            <p className="mt-4 text-zinc-400">
              등록된 이벤트가 없습니다.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {events.map((event: any) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-black">
                    {event.stock_name || "삭제된 종목"} ·{" "}
                    {event.event_title}
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    {event.event_type === "up" ? "호재" : "악재"} ·{" "}
                    {event.event_rate}% ·{" "}
                    {formatDate(event.starts_at)} ~{" "}
                    {formatDate(event.ends_at)}
                  </p>

                  <StockEventDeleteButton eventId={event.id} />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-950/10 p-6">
          <h2 className="text-xl font-black text-red-300">
            상장폐지 기록
          </h2>

          {delistLogs.length === 0 ? (
            <p className="mt-4 text-zinc-400">
              상장폐지 기록이 없습니다.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {delistLogs.map((log: any) => (
                <article
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-red-300">
                      {log.stock_name}
                    </p>

                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-black text-red-200">
                      {log.delist_type === "AUTO"
                        ? "자동 상폐"
                        : "관리자 상폐"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
                    <p>
                      이전 가격: {formatNumber(log.old_price)}
                    </p>
                    <p>
                      최종 가격: {formatNumber(log.new_price)}
                    </p>
                    <p>
                      변동 금액: {formatNumber(log.change_amount)}
                    </p>
                    <p>변동률: {log.change_rate}%</p>
                    <p>
                      삭제된 보유량:{" "}
                      {formatNumber(log.deleted_quantity)}주
                    </p>
                    <p>사유: {log.reason}</p>
                  </div>

                  <p className="mt-3 text-xs text-zinc-500">
                    {formatDate(log.created_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}