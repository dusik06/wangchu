import { NextResponse } from "next/server";
import db from "@/lib/db";
import { settleStockSeason } from "@/lib/stock-season-settlement";
import {
  getKstClock,
  getSeasonNowText,
  isMarketOpen,
  isSeasonRunning,
} from "@/lib/stock-market";

type StockRow = {
  id: number;
  stock_name: string;
  current_price: number;
  normal_rate: number;
  special_chance: number;
  special_rate: number;
  normal_down_min?: number;
  normal_down_max?: number;
  normal_up_min?: number;
  normal_up_max?: number;
  special_up_min?: number;
  special_up_max?: number;
  market_trend?: string | null;
  trend_rounds_left?: number | null;
  auto_event_cooldown_until?: any;
  is_listed: number;
  last_updated_at: any;
  previous_price?: number | null;
};

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value: unknown, fallback = 0) {
  return Math.floor(num(value, fallback));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number) {
  return Math.min(min, max) + Math.random() * Math.abs(max - min);
}

function randomInteger(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomBoolean(percent: number) {
  return Math.random() * 100 < clamp(percent, 0, 100);
}

const AUTO_EVENT_MESSAGES = [
  "신제품 기대감이 높아졌습니다.",
  "대규모 투자 소식이 전해졌습니다.",
  "실적 개선 기대감이 반영됐습니다.",
  "신규 사업 발표로 관심이 몰렸습니다.",
  "대형 계약 체결 소식이 전해졌습니다.",
  "시장에 강한 매수세가 유입됐습니다.",
  "긍정적인 소식으로 거래가 활발해졌습니다.",
];

function chooseAutoEventMessage() {
  return AUTO_EVENT_MESSAGES[randomInteger(0, AUTO_EVENT_MESSAGES.length - 1)];
}

function nextTrend(currentTrend: string, finalChangeRate: number) {
  if (finalChangeRate >= 12) return "OVERHEAT";
  if (finalChangeRate <= -8) return "REBOUND";
  if (finalChangeRate >= 2) return "RISE";
  if (finalChangeRate <= -2) return "WEAK";
  if (currentTrend === "OVERHEAT" && finalChangeRate < 0) return "NORMAL";
  if (currentTrend === "REBOUND" && finalChangeRate > 0) return "NORMAL";
  return currentTrend || "NORMAL";
}

function timeToSeconds(value: unknown) {
  const match = String(value || "").match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return hour * 3600 + minute * 60 + second;
}

function inTimeWindow(current: number, startValue: unknown, endValue: unknown) {
  const start = timeToSeconds(startValue);
  const end = timeToSeconds(endValue);

  if (start === null || end === null) return false;
  if (start === end) return true;
  if (start < end) return current >= start && current < end;

  return current >= start || current < end;
}

function mysqlText(value: any) {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 19).replace("T", " ");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (v: number) => String(v).padStart(2, "0");

  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(
    kst.getUTCDate()
  )} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(
    kst.getUTCSeconds()
  )}`;
}

function addMinutes(value: string, minutes: number) {
  const date = new Date(`${value.replace(" ", "T")}+09:00`);

  if (Number.isNaN(date.getTime())) return value;

  const target = new Date(date.getTime() + minutes * 60 * 1000);
  const kst = new Date(target.getTime() + 9 * 60 * 60 * 1000);
  const pad = (v: number) => String(v).padStart(2, "0");

  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(
    kst.getUTCDate()
  )} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(
    kst.getUTCSeconds()
  )}`;
}

function riskScore(stock: StockRow) {
  return clamp(
    Math.round(
      num(stock.normal_rate) * 0.25 +
        num(stock.special_chance) * 0.08 +
        num(stock.special_rate) * 0.12
    ),
    1,
    5
  );
}

function trendRate(stock: StockRow) {
  const current = num(stock.current_price);
  const previous = num(stock.previous_price);

  if (current <= 0 || previous <= 0) return 0;

  return ((current - previous) / previous) * 100;
}

function chooseStock(
  bot: any,
  stocks: StockRow[],
  holdings: Map<number, any>,
  wantsBuy: boolean,
  mistake: boolean
) {
  const candidates = stocks.map((stock) => {
    const risk = riskScore(stock);
    const trend = trendRate(stock);
    const hasHolding = int(holdings.get(stock.id)?.quantity) > 0;
    let score = Math.random() * 10;

    switch (bot.strategy_type) {
      case "SAFE":
        score += (6 - risk) * 5;
        break;
      case "HOLDER":
        score += (6 - risk) * 3 + (wantsBuy ? 6 : -2);
        break;
      case "AGGRESSIVE":
        score += risk * 5 + Math.abs(trend) * 1.5;
        break;
      case "TREND":
        score += wantsBuy ? trend * 4 : -trend * 4;
        break;
      case "COUNTER":
        score += wantsBuy ? -trend * 4 : trend * 4;
        break;
      case "IMPULSE":
        score += Math.abs(trend) * 3 + risk * 2;
        break;
    }

    score -= Math.abs(risk - int(bot.preferred_risk_level, 3)) * 2;

    if (!wantsBuy && !hasHolding) score -= 100;
    if (mistake) score *= -1;

    return { stock, score };
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.stock || null;
}

async function runBots(
  connection: any,
  season: any,
  stocks: StockRow[],
  now: string
) {
  if (
    Number(season.virtual_trader_enabled || 0) !== 1 ||
    int(season.virtual_trader_count) <= 0 ||
    randomBoolean(num(season.no_virtual_trade_chance))
  ) {
    return { attempted: 0, executed: 0 };
  }

  const clock = getKstClock();

  const [botRows]: any = await connection.query(
    `
    SELECT *
    FROM stock_virtual_traders
    WHERE season_id = ?
      AND is_active = 1
      AND (next_action_at IS NULL OR next_action_at <= ?)
    ORDER BY next_action_at ASC, id ASC
    LIMIT 3
    FOR UPDATE
    `,
    [season.id, now]
  );

  let attempted = 0;
  let executed = 0;

  for (const bot of botRows) {
    attempted += 1;

    const minInterval = Math.max(
      5,
      int(bot.min_action_interval_minutes, 20)
    );
    const maxInterval = Math.max(
      minInterval,
      int(bot.max_action_interval_minutes, 90)
    );
    const nextActionAt = addMinutes(
      now,
      randomInteger(minInterval, maxInterval)
    );

    if (
      !inTimeWindow(
        clock.totalSeconds,
        bot.activity_start_time,
        bot.activity_end_time
      )
    ) {
      await connection.query(
        `
        UPDATE stock_virtual_traders
        SET next_action_at = ?, updated_at = ?
        WHERE id = ? AND season_id = ?
        `,
        [nextActionAt, now, bot.id, season.id]
      );
      continue;
    }

    const [holdingRows]: any = await connection.query(
      `
      SELECT *
      FROM stock_virtual_holdings
      WHERE season_id = ?
        AND virtual_trader_id = ?
        AND quantity > 0
      FOR UPDATE
      `,
      [season.id, bot.id]
    );

    const holdingMap = new Map<number, any>();

    for (const holding of holdingRows) {
      holdingMap.set(Number(holding.stock_id), holding);
    }

    let wantsBuy =
      holdingRows.length === 0 ||
      randomBoolean(num(bot.buy_bias_rate, 50));

    if (int(bot.available_money) <= 0) wantsBuy = false;

    const mistake = randomBoolean(num(bot.mistake_rate, 25));
    const stock = chooseStock(bot, stocks, holdingMap, wantsBuy, mistake);

    if (!stock) continue;

    const unitPrice = Math.max(1, int(stock.current_price));
    const minBudgetRate = clamp(num(bot.min_trade_budget_rate, 5), 1, 100);
    const maxBudgetRate = clamp(
      num(bot.max_trade_budget_rate, 20),
      minBudgetRate,
      100
    );

    let tradeType: "BUY" | "SELL" = wantsBuy ? "BUY" : "SELL";
    let quantity = 0;
    let grossAmount = 0;
    let decisionReason = "";

    if (tradeType === "BUY") {
      const budget = Math.floor(
        int(bot.available_money) *
          (randomBetween(minBudgetRate, maxBudgetRate) / 100)
      );

      quantity = Math.floor(budget / unitPrice);

      if (quantity <= 0) {
        await connection.query(
          `
          UPDATE stock_virtual_traders
          SET next_action_at = ?, updated_at = ?
          WHERE id = ? AND season_id = ?
          `,
          [nextActionAt, now, bot.id, season.id]
        );
        continue;
      }

      grossAmount = quantity * unitPrice;

      const [existingRows]: any = await connection.query(
        `
        SELECT *
        FROM stock_virtual_holdings
        WHERE season_id = ?
          AND virtual_trader_id = ?
          AND stock_id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [season.id, bot.id, stock.id]
      );

      const existing = existingRows[0];

      if (existing) {
        const nextQuantity = int(existing.quantity) + quantity;
        const nextBuyAmount =
          int(existing.total_buy_amount) + grossAmount;

        await connection.query(
          `
          UPDATE stock_virtual_holdings
          SET quantity = ?,
              total_buy_amount = ?,
              average_price = ?,
              updated_at = ?
          WHERE id = ?
          `,
          [
            nextQuantity,
            nextBuyAmount,
            nextBuyAmount / nextQuantity,
            now,
            existing.id,
          ]
        );
      } else {
        await connection.query(
          `
          INSERT INTO stock_virtual_holdings
          (
            season_id,
            virtual_trader_id,
            stock_id,
            quantity,
            total_buy_amount,
            average_price,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            season.id,
            bot.id,
            stock.id,
            quantity,
            grossAmount,
            unitPrice,
            now,
            now,
          ]
        );
      }

      const [updatedBot]: any = await connection.query(
        `
        UPDATE stock_virtual_traders
        SET available_money = available_money - ?,
            trade_count = trade_count + 1,
            total_buy_amount = total_buy_amount + ?,
            last_action_at = ?,
            next_action_at = ?,
            updated_at = ?
        WHERE id = ?
          AND season_id = ?
          AND available_money >= ?
        `,
        [
          grossAmount,
          grossAmount,
          now,
          nextActionAt,
          now,
          bot.id,
          season.id,
          grossAmount,
        ]
      );

      if (!updatedBot.affectedRows) continue;

      decisionReason = mistake
        ? "판단 실수로 매수"
        : `${bot.strategy_type} 전략 매수`;
    } else {
      const holding = holdingMap.get(Number(stock.id));

      if (!holding) continue;

      const holdingQuantity = int(holding.quantity);
      quantity = Math.min(
        holdingQuantity,
        Math.max(
          1,
          Math.floor(
            holdingQuantity *
              (randomBetween(minBudgetRate, maxBudgetRate) / 100)
          )
        )
      );
      grossAmount = quantity * unitPrice;

      const removedBuyAmount = Math.floor(
        (int(holding.total_buy_amount) * quantity) / holdingQuantity
      );
      const nextQuantity = holdingQuantity - quantity;
      const nextBuyAmount = Math.max(
        0,
        int(holding.total_buy_amount) - removedBuyAmount
      );

      if (nextQuantity <= 0) {
        await connection.query(
          `DELETE FROM stock_virtual_holdings WHERE id = ?`,
          [holding.id]
        );
      } else {
        await connection.query(
          `
          UPDATE stock_virtual_holdings
          SET quantity = ?,
              total_buy_amount = ?,
              average_price = ?,
              updated_at = ?
          WHERE id = ?
          `,
          [
            nextQuantity,
            nextBuyAmount,
            nextBuyAmount / nextQuantity,
            now,
            holding.id,
          ]
        );
      }

      await connection.query(
        `
        UPDATE stock_virtual_traders
        SET available_money = available_money + ?,
            trade_count = trade_count + 1,
            total_sell_amount = total_sell_amount + ?,
            last_action_at = ?,
            next_action_at = ?,
            updated_at = ?
        WHERE id = ? AND season_id = ?
        `,
        [
          grossAmount,
          grossAmount,
          now,
          nextActionAt,
          now,
          bot.id,
          season.id,
        ]
      );

      decisionReason = mistake
        ? "판단 실수로 매도"
        : `${bot.strategy_type} 전략 매도`;
    }

    await connection.query(
      `
      INSERT INTO stock_virtual_trades
      (
        season_id,
        virtual_trader_id,
        stock_id,
        strategy_type,
        trade_type,
        quantity,
        unit_price,
        gross_amount,
        decision_reason,
        was_mistake,
        market_round_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
      `,
      [
        season.id,
        bot.id,
        stock.id,
        bot.strategy_type,
        tradeType,
        quantity,
        unitPrice,
        grossAmount,
        decisionReason,
        mistake ? 1 : 0,
        now,
      ]
    );

    executed += 1;
  }

  return { attempted, executed };
}

async function pressure(
  connection: any,
  table: "stock_season_trades" | "stock_virtual_trades",
  season: any,
  stock: StockRow,
  since: string,
  maxPressure: number
) {
  const identityColumn =
    table === "stock_season_trades" ? "user_id" : "virtual_trader_id";

  const [rows]: any = await connection.query(
    `
    SELECT
      ${identityColumn} AS actor_id,
      SUM(CASE WHEN trade_type = 'BUY' THEN gross_amount ELSE 0 END) AS buy_amount,
      SUM(CASE WHEN trade_type = 'SELL' THEN gross_amount ELSE 0 END) AS sell_amount,
      SUM(CASE WHEN trade_type = 'BUY' THEN 1 ELSE 0 END) AS buy_count,
      SUM(CASE WHEN trade_type = 'SELL' THEN 1 ELSE 0 END) AS sell_count
    FROM ${table}
    WHERE season_id = ?
      AND stock_id = ?
      AND created_at > ?
    GROUP BY ${identityColumn}
    `,
    [season.id, stock.id, since]
  );

  const rawTotal = rows.reduce(
    (sum: number, row: any) =>
      sum + num(row.buy_amount) + num(row.sell_amount),
    0
  );
  const actorCap = Math.max(
    num(stock.current_price) * 10,
    rawTotal * 0.2
  );

  let buyAmount = 0;
  let sellAmount = 0;
  let buyCount = 0;
  let sellCount = 0;

  for (const row of rows) {
    const net = num(row.buy_amount) - num(row.sell_amount);
    const capped = clamp(net, -actorCap, actorCap);

    if (capped > 0) buyAmount += capped;
    if (capped < 0) sellAmount += Math.abs(capped);

    buyCount += int(row.buy_count);
    sellCount += int(row.sell_count);
  }

  const denominator = Math.max(buyAmount + sellAmount, 1);
  const rate = clamp(
    ((buyAmount - sellAmount) / denominator) * maxPressure,
    -maxPressure,
    maxPressure
  );

  return {
    rate,
    buyAmount,
    sellAmount,
    buyCount,
    sellCount,
  };
}

async function recalculateParticipants(
  connection: any,
  season: any,
  now: string
) {
  const [participants]: any = await connection.query(
    `
    SELECT id, starting_money, available_money, trade_count
    FROM stock_season_participants
    WHERE season_id = ?
    FOR UPDATE
    `,
    [season.id]
  );

  for (const participant of participants) {
    const [holdings]: any = await connection.query(
      `
      SELECT
        h.id,
        h.quantity,
        h.total_buy_amount,
        s.current_price
      FROM stock_season_holdings h
      INNER JOIN stock_items s ON s.id = h.stock_id
      WHERE h.season_id = ?
        AND h.participant_id = ?
        AND h.quantity > 0
      FOR UPDATE
      `,
      [season.id, participant.id]
    );

    let holdingValue = 0;

    for (const holding of holdings) {
      const currentValue =
        int(holding.quantity) * int(holding.current_price);
      const profitAmount =
        currentValue - int(holding.total_buy_amount);
      const profitRate =
        int(holding.total_buy_amount) > 0
          ? (profitAmount / int(holding.total_buy_amount)) * 100
          : 0;

      holdingValue += currentValue;

      await connection.query(
        `
        UPDATE stock_season_holdings
        SET current_value = ?,
            profit_amount = ?,
            profit_rate = ?,
            updated_at = ?
        WHERE id = ?
        `,
        [currentValue, profitAmount, profitRate, now, holding.id]
      );
    }

    const startingMoney = Math.max(1, int(participant.starting_money));
    const availableMoney = Math.max(0, int(participant.available_money));
    const totalAsset = availableMoney + holdingValue;
    const profitAmount = totalAsset - startingMoney;
    const profitRate = (profitAmount / startingMoney) * 100;

    await connection.query(
      `
      UPDATE stock_season_participants
      SET current_holding_value = ?,
          current_total_asset = ?,
          current_profit_amount = ?,
          current_profit_rate = ?,
          is_reward_qualified = ?,
          updated_at = ?
      WHERE id = ? AND season_id = ?
      `,
      [
        holdingValue,
        totalAsset,
        profitAmount,
        profitRate,
        int(participant.trade_count) >= int(season.min_trade_count) ? 1 : 0,
        now,
        participant.id,
        season.id,
      ]
    );
  }
}

export async function POST() {
  const connection = await db.getConnection();
  let locked = false;

  try {
    const [lockRows]: any = await connection.query(
      "SELECT GET_LOCK('wangchu_stock_market_refresh', 1) AS locked"
    );

    locked = Number(lockRows?.[0]?.locked || 0) === 1;

    if (!locked) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "다른 가격 갱신 작업이 진행 중입니다.",
      });
    }

    await connection.beginTransaction();

    const now = getSeasonNowText();

    const [seasonRows]: any = await connection.query(
      `
      SELECT
        *,
        DATE_FORMAT(starts_at, '%Y-%m-%d %H:%i:%s') AS starts_at_text,
        DATE_FORMAT(ends_at, '%Y-%m-%d %H:%i:%s') AS ends_at_text
      FROM stock_seasons
      WHERE status IN ('ready', 'active')
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
      `
    );

    const season = seasonRows[0];

    if (!season) {
      await connection.commit();
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        message: "진행 중인 시즌이 없습니다.",
      });
    }

    const seasonEndsAt = new Date(
      `${String(season.ends_at_text).replace(" ", "T")}+09:00`
    ).getTime();

    if (
      !Number.isNaN(seasonEndsAt) &&
      Date.now() >= seasonEndsAt
    ) {
      const settlement = await settleStockSeason(
        connection,
        season,
        now
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        updatedCount: 0,
        marketOpen: false,
        autoSettled: settlement.settled,
        settlement,
        message: settlement.settled
          ? `${season.title} 시즌 자동 정산이 완료되었습니다.`
          : `${season.title} 시즌은 이미 정산되었습니다.`,
      });
    }

    const seasonState = isSeasonRunning(season);
    const marketState = isMarketOpen(
      season.market_open_time,
      season.market_close_time
    );

    if (!seasonState.running || !marketState.open) {
      await connection.commit();
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        marketOpen: false,
        message: seasonState.running
          ? marketState.message
          : seasonState.message,
      });
    }

    const [allStocks]: any = await connection.query(
      `
      SELECT
        s.*,
        (
          SELECT price
          FROM stock_price_logs
          WHERE stock_id = s.id
          ORDER BY id DESC
          LIMIT 1, 1
        ) AS previous_price
      FROM stock_items s
      WHERE s.is_listed = 1
      ORDER BY s.id ASC
      FOR UPDATE
      `
    );

    const botResult = await runBots(
      connection,
      season,
      allStocks,
      now
    );

    const intervalMinutes = Math.max(
      1,
      int(season.price_interval_minutes, 10)
    );

    const [dueStocks]: any = await connection.query(
      `
      SELECT
        s.*,
        (
          SELECT price
          FROM stock_price_logs
          WHERE stock_id = s.id
          ORDER BY id DESC
          LIMIT 1, 1
        ) AS previous_price
      FROM stock_items s
      WHERE s.is_listed = 1
        AND (
          s.last_updated_at IS NULL
          OR s.last_updated_at <= DATE_SUB(?, INTERVAL ${intervalMinutes} MINUTE)
        )
      ORDER BY s.id ASC
      FOR UPDATE
      `,
      [now]
    );

    let updatedCount = 0;
    let delistedCount = 0;

    for (const stock of dueStocks as StockRow[]) {
      const since =
        mysqlText(stock.last_updated_at) ||
        addMinutes(now, -intervalMinutes);

      const realPressure = await pressure(
        connection,
        "stock_season_trades",
        season,
        stock,
        since,
        num(season.real_user_max_pressure_rate, 2)
      );
      const virtualPressure = await pressure(
        connection,
        "stock_virtual_trades",
        season,
        stock,
        since,
        num(season.virtual_max_pressure_rate, 1.5)
      );

      const [eventRows]: any = await connection.query(
        `
        SELECT *
        FROM stock_events
        WHERE stock_id = ?
          AND is_active = 1
          AND starts_at <= ?
          AND ends_at >= ?
        ORDER BY id DESC
        LIMIT 1
        `,
        [stock.id, now, now]
      );

      const event = eventRows[0] || null;
      const fallbackNormal = Math.max(0.1, Math.abs(num(stock.normal_rate, 3)));
      const normalDownMin = Math.max(0.1, num(stock.normal_down_min, Math.min(1, fallbackNormal)));
      const normalDownMax = Math.max(normalDownMin, num(stock.normal_down_max, fallbackNormal));
      const normalUpMin = Math.max(0.1, num(stock.normal_up_min, Math.min(1, fallbackNormal)));
      const normalUpMax = Math.max(normalUpMin, num(stock.normal_up_max, Math.max(fallbackNormal, normalDownMax + 1)));
      const specialChance = clamp(num(stock.special_chance), 0, 100);
      const fallbackSpecial = Math.max(1, Math.abs(num(stock.special_rate, 10)));
      const specialUpMin = Math.max(0.1, num(stock.special_up_min, Math.min(5, fallbackSpecial)));
      const specialUpMax = Math.max(specialUpMin, num(stock.special_up_max, fallbackSpecial));
      const cooldownUntil = mysqlText(stock.auto_event_cooldown_until);
      const cooldownReady = !cooldownUntil || cooldownUntil <= now;
      const specialTriggered = cooldownReady && randomBoolean(specialChance);
      const currentTrend = String(stock.market_trend || "NORMAL").toUpperCase();

      let upChance = 56;
      if (currentTrend === "RISE") upChance = 66;
      if (currentTrend === "WEAK") upChance = 42;
      if (currentTrend === "OVERHEAT") upChance = 35;
      if (currentTrend === "REBOUND") upChance = 68;

      const normalUp = randomBoolean(upChance);
      let randomRate = specialTriggered
        ? randomBetween(specialUpMin, specialUpMax)
        : normalUp
          ? randomBetween(normalUpMin, normalUpMax)
          : -randomBetween(normalDownMin, normalDownMax);

      const autoEventTitle = specialTriggered
        ? `🚨 ${stock.stock_name} 자동 호재 발생`
        : null;
      const autoEventMessage = specialTriggered ? chooseAutoEventMessage() : null;

      const endsAt = new Date(
        `${String(season.ends_at_text).replace(" ", "T")}+09:00`
      ).getTime();
      const remainingHours =
        (endsAt - Date.now()) / (60 * 60 * 1000);
      const finalDayApplied =
        Number(season.final_day_enabled || 0) === 1 &&
        remainingHours > 0 &&
        remainingHours <= num(season.final_day_hours, 24);

      let finalDayBonusRate = 0;

      if (finalDayApplied) {
        const before = randomRate;
        randomRate *= clamp(
          num(season.final_day_volatility_multiplier, 1.25),
          1,
          5
        );
        finalDayBonusRate = randomRate - before;
      }

      const eventRate = event
        ? (event.event_type === "down" ? -1 : 1) *
          Math.abs(num(event.event_rate))
        : 0;
      const maxPressure = Math.abs(
        num(season.total_max_pressure_rate, 2.5)
      );
      const combinedPressure = clamp(
        realPressure.rate + virtualPressure.rate,
        -maxPressure,
        maxPressure
      );

      const oldPrice = Math.max(0, int(stock.current_price));
      let finalChangeRate = clamp(
        randomRate + combinedPressure + eventRate,
        -95,
        300
      );
      let newPrice =
        oldPrice + Math.trunc(oldPrice * (finalChangeRate / 100));

      if (finalChangeRate !== 0 && newPrice === oldPrice) {
        newPrice = finalChangeRate > 0 ? oldPrice + 1 : oldPrice - 1;
      }

      if (newPrice <= 0) {
        const [holdingRows]: any = await connection.query(
          `
          SELECT IFNULL(SUM(quantity), 0) AS total_quantity
          FROM stock_season_holdings
          WHERE season_id = ? AND stock_id = ?
          `,
          [season.id, stock.id]
        );

        const deletedQuantity = int(holdingRows[0]?.total_quantity);

        await connection.query(
          `
          UPDATE stock_items
          SET current_price = 0,
              is_listed = 0,
              last_updated_at = ?
          WHERE id = ?
          `,
          [now, stock.id]
        );

        await connection.query(
          `
          INSERT INTO stock_price_logs
          (stock_id, price, change_amount, change_rate, event_title, created_at)
          VALUES (?, 0, ?, -100, ?, ?)
          `,
          [
            stock.id,
            -oldPrice,
            event?.event_title || "자동 상장폐지",
            now,
          ]
        );

        await connection.query(
          `
          INSERT INTO stock_delist_logs
          (
            stock_id,
            stock_name,
            delist_type,
            old_price,
            new_price,
            change_amount,
            change_rate,
            deleted_quantity,
            reason,
            created_at
          )
          VALUES (?, ?, 'AUTO', ?, 0, ?, -100, ?, ?, ?)
          `,
          [
            stock.id,
            stock.stock_name,
            oldPrice,
            -oldPrice,
            deletedQuantity,
            event?.event_title || "가격 0 이하 자동 상장폐지",
            now,
          ]
        );

        await connection.query(
          `
          DELETE FROM stock_season_holdings
          WHERE season_id = ? AND stock_id = ?
          `,
          [season.id, stock.id]
        );
        await connection.query(
          `
          DELETE FROM stock_virtual_holdings
          WHERE season_id = ? AND stock_id = ?
          `,
          [season.id, stock.id]
        );

        newPrice = 0;
        finalChangeRate = -100;
        delistedCount += 1;
      } else {
        const actualChangeAmount = newPrice - oldPrice;
        finalChangeRate =
          oldPrice > 0 ? (actualChangeAmount / oldPrice) * 100 : 0;

        await connection.query(
          `
          UPDATE stock_items
          SET current_price = ?,
              market_trend = ?,
              trend_rounds_left = ?,
              auto_event_cooldown_until = ?,
              last_updated_at = ?
          WHERE id = ?
          `,
          [
            newPrice,
            nextTrend(currentTrend, finalChangeRate),
            Math.max(0, int(stock.trend_rounds_left, 0) - 1),
            specialTriggered ? addMinutes(now, intervalMinutes * 6) : cooldownUntil,
            now,
            stock.id,
          ]
        );

        await connection.query(
          `
          INSERT INTO stock_price_logs
          (stock_id, price, change_amount, change_rate, event_title, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            stock.id,
            newPrice,
            actualChangeAmount,
            finalChangeRate,
            autoEventTitle || event?.event_title || null,
            now,
          ]
        );
      }

      if (specialTriggered && autoEventTitle) {
        const eventEndsAt = addMinutes(now, Math.max(intervalMinutes, 10));
        await connection.query(
          `
          INSERT INTO stock_events
          (stock_id, event_title, event_type, event_rate, starts_at, ends_at, is_active, created_at)
          VALUES (?, ?, 'up', ?, ?, ?, 1, ?)
          `,
          [
            stock.id,
            `${autoEventTitle} · ${autoEventMessage}`,
            Number(randomRate.toFixed(4)),
            now,
            eventEndsAt,
            now,
          ]
        );
      }

      await connection.query(
        `
        INSERT INTO stock_market_rounds
        (
          season_id,
          stock_id,
          round_started_at,
          round_ended_at,
          old_price,
          new_price,
          normal_rate_limit,
          special_chance,
          special_rate_limit,
          random_rate,
          real_user_pressure_rate,
          virtual_pressure_rate,
          event_rate,
          final_day_bonus_rate,
          final_change_rate,
          real_buy_amount,
          real_sell_amount,
          virtual_buy_amount,
          virtual_sell_amount,
          real_buy_count,
          real_sell_count,
          virtual_buy_count,
          virtual_sell_count,
          special_event_triggered,
          final_day_applied,
          market_status,
          calculation_note,
          created_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
        `,
        [
          season.id,
          stock.id,
          since,
          now,
          oldPrice,
          newPrice,
          Math.max(normalDownMax, normalUpMax),
          specialChance,
          specialUpMax,
          randomRate,
          realPressure.rate,
          virtualPressure.rate,
          eventRate,
          finalDayBonusRate,
          finalChangeRate,
          Math.round(realPressure.buyAmount),
          Math.round(realPressure.sellAmount),
          Math.round(virtualPressure.buyAmount),
          Math.round(virtualPressure.sellAmount),
          realPressure.buyCount,
          realPressure.sellCount,
          virtualPressure.buyCount,
          virtualPressure.sellCount,
          specialTriggered ? 1 : 0,
          finalDayApplied ? 1 : 0,
          [
            specialTriggered ? `자동호재:${autoEventMessage}` : "일반변동",
            event?.event_title ? `수동이벤트:${event.event_title}` : null,
            `흐름:${currentTrend}`,
          ]
            .filter(Boolean)
            .join(" / "),
          now,
        ]
      );

      updatedCount += 1;
    }

    await recalculateParticipants(connection, season, now);
    await connection.commit();

    return NextResponse.json({
      success: true,
      marketOpen: true,
      updatedCount,
      delistedCount,
      virtualTraderAttempted: botResult.attempted,
      virtualTraderExecuted: botResult.executed,
      message:
        updatedCount > 0
          ? `${updatedCount}개 종목의 가격이 갱신되었습니다.`
          : "아직 가격 갱신 시간이 되지 않았습니다.",
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    console.error("Stock market refresh error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "주식시장 가격 갱신 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    if (locked) {
      try {
        await connection.query(
          "SELECT RELEASE_LOCK('wangchu_stock_market_refresh')"
        );
      } catch {}
    }

    connection.release();
  }
}
