import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const connection = await db.getConnection();

  try {
    const body = await req.json();
    const { gameId } = body;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    await connection.beginTransaction();

    const [games]: any = await connection.query(
      `
      SELECT *
      FROM dice_game_logs
      WHERE id = ?
      AND user_id = ?
      AND status = 'PENDING_CHOICE'
      LIMIT 1
      `,
      [gameId, userId]
    );

    if (!games.length) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "수령 가능한 게임이 없습니다." },
        { status: 400 }
      );
    }

    const game = games[0];
    const payoutAmount = Math.floor(game.bet_amount * 1.9);

    await connection.query(
      "UPDATE users SET dotori = dotori + ? WHERE id = ?",
      [payoutAmount, userId]
    );

    await connection.query(
      `
      UPDATE dice_game_logs
      SET
        final_action = 'CASHOUT',
        payout_amount = ?,
        status = 'CASHED_OUT',
        completed_at = NOW()
      WHERE id = ?
      `,
      [payoutAmount, gameId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      payoutAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { success: false, message: "수령 처리 실패" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}