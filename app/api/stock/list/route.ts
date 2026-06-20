import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [stocks]: any = await db.query(`
      SELECT
        s.*,
        (
          SELECT price
          FROM stock_price_logs
          WHERE stock_id = s.id
          ORDER BY id DESC
          LIMIT 1 OFFSET 1
        ) AS prev_price
      FROM stock_items s
      ORDER BY s.is_listed DESC, s.id ASC
    `);

    return NextResponse.json({
      success: true,
      stocks,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "주식 목록 조회 실패" },
      { status: 500 }
    );
  }
}