import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockTradeBox from "./stock-trade-box";
import PolicyNotice from "@/components/PolicyNotice";

export const dynamic = "force-dynamic";

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function getChangeText(currentPrice: number, prevPrice: number | null) {
  if (!prevPrice || prevPrice <= 0) {
    return {
      text: "기준가 없음",
      className: "text-zinc-400",
    };
  }

  const diff = currentPrice - prevPrice;
  const rate = Math.floor((diff / prevPrice) * 100);

  if (diff > 0) {
    return {
      text: `▲ ${formatNumber(diff)} (${rate}%)`,
      className: "text-red-400",
    };
  }

  if (diff < 0) {
    return {
      text: `▼ ${formatNumber(Math.abs(diff))} (${Math.abs(rate)}%)`,
      className: "text-blue-400",
    };
  }

  return {
    text: "변동 없음",
    className: "text-zinc-400",
  };
}

export default async function StockPage() {
  const session = await getServerSession(authOptions);

  let currentUser: any = null;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT id, nickname, dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    currentUser = users[0] || null;
  }

  const [stocks]: any = await db.query(`
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
    ORDER BY s.is_listed DESC, s.id ASC
  `);

  const [holdings]: any = currentUser
    ? await db.query(
        `
        SELECT
          h.*,
          s.stock_name,
          s.current_price
        FROM stock_holdings h
        INNER JOIN stock_items s ON s.id = h.stock_id
        WHERE h.user_id = ?
        `,
        [currentUser.id]
      )
    : [[]];

  const holdingsMap = new Map();

  for (const holding of holdings) {
    holdingsMap.set(Number(holding.stock_id), holding);
  }

  const totalBuyAmount = holdings.reduce(
    (sum: number, h: any) => sum + Number(h.total_buy_amount || 0),
    0
  );

  const totalEvalAmount = holdings.reduce(
    (sum: number, h: any) =>
      sum + Number(h.current_price || 0) * Number(h.quantity || 0),
    0
  );

  const profit = totalEvalAmount - totalBuyAmount;
  const profitRate =
    totalBuyAmount > 0 ? Math.floor((profit / totalBuyAmount) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#f7d36b]">
              📈 도토리 주식시장
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              10분마다 가격이 변동됩니다. 가격이 0도토리가 되면 상장폐지됩니다.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-700"
          >
            메인으로
          </a>
        </div>

        {currentUser && (
          <section className="mb-6 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">보유 도토리</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">
                {formatNumber(currentUser.dotori)}개
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">총 투자금</p>
              <p className="mt-2 text-2xl font-black">
                {formatNumber(totalBuyAmount)}개
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">현재 평가금</p>
              <p className="mt-2 text-2xl font-black">
                {formatNumber(totalEvalAmount)}개
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">평가손익</p>
              <p
                className={`mt-2 text-2xl font-black ${
                  profit >= 0 ? "text-red-400" : "text-blue-400"
                }`}
              >
                {profit >= 0 ? "+" : ""}
                {formatNumber(profit)}개
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-zinc-400">수익률</p>
              <p
                className={`mt-2 text-2xl font-black ${
                  profitRate >= 0 ? "text-red-400" : "text-blue-400"
                }`}
              >
                {profitRate >= 0 ? "+" : ""}
                {profitRate}%
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-5 md:grid-cols-3">
          {stocks.map((stock: any) => {
            const change = getChangeText(
              Number(stock.current_price),
              stock.prev_price ? Number(stock.prev_price) : null
            );

            const myHolding = holdingsMap.get(Number(stock.id));
            const myQuantity = Number(myHolding?.quantity || 0);
            const myBuyAmount = Number(myHolding?.total_buy_amount || 0);
            const myAvgPrice =
              myQuantity > 0
                ? Math.floor(myBuyAmount / Math.max(myQuantity, 1))
                : 0;
            const myEvalAmount = myQuantity * Number(stock.current_price);
            const myProfit = myEvalAmount - myBuyAmount;
            const myProfitRate =
              myBuyAmount > 0
                ? Math.floor((myProfit / myBuyAmount) * 100)
                : 0;

            const buyableQuantity =
              currentUser && Number(stock.current_price) > 0
                ? Math.floor(
                    Number(currentUser.dotori || 0) /
                      Number(stock.current_price)
                  )
                : 0;

            return (
              <div
                key={stock.id}
                className={`rounded-2xl border p-5 ${
                  stock.is_listed
                    ? "border-white/10 bg-slate-900"
                    : "border-red-500/30 bg-red-950/30 opacity-70"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <a
                    href={`/stock/${stock.id}`}
                    className="text-xl font-black hover:text-[#f7d36b]"
                  >
                    {stock.stock_name}
                  </a>

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

                <p className="text-3xl font-black text-yellow-300">
                  {formatNumber(stock.current_price)} 도토리
                </p>

                <p className={`mt-2 text-sm font-bold ${change.className}`}>
                  {change.text}
                </p>

                {currentUser && stock.is_listed ? (
                  <StockTradeBox
                    stockId={stock.id}
                    currentPrice={Number(stock.current_price)}
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
                  <p className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-zinc-400">
                    {currentUser ? "거래 불가" : "로그인 후 거래 가능"}
                  </p>
                )}
              </div>
            );
          })}
        </section>

        <PolicyNotice />
      </div>
    </main>
  );
}