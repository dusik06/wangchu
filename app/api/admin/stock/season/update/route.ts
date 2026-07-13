import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  datetimeLocalToMysql,
  getKstMysqlNow,
  kstMysqlToTimestamp,
} from "@/lib/stock-time";

function integer(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

  const seasonId = integer(body.seasonId);
  const title = String(body.title || "").trim();
  const currencyName = String(body.currencyName || "").trim();
  const startsAt = datetimeLocalToMysql(String(body.startsAt || ""));
  const endsAt = datetimeLocalToMysql(String(body.endsAt || ""));
  const rates = [
    number(body.firstPrizeRate),
    number(body.secondPrizeRate),
    number(body.thirdPrizeRate),
  ];
  const marketOpenTime = String(body.marketOpenTime || "");
  const marketCloseTime = String(body.marketCloseTime || "");

  if (!seasonId || !title || !currencyName || !startsAt || !endsAt) {
    return NextResponse.json(
      { success: false, message: "필수 설정값을 확인해주세요." },
      { status: 400 }
    );
  }

  if (
    Number.isNaN(kstMysqlToTimestamp(startsAt)) ||
    Number.isNaN(kstMysqlToTimestamp(endsAt)) ||
    kstMysqlToTimestamp(endsAt) <= kstMysqlToTimestamp(startsAt)
  ) {
    return NextResponse.json(
      { success: false, message: "시즌 기간을 확인해주세요." },
      { status: 400 }
    );
  }

  if (
    Number(rates.reduce((sum, rate) => sum + rate, 0).toFixed(3)) !== 100
  ) {
    return NextResponse.json(
      { success: false, message: "상금 비율 합계는 100%여야 합니다." },
      { status: 400 }
    );
  }

  if (!validTime(marketOpenTime) || !validTime(marketCloseTime)) {
    return NextResponse.json(
      { success: false, message: "장 운영시간을 확인해주세요." },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [admins]: any = await connection.query(
      "SELECT role FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );
    if (!admins.length || admins[0].role !== "admin") {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const [seasons]: any = await connection.query(
      `
      SELECT *
      FROM stock_seasons
      WHERE id = ?
        AND status IN ('ready', 'active')
      LIMIT 1
      FOR UPDATE
      `,
      [seasonId]
    );
    const season = seasons[0];
    if (!season) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "수정할 시즌이 없습니다." },
        { status: 404 }
      );
    }

    const [counts]: any = await connection.query(
      `
      SELECT COUNT(*) AS participant_count
      FROM stock_season_participants
      WHERE season_id = ?
      `,
      [seasonId]
    );

    const startingMoney = integer(body.startingMoney);
    if (
      integer(counts[0]?.participant_count) > 0 &&
      startingMoney !== integer(season.starting_money)
    ) {
      await connection.rollback();
      return NextResponse.json(
        {
          success: false,
          message: "참가자가 있는 시즌은 시작 자금을 변경할 수 없습니다.",
        },
        { status: 409 }
      );
    }

    const now = getKstMysqlNow();

    await connection.query(
      `
      UPDATE stock_seasons
      SET title = ?,
          starts_at = ?,
          ends_at = ?,
          currency_name = ?,
          entry_fee_dotori = ?,
          starting_money = ?,
          base_prize = ?,
          include_entry_fee_in_prize = ?,
          trade_fee_rate = ?,
          min_trade_count = ?,
          first_prize_rate = ?,
          second_prize_rate = ?,
          third_prize_rate = ?,
          market_open_time = ?,
          market_close_time = ?,
          price_interval_minutes = ?,
          virtual_trader_enabled = ?,
          virtual_trader_count = ?,
          no_virtual_trade_chance = ?,
          virtual_max_pressure_rate = ?,
          real_user_max_pressure_rate = ?,
          total_max_pressure_rate = ?,
          final_day_enabled = ?,
          final_day_hours = ?,
          final_day_volatility_multiplier = ?,
          updated_at = ?
      WHERE id = ?
      `,
      [
        title,
        startsAt,
        endsAt,
        currencyName,
        integer(body.entryFeeDotori),
        startingMoney,
        integer(body.basePrize),
        body.includeEntryFeeInPrize === true ? 1 : 0,
        number(body.tradeFeeRate),
        integer(body.minTradeCount),
        rates[0],
        rates[1],
        rates[2],
        `${marketOpenTime}:00`,
        `${marketCloseTime}:00`,
        integer(body.priceIntervalMinutes),
        body.virtualTraderEnabled === true ? 1 : 0,
        integer(body.virtualTraderCount),
        number(body.noVirtualTradeChance),
        number(body.virtualMaxPressureRate),
        number(body.realUserMaxPressureRate),
        number(body.totalMaxPressureRate),
        body.finalDayEnabled === true ? 1 : 0,
        integer(body.finalDayHours),
        number(body.finalDayVolatilityMultiplier),
        now,
        seasonId,
      ]
    );

    await connection.query(
      `
      UPDATE stock_virtual_traders
      SET is_active = ?,
          updated_at = ?
      WHERE season_id = ?
      `,
      [body.virtualTraderEnabled === true ? 1 : 0, now, seasonId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${title} 시즌 설정이 저장되었습니다.`,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    console.error("Stock season update error:", error);
    return NextResponse.json(
      { success: false, message: "시즌 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
