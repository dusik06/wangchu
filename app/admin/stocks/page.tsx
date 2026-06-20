import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import StockCreateForm from "./stock-create-form";
import StockAdminActions from "./stock-admin-actions";
import StockEventForm from "./stock-event-form";
import StockEventDeleteButton from "./stock-event-delete-button";

export const dynamic = "force-dynamic";

export default async function AdminStocksPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const [adminRows]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!adminRows.length || adminRows[0].role !== "admin") {
    redirect("/");
  }

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
    LEFT JOIN stock_items s ON s.id = e.stock_id
    ORDER BY e.id DESC
    LIMIT 30
  `);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black text-[#f7d36b]">
            주식 관리
          </h1>

          <a href="/admin" className="rounded-xl bg-slate-800 px-4 py-3">
            관리자 홈
          </a>
        </div>

        <StockCreateForm />

        <StockEventForm stocks={stocks} />

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-black">등록된 주식</h2>

          {stocks.length === 0 ? (
            <p className="text-zinc-400">등록된 주식이 없습니다.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {stocks.map((stock: any) => (
                <div
                  key={stock.id}
                  className="rounded-2xl border border-white/10 bg-slate-800 p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xl font-black">{stock.stock_name}</h3>

                    {stock.is_listed ? (
                      <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-black">
                        상장중
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                        상장폐지
                      </span>
                    )}
                  </div>

                  <p className="text-2xl font-black text-yellow-300">
                    {Number(stock.current_price).toLocaleString()} 도토리
                  </p>

                  <div className="mt-4 space-y-1 text-sm text-zinc-300">
                    <p>일반 변동폭: ±{stock.normal_rate}%</p>
                    <p>특수 확률: {stock.special_chance}%</p>
                    <p>특수 변동폭: ±{stock.special_rate}%</p>
                  </div>

                  <StockAdminActions stock={stock} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-black">최근 뉴스 이벤트</h2>

          {events.length === 0 ? (
            <p className="text-zinc-400">등록된 이벤트가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/10 bg-slate-800 p-4"
                >
                  <p className="font-black">
                    {event.stock_name} - {event.event_title}
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    {event.event_type === "up" ? "호재" : "악재"} / 변동{" "}
                    {event.event_rate}% / {String(event.starts_at).slice(0, 16)} ~{" "}
                    {String(event.ends_at).slice(0, 16)}
                  </p>

                  <StockEventDeleteButton eventId={event.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}