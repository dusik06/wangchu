import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [ranking]: any = await db.query(
      `
      SELECT
        u.id AS user_id,
        u.nickname,
        SUM(d.bet_amount) AS total_bet
      FROM dice_game_logs d
      JOIN users u ON d.user_id = u.id
      WHERE u.role != 'admin'
      GROUP BY u.id, u.nickname
      ORDER BY total_bet DESC
      LIMIT 10
      `
    );

    return NextResponse.json({
      success: true,
      ranking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "랭킹을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}