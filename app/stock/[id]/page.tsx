import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockTradeBox from "../stock-trade-box";
import {
  isMarketOpen,
  isSeasonRunning,
} from "@/lib/stock-market";

export const dynamic = "force-dynamic";

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: any) {
  if (!value) return "";

  const text = String(value).slice(0, 19).replace("T", " ");
  return text;
}

function formatShortTime(value: any) {
  if (!value) return "";

  const text = String(value).slice(0, 19).replace("T", " ");
  return text.slice(11, 16);
}

function getPriceColor(diff: number) {
  if (diff > 0) return "text-red-400";
  if (diff < 0) return "text-blue-400";
  return "text-zinc-400";
}

function getRangeConfig(range?: string) {
  if (range === "1m") {
    return {
      key: "1m",
      label: "1분",
      minutes: 60,
    };
  }

  if (range === "30m") {
    return {
      key: "30m",
      label: "30분",
      minutes: 1800,
    };
  }

  if (range === "1h") {
    return {
      key: "1h",
      label: "1시간",
      minutes: 3600,
    };
  }

  return {
    key: "10m",
    label: "10분",
    minutes: 720,
  };
}

function getRiskInfo(stock: any) {
  const normalRate = Number(stock.normal_rate || 0);
  const specialChance = Number(stock.special_chance || 0);
  const specialRate = Number(stock.special_rate || 0);

  const score =
    normalRate * 1.5 +
    specialChance * 0.3 +
    specialRate * 0.8;

  if (score <= 15) {
    return {
      label: "안정형",
      className:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    };
  }

  if (score <= 30) {
    return {
      label: "중립형",
      className:
        "border-yellow-300/20 bg-yellow-300/10 text-yellow-200",
    };
  }

  if (score <= 50) {
    return {
      label: "공격형",
      className:
        "border-orange-400/20 bg-orange-400/10 text-orange-300",
    };
  }

  return {
    label: "초고위험",
    className:
      "border-red-400/20 bg-red-400/10 text-red-300",
  };
}

function calculateFee(grossAmount: number, feeRate: number) {
  if (grossAmount <= 0 || feeRate <= 0) {
    return 0;
  }

  return Math.max(
    1,
    Math.ceil((grossAmount * feeRate) / 100)
  );
}

function getBuyableQuantity(
  availableMoney: number,
  currentPrice: number,
  feeRate: number
) {
  if (availableMoney <= 0 || currentPrice <= 0) {
    return 0;
  }

  let quantity = Math.floor(
    availableMoney /
      (currentPrice * (1 + feeRate / 100))
  );

  quantity = Math.max(0, quantity);

  while (quantity > 0) {
    const grossAmount = currentPrice * quantity;
    const feeAmount = calculateFee(grossAmount, feeRate);

    if (grossAmount + feeAmount <= availableMoney) {
      return quantity;
    }

    quantity -= 1;
  }

  return 0;
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

  if (session?.user?.email) {
    const [userRows]: any = await db.query(
      `
      SELECT
        id,
        nickname,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [session.user.email]
    );

    currentUser = userRows[0] || null;
  }

  const [seasonRows]: any = await db.query(`
    SELECT
      *,
      DATE_FORMAT(
        starts_at,
        '%Y-%m-%d %H:%i:%s'
      ) AS starts_at_text,
      DATE_FORMAT(
        ends_at,
        '%Y-%m-%d %H:%i:%s'
      ) AS ends_at_text
    FROM stock_seasons
    WHERE status IN ('ready', 'active')
    ORDER BY id DESC
    LIMIT 1
  `);

  const season = seasonRows[0] || null;

  const seasonState = season
    ? isSeasonRunning(season)
    : {
        running: false,
        message: "현재 진행 중인 시즌이 없습니다.",
      };

  const marketState = season
    ? isMarketOpen(
        season.market_open_time,
        season.market_close_time
      )
    : {
        open: false,
        message: "현재 진행 중인 시즌이 없습니다.",
        currentKstTime: "",
      };

  let currentParticipant: any = null;

  if (season && currentUser) {
    const [participantRows]: any = await db.query(
      `
      SELECT *
      FROM stock_season_participants
      WHERE season_id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [season.id, currentUser.id]
    );

    currentParticipant = participantRows[0] || null;
  }

  const [stockRows]: any = await db.query(
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

  const stock = stockRows[0];

  if (!stock) {
    redirect("/stock");
  }

  const [logs]: any = await db.query(
    `
    SELECT *
    FROM stock_price_logs
    WHERE stock_id = ?
      AND created_at >= DATE_SUB(
        NOW(),
        INTERVAL ${rangeConfig.minutes} MINUTE
      )
    ORDER BY id ASC
    LIMIT 240
    `,
    [id]
  );

  const [tradeRows]: any = season
    ? await db.query(
        `
        SELECT
          t.*,
          u.nickname
        FROM stock_season_trades t
        LEFT JOIN users u
          ON u.id = t.user_id
        WHERE t.season_id = ?
          AND t.stock_id = ?
        ORDER BY t.id DESC
        LIMIT 30
        `,
        [season.id, id]
      )
    : [[]];

  const trades = tradeRows || [];

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

  let myHolding: any = null;

  if (season && currentUser) {
    const [holdingRows]: any = await db.query(
      `
      SELECT *
      FROM stock_season_holdings
      WHERE season_id = ?
        AND user_id = ?
        AND stock_id = ?
      LIMIT 1
      `,
      [season.id, currentUser.id, id]
    );

    myHolding = holdingRows[0] || null;
  }

  const currentPrice = Number(stock.current_price || 0);
  const previousPrice = Number(stock.prev_price || 0);

  const priceDifference =
    previousPrice > 0
      ? currentPrice - previousPrice
      : 0;

  const priceRate =
    previousPrice > 0
      ? (priceDifference / previousPrice) * 100
      : 0;

  const logPrices = logs.map((log: any) =>
    Number(log.price || 0)
  );

  const highPrice = Math.max(
    ...logPrices,
    currentPrice,
    0
  );

  const lowPrice =
    logPrices.length > 0
      ? Math.min(...logPrices, currentPrice)
      : currentPrice;

  const chartMax = Math.max(
    ...logPrices,
    currentPrice,
    1
  );

  const chartMin =
    logPrices.length > 0
      ? Math.min(...logPrices, currentPrice)
      : currentPrice;

  const chartRange = Math.max(
    chartMax - chartMin,
    1
  );

  const recentVolume = trades.reduce(
    (sum: number, trade: any) =>
      sum + Number(trade.quantity || 0),
    0
  );

  const recentTradeAmount = trades.reduce(
    (sum: number, trade: any) =>
      sum + Number(trade.gross_amount || 0),
    0
  );

  const myQuantity = Number(
    myHolding?.quantity || 0
  );

  const myBuyAmount = Number(
    myHolding?.total_buy_amount || 0
  );

  const myAvgPrice =
    myQuantity > 0
      ? Number(
          myHolding?.average_price ||
            myBuyAmount / myQuantity
        )
      : 0;

  const myEvalAmount =
    myQuantity * currentPrice;

  const myProfit =
    myEvalAmount - myBuyAmount;

  const myProfitRate =
    myBuyAmount > 0
      ? (myProfit / myBuyAmount) * 100
      : 0;

  const currencyName =
    season?.currency_name || "시즌 화폐";

  const availableMoney = Number(
    currentParticipant?.available_money || 0
  );

  const feeRate = Number(
    season?.trade_fee_rate || 0
  );

  const buyableQuantity = getBuyableQuantity(
    availableMoney,
    currentPrice,
    feeRate
  );

  const isAdmin =
    currentUser?.role === "admin";

  const canTrade =
    Boolean(season) &&
    Boolean(currentUser) &&
    !isAdmin &&
    Boolean(currentParticipant) &&
    seasonState.running &&
    marketState.open &&
    Number(stock.is_listed) === 1;

  let tradeDisabledMessage =
    "현재 거래할 수 없습니다.";

  if (!season) {
    tradeDisabledMessage =
      "현재 진행 중인 주식 시즌이 없습니다.";
  } else if (!currentUser) {
    tradeDisabledMessage =
      "로그인 후 시즌에 참가해주세요.";
  } else if (isAdmin) {
    tradeDisabledMessage =
      "관리자 계정은 시즌 주식 거래를 할 수 없습니다.";
  } else if (!currentParticipant) {
    tradeDisabledMessage =
      "먼저 이번 시즌에 참가해주세요.";
  } else if (!seasonState.running) {
    tradeDisabledMessage =
      seasonState.message;
  } else if (!marketState.open) {
    tradeDisabledMessage =
      marketState.message;
  } else if (Number(stock.is_listed) !== 1) {
    tradeDisabledMessage =
      "상장폐지된 종목은 거래할 수 없습니다.";
  }

  const dangerPrice =
    currentPrice <= 100;

  const riskInfo = getRiskInfo(stock);

  const ranges = [
    {
      key: "1m",
      label: "1분",
    },
    {
      key: "10m",
      label: "10분",
    },
    {
      key: "30m",
      label: "30분",
    },
    {
      key: "1h",
      label: "1시간",
    },
  ];

  const chartHeight = 360;
  const chartWidth = Math.max(logs.length - 1, 1);

  const linePoints = logs
    .map((log: any, index: number) => {
      const price = Number(log.price || 0);
      const x =
        (index / chartWidth) * 100;

      const y =
        100 -
        ((price - chartMin) / chartRange) * 88 -
        6;

      return `${x},${y}`;
    })
    .join(" ");

  const highIndex = logs.findIndex(
    (log: any) =>
      Number(log.price || 0) === highPrice
  );

  const lowIndex = logs.findIndex(
    (log: any) =>
      Number(log.price || 0) === lowPrice
  );

  const highPoint =
    highIndex >= 0
      ? {
          x: (highIndex / chartWidth) * 100,
          y:
            100 -
            ((highPrice - chartMin) /
              chartRange) *
              88 -
            6,
        }
      : null;

  const lowPoint =
    lowIndex >= 0
      ? {
          x: (lowIndex / chartWidth) * 100,
          y:
            100 -
            ((lowPrice - chartMin) /
              chartRange) *
              88 -
            6,
        }
      : null;

  const currentLineY =
    100 -
    ((currentPrice - chartMin) /
      chartRange) *
      88 -
    6;

  const yTicks = [
    chartMax,
    Math.floor(
      chartMax - chartRange * 0.25
    ),
    Math.floor(
      chartMax - chartRange * 0.5
    ),
    Math.floor(
      chartMax - chartRange * 0.75
    ),
    chartMin,
  ];

  const firstLog =
    logs[0] || null;

  const middleLog =
    logs[Math.floor(logs.length / 2)] || null;

  const lastLog =
    logs[logs.length - 1] || null;

  return (
    <main className="min-h-screen bg-[#070914] px-4 py-8 text-white">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-yellow-300">
              WANGCHU STOCK MARKET
            </p>

            <h1 className="mt-2 text-3xl font-black">
              {stock.stock_name}
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              종목 가격 흐름과 변동 규칙을 확인하고 시즌 전용 화폐로 거래하세요.
            </p>
          </div>

          <a
            href="/stock"
            className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-black transition hover:bg-slate-700"
          >
            주식 목록
          </a>
        </header>

        <section className="mb-5 rounded-3xl border border-white/10 bg-[#101321] p-6 shadow-xl">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="flex flex-wrap items-end gap-4">
                <p className="text-5xl font-black text-yellow-300">
                  {formatNumber(currentPrice)}

                  <span className="ml-2 text-xl text-yellow-200">
                    {currencyName}
                  </span>
                </p>

                <p
                  className={`text-2xl font-black ${getPriceColor(
                    priceDifference
                  )}`}
                >
                  {previousPrice > 0 ? (
                    <>
                      {priceDifference > 0 && "▲ "}
                      {priceDifference < 0 && "▼ "}

                      {priceDifference > 0 ? "+" : ""}
                      {formatNumber(priceDifference)}

                      {" ("}

                      {priceRate > 0 ? "+" : ""}
                      {priceRate.toFixed(2)}%

                      {")"}
                    </>
                  ) : (
                    "기준가 없음"
                  )}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Number(stock.is_listed) === 1 ? (
                  <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                    상장중
                  </span>
                ) : (
                  <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                    상장폐지
                  </span>
                )}

                {dangerPrice &&
                  Number(stock.is_listed) === 1 && (
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                      ⚠ 상장폐지 위험
                    </span>
                  )}

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${riskInfo.className}`}
                >
                  {riskInfo.label}
                </span>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-zinc-300">
                  현재 차트: {rangeConfig.label}
                </span>

                {season && (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${
                      marketState.open
                        ? "border-red-400/20 bg-red-400/10 text-red-300"
                        : "border-blue-400/20 bg-blue-400/10 text-blue-300"
                    }`}
                  >
                    {marketState.open
                      ? "장 운영 중"
                      : "휴장 중"}
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <VolatilityCard
                  label="일반 랜덤 변동폭"
                  value={`±${stock.normal_rate}%`}
                  description={
                    season
                      ? `${season.price_interval_minutes}분마다 적용`
                      : "가격 갱신 시 적용"
                  }
                />

                <VolatilityCard
                  label="특수 이벤트 확률"
                  value={`${stock.special_chance}%`}
                  description="각 가격 변동 회차"
                />

                <VolatilityCard
                  label="특수 이벤트 변동폭"
                  value={`±${stock.special_rate}%`}
                  description="특수 변동 발생 시"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-zinc-400">
                이 종목은 일반 랜덤 변동폭 안에서 가격이 움직입니다.
                각 가격 갱신 시{" "}
                <strong className="text-white">
                  {stock.special_chance}% 확률
                </strong>
                로 특수 변동이 발생할 수 있습니다. 실제 유저와 가상 참가자의
                매수·매도 흐름도 설정된 제한 범위 안에서 가격에 영향을 줍니다.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
              <SummaryCard
                label="고가"
                value={formatNumber(highPrice)}
                className="text-red-400"
              />

              <SummaryCard
                label="저가"
                value={formatNumber(lowPrice)}
                className="text-blue-400"
              />

              <SummaryCard
                label="최근 실제 거래량"
                value={`${formatNumber(recentVolume)}주`}
              />

              <SummaryCard
                label="최근 실제 거래대금"
                value={`${formatNumber(recentTradeAmount)} ${currencyName}`}
              />
            </div>
          </div>
        </section>

        {season && (
          <section className="mb-5 rounded-3xl border border-yellow-300/15 bg-yellow-300/5 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <SeasonCard
                label="현재 시즌"
                value={season.title}
              />

              <SeasonCard
                label="시장 운영시간"
                value={`${String(
                  season.market_open_time
                ).slice(0, 5)} ~ ${String(
                  season.market_close_time
                ).slice(0, 5)}`}
              />

              <SeasonCard
                label="거래 수수료"
                value={`${feeRate}%`}
              />

              <SeasonCard
                label="현재 한국시간"
                value={
                  marketState.currentKstTime || "-"
                }
              />
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#101321] p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">
                    가격 차트
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    가격 눈금, 현재가, 최고가와 최저가를 확인할 수 있습니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {ranges.map((range) => (
                    <a
                      key={range.key}
                      href={`/stock/${id}?range=${range.key}`}
                      className={`rounded-lg px-3 py-2 transition ${
                        rangeConfig.key === range.key
                          ? "bg-yellow-300 text-black"
                          : "bg-slate-800 text-zinc-400 hover:bg-slate-700"
                      }`}
                    >
                      {range.label}
                    </a>
                  ))}
                </div>
              </div>

              {logs.length === 0 ? (
                <p className="rounded-2xl bg-black/20 p-6 text-zinc-400">
                  아직 가격 기록이 없습니다.
                </p>
              ) : (
                <div
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5"
                  style={{
                    height: chartHeight + 80,
                  }}
                >
                  <div className="absolute bottom-12 left-5 right-16 top-5">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent" />

                    {[0, 25, 50, 75, 100].map(
                      (top) => (
                        <div
                          key={top}
                          className="absolute left-0 right-0 border-t border-white/10"
                          style={{
                            top: `${top}%`,
                          }}
                        />
                      )
                    )}

                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-yellow-300/50"
                      style={{
                        top: `${currentLineY}%`,
                      }}
                    >
                      <span className="absolute -right-14 -top-3 rounded bg-yellow-300 px-2 py-1 text-[10px] font-black text-black">
                        현재가
                      </span>
                    </div>

                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full overflow-visible"
                    >
                      <polyline
                        points={linePoints}
                        fill="none"
                        stroke={
                          priceDifference >= 0
                            ? "#f87171"
                            : "#60a5fa"
                        }
                        strokeWidth="1.4"
                        vectorEffect="non-scaling-stroke"
                      />

                      {logs.map(
                        (
                          log: any,
                          index: number
                        ) => {
                          const price = Number(
                            log.price || 0
                          );

                          const previous =
                            index > 0
                              ? Number(
                                  logs[index - 1]
                                    .price || 0
                                )
                              : price;

                          const pointDifference =
                            price - previous;

                          const x =
                            (index /
                              chartWidth) *
                            100;

                          const y =
                            100 -
                            ((price -
                              chartMin) /
                              chartRange) *
                              88 -
                            6;

                          return (
                            <circle
                              key={log.id}
                              cx={x}
                              cy={y}
                              r="0.65"
                              fill={
                                pointDifference >= 0
                                  ? "#ef4444"
                                  : "#3b82f6"
                              }
                            >
                              <title>
                                {formatDate(
                                  log.created_at
                                )}{" "}
                                /{" "}
                                {formatNumber(
                                  price
                                )}{" "}
                                {currencyName}
                              </title>
                            </circle>
                          );
                        }
                      )}

                      {highPoint && (
                        <circle
                          cx={highPoint.x}
                          cy={highPoint.y}
                          r="1.2"
                          fill="#ef4444"
                        />
                      )}

                      {lowPoint && (
                        <circle
                          cx={lowPoint.x}
                          cy={lowPoint.y}
                          r="1.2"
                          fill="#3b82f6"
                        />
                      )}
                    </svg>

                    {highPoint && (
                      <div
                        className="absolute rounded-lg bg-red-500 px-2 py-1 text-[10px] font-black text-white"
                        style={{
                          left: `${Math.min(
                            highPoint.x,
                            82
                          )}%`,
                          top: `${Math.max(
                            highPoint.y - 8,
                            0
                          )}%`,
                        }}
                      >
                        최고{" "}
                        {formatNumber(
                          highPrice
                        )}
                      </div>
                    )}

                    {lowPoint && (
                      <div
                        className="absolute rounded-lg bg-blue-500 px-2 py-1 text-[10px] font-black text-white"
                        style={{
                          left: `${Math.min(
                            lowPoint.x,
                            82
                          )}%`,
                          top: `${Math.min(
                            lowPoint.y + 4,
                            88
                          )}%`,
                        }}
                      >
                        최저{" "}
                        {formatNumber(
                          lowPrice
                        )}
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-12 right-4 top-5 flex w-12 flex-col justify-between text-right text-[11px] text-zinc-500">
                    {yTicks.map(
                      (
                        tick,
                        index
                      ) => (
                        <span key={index}>
                          {formatNumber(tick)}
                        </span>
                      )
                    )}
                  </div>

                  <div className="absolute bottom-4 left-5 right-16 flex justify-between text-[11px] text-zinc-500">
                    <span>
                      {firstLog
                        ? formatShortTime(
                            firstLog.created_at
                          )
                        : ""}
                    </span>

                    <span>
                      {middleLog
                        ? formatShortTime(
                            middleLog.created_at
                          )
                        : ""}
                    </span>

                    <span>
                      {lastLog
                        ? formatShortTime(
                            lastLog.created_at
                          )
                        : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <section className="rounded-3xl border border-white/10 bg-[#101321] p-6">
              <div className="mb-4">
                <h2 className="text-xl font-black">
                  최근 실제 유저 거래
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  가상 참가자는 실제 유저 거래내역과 랭킹에 표시되지 않습니다.
                </p>
              </div>

              {trades.length === 0 ? (
                <p className="rounded-2xl bg-black/20 p-6 text-zinc-400">
                  아직 이번 시즌 실제 유저 거래 내역이 없습니다.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="min-w-[760px] w-full text-left text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="p-4">
                          유저
                        </th>

                        <th className="p-4">
                          구분
                        </th>

                        <th className="p-4">
                          수량
                        </th>

                        <th className="p-4">
                          체결가
                        </th>

                        <th className="p-4">
                          거래금액
                        </th>

                        <th className="p-4">
                          수수료
                        </th>

                        <th className="p-4">
                          시간
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {trades.map(
                        (trade: any) => (
                          <tr
                            key={trade.id}
                            className="border-t border-white/10"
                          >
                            <td className="p-4 font-bold">
                              {trade.nickname ||
                                "닉네임없음"}
                            </td>

                            <td
                              className={`p-4 font-black ${
                                trade.trade_type ===
                                "BUY"
                                  ? "text-red-400"
                                  : "text-blue-400"
                              }`}
                            >
                              {trade.trade_type ===
                              "BUY"
                                ? "매수"
                                : "매도"}
                            </td>

                            <td className="p-4">
                              {formatNumber(
                                trade.quantity
                              )}
                              주
                            </td>

                            <td className="p-4">
                              {formatNumber(
                                trade.unit_price
                              )}{" "}
                              {currencyName}
                            </td>

                            <td className="p-4">
                              {formatNumber(
                                trade.gross_amount
                              )}{" "}
                              {currencyName}
                            </td>

                            <td className="p-4 text-yellow-300">
                              {formatNumber(
                                trade.fee_amount
                              )}{" "}
                              {currencyName}
                            </td>

                            <td className="p-4 text-zinc-400">
                              {formatDate(
                                trade.created_at
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#101321] p-6">
              <div className="mb-4">
                <h2 className="text-xl font-black">
                  거래하기
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  매수·매도 시 거래금액의 {feeRate}%가 수수료로 차감됩니다.
                </p>
              </div>

              <StockTradeBox
                stockId={Number(stock.id)}
                currentPrice={currentPrice}
                currencyName={currencyName}
                availableMoney={availableMoney}
                myQuantity={myQuantity}
                myAvgPrice={myAvgPrice}
                myBuyAmount={myBuyAmount}
                myEvalAmount={myEvalAmount}
                myProfit={myProfit}
                myProfitRate={myProfitRate}
                buyableQuantity={buyableQuantity}
                feeRate={feeRate}
                canTrade={canTrade}
                disabledMessage={
                  tradeDisabledMessage
                }
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#101321] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">
                  주식 목록
                </h2>

                <a
                  href="/stock"
                  className="text-xs font-bold text-zinc-400 transition hover:text-yellow-300"
                >
                  전체 보기
                </a>
              </div>

              <div className="space-y-2">
                {stockList.map(
                  (item: any) => {
                    const itemCurrent =
                      Number(
                        item.current_price ||
                          0
                      );

                    const itemPrevious =
                      Number(
                        item.prev_price ||
                          0
                      );

                    const itemDifference =
                      itemPrevious > 0
                        ? itemCurrent -
                          itemPrevious
                        : 0;

                    const itemRate =
                      itemPrevious > 0
                        ? (itemDifference /
                            itemPrevious) *
                          100
                        : 0;

                    return (
                      <a
                        key={item.id}
                        href={`/stock/${item.id}`}
                        className={`block rounded-2xl border p-4 transition ${
                          Number(
                            item.id
                          ) === Number(id)
                            ? "border-yellow-300 bg-yellow-300/10"
                            : "border-white/10 bg-black/20 hover:border-yellow-300/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate font-black">
                            {item.stock_name}
                          </p>

                          <p className="whitespace-nowrap font-black text-yellow-300">
                            {formatNumber(
                              itemCurrent
                            )}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span
                            className={
                              Number(
                                item.is_listed
                              ) === 1
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {Number(
                              item.is_listed
                            ) === 1
                              ? "상장중"
                              : "상장폐지"}
                          </span>

                          <span
                            className={getPriceColor(
                              itemDifference
                            )}
                          >
                            {itemPrevious > 0
                              ? `${
                                  itemDifference >
                                  0
                                    ? "+"
                                    : ""
                                }${formatNumber(
                                  itemDifference
                                )} (${
                                  itemRate > 0
                                    ? "+"
                                    : ""
                                }${itemRate.toFixed(
                                  2
                                )}%)`
                              : "기준가 없음"}
                          </span>
                        </div>
                      </a>
                    );
                  }
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  className = "text-white",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${className}`}
      >
        {value}
      </p>
    </div>
  );
}

function SeasonCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-2 font-black text-white">
        {value}
      </p>
    </div>
  );
}

function VolatilityCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}