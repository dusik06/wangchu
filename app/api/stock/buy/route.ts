import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  calculateFee,
  getSeasonNowText,
  isMarketOpen,
  isSeasonRunning,
} from "@/lib/stock-market";

function toInteger(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
      { success: false, message: "매수 요청을 읽을 수 없습니다." },
      { status: 400 }
    );
  }

  const stockId = toInteger(body.stockId);
  const quantity = toInteger(body.quantity);

  if (stockId <= 0 || quantity <= 0) {
    return NextResponse.json(
      { success: false, message: "종목과 매수 수량을 확인해주세요." },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [userRows]: any = await connection.query(
      `
      SELECT id, role
      FROM users
      WHERE email = ?
      LIMIT 1
      FOR UPDATE
      `,
      [session.user.email]
    );

    const user = userRows[0];

    if (!user) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "유저 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (user.role === "admin") {
      await connection.rollback();
      return NextResponse.json(
        {
          success: false,
          message: "관리자 계정은 시즌 주식 거래를 할 수 없습니다.",
        },
        { status: 403 }
      );
    }

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
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "현재 진행 중인 시즌이 없습니다." },
        { status: 404 }
      );
    }

    const seasonState = isSeasonRunning(season);
    const marketState = isMarketOpen(
      season.market_open_time,
      season.market_close_time
    );

    if (!seasonState.running) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: seasonState.message },
        { status: 400 }
      );
    }

    if (!marketState.open) {
      await connection.rollback();
      return NextResponse.json(
        {
          success: false,
          message: marketState.message,
          currentKstTime: marketState.currentKstTime,
        },
        { status: 400 }
      );
    }

    const [participantRows]: any = await connection.query(
      `
      SELECT *
      FROM stock_season_participants
      WHERE season_id = ?
        AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [season.id, user.id]
    );

    const participant = participantRows[0];

    if (!participant) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "먼저 이번 시즌에 참가해주세요." },
        { status: 403 }
      );
    }

    const [stockRows]: any = await connection.query(
      `
      SELECT *
      FROM stock_items
      WHERE id = ?
        AND is_listed = 1
      LIMIT 1
      FOR UPDATE
      `,
      [stockId]
    );

    const stock = stockRows[0];

    if (!stock) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "현재 거래할 수 없는 종목입니다." },
        { status: 404 }
      );
    }

    const unitPrice = toInteger(stock.current_price);
    const grossAmount = unitPrice * quantity;
    const feeRate = toNumber(season.trade_fee_rate);
    const feeAmount = calculateFee(grossAmount, feeRate);
    const finalCost = grossAmount + feeAmount;

    if (
      unitPrice <= 0 ||
      grossAmount <= 0 ||
      !Number.isSafeInteger(grossAmount) ||
      !Number.isSafeInteger(finalCost)
    ) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "거래 금액이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (toInteger(participant.available_money) < finalCost) {
      await connection.rollback();
      return NextResponse.json(
        {
          success: false,
          message: `${season.currency_name}이 부족합니다. ${finalCost.toLocaleString()} ${season.currency_name}이 필요합니다.`,
        },
        { status: 400 }
      );
    }

    const now = getSeasonNowText();

    const [updateParticipant]: any = await connection.query(
      `
      UPDATE stock_season_participants
      SET available_money = available_money - ?,
          trade_count = trade_count + 1,
          buy_count = buy_count + 1,
          total_buy_amount = total_buy_amount + ?,
          total_fee_amount = total_fee_amount + ?,
          last_trade_at = ?,
          updated_at = ?
      WHERE id = ?
        AND season_id = ?
        AND available_money >= ?
      `,
      [
        finalCost,
        grossAmount,
        feeAmount,
        now,
        now,
        participant.id,
        season.id,
        finalCost,
      ]
    );

    if (!updateParticipant.affectedRows) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "잔액이 변경되어 매수를 완료하지 못했습니다." },
        { status: 409 }
      );
    }

    const [holdingRows]: any = await connection.query(
      `
      SELECT *
      FROM stock_season_holdings
      WHERE season_id = ?
        AND participant_id = ?
        AND user_id = ?
        AND stock_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [season.id, participant.id, user.id, stock.id]
    );

    const holding = holdingRows[0];

    if (holding) {
      const nextQuantity = toInteger(holding.quantity) + quantity;
      const nextBuyAmount =
        toInteger(holding.total_buy_amount) + grossAmount;
      const nextCurrentValue = nextQuantity * unitPrice;
      const nextProfitAmount = nextCurrentValue - nextBuyAmount;
      const nextProfitRate =
        nextBuyAmount > 0 ? (nextProfitAmount / nextBuyAmount) * 100 : 0;

      await connection.query(
        `
        UPDATE stock_season_holdings
        SET quantity = ?,
            total_buy_amount = ?,
            average_price = ?,
            current_value = ?,
            profit_amount = ?,
            profit_rate = ?,
            updated_at = ?
        WHERE id = ?
        `,
        [
          nextQuantity,
          nextBuyAmount,
          nextBuyAmount / nextQuantity,
          nextCurrentValue,
          nextProfitAmount,
          nextProfitRate,
          now,
          holding.id,
        ]
      );
    } else {
      await connection.query(
        `
        INSERT INTO stock_season_holdings
        (
          season_id,
          participant_id,
          user_id,
          stock_id,
          quantity,
          total_buy_amount,
          average_price,
          current_value,
          profit_amount,
          profit_rate,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `,
        [
          season.id,
          participant.id,
          user.id,
          stock.id,
          quantity,
          grossAmount,
          unitPrice,
          grossAmount,
          now,
          now,
        ]
      );
    }

    await connection.query(
      `
      INSERT INTO stock_season_trades
      (
        season_id,
        participant_id,
        user_id,
        stock_id,
        trade_type,
        quantity,
        unit_price,
        gross_amount,
        fee_rate,
        fee_amount,
        net_amount,
        buy_cost_amount,
        realized_profit_amount,
        price_before,
        market_round_id,
        created_at
      )
      VALUES
      (?, ?, ?, ?, 'BUY', ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, ?)
      `,
      [
        season.id,
        participant.id,
        user.id,
        stock.id,
        quantity,
        unitPrice,
        grossAmount,
        feeRate,
        feeAmount,
        finalCost,
        grossAmount,
        unitPrice,
        now,
      ]
    );

    await connection.query(
      `
      UPDATE stock_seasons
      SET fee_prize = fee_prize + ?,
          updated_at = ?
      WHERE id = ?
      `,
      [feeAmount, now, season.id]
    );

    const [assetRows]: any = await connection.query(
      `
      SELECT
        p.available_money,
        p.starting_money,
        p.trade_count,
        IFNULL(SUM(h.quantity * s.current_price), 0) AS holding_value
      FROM stock_season_participants p
      LEFT JOIN stock_season_holdings h
        ON h.participant_id = p.id
       AND h.season_id = p.season_id
       AND h.quantity > 0
      LEFT JOIN stock_items s
        ON s.id = h.stock_id
      WHERE p.id = ?
        AND p.season_id = ?
      GROUP BY p.id, p.available_money, p.starting_money, p.trade_count
      `,
      [participant.id, season.id]
    );

    const asset = assetRows[0];
    const nextAvailableMoney = toInteger(asset?.available_money);
    const startingMoney = Math.max(1, toInteger(asset?.starting_money));
    const holdingValue = toInteger(asset?.holding_value);
    const totalAsset = nextAvailableMoney + holdingValue;
    const profitAmount = totalAsset - startingMoney;
    const profitRate = (profitAmount / startingMoney) * 100;
    const tradeCount = toInteger(asset?.trade_count);
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

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${stock.stock_name} ${quantity.toLocaleString()}주 매수가 완료되었습니다.`,
      stockName: stock.stock_name,
      quantity,
      unitPrice,
      grossAmount,
      feeRate,
      feeAmount,
      finalCost,
      currencyName: season.currency_name,
      availableMoney: nextAvailableMoney,
      holdingValue,
      totalAsset,
      profitAmount,
      profitRate: Number(profitRate.toFixed(4)),
      tradeCount,
      minimumTradeCount,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    console.error("Stock season buy error:", error);

    return NextResponse.json(
      { success: false, message: "주식 매수 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
