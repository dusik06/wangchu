import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockTradeBox from "../stock-trade-box";

export const dynamic = "force-dynamic";

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: any) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleString("ko-KR");
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  let currentUser: any = null;
  let myHolding: any = null;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT id, nickname, dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    currentUser = users[0] || null;
  }

  const [stocks]: any = await db.query(
    `
    SELECT *
    FROM stock_items
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  const stock = stocks[0];

  if (!stock) {
    redirect("/stock");
  }

  const [logs]: any = await db.query(
    `
    SELECT *
    FROM stock_price_logs
    WHERE stock_id = ?
    ORDER BY id ASC
    LIMIT 144
    `,
    [id]
  );

  const [trades]: any = await db.query(
    `
    SELECT
      t.*,
      u.nickname
    FROM stock_trades t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.stock_id = ?
    ORDER BY t.id DESC
    LIMIT 30
    `,
    [id]
  );

  if (currentUser) {
    const [holdings]: any = await db.query(
      `
      SELECT *
      FROM stock_holdings
      WHERE user_id = ?
        AND stock_id = ?
      LIMIT 1
      `,
      [currentUser.id, id]
    );

    myHolding = holdings[0] || null;
  }

  const firstPrice = logs.length ? Number(logs[0].price) : Number(stock.current_price);
  const lastPrice = Number(stock.current_price);
  const diff = lastPrice - firstPrice;
  const rate = firstPrice > 0 ? Math.floor((diff / firstPrice) * 100) : 0;

  const maxPrice = Math.max(...logs.map((log: any) => Number(log.price)), lastPrice, 1);

  const myQuantity = Number(myHolding?.quantity || 0);
  const myBuyAmount = Number(myHolding?.total_buy_amount || 0);
  const myEvalAmount = myQuantity * lastPrice;
  const myProfit = myEvalAmount - myBuyAmount;
  const myProfitRate = myBuyAmount > 0 ? Math.floor((myProfit / myBuyAmount) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#f7d36b]">
              {stock.stock_name}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              10분봉 가격 흐름과 거래 내역을 확인할 수 있습니다.
            </p>
          </div>

          <a
            href="/stock"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-700"
          >
            주식 목록
          </a>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-zinc-400">현재가</p>
            <p className="mt-2 text-3xl font-black text-yellow-300">
              {formatNumber(stock.current_price)}개
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-zinc-400">최근 흐름</p>
            <p
              className={`mt-2 text-3xl font-black ${
                diff >= 0 ? "text-red-400" : "text-blue-400"
              }`}
            >
              {diff >= 0 ? "+" : ""}
              {formatNumber(diff)} ({rate}%)
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-zinc-400">상장 상태</p>
            <p
              className={`mt-2 text-2xl font-black ${
                stock.is_listed ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {stock.is_listed ? "상장중" : "상장폐지"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-sm text-zinc-400">내 보유</p>
            <p className="mt-2 text-2xl font-black">
              {formatNumber(myQuantity)}주
            </p>
          </div>
        </section>

        {currentUser && myHolding && (
          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">내 총 투자금</p>
              <p className="mt-2 text-2xl font-black">
                {formatNumber(myBuyAmount)}개
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">현재 평가금</p>
              <p className="mt-2 text-2xl font-black">
                {formatNumber(myEvalAmount)}개
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">평가손익</p>
              <p
                className={`mt-2 text-2xl font-black ${
                  myProfit >= 0 ? "text-red-400" : "text-blue-400"
                }`}
              >
                {myProfit >= 0 ? "+" : ""}
                {formatNumber(myProfit)}개
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">수익률</p>
              <p
                className={`mt-2 text-2xl font-black ${
                  myProfitRate >= 0 ? "text-red-400" : "text-blue-400"
                }`}
              >
                {myProfitRate >= 0 ? "+" : ""}
                {myProfitRate}%
              </p>
            </div>
          </section>
        )}

        <section className="mb-6 grid gap-5 lg:grid-cols-[1.4fr_360px]">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-black">가격 그래프</h2>

            {logs.length === 0 ? (
              <p className="text-zinc-400">아직 가격 기록이 없습니다.</p>
            ) : (
              <div className="flex h-72 items-end gap-1 rounded-2xl bg-black/30 p-4">
                {logs.map((log: any) => {
                  const height = Math.max(
                    4,
                    Math.floor((Number(log.price) / maxPrice) * 250)
                  );

                  return (
                    <div
                      key={log.id}
                      title={`${formatDate(log.created_at)} / ${formatNumber(
                        log.price
                      )}개`}
                      className="flex-1 rounded-t bg-yellow-400 hover:bg-yellow-300"
                      style={{ height }}
                    />
                  );
                })}
              </div>
            )}

            <p className="mt-3 text-sm text-zinc-500">
              막대에 마우스를 올리면 해당 10분봉 가격을 볼 수 있습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-black">거래하기</h2>

            {currentUser && stock.is_listed ? (
              <StockTradeBox stockId={stock.id} />
            ) : (
              <p className="rounded-xl bg-slate-800 p-4 text-sm text-zinc-400">
                {currentUser ? "상장폐지된 주식은 거래할 수 없습니다." : "로그인 후 거래 가능합니다."}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-black">최근 거래 내역</h2>

          {trades.length === 0 ? (
            <p className="text-zinc-400">아직 거래 내역이 없습니다.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="p-4">유저</th>
                    <th className="p-4">구분</th>
                    <th className="p-4">수량</th>
                    <th className="p-4">체결가</th>
                    <th className="p-4">총액</th>
                    <th className="p-4">시간</th>
                  </tr>
                </thead>

                <tbody>
                  {trades.map((trade: any) => (
                    <tr key={trade.id} className="border-t border-white/10">
                      <td className="p-4">{trade.nickname || "익명"}</td>
                      <td
                        className={`p-4 font-black ${
                          trade.trade_type === "BUY"
                            ? "text-red-400"
                            : "text-blue-400"
                        }`}
                      >
                        {trade.trade_type === "BUY" ? "매수" : "매도"}
                      </td>
                      <td className="p-4">{formatNumber(trade.quantity)}주</td>
                      <td className="p-4">{formatNumber(trade.price)}개</td>
                      <td className="p-4">{formatNumber(trade.total_amount)}개</td>
                      <td className="p-4 text-zinc-400">
                        {formatDate(trade.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}