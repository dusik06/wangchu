import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  try {
    const [users]: any = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!users.length) {
      return NextResponse.json({
        success: false,
        message: "유저 정보를 찾을 수 없습니다.",
      });
    }

    const user = users[0];

    const [sessions]: any = await db.query(
      `
      SELECT id, bet_amount, current_number, step, accumulated_payout, status
      FROM updown_game_sessions
      WHERE user_id = ? AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
      `,
      [user.id]
    );

    if (!sessions.length) {
      return NextResponse.json({
        success: true,
        hasActiveGame: false,
      });
    }

    const game = sessions[0];

    return NextResponse.json({
      success: true,
      hasActiveGame: true,
      sessionId: Number(game.id),
      betAmount: Number(game.bet_amount),
      currentNumber: Number(game.current_number),
      step: Number(game.step),
      accumulatedPayout: Number(game.accumulated_payout),
      status: "active",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "게임 상태를 불러오지 못했습니다.",
    });
  }
}