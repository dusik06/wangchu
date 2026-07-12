import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSeasonNowText } from "@/lib/stock-market";

function toInteger(value: unknown) {
  const parsed = Math.floor(Number(value));

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

async function recalculateSeasonParticipants(
  connection: any,
  season: any,
  now: string
) {
  const [participantRows]: any = await connection.query(
    `
    SELECT
      id,
      starting_money,
      available_money,
      trade_count
    FROM stock_season_participants
    WHERE season_id = ?
    FOR UPDATE
    `,
    [season.id]
  );

  for (const participant of participantRows) {
    const [holdingRows]: any = await connection.query(
      `
      SELECT
        h.id,
        h.quantity,
        h.total_buy_amount,
        s.current_price
      FROM stock_season_holdings h
      INNER JOIN stock_items s
        ON s.id = h.stock_id
      WHERE h.season_id = ?
        AND h.participant_id = ?
        AND h.quantity > 0
      FOR UPDATE
      `,
      [season.id, participant.id]
    );

    let holdingValue = 0;

    for (const holding of holdingRows) {
      const quantity = toInteger(holding.quantity);
      const totalBuyAmount = toInteger(
        holding.total_buy_amount
      );
      const currentPrice = toInteger(
        holding.current_price
      );

      const currentValue =
        quantity * currentPrice;

      const profitAmount =
        currentValue - totalBuyAmount;

      const profitRate =
        totalBuyAmount > 0
          ? (profitAmount / totalBuyAmount) * 100
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
        [
          currentValue,
          profitAmount,
          profitRate,
          now,
          holding.id,
        ]
      );
    }

    const startingMoney = Math.max(
      1,
      toInteger(participant.starting_money)
    );

    const availableMoney = Math.max(
      0,
      toInteger(participant.available_money)
    );

    const totalAsset =
      availableMoney + holdingValue;

    const profitAmount =
      totalAsset - startingMoney;

    const profitRate =
      (profitAmount / startingMoney) * 100;

    const tradeCount = toInteger(
      participant.trade_count
    );

    const minimumTradeCount = Math.max(
      0,
      toInteger(season.min_trade_count)
    );

    await connection.query(
      `
      UPDATE stock_season_participants
      SET current_holding_value = ?,
          current_total_asset = ?,
          current_profit_amount = ?,
          current_profit_rate = ?,
          is_reward_qualified = ?,
          updated_at = ?
      WHERE id = ?
        AND season_id = ?
      `,
      [
        holdingValue,
        totalAsset,
        profitAmount,
        profitRate,
        tradeCount >= minimumTradeCount ? 1 : 0,
        now,
        participant.id,
        season.id,
      ]
    );
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
        message: "요청값을 읽을 수 없습니다.",
      },
      { status: 400 }
    );
  }

  const stockId = toInteger(body.stockId);
  const stockName = String(
    body.stockName || ""
  ).trim();

  const currentPrice = toInteger(
    body.currentPrice
  );

  const normalRate = toNumber(
    body.normalRate
  );

  const specialChance = toNumber(
    body.specialChance
  );

  const specialRate = toNumber(
    body.specialRate
  );

  if (stockId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "주식 정보가 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  if (!stockName || stockName.length > 100) {
    return NextResponse.json(
      {
        success: false,
        message:
          "주식 이름을 1자 이상 100자 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  if (currentPrice <= 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "현재 가격은 1 이상이어야 합니다.",
      },
      { status: 400 }
    );
  }

  if (
    normalRate < 0 ||
    normalRate > 100
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "일반 변동폭은 0% 이상 100% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (
    specialChance < 0 ||
    specialChance > 100
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "특수 발생 확률은 0% 이상 100% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (
    specialRate < 0 ||
    specialRate > 500
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "특수 변동폭은 0% 이상 500% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [adminRows]: any = await connection.query(
      `
      SELECT
        id,
        role
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
          message: "관리자만 가능합니다.",
        },
        { status: 403 }
      );
    }

    const [stockRows]: any = await connection.query(
      `
      SELECT *
      FROM stock_items
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [stockId]
    );

    const stock = stockRows[0];

    if (!stock) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "수정할 주식을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    const oldPrice = toInteger(
      stock.current_price
    );

    const now = getSeasonNowText();

    const priceChanged =
      oldPrice !== currentPrice;

    const changeAmount =
      currentPrice - oldPrice;

    const changeRate =
      oldPrice > 0
        ? (changeAmount / oldPrice) * 100
        : 0;

    await connection.query(
      `
      UPDATE stock_items
      SET stock_name = ?,
          current_price = ?,
          normal_rate = ?,
          special_chance = ?,
          special_rate = ?,
          last_updated_at = ?
      WHERE id = ?
      `,
      [
        stockName,
        currentPrice,
        normalRate,
        specialChance,
        specialRate,
        now,
        stockId,
      ]
    );

    if (priceChanged) {
      await connection.query(
        `
        INSERT INTO stock_price_logs
        (
          stock_id,
          price,
          change_amount,
          change_rate,
          event_title,
          created_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?)
        `,
        [
          stockId,
          currentPrice,
          changeAmount,
          changeRate,
          "관리자 가격 수정",
          now,
        ]
      );
    }

    const [activeSeasonRows]: any =
      await connection.query(
        `
        SELECT
          id,
          min_trade_count
        FROM stock_seasons
        WHERE status IN ('ready', 'active')
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
        `
      );

    const activeSeason =
      activeSeasonRows[0] || null;

    if (activeSeason) {
      await recalculateSeasonParticipants(
        connection,
        activeSeason,
        now
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message:
        priceChanged
          ? `${stockName} 수정과 시즌 자산 재계산이 완료되었습니다.`
          : `${stockName} 설정 수정이 완료되었습니다.`,
      stockId,
      stockName,
      oldPrice,
      currentPrice,
      changeAmount,
      changeRate: Number(
        changeRate.toFixed(4)
      ),
      normalRate,
      specialChance,
      specialRate,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback 실패 무시
    }

    console.error(
      "Admin stock update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "주식 수정 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}