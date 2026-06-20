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
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR");
}

function getPriceColor(diff: number) {
  if (diff > 0) return "text-red-400";
  if (diff < 0) return "text-blue-400";
  return "text-zinc-400";
}

function getRangeConfig(range?: string) {
  if (range === "1m") return { key: "1m", label: "1분", minutes: 60 };
  if (range === "30m") return { key: "30m", label: "30분", minutes: 1800 };
  if (range === "1h") return { key: "1h", label: "1시간", minutes: 3600 };
  return { key: "10m", label: "10분", minutes: 720 };
}

export default async function StockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const rangeConfig = getRangeConfig(sp?.range);

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
    SELECT
      s.*,
      (
        SELECT price
        FROM stock_price_logs
        WHERE stock_id = s.id
          AND created_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) AS prev_price
    FROM stock_items s
    WHERE s.id = ?
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
      AND created_at >= DATE_SUB(NOW(), INTERVAL ${rangeConfig.minutes} MINUTE)
    ORDER BY id ASC
    LIMIT 240
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

  const [stockList]: any = await db.query(`
    SELECT
      s.id,
      s.stock_name,
      s.current_price,
      s.is_listed,
      (
        SELECT price
        FROM stock_price_logs
        WHERE stock_id = s.id
          AND created_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) AS prev_price
    FROM stock_items s
    ORDER BY s.is_listed DESC, s.current_price DESC
    LIMIT 12
  `);

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

  const currentPrice = Number(stock.current_price || 0);
  const prevPrice = Number(stock.prev_price || 0);
  const diff = prevPrice > 0 ? currentPrice - prevPrice : 0;
  const rate = prevPrice > 0 ? Math.floor((diff / prevPrice) * 100) : 0;

  const logPrices = logs.map((log: any) => Number(log.price || 0));
  const highPrice = Math.max(...logPrices, currentPrice, 0);
  const lowPrice = Math.min(...logPrices, currentPrice);
  const chartMax = Math.max(...logPrices, currentPrice, 1);
  const chartMin = Math.min(...logPrices, currentPrice, chartMax);
  const chartRange = Math.max(chartMax - chartMin, 1);

  const recentVolume = trades.reduce(
    (sum: number, trade: any) => sum + Number(trade.quantity || 0),
    0
  );

  const recentTradeAmount = trades.reduce(
    (sum: number, trade: any) => sum + Number(trade.total_amount || 0),
    0
  );

  const myQuantity = Number(myHolding?.quantity || 0);
  const myBuyAmount = Number(myHolding?.total_buy_amount || 0);
  const myAvgPrice =
    myQuantity > 0 ? Math.floor(myBuyAmount / Math.max(myQuantity, 1)) : 0;
  const myEvalAmount = myQuantity * currentPrice;
  const myProfit = myEvalAmount - myBuyAmount;
  const myProfitRate =
    myBuyAmount > 0 ? Math.floor((myProfit / myBuyAmount) * 100) : 0;

  const buyableQuantity =
    currentUser && currentPrice > 0
      ? Math.floor(Number(currentUser.dotori || 0) / currentPrice)
      : 0;

  const dangerPrice = currentPrice <= 100;

  const ranges = [
    { key: "1m", label: "1분" },
    { key: "10m", label: "10분" },
    { key: "30m", label: "30분" },
    { key: "1h", label: "1시간" },
  ];

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-8 text-white">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-500">도토리 주식시장</p>
            <h1 className="mt-1 text-3xl font-black text-[#f7d36b]">
              {stock.stock_name}
            </h1>
          </div>

          <a
            href="/stock"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-700"
          >
            주식 목록
          </a>
        </div>

        <section className="mb-5 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="flex flex-wrap items-end gap-4">
                <p className="text-5xl font-black text-yellow-300">
                  {formatNumber(currentPrice)}
                  <span className="ml-2 text-xl">도토리</span>
                </p>

                <p className={`text-2xl font-black ${getPriceColor(diff)}`}>
                  {prevPrice > 0 ? (
                    <>
                      {diff > 0 && "▲ "}
                      {diff < 0 && "▼ "}
                      {diff > 0 ? "+" : ""}
                      {formatNumber(diff)} ({rate > 0 ? "+" : ""}
                      {rate}%)
                    </>
                  ) : (
                    "기준가 없음"
                  )}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {stock.is_listed ? (
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-black">
                    상장중
                  </span>
                ) : (
                  <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                    상장폐지
                  </span>
                )}

                {dangerPrice && stock.is_listed && (
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                    ⚠ 상장폐지 위험
                  </span>
                )}

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-zinc-300">
                  현재 차트: {rangeConfig.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-xs text-zinc-500">고가</p>
                <p className="mt-1 text-xl font-black text-red-400">
                  {formatNumber(highPrice)}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-xs text-zinc-500">저가</p>
                <p className="mt-1 text-xl font-black text-blue-400">
                  {formatNumber(lowPrice)}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-xs text-zinc-500">최근 거래량</p>
                <p className="mt-1 text-xl font-black">
                  {formatNumber(recentVolume)}주
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-xs text-zinc-500">최근 거래대금</p>
                <p className="mt-1 text-xl font-black">
                  {formatNumber(recentTradeAmount)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">가격 차트</h2>
                <div className="flex gap-2 text-xs font-bold">
                  {ranges.map((range) => (
                    <a
                      key={range.key}
                      href={`/stock/${id}?range=${range.key}`}
                      className={`rounded-lg px-3 py-2 ${
                        rangeConfig.key === range.key
                          ? "bg-[#f7d36b] text-black"
                          : "bg-slate-800 text-zinc-400 hover:bg-slate-700"
                      }`}
                    >
                      {range.label}
                    </a>
                  ))}
                </div>
              </div>

              {logs.length === 0 ? (
                <p className="text-zinc-400">아직 가격 기록이 없습니다.</p>
              ) : (
                <div className="relative h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="absolute inset-x-5 top-5 border-t border-white/10" />
                  <div className="absolute inset-x-5 top-1/3 border-t border-white/10" />
                  <div className="absolute inset-x-5 top-2/3 border-t border-white/10" />
                  <div className="absolute inset-x-5 bottom-5 border-t border-white/10" />

                  <div className="relative z-10 flex h-full items-end gap-1">
                    {logs.map((log: any, index: number) => {
                      const price = Number(log.price || 0);
                      const prev =
                        index > 0 ? Number(logs[index - 1].price || 0) : price;
                      const candleDiff = price - prev;
                      const height = Math.max(
                        8,
                        Math.floor(((price - chartMin) / chartRange) * 350) + 12
                      );

                      return (
                        <div
                          key={log.id}
                          title={`${formatDate(log.created_at)} / ${formatNumber(
                            price
                          )}개`}
                          className={`flex-1 rounded-t ${
                            candleDiff >= 0
                              ? "bg-red-500 hover:bg-red-400"
                              : "bg-blue-500 hover:bg-blue-400"
                          }`}
                          style={{ height }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="mt-3 text-sm text-zinc-500">
                선택한 시간 범위 안의 가격 기록을 보여줍니다.
              </p>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
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
                          <td className="p-4">
                            {formatNumber(trade.quantity)}주
                          </td>
                          <td className="p-4">
                            {formatNumber(trade.price)}개
                          </td>
                          <td className="p-4">
                            {formatNumber(trade.total_amount)}개
                          </td>
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

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-black">거래하기</h2>

              {currentUser && stock.is_listed ? (
                <StockTradeBox
                  stockId={stock.id}
                  currentPrice={currentPrice}
                  userDotori={Number(currentUser.dotori || 0)}
                  myQuantity={myQuantity}
                  myAvgPrice={myAvgPrice}
                  myBuyAmount={myBuyAmount}
                  myEvalAmount={myEvalAmount}
                  myProfit={myProfit}
                  myProfitRate={myProfitRate}
                  buyableQuantity={buyableQuantity}
                />
              ) : (
                <p className="rounded-xl bg-slate-800 p-4 text-sm text-zinc-400">
                  {currentUser
                    ? "상장폐지된 주식은 거래할 수 없습니다."
                    : "로그인 후 거래 가능합니다."}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">주식 목록</h2>
                <a
                  href="/stock"
                  className="text-xs font-bold text-zinc-400 hover:text-[#f7d36b]"
                >
                  전체 보기
                </a>
              </div>

              <div className="space-y-2">
                {stockList.map((item: any) => {
                  const itemCurrent = Number(item.current_price || 0);
                  const itemPrev = Number(item.prev_price || 0);
                  const itemDiff =
                    itemPrev > 0 ? itemCurrent - itemPrev : 0;
                  const itemRate =
                    itemPrev > 0
                      ? Math.floor((itemDiff / itemPrev) * 100)
                      : 0;

                  return (
                    <a
                      key={item.id}
                      href={`/stock/${item.id}`}
                      className={`block rounded-2xl border p-4 ${
                        Number(item.id) === Number(id)
                          ? "border-[#f7d36b] bg-[#2b2415]"
                          : "border-white/10 bg-slate-800 hover:border-[#f7d36b]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-black">
                          {item.stock_name}
                        </p>
                        <p className="whitespace-nowrap font-black text-yellow-300">
                          {formatNumber(itemCurrent)}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span
                          className={
                            item.is_listed ? "text-emerald-400" : "text-red-400"
                          }
                        >
                          {item.is_listed ? "상장중" : "상장폐지"}
                        </span>

                        <span className={getPriceColor(itemDiff)}>
                          {itemPrev > 0
                            ? `${itemDiff > 0 ? "+" : ""}${formatNumber(
                                itemDiff
                              )} (${itemRate > 0 ? "+" : ""}${itemRate}%)`
                            : "기준가 없음"}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}