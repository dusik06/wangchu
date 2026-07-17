import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [realtimeRows]: any = await db.query(`
      SELECT
        u.id AS user_id,
        u.nickname,
        SUM((s.current_price * h.quantity) - h.total_buy_amount) AS profit_amount,
        SUM(h.total_buy_amount) AS buy_amount
      FROM stock_holdings h
      INNER JOIN users u ON u.id = h.user_id
      INNER JOIN stock_items s ON s.id = h.stock_id
      GROUP BY u.id, u.nickname
      HAVING profit_amount != 0
      ORDER BY profit_amount DESC
      LIMIT 5
    `);

    const [profitRows]: any = await db.query(`
      SELECT
        u.id AS user_id,
        u.nickname,
        SUM(t.profit_amount) AS profit_amount
      FROM stock_trades t
      INNER JOIN users u ON u.id = t.user_id
      WHERE t.trade_type = 'SELL'
      GROUP BY u.id, u.nickname
      HAVING profit_amount != 0
      ORDER BY profit_amount DESC
      LIMIT 5
    `);

    const realtime = realtimeRows.map((row: any) => {
      const profitAmount = Number(row.profit_amount || 0);
      const buyAmount = Number(row.buy_amount || 0);
      const profitRate =
        buyAmount > 0 ? Math.floor((profitAmount / buyAmount) * 100) : 0;

      return {
        user_id: Number(row.user_id),
        nickname: row.nickname || "익명",
        profit_amount: profitAmount,
        profit_rate: profitRate,
      };
    });

    const profit = profitRows.map((row: any) => ({
      user_id: Number(row.user_id),
      nickname: row.nickname || "익명",
      profit_amount: Number(row.profit_amount || 0),
    }));

    return NextResponse.json({
      success: true,
      realtime,
      profit,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "주식 랭킹을 불러오지 못했습니다.",
        realtime: [],
        profit: [],
      },
      { status: 500 }
    );
  }
}