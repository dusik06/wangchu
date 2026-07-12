import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  addMinutesToKstMysql,
  datetimeLocalToMysql,
  getKstMysqlNow,
  getKstNowTimestamp,
  kstMysqlToTimestamp,
} from "@/lib/stock-time";

type BotTemplate = {
  code: string;
  name: string;
  strategy: string;
  description: string;
  activityStart: string;
  activityEnd: string;
  minInterval: number;
  maxInterval: number;
  minBudgetRate: number;
  maxBudgetRate: number;
  buyBiasRate: number;
  mistakeRate: number;
  preferredRisk: number;
};

const BOT_TEMPLATES: BotTemplate[] = [
  {
    code: "SAFE_A",
    name: "안정형 A",
    strategy: "SAFE",
    description: "변동성이 낮은 종목을 분산 매수하고 오래 보유합니다.",
    activityStart: "11:00:00",
    activityEnd: "23:00:00",
    minInterval: 50,
    maxInterval: 120,
    minBudgetRate: 5,
    maxBudgetRate: 12,
    buyBiasRate: 58,
    mistakeRate: 20,
    preferredRisk: 1,
  },
  {
    code: "SAFE_B",
    name: "장기형 B",
    strategy: "HOLDER",
    description: "거래 빈도는 낮지만 한 번 매수하면 오래 보유합니다.",
    activityStart: "13:00:00",
    activityEnd: "01:00:00",
    minInterval: 70,
    maxInterval: 150,
    minBudgetRate: 6,
    maxBudgetRate: 15,
    buyBiasRate: 62,
    mistakeRate: 23,
    preferredRisk: 2,
  },
  {
    code: "AGGRESSIVE",
    name: "공격형",
    strategy: "AGGRESSIVE",
    description: "고변동 종목을 선호하며 비교적 자주 거래합니다.",
    activityStart: "18:00:00",
    activityEnd: "02:00:00",
    minInterval: 20,
    maxInterval: 65,
    minBudgetRate: 10,
    maxBudgetRate: 25,
    buyBiasRate: 52,
    mistakeRate: 32,
    preferredRisk: 5,
  },
  {
    code: "TREND",
    name: "추세형",
    strategy: "TREND",
    description: "최근 상승 흐름이 강한 종목을 따라갑니다.",
    activityStart: "10:00:00",
    activityEnd: "22:30:00",
    minInterval: 30,
    maxInterval: 85,
    minBudgetRate: 7,
    maxBudgetRate: 18,
    buyBiasRate: 55,
    mistakeRate: 27,
    preferredRisk: 3,
  },
  {
    code: "COUNTER",
    name: "역추세형",
    strategy: "COUNTER",
    description: "급락한 종목을 매수하고 급등한 종목을 매도합니다.",
    activityStart: "14:00:00",
    activityEnd: "01:30:00",
    minInterval: 35,
    maxInterval: 95,
    minBudgetRate: 6,
    maxBudgetRate: 20,
    buyBiasRate: 50,
    mistakeRate: 30,
    preferredRisk: 4,
  },
  {
    code: "IMPULSE",
    name: "충동형",
    strategy: "IMPULSE",
    description: "뉴스와 시장 분위기에 민감하게 반응하며 실수도 많습니다.",
    activityStart: "19:00:00",
    activityEnd: "02:00:00",
    minInterval: 15,
    maxInterval: 55,
    minBudgetRate: 8,
    maxBudgetRate: 22,
    buyBiasRate: 50,
    mistakeRate: 40,
    preferredRisk: 4,
  },
];

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function integerValue(value: unknown, fallback = 0) {
  return Math.floor(numberValue(value, fallback));
}

function randomInteger(min: number, max: number) {
  const safeMin = Math.ceil(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));

  return (
    Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
  );
}

function validateTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

async function releaseLock(connection: any) {
  try {
    await connection.query(
      "SELECT RELEASE_LOCK('wangchu_stock_season_start')"
    );
  } catch {
    // 잠금 해제 실패가 API 응답을 막지 않도록 처리
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      {
        success: false,
        message: "로그인이 필요합니다.",
      },
      { status: 401 }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "시즌 설정값을 읽을 수 없습니다.",
      },
      { status: 400 }
    );
  }

  const title = String(body.title || "").trim();
  const currencyName = String(body.currencyName || "").trim();

  const startsAt = datetimeLocalToMysql(String(body.startsAt || ""));
  const endsAt = datetimeLocalToMysql(String(body.endsAt || ""));

  const entryFeeDotori = integerValue(body.entryFeeDotori);
  const startingMoney = integerValue(body.startingMoney);
  const basePrize = integerValue(body.basePrize);

  const includeEntryFeeInPrize =
    body.includeEntryFeeInPrize === true ? 1 : 0;

  const tradeFeeRate = numberValue(body.tradeFeeRate);
  const minTradeCount = integerValue(body.minTradeCount);

  const firstPrizeRate = numberValue(body.firstPrizeRate);
  const secondPrizeRate = numberValue(body.secondPrizeRate);
  const thirdPrizeRate = numberValue(body.thirdPrizeRate);

  const marketOpenTime = String(body.marketOpenTime || "");
  const marketCloseTime = String(body.marketCloseTime || "");
  const priceIntervalMinutes = integerValue(body.priceIntervalMinutes);

  const virtualTraderEnabled =
    body.virtualTraderEnabled === true ? 1 : 0;
  const virtualTraderCount = integerValue(body.virtualTraderCount);

  const noVirtualTradeChance = numberValue(
    body.noVirtualTradeChance
  );
  const virtualMaxPressureRate = numberValue(
    body.virtualMaxPressureRate
  );
  const realUserMaxPressureRate = numberValue(
    body.realUserMaxPressureRate
  );
  const totalMaxPressureRate = numberValue(
    body.totalMaxPressureRate
  );

  const finalDayEnabled = body.finalDayEnabled === true ? 1 : 0;
  const finalDayHours = integerValue(body.finalDayHours);
  const finalDayVolatilityMultiplier = numberValue(
    body.finalDayVolatilityMultiplier
  );

  if (!title || title.length > 100) {
    return NextResponse.json(
      {
        success: false,
        message: "시즌명을 1자 이상 100자 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  if (!currencyName || currencyName.length > 30) {
    return NextResponse.json(
      {
        success: false,
        message: "전용 화폐명을 1자 이상 30자 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  if (!startsAt || !endsAt) {
    return NextResponse.json(
      {
        success: false,
        message: "시즌 시작일시와 종료일시를 정확히 입력해주세요.",
      },
      { status: 400 }
    );
  }

  const startsTimestamp = kstMysqlToTimestamp(startsAt);
  const endsTimestamp = kstMysqlToTimestamp(endsAt);
  const currentTimestamp = getKstNowTimestamp();

  if (
    Number.isNaN(startsTimestamp) ||
    Number.isNaN(endsTimestamp) ||
    endsTimestamp <= startsTimestamp
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "시즌 종료일시는 시작일시보다 뒤여야 합니다.",
      },
      { status: 400 }
    );
  }

  if (endsTimestamp <= currentTimestamp) {
    return NextResponse.json(
      {
        success: false,
        message: "이미 지난 종료일시로 시즌을 시작할 수 없습니다.",
      },
      { status: 400 }
    );
  }

  if (entryFeeDotori < 0 || entryFeeDotori > 100000000) {
    return NextResponse.json(
      {
        success: false,
        message: "참가비 도토리 설정값이 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  if (startingMoney <= 0 || startingMoney > 1000000000000) {
    return NextResponse.json(
      {
        success: false,
        message: "시즌 시작 화폐는 1 이상이어야 합니다.",
      },
      { status: 400 }
    );
  }

  if (basePrize < 0 || basePrize > 100000000) {
    return NextResponse.json(
      {
        success: false,
        message: "기본상금 설정값이 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  if (tradeFeeRate < 0 || tradeFeeRate > 20) {
    return NextResponse.json(
      {
        success: false,
        message: "거래 수수료는 0% 이상 20% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (minTradeCount < 0 || minTradeCount > 1000) {
    return NextResponse.json(
      {
        success: false,
        message: "최소 거래 횟수 설정값이 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  const totalPrizeRate = Number(
    (
      firstPrizeRate +
      secondPrizeRate +
      thirdPrizeRate
    ).toFixed(3)
  );

  if (
    firstPrizeRate < 0 ||
    secondPrizeRate < 0 ||
    thirdPrizeRate < 0 ||
    totalPrizeRate !== 100
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "1등, 2등, 3등 상금 비율의 합계는 100%여야 합니다.",
      },
      { status: 400 }
    );
  }

  if (!validateTime(marketOpenTime) || !validateTime(marketCloseTime)) {
    return NextResponse.json(
      {
        success: false,
        message: "시장 개장시간과 마감시간을 확인해주세요.",
      },
      { status: 400 }
    );
  }

  if (priceIntervalMinutes < 1 || priceIntervalMinutes > 1440) {
    return NextResponse.json(
      {
        success: false,
        message: "가격 갱신 주기는 1분 이상 1,440분 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (virtualTraderCount < 0 || virtualTraderCount > 30) {
    return NextResponse.json(
      {
        success: false,
        message: "가상 참가자는 0명 이상 30명 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (noVirtualTradeChance < 0 || noVirtualTradeChance > 100) {
    return NextResponse.json(
      {
        success: false,
        message: "봇 거래 없음 확률은 0% 이상 100% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (
    virtualMaxPressureRate < 0 ||
    realUserMaxPressureRate < 0 ||
    totalMaxPressureRate < 0 ||
    virtualMaxPressureRate > totalMaxPressureRate ||
    realUserMaxPressureRate > totalMaxPressureRate
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "실제 유저와 가상 참가자의 가격 영향은 전체 최대 영향보다 클 수 없습니다.",
      },
      { status: 400 }
    );
  }

  if (
    finalDayHours < 1 ||
    finalDayHours > 168 ||
    finalDayVolatilityMultiplier < 1 ||
    finalDayVolatilityMultiplier > 5
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "마지막 구간 변동성 설정값을 확인해주세요.",
      },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();
  let lockAcquired = false;

  try {
    const [lockRows]: any = await connection.query(
      "SELECT GET_LOCK('wangchu_stock_season_start', 5) AS locked"
    );

    lockAcquired = Number(lockRows?.[0]?.locked || 0) === 1;

    if (!lockAcquired) {
      return NextResponse.json(
        {
          success: false,
          message:
            "다른 시즌 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.",
        },
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
        {
          success: false,
          message: "관리자만 시즌을 시작할 수 있습니다.",
        },
        { status: 403 }
      );
    }

    const [activeRows]: any = await connection.query(`
      SELECT id, title, status
      FROM stock_seasons
      WHERE status IN ('ready', 'active')
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `);

    if (activeRows.length > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "이미 대기 또는 진행 중인 시즌이 있습니다. 기존 시즌을 먼저 종료해주세요.",
        },
        { status: 400 }
      );
    }

    const [seasonNumberRows]: any = await connection.query(`
      SELECT IFNULL(MAX(season_no), 0) + 1 AS next_season_no
      FROM stock_seasons
    `);

    const nextSeasonNo = Math.max(
      1,
      integerValue(seasonNumberRows?.[0]?.next_season_no, 1)
    );

    const now = getKstMysqlNow();
    const seasonStatus =
      startsTimestamp <= currentTimestamp ? "active" : "ready";

    const [insertSeasonResult]: any = await connection.query(
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
      (
        ?, ?, ?, ?, ?, 'Asia/Seoul', ?, ?, ?, ?, 0, 0, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      `,
      [
        nextSeasonNo,
        title,
        seasonStatus,
        startsAt,
        endsAt,
        currencyName,
        entryFeeDotori,
        startingMoney,
        basePrize,
        includeEntryFeeInPrize,
        tradeFeeRate,
        minTradeCount,
        firstPrizeRate,
        secondPrizeRate,
        thirdPrizeRate,
        `${marketOpenTime}:00`,
        `${marketCloseTime}:00`,
        priceIntervalMinutes,
        virtualTraderEnabled,
        virtualTraderCount,
        noVirtualTradeChance,
        virtualMaxPressureRate,
        realUserMaxPressureRate,
        totalMaxPressureRate,
        finalDayEnabled,
        finalDayHours,
        finalDayVolatilityMultiplier,
        admin.id,
        now,
        now,
      ]
    );

    const seasonId = Number(insertSeasonResult.insertId);

    if (virtualTraderEnabled && virtualTraderCount > 0) {
      const botBaseTime =
        startsTimestamp > currentTimestamp ? startsAt : now;

      for (let index = 0; index < virtualTraderCount; index++) {
        const template =
          BOT_TEMPLATES[index % BOT_TEMPLATES.length];

        const duplicateNo =
          Math.floor(index / BOT_TEMPLATES.length) + 1;

        const botCode =
          duplicateNo === 1
            ? template.code
            : `${template.code}_${duplicateNo}`;

        const displayName =
          duplicateNo === 1
            ? template.name
            : `${template.name} ${duplicateNo}`;

        const firstDelay = randomInteger(
          template.minInterval,
          template.maxInterval
        );

        const nextActionAt =
          addMinutesToKstMysql(botBaseTime, firstDelay) ||
          botBaseTime;

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
          VALUES
          (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?
          )
          `,
          [
            seasonId,
            botCode,
            displayName,
            template.strategy,
            template.description,
            startingMoney,
            startingMoney,
            template.activityStart,
            template.activityEnd,
            template.minInterval,
            template.maxInterval,
            template.minBudgetRate,
            template.maxBudgetRate,
            template.buyBiasRate,
            template.mistakeRate,
            template.preferredRisk,
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
        seasonStatus === "active"
          ? `${title} 시즌이 한국시간 기준으로 시작되었습니다.`
          : `${title} 시즌이 생성되었습니다. 설정한 시작시간에 시작됩니다.`,
      seasonId,
      seasonNo: nextSeasonNo,
      status: seasonStatus,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback 오류 무시
    }

    console.error("Stock season start error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "시즌 시작 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    if (lockAcquired) {
      await releaseLock(connection);
    }

    connection.release();
  }
}