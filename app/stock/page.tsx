import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockTradeBox from "./stock-trade-box";
import StockSeasonActions from "./stock-season-actions";
import PolicyNotice from "@/components/PolicyNotice";
import {
  isMarketOpen,
  isSeasonRunning,
} from "@/lib/stock-market";

export const dynamic = "force-dynamic";

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function formatRate(value: any) {
  const rate = Number(value || 0);

  return `${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%`;
}

function formatDate(value: any) {
  if (!value) return "-";

  return String(value).slice(0, 16).replace("T", " ");
}

function getChangeText(currentPrice: number, previousPrice: number | null) {
  if (!previousPrice || previousPrice <= 0) {
    return {
      text: "비교 가격 없음",
      className: "text-zinc-400",
    };
  }

  const difference = currentPrice - previousPrice;
  const rate = (difference / previousPrice) * 100;

  if (difference > 0) {
    return {
      text: `▲ ${formatNumber(difference)} (${rate.toFixed(2)}%)`,
      className: "text-red-400",
    };
  }

  if (difference < 0) {
    return {
      text: `▼ ${formatNumber(Math.abs(difference))} (${Math.abs(
        rate
      ).toFixed(2)}%)`,
      className: "text-blue-400",
    };
  }

  return {
    text: "변동 없음",
    className: "text-zinc-400",
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

function getBuyableQuantity(
  availableMoney: number,
  price: number,
  feeRate: number
) {
  if (availableMoney <= 0 || price <= 0) {
    return 0;
  }

  let quantity = Math.floor(
    availableMoney / (price * (1 + feeRate / 100))
  );

  quantity = Math.max(0, quantity);

  while (quantity > 0) {
    const grossAmount = price * quantity;
    const feeAmount =
      feeRate > 0
        ? Math.max(1, Math.ceil((grossAmount * feeRate) / 100))
        : 0;

    if (grossAmount + feeAmount <= availableMoney) {
      return quantity;
    }

    quantity -= 1;
  }

  return 0;
}

export default async function StockPage() {
  const session = await getServerSession(authOptions);

  let currentUser: any = null;

  if (session?.user?.email) {
    const [userRows]: any = await db.query(
      `
      SELECT
        id,
        nickname,
        dotori,
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

  let seasonState = {
    running: false,
    message: "현재 진행 중인 시즌이 없습니다.",
  };

  let marketState = {
    open: false,
    message: "현재 진행 중인 시즌이 없습니다.",
    currentKstTime: "",
  };

  if (season) {
    seasonState = isSeasonRunning(season);

    marketState = isMarketOpen(
      season.market_open_time,
      season.market_close_time
    );
  }

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

  const [myHoldingRows]: any =
    season && currentUser
      ? await db.query(
          `
          SELECT
            h.*,
            s.stock_name,
            s.current_price
          FROM stock_season_holdings h
          INNER JOIN stock_items s
            ON s.id = h.stock_id
          WHERE h.season_id = ?
            AND h.user_id = ?
            AND h.quantity > 0
          `,
          [season.id, currentUser.id]
        )
      : [[]];

  const myHoldingsMap = new Map<number, any>();

  for (const holding of myHoldingRows) {
    myHoldingsMap.set(Number(holding.stock_id), holding);
  }

  const myHoldingValue = myHoldingRows.reduce(
    (sum: number, holding: any) =>
      sum +
      Number(holding.quantity || 0) *
        Number(holding.current_price || 0),
    0
  );

  const myAvailableMoney = Number(
    currentParticipant?.available_money || 0
  );

  const myStartingMoney = Math.max(
    1,
    Number(currentParticipant?.starting_money || 1)
  );

  const myTotalAsset = currentParticipant
    ? myAvailableMoney + myHoldingValue
    : 0;

  const myProfitAmount = currentParticipant
    ? myTotalAsset - myStartingMoney
    : 0;

  const myProfitRate = currentParticipant
    ? (myProfitAmount / myStartingMoney) * 100
    : 0;

  const [rankingRows]: any = season
    ? await db.query(
        `
        SELECT
          p.*,
          u.nickname,
          u.role,
          IFNULL(
            (
              SELECT SUM(
                h.quantity * s.current_price
              )
              FROM stock_season_holdings h
              INNER JOIN stock_items s
                ON s.id = h.stock_id
              WHERE h.season_id = p.season_id
                AND h.user_id = p.user_id
                AND h.quantity > 0
            ),
            0
          ) AS holding_value
        FROM stock_season_participants p
        INNER JOIN users u
          ON u.id = p.user_id
        WHERE p.season_id = ?
          AND IFNULL(u.role, '') <> 'admin'
        ORDER BY p.id ASC
        `,
        [season.id]
      )
    : [[]];

  const [allParticipantHoldingRows]: any = season
    ? await db.query(
        `
        SELECT
          h.user_id,
          h.stock_id,
          h.quantity,
          h.total_buy_amount,
          h.average_price,
          s.stock_name,
          s.current_price
        FROM stock_season_holdings h
        INNER JOIN stock_items s
          ON s.id = h.stock_id
        WHERE h.season_id = ?
          AND h.quantity > 0
        ORDER BY h.user_id ASC, s.stock_name ASC
        `,
        [season.id]
      )
    : [[]];

  const participantHoldingsMap = new Map<number, any[]>();

  for (const holding of allParticipantHoldingRows) {
    const userId = Number(holding.user_id);
    const existing = participantHoldingsMap.get(userId) || [];

    existing.push(holding);
    participantHoldingsMap.set(userId, existing);
  }

  const minimumTradeCount = Number(
    season?.min_trade_count || 0
  );

  const ranking = rankingRows
    .map((row: any) => {
      const startingMoney = Math.max(
        1,
        Number(row.starting_money || 0)
      );

      const availableMoney = Number(
        row.available_money || 0
      );

      const holdingValue = Number(row.holding_value || 0);
      const totalAsset = availableMoney + holdingValue;
      const profitAmount = totalAsset - startingMoney;
      const profitRate =
        (profitAmount / startingMoney) * 100;

      const qualified =
        Number(row.trade_count || 0) >= minimumTradeCount;

      return {
        ...row,
        availableMoney,
        holdingValue,
        totalAsset,
        profitAmount,
        profitRate,
        qualified,
        holdings:
          participantHoldingsMap.get(Number(row.user_id)) || [],
      };
    })
    .sort((a: any, b: any) => {
      if (a.qualified !== b.qualified) {
        return a.qualified ? -1 : 1;
      }

      if (b.profitRate !== a.profitRate) {
        return b.profitRate - a.profitRate;
      }

      if (b.totalAsset !== a.totalAsset) {
        return b.totalAsset - a.totalAsset;
      }

      return Number(a.id) - Number(b.id);
    });

  const qualifiedRanking = ranking.filter(
    (row: any) => row.qualified
  );

  const rewardRankMap = new Map<number, number>();

  qualifiedRanking.forEach((row: any, index: number) => {
    rewardRankMap.set(Number(row.user_id), index + 1);
  });

  const totalPrize = season
    ? Number(season.base_prize || 0) +
      Number(season.entry_fee_prize || 0) +
      Number(season.fee_prize || 0)
    : 0;

  const configuredPrizeRates = season
    ? [
        Number(season.first_prize_rate || 0),
        Number(season.second_prize_rate || 0),
        Number(season.third_prize_rate || 0),
      ]
    : [0, 0, 0];

  const expectedPrizes = [0, 0, 0];

  if (season && qualifiedRanking.length > 0) {
    const rewardedCount = Math.min(
      3,
      qualifiedRanking.length
    );

    for (let index = 0; index < rewardedCount; index++) {
      expectedPrizes[index] = Math.floor(
        (totalPrize * configuredPrizeRates[index]) / 100
      );
    }

    const distributedPrize = expectedPrizes.reduce(
      (sum, amount) => sum + amount,
      0
    );

    if (totalPrize > distributedPrize) {
      expectedPrizes[0] += totalPrize - distributedPrize;
    }
  }

  const isLoggedIn = Boolean(currentUser);
  const isAdmin = currentUser?.role === "admin";
  const alreadyJoined = Boolean(currentParticipant);

  const canJoin =
    Boolean(season) &&
    isLoggedIn &&
    !isAdmin &&
    !alreadyJoined &&
    seasonState.running;

  const canTrade =
    Boolean(season) &&
    Boolean(currentParticipant) &&
    seasonState.running &&
    marketState.open &&
    !isAdmin;

  let tradeDisabledMessage = "현재 거래할 수 없습니다.";

  if (!season) {
    tradeDisabledMessage = "현재 진행 중인 시즌이 없습니다.";
  } else if (!currentUser) {
    tradeDisabledMessage = "로그인 후 시즌에 참가해주세요.";
  } else if (isAdmin) {
    tradeDisabledMessage =
      "관리자 계정은 시즌 주식 거래를 할 수 없습니다.";
  } else if (!currentParticipant) {
    tradeDisabledMessage = "먼저 이번 시즌에 참가해주세요.";
  } else if (!seasonState.running) {
    tradeDisabledMessage = seasonState.message;
  } else if (!marketState.open) {
    tradeDisabledMessage = marketState.message;
  }

  return (
    <main className="min-h-screen bg-[#070914] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-yellow-300">
              WANGCHU STOCK MARKET
            </p>

            <h1 className="mt-2 text-3xl font-black">
              도토리 주식 시즌
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              종목별 변동 규칙과 시장 매수·매도 흐름을 확인하고
              시즌 수익률 순위를 경쟁하세요.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/stock/history"
              className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-black transition hover:bg-slate-700"
            >
              지난 시즌
            </a>

            {isAdmin && (
              <a
                href="/admin/stock/season"
                className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-sm font-black text-yellow-200 transition hover:bg-yellow-300/20"
              >
                시즌 관리
              </a>
            )}

            <a
              href="/"
              className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-black transition hover:bg-slate-700"
            >
              메인으로
            </a>
          </div>
        </header>

        {!season ? (
          <section className="mt-8 rounded-3xl border border-white/10 bg-[#101321] p-8 text-center">
            <p className="text-4xl">📉</p>

            <h2 className="mt-4 text-2xl font-black">
              현재 진행 중인 시즌이 없습니다
            </h2>

            <p className="mt-3 text-sm text-zinc-400">
              관리자가 다음 시즌을 시작하면 이곳에서 참가할 수
              있습니다.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 overflow-hidden rounded-3xl border border-yellow-300/20 bg-gradient-to-br from-[#171126] via-[#101729] to-[#0b1220] shadow-2xl">
              <div className="grid gap-0 xl:grid-cols-[1.5fr_0.8fr]">
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        seasonState.running
                          ? "bg-emerald-400 text-black"
                          : "bg-zinc-700 text-zinc-200"
                      }`}
                    >
                      {seasonState.running
                        ? "시즌 진행 중"
                        : "시즌 대기"}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${
                        marketState.open
                          ? "border-red-400/20 bg-red-400/10 text-red-300"
                          : "border-blue-400/20 bg-blue-400/10 text-blue-300"
                      }`}
                    >
                      {marketState.open ? "장 운영 중" : "휴장 중"}
                    </span>

                    <span className="text-xs font-bold text-zinc-500">
                      SEASON {season.season_no}
                    </span>
                  </div>

                  <h2 className="mt-4 text-3xl font-black md:text-4xl">
                    {season.title}
                  </h2>

                  <p className="mt-3 text-sm text-zinc-400">
                    한국시간 {formatDate(season.starts_at_text)} ~{" "}
                    {formatDate(season.ends_at_text)}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <SeasonInfo
                      label="현재 총상금"
                      value={`${formatNumber(totalPrize)} 도토리`}
                      highlight
                    />

                    <SeasonInfo
                      label="기본상금"
                      value={`${formatNumber(
                        season.base_prize
                      )} 도토리`}
                    />

                    <SeasonInfo
                      label="참가비 적립"
                      value={`${formatNumber(
                        season.entry_fee_prize
                      )} 도토리`}
                    />

                    <SeasonInfo
                      label="수수료 적립"
                      value={`${formatNumber(
                        season.fee_prize
                      )} 도토리`}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <PrizeCard
                      rank="1등 예상"
                      rate={Number(season.first_prize_rate)}
                      amount={expectedPrizes[0]}
                    />

                    <PrizeCard
                      rank="2등 예상"
                      rate={Number(season.second_prize_rate)}
                      amount={expectedPrizes[1]}
                    />

                    <PrizeCard
                      rank="3등 예상"
                      rate={Number(season.third_prize_rate)}
                      amount={expectedPrizes[2]}
                    />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                    <p className="font-black text-white">
                      시장 운영시간
                    </p>

                    <p className="mt-2">
                      한국시간{" "}
                      {String(season.market_open_time).slice(0, 5)} ~{" "}
                      {String(season.market_close_time).slice(0, 5)}
                    </p>

                    <p className="mt-1 text-zinc-500">
                      현재 한국시간 {marketState.currentKstTime} ·{" "}
                      {marketState.message}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 bg-black/20 p-6 xl:border-l xl:border-t-0">
                  <StockSeasonActions
                    seasonTitle={season.title}
                    endsAt={season.ends_at_text}
                    canJoin={canJoin}
                    alreadyJoined={alreadyJoined}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin}
                    seasonRunning={seasonState.running}
                    entryFeeDotori={Number(
                      season.entry_fee_dotori
                    )}
                    startingMoney={Number(season.starting_money)}
                    currencyName={season.currency_name}
                    seasonStateMessage={seasonState.message}
                    priceIntervalMinutes={Number(
                      season.price_interval_minutes || 10
                    )}
                  />
                </div>
              </div>
            </section>

            {currentParticipant && (
              <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <AssetCard
                  label={`보유 ${season.currency_name}`}
                  value={`${formatNumber(myAvailableMoney)}`}
                  highlight
                />

                <AssetCard
                  label="주식 평가금"
                  value={`${formatNumber(myHoldingValue)}`}
                />

                <AssetCard
                  label="현재 총자산"
                  value={`${formatNumber(myTotalAsset)}`}
                />

                <AssetCard
                  label="시즌 손익"
                  value={`${
                    myProfitAmount >= 0 ? "+" : ""
                  }${formatNumber(myProfitAmount)}`}
                  profit={myProfitAmount}
                />

                <AssetCard
                  label="시즌 수익률"
                  value={formatRate(myProfitRate)}
                  profit={myProfitRate}
                />
              </section>
            )}

            <section className="mt-8 rounded-3xl border border-white/10 bg-[#101321] p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-yellow-300">
                    LIVE RANKING
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    실시간 시즌 랭킹
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    실제 참가자 전원이 표시됩니다. 가상 참가자는
                    랭킹과 상금에 포함되지 않습니다.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
                  <span className="text-zinc-400">실제 참가자 </span>
                  <strong>{ranking.length}명</strong>
                </div>
              </div>

              {ranking.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                  아직 시즌 참가자가 없습니다.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {ranking.map((row: any, index: number) => {
                    const rewardRank =
                      rewardRankMap.get(Number(row.user_id)) || null;

                    const expectedPrize =
                      rewardRank && rewardRank <= 3
                        ? expectedPrizes[rewardRank - 1]
                        : 0;

                    return (
                      <details
                        key={row.id}
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                      >
                        <summary className="cursor-pointer list-none p-4">
                          <div className="grid items-center gap-4 sm:grid-cols-[80px_1fr] lg:grid-cols-[70px_1fr_140px_120px_160px]">
                            <div>
                              {rewardRank && rewardRank <= 3 ? (
                                <span className="text-xl font-black text-yellow-300">
                                  {rewardRank === 1
                                    ? "🥇"
                                    : rewardRank === 2
                                    ? "🥈"
                                    : "🥉"}{" "}
                                  {rewardRank}위
                                </span>
                              ) : row.qualified ? (
                                <span className="font-black text-zinc-300">
                                  {rewardRank}위
                                </span>
                              ) : (
                                <span className="text-xs font-black text-zinc-500">
                                  조건 미달
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="font-black text-white">
                                {row.nickname ||
                                  row.nickname_snapshot ||
                                  "닉네임없음"}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                클릭하면 보유 종목을 확인할 수 있습니다.
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-zinc-500">
                                현재 수익률
                              </p>

                              <p
                                className={`mt-1 text-lg font-black ${
                                  row.profitRate >= 0
                                    ? "text-red-400"
                                    : "text-blue-400"
                                }`}
                              >
                                {formatRate(row.profitRate)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-zinc-500">
                                거래 횟수
                              </p>

                              <p className="mt-1 font-black">
                                {formatNumber(row.trade_count)} /{" "}
                                {minimumTradeCount}회
                              </p>
                            </div>

                            <div>
                              {expectedPrize > 0 ? (
                                <>
                                  <p className="text-xs text-zinc-500">
                                    현재 예상 상금
                                  </p>

                                  <p className="mt-1 font-black text-yellow-300">
                                    {formatNumber(expectedPrize)} 도토리
                                  </p>
                                </>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                                    row.qualified
                                      ? "bg-emerald-400/10 text-emerald-300"
                                      : "bg-zinc-500/10 text-zinc-400"
                                  }`}
                                >
                                  {row.qualified
                                    ? "보상 조건 충족"
                                    : `${formatNumber(
                                        row.trade_count
                                      )}/${minimumTradeCount}회`}
                                </span>
                              )}
                            </div>
                          </div>
                        </summary>

                        <div className="border-t border-white/10 p-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <RankInfo
                              label={`보유 ${season.currency_name}`}
                              value={formatNumber(row.availableMoney)}
                            />

                            <RankInfo
                              label="주식 평가금"
                              value={formatNumber(row.holdingValue)}
                            />

                            <RankInfo
                              label="현재 총자산"
                              value={formatNumber(row.totalAsset)}
                            />

                            <RankInfo
                              label="시즌 손익"
                              value={`${
                                row.profitAmount >= 0 ? "+" : ""
                              }${formatNumber(row.profitAmount)}`}
                            />
                          </div>

                          <div className="mt-4">
                            <h3 className="text-sm font-black text-white">
                              보유 주식
                            </h3>

                            {row.holdings.length === 0 ? (
                              <p className="mt-3 rounded-xl bg-black/25 p-4 text-sm text-zinc-500">
                                현재 보유 중인 주식이 없습니다.
                              </p>
                            ) : (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {row.holdings.map((holding: any) => {
                                  const quantity = Number(
                                    holding.quantity || 0
                                  );

                                  const totalBuyAmount = Number(
                                    holding.total_buy_amount || 0
                                  );

                                  const currentValue =
                                    quantity *
                                    Number(
                                      holding.current_price || 0
                                    );

                                  const profit =
                                    currentValue - totalBuyAmount;

                                  const profitRate =
                                    totalBuyAmount > 0
                                      ? (profit / totalBuyAmount) * 100
                                      : 0;

                                  return (
                                    <div
                                      key={`${row.user_id}-${holding.stock_id}`}
                                      className="rounded-xl border border-white/10 bg-black/25 p-4"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="font-black">
                                          {holding.stock_name}
                                        </p>

                                        <span className="text-sm font-bold text-zinc-300">
                                          {formatNumber(quantity)}주
                                        </span>
                                      </div>

                                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <SmallInfo
                                          label="평균 매수가"
                                          value={formatNumber(
                                            holding.average_price
                                          )}
                                        />

                                        <SmallInfo
                                          label="현재가"
                                          value={formatNumber(
                                            holding.current_price
                                          )}
                                        />

                                        <SmallInfo
                                          label="평가금"
                                          value={formatNumber(currentValue)}
                                        />

                                        <SmallInfo
                                          label="수익률"
                                          value={formatRate(profitRate)}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-yellow-300">
                  STOCK LIST
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  상장 종목
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  각 종목의 일반 랜덤 변동폭과 특수 이벤트 확률을
                  확인한 뒤 투자하세요.
                </p>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {stocks.map((stock: any) => {
                  const currentPrice = Number(
                    stock.current_price || 0
                  );

                  const previousPrice = stock.prev_price
                    ? Number(stock.prev_price)
                    : null;

                  const change = getChangeText(
                    currentPrice,
                    previousPrice
                  );

                  const risk = getRiskInfo(stock);
                  const myHolding = myHoldingsMap.get(
                    Number(stock.id)
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

                  const myStockProfitRate =
                    myBuyAmount > 0
                      ? (myProfit / myBuyAmount) * 100
                      : 0;

                  const buyableQuantity = getBuyableQuantity(
                    myAvailableMoney,
                    currentPrice,
                    Number(season.trade_fee_rate || 0)
                  );

                  return (
                    <article
                      key={stock.id}
                      className={`rounded-3xl border p-5 shadow-xl ${
                        Number(stock.is_listed) === 1
                          ? "border-white/10 bg-[#101321]"
                          : "border-red-400/20 bg-red-950/10 opacity-70"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <a
                            href={`/stock/${stock.id}`}
                            className="text-2xl font-black transition hover:text-yellow-300"
                          >
                            {stock.stock_name}
                          </a>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${risk.className}`}
                            >
                              {risk.label}
                            </span>

                            {Number(stock.is_listed) === 1 ? (
                              <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                                상장중
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                                상장폐지
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-3xl font-black text-yellow-300">
                            {formatNumber(currentPrice)}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {season.currency_name}
                          </p>

                          <p
                            className={`mt-2 text-sm font-bold ${change.className}`}
                          >
                            {change.text}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                        <VolatilityCard
                          label="일반 변동"
                          value={`±${stock.normal_rate}%`}
                          description={`${season.price_interval_minutes}분마다`}
                        />

                        <VolatilityCard
                          label="특수 확률"
                          value={`${stock.special_chance}%`}
                          description="각 변동 회차"
                        />

                        <VolatilityCard
                          label="특수 변동"
                          value={`±${stock.special_rate}%`}
                          description="발생 시 최대"
                        />
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-zinc-400">
                        이 종목은 매 가격 갱신 시 일반 변동폭 안에서
                        랜덤하게 움직입니다. 각 회차에는{" "}
                        <strong className="text-white">
                          {stock.special_chance}% 확률
                        </strong>
                        로 특수 변동이 발생할 수 있으며, 실제 유저와
                        가상 참가자의 매수·매도 흐름도 제한된 범위에서
                        가격에 영향을 줍니다.
                      </div>

                      {Number(stock.is_listed) === 1 ? (
                        <StockTradeBox
                          stockId={Number(stock.id)}
                          currentPrice={currentPrice}
                          currencyName={season.currency_name}
                          availableMoney={myAvailableMoney}
                          myQuantity={myQuantity}
                          myAvgPrice={myAvgPrice}
                          myBuyAmount={myBuyAmount}
                          myEvalAmount={myEvalAmount}
                          myProfit={myProfit}
                          myProfitRate={myStockProfitRate}
                          buyableQuantity={buyableQuantity}
                          feeRate={Number(
                            season.trade_fee_rate || 0
                          )}
                          canTrade={canTrade}
                          disabledMessage={tradeDisabledMessage}
                        />
                      ) : (
                        <p className="mt-5 rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-300">
                          상장폐지된 종목은 거래할 수 없습니다.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-[#101321] p-6">
              <h2 className="text-xl font-black">시즌 이용 규칙</h2>

              <div className="mt-4 grid gap-4 text-sm leading-7 text-zinc-300 md:grid-cols-2">
                <Rule>
                  참가비는{" "}
                  <strong>
                    {formatNumber(season.entry_fee_dotori)} 도토리
                  </strong>
                  이며, 참가 시 모든 유저에게 동일한{" "}
                  <strong>
                    {formatNumber(season.starting_money)}{" "}
                    {season.currency_name}
                  </strong>
                  이 지급됩니다.
                </Rule>

                <Rule>
                  시즌 순위는 보유 {season.currency_name}과 보유 주식
                  평가금을 합친 총자산의{" "}
                  <strong>수익률</strong>로 결정됩니다.
                </Rule>

                <Rule>
                  시즌 보상을 받으려면 최소{" "}
                  <strong>{minimumTradeCount}회</strong> 이상 거래해야
                  합니다. 조건 미달 참가자도 전체 목록에는 표시됩니다.
                </Rule>

                <Rule>
                  매수와 매도마다 거래금액의{" "}
                  <strong>{season.trade_fee_rate}%</strong>가 수수료로
                  차감되며 실제 유저의 수수료는 시즌 상금에 적립됩니다.
                </Rule>

                <Rule>
                  가상 참가자는 시장의 거래량과 가격 흐름을 만들지만
                  실제 참가자 랭킹, 참가자 수, 상금에는 포함되지
                  않습니다.
                </Rule>

                <Rule>
                  시장은 한국시간{" "}
                  <strong>
                    {String(season.market_open_time).slice(0, 5)} ~{" "}
                    {String(season.market_close_time).slice(0, 5)}
                  </strong>
                  에만 거래할 수 있으며 휴장 중에는 가격도 움직이지
                  않습니다.
                </Rule>
              </div>
            </section>
          </>
        )}

        <PolicyNotice />
      </div>
    </main>
  );
}

function SeasonInfo({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-bold text-zinc-500">{label}</p>

      <p
        className={`mt-2 text-lg font-black ${
          highlight ? "text-yellow-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PrizeCard({
  rank,
  rate,
  amount,
}: {
  rank: string;
  rate: number;
  amount: number;
}) {
  return (
    <div className="rounded-2xl border border-yellow-300/15 bg-yellow-300/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-yellow-200">
          {rank}
        </p>

        <span className="text-xs text-zinc-500">{rate}%</span>
      </div>

      <p className="mt-2 text-xl font-black">
        {formatNumber(amount)} 도토리
      </p>
    </div>
  );
}

function AssetCard({
  label,
  value,
  highlight = false,
  profit,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  profit?: number;
}) {
  let className = "text-white";

  if (highlight) {
    className = "text-yellow-300";
  } else if (typeof profit === "number") {
    className =
      profit > 0
        ? "text-red-400"
        : profit < 0
        ? "text-blue-400"
        : "text-zinc-300";
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101321] p-5">
      <p className="text-sm text-zinc-500">{label}</p>

      <p className={`mt-2 text-2xl font-black ${className}`}>
        {value}
      </p>
    </div>
  );
}

function RankInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-black/25 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function SmallInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-black/30 p-2">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-zinc-200">{value}</p>
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
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      {children}
    </div>
  );
}