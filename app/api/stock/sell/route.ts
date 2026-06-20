import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const stockId = Number(body.stockId);
  const quantity = Math.floor(Number(body.quantity));

  if (!stockId || !quantity || quantity <= 0) {
    return NextResponse.json(
      { success: false, message: "판매 수량이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );

    const user = users[0];

    if (!user) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "유저 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const [stocks]: any = await connection.query(
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

    const stock = stocks[0];

    if (!stock) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "거래 가능한 주식이 없습니다." },
        { status: 404 }
      );
    }

    const [holdings]: any = await connection.query(
      `
      SELECT *
      FROM stock_holdings
      WHERE user_id = ?
        AND stock_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [user.id, stock.id]
    );

    const holding = holdings[0];

    if (!holding || Number(holding.quantity) < quantity) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "보유 수량이 부족합니다." },
        { status: 400 }
      );
    }

    const price = Number(stock.current_price);
    const totalAmount = price * quantity;

    if (price <= 0 || totalAmount <= 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "현재 거래할 수 없는 가격입니다." },
        { status: 400 }
      );
    }

    const currentQuantity = Number(holding.quantity);
    const currentTotalBuy = Number(holding.total_buy_amount);
    const sellBuyAmount = Math.floor(
      (currentTotalBuy * quantity) / currentQuantity
    );
    const profitAmount = totalAmount - sellBuyAmount;

    const nextQuantity = currentQuantity - quantity;
    const nextTotalBuyAmount = Math.max(0, currentTotalBuy - sellBuyAmount);

    await connection.query(
      `
      UPDATE users
      SET dotori = dotori + ?
      WHERE id = ?
      `,
      [totalAmount, user.id]
    );

    if (nextQuantity <= 0) {
      await connection.query(
        `
        DELETE FROM stock_holdings
        WHERE id = ?
        `,
        [holding.id]
      );
    } else {
      await connection.query(
        `
        UPDATE stock_holdings
        SET quantity = ?,
            total_buy_amount = ?,
            updated_at = NOW()
        WHERE id = ?
        `,
        [nextQuantity, nextTotalBuyAmount, holding.id]
      );
    }

    await connection.query(
      `
      INSERT INTO stock_trades
      (
        user_id,
        stock_id,
        trade_type,
        quantity,
        price,
        total_amount,
        buy_cost_amount,
        profit_amount,
        created_at
      )
      VALUES (?, ?, 'SELL', ?, ?, ?, ?, ?, NOW())
      `,
      [
        user.id,
        stock.id,
        quantity,
        price,
        totalAmount,
        sellBuyAmount,
        profitAmount,
      ]
    );

    await connection.query(
      `
      INSERT INTO dotori_logs (user_id, amount, reason)
      VALUES (?, ?, ?)
      `,
      [
        user.id,
        totalAmount,
        `주식 매도 - ${stock.stock_name} ${quantity}주 판매`,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "주식 매도 완료",
      price,
      quantity,
      totalAmount,
      profitAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { success: false, message: "주식 매도 실패" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}