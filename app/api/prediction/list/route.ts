import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 0;

    const [games]: any = await db.query(
      `
      SELECT
        g.*,
        b.choice AS my_choice,
        b.bet_amount AS my_bet_amount,
        b.status AS my_bet_status,
        b.payout_amount AS my_payout_amount
      FROM prediction_games g
      LEFT JOIN prediction_bets b
        ON b.game_id = g.id
        AND b.user_id = ?
      ORDER BY g.created_at DESC
      `,
      [userId]
    );

    return NextResponse.json({
      success: true,
      games,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "목록 불러오기 실패" },
      { status: 500 }
    );
  }
}