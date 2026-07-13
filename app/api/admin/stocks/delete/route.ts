import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSeasonNowText } from "@/lib/stock-market";

function toInteger(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function recalculateActiveSeasonParticipants(
  connection: any,
  now: string
) {
  const [seasonRows]: any = await connection.query(
    `
    SELECT id, min_trade_count
    FROM stock_seasons
    WHERE status IN ('ready', 'active')
    ORDER BY id DESC
    LIMIT 1
    FOR UPDATE
    `
  );

  const season = seasonRows[0];

  if (!season) {
    return;
  }

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
        IFNULL(SUM(h.quantity * s.current_price), 0) AS holding_value
      FROM stock_season_holdings h
      INNER JOIN stock_items s
        ON s.id = h.stock_id
      WHERE h.season_id = ?
        AND h.participant_id = ?
        AND h.quantity > 0
      `,
      [season.id, participant.id]
    );

    const holdingValue = toInteger(
      holdingRows[0]?.holding_value
    );
    const startingMoney = Math.max(
      1,
      toInteger(participant.starting_money)
    );
    const availableMoney = Math.max(
      0,
      toInteger(participant.available_money)
    );
    const totalAsset = availableMoney + holdingValue;
    const profitAmount = totalAsset - startingMoney;
    const profitRate =
      (profitAmount / startingMoney) * 100;

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
        toInteger(participant.trade_count) >=
        toInteger(season.min_trade_count)
          ? 1
          : 0,
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

  const body = await req.json().catch(() => ({}));
  const stockId = toInteger(body.stockId);
  const confirmedStockName = String(
    body.stockName || ""
  ).trim();

  if (stockId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "삭제할 종목 정보가 올바르지 않습니다.",
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
          message: "삭제할 종목을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    if (
      !confirmedStockName ||
      confirmedStockName !== String(stock.stock_name)
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "종목명 확인값이 일치하지 않습니다.",
        },
        { status: 400 }
      );
    }

    const now = getSeasonNowText();

    const [countRows]: any = await connection.query(
      `
      SELECT
        (
          SELECT COUNT(*)
          FROM stock_price_logs
          WHERE stock_id = ?
        ) AS price_log_count,
        (
          SELECT COUNT(*)
          FROM stock_season_trades
          WHERE stock_id = ?
        ) AS season_trade_count,
        (
          SELECT COUNT(*)
          FROM stock_market_rounds
          WHERE stock_id = ?
        ) AS market_round_count
      `,
      [stockId, stockId, stockId]
    );

    const deletedCounts = {
      priceLogs: toInteger(countRows[0]?.price_log_count),
      seasonTrades: toInteger(
        countRows[0]?.season_trade_count
      ),
      marketRounds: toInteger(
        countRows[0]?.market_round_count
      ),
    };

    await connection.query(
      `DELETE FROM stock_events WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_virtual_trades WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_virtual_holdings WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_season_trades WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_season_holdings WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_market_rounds WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_price_logs WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_delist_logs WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_trades WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `DELETE FROM stock_holdings WHERE stock_id = ?`,
      [stockId]
    );

    await connection.query(
      `
      DELETE FROM stock_items
      WHERE id = ?
      `,
      [stockId]
    );

    await recalculateActiveSeasonParticipants(
      connection,
      now
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${stock.stock_name} 종목과 관련 기록이 완전히 삭제되었습니다.`,
      stockId,
      deletedCounts,
    });
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {}

    console.error("Admin stock delete error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.code === "ER_NO_SUCH_TABLE"
            ? "삭제 대상 테이블 구조를 확인해주세요."
            : "종목 완전 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
