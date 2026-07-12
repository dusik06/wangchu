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
  seasonId: number,
  minimumTradeCount: number,
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
    [seasonId]
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
      [seasonId, participant.id]
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
        seasonId,
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

  if (stockId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "주식 정보가 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
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
          message: "주식을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    if (Number(stock.is_listed) !== 1) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "이미 상장폐지된 주식입니다.",
        },
        { status: 409 }
      );
    }

    const now = getSeasonNowText();
    const oldPrice = toInteger(
      stock.current_price
    );

    const [seasonRows]: any = await connection.query(
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

    const activeSeason = seasonRows[0] || null;

    const [legacyHoldingRows]: any =
      await connection.query(
        `
        SELECT IFNULL(
          SUM(quantity),
          0
        ) AS total_quantity
        FROM stock_holdings
        WHERE stock_id = ?
        `,
        [stockId]
      );

    const legacyQuantity = toInteger(
      legacyHoldingRows[0]?.total_quantity
    );

    let seasonQuantity = 0;
    let virtualQuantity = 0;

    if (activeSeason) {
      const [seasonHoldingRows]: any =
        await connection.query(
          `
          SELECT IFNULL(
            SUM(quantity),
            0
          ) AS total_quantity
          FROM stock_season_holdings
          WHERE season_id = ?
            AND stock_id = ?
          `,
          [activeSeason.id, stockId]
        );

      seasonQuantity = toInteger(
        seasonHoldingRows[0]?.total_quantity
      );

      const [virtualHoldingRows]: any =
        await connection.query(
          `
          SELECT IFNULL(
            SUM(quantity),
            0
          ) AS total_quantity
          FROM stock_virtual_holdings
          WHERE season_id = ?
            AND stock_id = ?
          `,
          [activeSeason.id, stockId]
        );

      virtualQuantity = toInteger(
        virtualHoldingRows[0]?.total_quantity
      );
    }

    const deletedQuantity =
      legacyQuantity +
      seasonQuantity +
      virtualQuantity;

    await connection.query(
      `
      UPDATE stock_items
      SET is_listed = 0,
          current_price = 0,
          last_updated_at = ?
      WHERE id = ?
      `,
      [now, stockId]
    );

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
      VALUES (?, 0, ?, -100, ?, ?)
      `,
      [
        stockId,
        -oldPrice,
        "관리자 상장폐지",
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
      VALUES
      (
        ?, ?, 'ADMIN',
        ?, 0, ?, -100, ?, ?, ?
      )
      `,
      [
        stockId,
        stock.stock_name,
        oldPrice,
        -oldPrice,
        deletedQuantity,
        "관리자 수동 상장폐지",
        now,
      ]
    );

    if (activeSeason) {
      await connection.query(
        `
        DELETE FROM stock_season_holdings
        WHERE season_id = ?
          AND stock_id = ?
        `,
        [activeSeason.id, stockId]
      );

      await connection.query(
        `
        DELETE FROM stock_virtual_holdings
        WHERE season_id = ?
          AND stock_id = ?
        `,
        [activeSeason.id, stockId]
      );

      await recalculateSeasonParticipants(
        connection,
        Number(activeSeason.id),
        Math.max(
          0,
          toInteger(activeSeason.min_trade_count)
        ),
        now
      );
    }

    await connection.query(
      `
      DELETE FROM stock_holdings
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${stock.stock_name} 상장폐지가 완료되었습니다.`,
      stockId,
      stockName: stock.stock_name,
      deletedQuantity,
      legacyQuantity,
      seasonQuantity,
      virtualQuantity,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback 실패 무시
    }

    console.error(
      "Admin stock delist error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "상장폐지 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}