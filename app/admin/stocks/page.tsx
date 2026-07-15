import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockCreateForm from "./stock-create-form";
import StockEventForm from "./stock-event-form";
import StockAdminActions from "./stock-admin-actions";
import StockMarketRefreshButton from "./stock-market-refresh-button";
import StockEventAdminActions from "./stock-event-admin-actions";

export const dynamic = "force-dynamic";

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: unknown) {
  return value ? String(value).slice(0, 19).replace("T", " ") : "-";
}

export default async function AdminStocksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [adminRows]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );
  if (!adminRows.length || adminRows[0].role !== "admin") redirect("/");

  const [stocks]: any = await db.query(`
    SELECT
      s.*,
      (SELECT COUNT(*) FROM stock_price_logs WHERE stock_id = s.id) AS price_log_count,
      (SELECT COUNT(*) FROM stock_season_trades WHERE stock_id = s.id) AS season_trade_count
    FROM stock_items s
    ORDER BY s.is_listed DESC, s.id DESC
  `);

  const [seasonRows]: any = await db.query(`
    SELECT *
    FROM stock_seasons
    WHERE status IN ('ready', 'active')
    ORDER BY id DESC
    LIMIT 1
  `);
  const season = seasonRows[0] || null;

  const [eventRows]: any = await db.query(`
    SELECT
      e.*,
      s.stock_name,
      CASE
        WHEN e.is_active = 1 AND e.starts_at <= NOW() AND e.ends_at >= NOW()
        THEN 1 ELSE 0
      END AS currently_active
    FROM stock_events e
    INNER JOIN stock_items s ON s.id = e.stock_id
    ORDER BY e.id DESC
    LIMIT 50
  `);

  const [participantRows]: any = season
    ? await db.query(
        "SELECT COUNT(*) AS cnt FROM stock_season_participants WHERE season_id = ?",
        [season.id]
      )
    : [[{ cnt: 0 }]];

  const [tradeRows]: any = season
    ? await db.query(
        "SELECT COUNT(*) AS cnt FROM stock_season_trades WHERE season_id = ?",
        [season.id]
      )
    : [[{ cnt: 0 }]];

  const [roundRows]: any = season
    ? await db.query(
        "SELECT MAX(round_ended_at) AS last_round_at FROM stock_market_rounds WHERE season_id = ?",
        [season.id]
      )
    : [[{ last_round_at: null }]];

  const listed = stocks.filter((stock: any) => Number(stock.is_listed) === 1);
  const delisted = stocks.filter((stock: any) => Number(stock.is_listed) !== 1);
  const totalPrize = season
    ? Number(season.base_prize || 0) +
      Number(season.entry_fee_prize || 0) +
      Number(season.fee_prize || 0)
    : 0;

  return (
    <main className="min-h-screen bg-[#070914] px-4 py-8 text-white">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-cyan-300">
              STOCK ADMIN CENTER
            </p>
            <h1 className="mt-2 text-3xl font-black">주식 통합 관리자</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="/admin/stock/season" className="rounded-xl bg-yellow-300 px-4 py-3 text-sm font-black text-black">
              시즌 관리
            </a>
            <a href="/stock" className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-black">
              사용자 화면
            </a>
            <a href="/admin" className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-black">
              관리자 메인
            </a>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Summary label="상장 종목" value={`${listed.length}개`} />
          <Summary label="상장폐지" value={`${delisted.length}개`} />
          <Summary label="현재 시즌" value={season?.title || "없음"} />
          <Summary label="실제 참가자" value={`${participantRows[0]?.cnt || 0}명`} />
          <Summary label="시즌 거래" value={`${tradeRows[0]?.cnt || 0}회`} />
          <Summary label="현재 총상금" value={`${formatNumber(totalPrize)} 도토리`} accent />
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[#101321] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">시장 즉시 갱신</h2>
              <p className="mt-2 text-sm text-zinc-400">
                기존 10분 자동 갱신은 그대로 유지됩니다.
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-zinc-500">마지막 가격 회차</p>
              <p className="mt-1 font-black">{formatDate(roundRows[0]?.last_round_at)}</p>
            </div>
          </div>
          <StockMarketRefreshButton />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-2">
          <StockCreateForm />
          <StockEventForm stocks={stocks} />
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-[#101321] p-6">
          <h2 className="text-2xl font-black">이벤트 관리</h2>
          <p className="mt-2 text-sm text-zinc-400">
            진행 중 이벤트를 즉시 종료하거나 기록을 삭제할 수 있습니다.
          </p>

          {eventRows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500">
              등록된 이벤트가 없습니다.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {eventRows.map((event: any) => (
                <article key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex gap-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${String(event.event_type).toLowerCase() === "down" ? "bg-blue-400/10 text-blue-300" : "bg-red-400/10 text-red-300"}`}>
                          {String(event.event_type).toLowerCase() === "down" ? "악재" : "호재"}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${Number(event.currently_active) === 1 ? "bg-emerald-400/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-400"}`}>
                          {Number(event.currently_active) === 1 ? "진행 중" : "종료됨"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-black">{event.event_title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{event.stock_name}</p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>{formatDate(event.starts_at)}</p>
                      <p className="mt-1">~ {formatDate(event.ends_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <StockEventAdminActions
                      eventId={Number(event.id)}
                      eventTitle={String(event.event_title)}
                      currentlyActive={Number(event.currently_active) === 1}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <StockList title="상장 종목" stocks={listed} />
        <div className="mt-6">
          <StockList title="상장폐지 종목" stocks={delisted} danger />
        </div>
      </div>
    </main>
  );
}

function StockList({ title, stocks, danger = false }: { title: string; stocks: any[]; danger?: boolean }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#101321] p-6">
      <h2 className="text-2xl font-black">{title}</h2>

      {stocks.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500">
          표시할 종목이 없습니다.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {stocks.map((stock: any) => (
            <article key={stock.id} className={`rounded-2xl border p-5 ${danger ? "border-red-400/15 bg-red-400/5" : "border-white/10 bg-black/20"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">{stock.stock_name}</h3>
                  <p className="mt-2 text-xs text-zinc-500">
                    일반 ±{stock.normal_rate}% · 특수 {stock.special_chance}% · 특수폭 ±{stock.special_rate}%
                  </p>
                </div>
                <p className="text-2xl font-black text-yellow-300">
                  {formatNumber(stock.current_price)}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-zinc-500">가격 기록</p>
                  <p className="mt-1 font-black">{formatNumber(stock.price_log_count)}건</p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-zinc-500">시즌 거래</p>
                  <p className="mt-1 font-black">{formatNumber(stock.season_trade_count)}건</p>
                </div>
              </div>

              <StockAdminActions stock={stock} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101321] p-5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-2 font-black ${accent ? "text-yellow-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
