import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [logs]: any = await db.query(
      `
      SELECT
        d.id,
        d.user_id,
        u.email,
        u.nickname,
        u.role,
        d.bet_amount,
        d.choice,
        d.first_dice,
        d.first_result,
        d.first_win,
        d.final_action,
        d.second_dice,
        d.second_result,
        d.double_win,
        d.payout_amount,
        d.status,
        d.created_at,
        d.completed_at
      FROM dice_game_logs d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
      LIMIT 300
      `
    );

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "관리자 게임 기록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}