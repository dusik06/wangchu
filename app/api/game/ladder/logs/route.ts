import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [logs]: any = await db.query(
      `
      SELECT
        id,
        nickname,
        bet_type,
        bet_amount,
        result_text,
        is_win,
        payout_amount,
        created_at
      FROM ladder_game_logs
      ORDER BY id DESC
      LIMIT 30
      `
    );

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "사다리 기록을 불러오지 못했습니다.",
    });
  }
}