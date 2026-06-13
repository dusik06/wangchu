import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [logs]: any = await db.query(
      `
      SELECT
        d.id,
        d.bet_amount,
        d.payout_amount,
        d.created_at,
        u.nickname
      FROM dice_game_logs d
      JOIN users u ON d.user_id = u.id
      WHERE d.status = 'DOUBLE_SUCCESS'
      AND u.role != 'admin'
      ORDER BY d.completed_at DESC
      LIMIT 10
      `
    );

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "게임현황을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}