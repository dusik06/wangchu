import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [logs]: any = await db.query(
      `
      SELECT
        u.nickname,
        b.choice,
        b.bet_amount,
        b.status,
        b.payout_amount
      FROM prediction_bets b
      INNER JOIN users u
        ON u.id = b.user_id
      WHERE b.game_id = ?
      ORDER BY b.bet_amount DESC
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "상세 내역 불러오기 실패" },
      { status: 500 }
    );
  }
}