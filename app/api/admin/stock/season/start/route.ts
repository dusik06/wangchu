import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  addMinutesToKstMysql,
  datetimeLocalToMysql,
  getKstMysqlNow,
  kstMysqlToTimestamp,
} from "@/lib/stock-time";

const BOT_TEMPLATES = [
  ["SAFE_A", "안정형 A", "SAFE", "저변동 종목 분산형", "11:00:00", "23:00:00", 50, 120, 5, 12, 58, 20, 1],
  ["SAFE_B", "장기형 B", "HOLDER", "저빈도 장기 보유형", "13:00:00", "01:00:00", 70, 150, 6, 15, 62, 23, 2],
  ["AGGRESSIVE", "공격형", "AGGRESSIVE", "고변동 적극 거래형", "18:00:00", "02:00:00", 20, 65, 10, 25, 52, 32, 5],
  ["TREND", "추세형", "TREND", "상승 추세 추종형", "10:00:00", "22:30:00", 30, 85, 7, 18, 55, 27, 3],
  ["COUNTER", "역추세형", "COUNTER", "급락 매수·급등 매도형", "14:00:00", "01:30:00", 35, 95, 6, 20, 50, 30, 4],
  ["IMPULSE", "충동형", "IMPULSE", "뉴스 민감 충동형", "19:00:00", "02:00:00", 15, 55, 8, 22, 50, 40, 4],
] as const;

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value: unknown, fallback = 0) {
  return Math.floor(num(value, fallback));
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "시즌 설정값을 읽을 수 없습니다." },
      { status: 400 }
    );
  }

  const title = String(body.title || "").trim();
  const currencyName = String(body.currencyName || "").trim();
  const startsAt = datetimeLocalToMysql(String(body.startsAt || ""));
  const endsAt = datetimeLocalToMysql(String(body.endsAt || ""));

  const values = {
    entryFeeDotori: int(body.entryFeeDotori),
    startingMoney: int(body.startingMoney),
    basePrize: int(body.basePrize),
    includeEntryFeeInPrize: body.includeEntryFeeInPrize === true ? 1 : 0,
    tradeFeeRate: num(body.tradeFeeRate),
    minTradeCount: int(body.minTradeCount),
    firstPrizeRate: num(body.firstPrizeRate),
    secondPrizeRate: num(body.secondPrizeRate),
    thirdPrizeRate: num(body.thirdPrizeRate),
    marketOpenTime: String(body.marketOpenTime || ""),
    marketCloseTime: String(body.marketCloseTime || ""),
    priceIntervalMinutes: int(body.priceIntervalMinutes),
    virtualTraderEnabled: body.virtualTraderEnabled === true ? 1 : 0,
    virtualTraderCount: int(body.virtualTraderCount),
    noVirtualTradeChance: num(body.noVirtualTradeChance),
    virtualMaxPressureRate: num(body.virtualMaxPressureRate),
    realUserMaxPressureRate: num(body.realUserMaxPressureRate),
    totalMaxPressureRate: num(body.totalMaxPressureRate),
    finalDayEnabled: body.finalDayEnabled === true ? 1 : 0,
    finalDayHours: int(body.finalDayHours),
    finalDayVolatilityMultiplier: num(body.finalDayVolatilityMultiplier),
  };

  if (!title || !currencyName || !startsAt || !endsAt) {
    return NextResponse.json(
      { success: false, message: "필수 시즌 설정값을 확인해주세요." },
      { status: 400 }
    );
  }

  const startTs = kstMysqlToTimestamp(startsAt);
  const endTs = kstMysqlToTimestamp(endsAt);

  if (
    Number.isNaN(startTs) ||
    Number.isNaN(endTs) ||
    endTs <= startTs ||
    endTs <= Date.now()
  ) {
    return NextResponse.json(
      { success: false, message: "시즌 시작·종료 시간을 확인해주세요." },
      { status: 400 }
    );
  }

  if (
    values.startingMoney <= 0 ||
    values.entryFeeDotori < 0 ||
    values.basePrize < 0 ||
    values.tradeFeeRate < 0 ||
    values.tradeFeeRate > 20 ||
    values.minTradeCount < 0 ||
    values.virtualTraderCount < 0 ||
    values.virtualTraderCount > 30 ||
    values.priceIntervalMinutes < 1 ||
    !validTime(values.marketOpenTime) ||
    !validTime(values.marketCloseTime)
  ) {
    return NextResponse.json(
      { success: false, message: "시즌 숫자 설정값을 확인해주세요." },
      { status: 400 }
    );
  }

  if (
    Number(
      (
        values.firstPrizeRate +
        values.secondPrizeRate +
        values.thirdPrizeRate
      ).toFixed(3)
    ) !== 100
  ) {
    return NextResponse.json(
      { success: false, message: "1~3등 상금 비율 합계는 100%여야 합니다." },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();
  let locked = false;

  try {
    const [lockRows]: any = await connection.query(
      "SELECT GET_LOCK('wangchu_stock_season_start', 5) AS locked"
    );
    locked = Number(lockRows?.[0]?.locked || 0) === 1;

    if (!locked) {
      return NextResponse.json(
        { success: false, message: "다른 시즌 작업이 진행 중입니다." },
        { status: 409 }
      );
    }

    await connection.beginTransaction();

    const [adminRows]: any = await connection.query(
      `
      SELECT id, role
      FROM users
      WHERE email = ?
      LIMIT 1
      FOR UPDATE
      `,
      [session.user.email]
    );

    const admin = adminRows[0];

    if (!admin || admin.role !== "admin") {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const [activeRows]: any = await connection.query(
      `
      SELECT id
      FROM stock_seasons
      WHERE status IN ('ready', 'active')
      LIMIT 1
      FOR UPDATE
      `
    );

    if (activeRows.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        {
          success: false,
          message: "이미 대기 또는 진행 중인 시즌이 있습니다.",
        },
        { status: 409 }
      );
    }

    const [numberRows]: any = await connection.query(
      `SELECT IFNULL(MAX(season_no), 0) + 1 AS next_no FROM stock_seasons`
    );

    const nextSeasonNo = Math.max(1, int(numberRows[0]?.next_no, 1));
    const now = getKstMysqlNow();
    const status = startTs <= Date.now() ? "active" : "ready";

    const [insertResult]: any = await connection.query(
      `
      INSERT INTO stock_seasons
      (
        season_no,
        title,
        status,
        starts_at,
        ends_at,
        timezone_name,
        currency_name,
        entry_fee_dotori,
        starting_money,
        base_prize,
        entry_fee_prize,
        fee_prize,
        include_entry_fee_in_prize,
        trade_fee_rate,
        min_trade_count,
        first_prize_rate,
        second_prize_rate,
        third_prize_rate,
        market_open_time,
        market_close_time,
        price_interval_minutes,
        virtual_trader_enabled,
        virtual_trader_count,
        no_virtual_trade_chance,
        virtual_max_pressure_rate,
        real_user_max_pressure_rate,
        total_max_pressure_rate,
        final_day_enabled,
        final_day_hours,
        final_day_volatility_multiplier,
        created_by,
        created_at,
        updated_at
      )
      VALUES
      (?, ?, ?, ?, ?, 'Asia/Seoul', ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nextSeasonNo,
        title,
        status,
        startsAt,
        endsAt,
        currencyName,
        values.entryFeeDotori,
        values.startingMoney,
        values.basePrize,
        values.includeEntryFeeInPrize,
        values.tradeFeeRate,
        values.minTradeCount,
        values.firstPrizeRate,
        values.secondPrizeRate,
        values.thirdPrizeRate,
        `${values.marketOpenTime}:00`,
        `${values.marketCloseTime}:00`,
        values.priceIntervalMinutes,
        values.virtualTraderEnabled,
        values.virtualTraderCount,
        values.noVirtualTradeChance,
        values.virtualMaxPressureRate,
        values.realUserMaxPressureRate,
        values.totalMaxPressureRate,
        values.finalDayEnabled,
        values.finalDayHours,
        values.finalDayVolatilityMultiplier,
        admin.id,
        now,
        now,
      ]
    );

    const seasonId = Number(insertResult.insertId);

    if (values.virtualTraderEnabled && values.virtualTraderCount > 0) {
      const baseTime = startTs > Date.now() ? startsAt : now;

      for (let index = 0; index < values.virtualTraderCount; index++) {
        const template = BOT_TEMPLATES[index % BOT_TEMPLATES.length];
        const duplicateNo = Math.floor(index / BOT_TEMPLATES.length) + 1;
        const botCode =
          duplicateNo === 1 ? template[0] : `${template[0]}_${duplicateNo}`;
        const displayName =
          duplicateNo === 1 ? template[1] : `${template[1]} ${duplicateNo}`;
        const nextActionAt =
          addMinutesToKstMysql(
            baseTime,
            randomInteger(template[6], template[7])
          ) || baseTime;

        await connection.query(
          `
          INSERT INTO stock_virtual_traders
          (
            season_id,
            bot_code,
            display_name,
            strategy_type,
            description,
            starting_money,
            available_money,
            activity_start_time,
            activity_end_time,
            min_action_interval_minutes,
            max_action_interval_minutes,
            min_trade_budget_rate,
            max_trade_budget_rate,
            buy_bias_rate,
            mistake_rate,
            preferred_risk_level,
            is_active,
            next_action_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
          `,
          [
            seasonId,
            botCode,
            displayName,
            template[2],
            template[3],
            values.startingMoney,
            values.startingMoney,
            template[4],
            template[5],
            template[6],
            template[7],
            template[8],
            template[9],
            template[10],
            template[11],
            template[12],
            nextActionAt,
            now,
            now,
          ]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message:
        status === "active"
          ? `${title} 시즌이 시작되었습니다.`
          : `${title} 시즌이 생성되었습니다.`,
      seasonId,
      seasonNo: nextSeasonNo,
      status,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    console.error("Stock season start error:", error);

    return NextResponse.json(
      { success: false, message: "시즌 시작 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    if (locked) {
      try {
        await connection.query(
          "SELECT RELEASE_LOCK('wangchu_stock_season_start')"
        );
      } catch {}
    }

    connection.release();
  }
}
