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

async function recalculateParticipant(
  connection: any,
  season: any,
  participant: any,
  now: string
) {
  const [aggregateRows]: any = await connection.query(
    `
    SELECT
      COUNT(*) AS trade_count,
      SUM(
        CASE
          WHEN trade_type = 'BUY' THEN 1
          ELSE 0
        END
      ) AS buy_count,
      SUM(
        CASE
          WHEN trade_type = 'SELL' THEN 1
          ELSE 0
        END
      ) AS sell_count,
      SUM(
        CASE
          WHEN trade_type = 'BUY' THEN gross_amount
          ELSE 0
        END
      ) AS total_buy_amount,
      SUM(
        CASE
          WHEN trade_type = 'SELL' THEN gross_amount
          ELSE 0
        END
      ) AS total_sell_amount,
      SUM(fee_amount) AS total_fee_amount
    FROM stock_season_trades
    WHERE season_id = ?
      AND participant_id = ?
    `,
    [season.id, participant.id]
  );

  const aggregate = aggregateRows[0] || {};

  const tradeCount = toInteger(
    aggregate.trade_count
  );

  const buyCount = toInteger(
    aggregate.buy_count
  );

  const sellCount = toInteger(
    aggregate.sell_count
  );

  const totalBuyAmount = toInteger(
    aggregate.total_buy_amount
  );

  const totalSellAmount = toInteger(
    aggregate.total_sell_amount
  );

  const totalFeeAmount = toInteger(
    aggregate.total_fee_amount
  );

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
    const quantity = toInteger(
      holding.quantity
    );

    const holdingBuyAmount = toInteger(
      holding.total_buy_amount
    );

    const currentPrice = toInteger(
      holding.current_price
    );

    const currentValue =
      quantity * currentPrice;

    const holdingProfitAmount =
      currentValue - holdingBuyAmount;

    const holdingProfitRate =
      holdingBuyAmount > 0
        ? (holdingProfitAmount /
            holdingBuyAmount) *
          100
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
        holdingProfitAmount,
        holdingProfitRate,
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

  const qualified =
    tradeCount >=
    Math.max(
      0,
      toInteger(season.min_trade_count)
    );

  await connection.query(
    `
    UPDATE stock_season_participants
    SET trade_count = ?,
        buy_count = ?,
        sell_count = ?,
        total_buy_amount = ?,
        total_sell_amount = ?,
        total_fee_amount = ?,
        current_holding_value = ?,
        current_total_asset = ?,
        current_profit_amount = ?,
        current_profit_rate = ?,
        is_reward_qualified = ?,
        updated_at = ?
    WHERE id = ?
      AND season_id = ?
    `,
    [
      tradeCount,
      buyCount,
      sellCount,
      totalBuyAmount,
      totalSellAmount,
      totalFeeAmount,
      holdingValue,
      totalAsset,
      profitAmount,
      profitRate,
      qualified ? 1 : 0,
      now,
      participant.id,
      season.id,
    ]
  );
}

async function recalculateSeason(
  connection: any,
  season: any,
  now: string
) {
  const [participantRows]: any =
    await connection.query(
      `
      SELECT
        id,
        starting_money,
        available_money
      FROM stock_season_participants
      WHERE season_id = ?
      FOR UPDATE
      `,
      [season.id]
    );

  for (const participant of participantRows) {
    await recalculateParticipant(
      connection,
      season,
      participant,
      now
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(
    authOptions
  );

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

    const [adminRows]: any =
      await connection.query(
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

    const [stockRows]: any =
      await connection.query(
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

    const [endedHistoryRows]: any =
      await connection.query(
        `
        SELECT COUNT(*) AS history_count
        FROM stock_season_trades t
        INNER JOIN stock_seasons s
          ON s.id = t.season_id
        WHERE t.stock_id = ?
          AND s.status = 'ended'
        `,
        [stockId]
      );

    const endedHistoryCount = toInteger(
      endedHistoryRows[0]?.history_count
    );

    if (endedHistoryCount > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "종료된 시즌 기록이 있는 종목은 완전 삭제할 수 없습니다. 상장폐지를 이용해주세요.",
        },
        { status: 409 }
      );
    }

    const now = getSeasonNowText();

    const [activeSeasonRows]: any =
      await connection.query(
        `
        SELECT
          id,
          min_trade_count,
          fee_prize
        FROM stock_seasons
        WHERE status IN ('ready', 'active')
        ORDER BY id ASC
        FOR UPDATE
        `
      );

    const [deletedFeeRows]: any =
      await connection.query(
        `
        SELECT
          season_id,
          IFNULL(
            SUM(fee_amount),
            0
          ) AS deleted_fee_amount
        FROM stock_season_trades
        WHERE stock_id = ?
        GROUP BY season_id
        `,
        [stockId]
      );

    const deletedFeeMap =
      new Map<number, number>();

    for (const feeRow of deletedFeeRows) {
      deletedFeeMap.set(
        Number(feeRow.season_id),
        toInteger(
          feeRow.deleted_fee_amount
        )
      );
    }

    const [seasonHoldingRows]: any =
      await connection.query(
        `
        SELECT IFNULL(
          SUM(quantity),
          0
        ) AS total_quantity
        FROM stock_season_holdings
        WHERE stock_id = ?
        `,
        [stockId]
      );

    const [virtualHoldingRows]: any =
      await connection.query(
        `
        SELECT IFNULL(
          SUM(quantity),
          0
        ) AS total_quantity
        FROM stock_virtual_holdings
        WHERE stock_id = ?
        `,
        [stockId]
      );

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

    const deletedSeasonQuantity =
      toInteger(
        seasonHoldingRows[0]?.total_quantity
      );

    const deletedVirtualQuantity =
      toInteger(
        virtualHoldingRows[0]?.total_quantity
      );

    const deletedLegacyQuantity =
      toInteger(
        legacyHoldingRows[0]?.total_quantity
      );

    await connection.query(
      `
      DELETE FROM stock_season_holdings
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_virtual_holdings
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_season_trades
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_virtual_trades
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_market_rounds
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_holdings
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_trades
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_events
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_price_logs
      WHERE stock_id = ?
      `,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_delist_logs
      WHERE stock_id = ?
      `,
      [stockId]
    );

    for (const season of activeSeasonRows) {
      const deletedFeeAmount =
        deletedFeeMap.get(
          Number(season.id)
        ) || 0;

      if (deletedFeeAmount > 0) {
        await connection.query(
          `
          UPDATE stock_seasons
          SET fee_prize =
                GREATEST(
                  0,
                  fee_prize - ?
                ),
              updated_at = ?
          WHERE id = ?
          `,
          [
            deletedFeeAmount,
            now,
            season.id,
          ]
        );
      }

      await recalculateSeason(
        connection,
        season,
        now
      );
    }

    await connection.query(
      `
      DELETE FROM stock_items
      WHERE id = ?
      `,
      [stockId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${stock.stock_name}과 관련된 기록이 모두 삭제되었습니다.`,
      stockId,
      stockName: stock.stock_name,
      deletedSeasonQuantity,
      deletedVirtualQuantity,
      deletedLegacyQuantity,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback 실패 무시
    }

    console.error(
      "Admin stock delete error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "주식 완전 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}