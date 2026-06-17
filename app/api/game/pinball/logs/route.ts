import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [logs]: any = await db.query(
      `
      SELECT
        id,
        nickname,
        ball_count,
        selected_color,
        loser_color,
        bet_amount,
        multiplier,
        is_win,
        payout_amount,
        created_at
      FROM pinball_game_logs
      ORDER BY id DESC
      LIMIT 30
      `
    );

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("pinball logs error:", error);

    return NextResponse.json({
      success: false,
      message: "핀볼 기록을 불러오지 못했습니다.",
      logs: [],
    });
  }
}