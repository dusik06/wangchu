import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "관리자만 접근 가능합니다." },
        { status: 403 }
      );
    }

    const [logs]: any = await db.query(`
      SELECT
        b.id,
        b.game_id,
        g.title,
        g.win_label,
        g.lose_label,
        g.result,
        g.status AS game_status,
        u.nickname,
        u.email,
        u.role,
        b.choice,
        b.bet_amount,
        b.odds,
        b.payout_amount,
        b.status,
        b.created_at,
        b.settled_at
      FROM prediction_bets b
      JOIN prediction_games g ON b.game_id = g.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
      LIMIT 500
    `);

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "예측 로그를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}