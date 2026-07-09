import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function getDiceResult(choice: string) {
  const winChance = 40;
  const isWin = Math.random() * 100 < winChance;

  const result = isWin
    ? choice
    : choice === "ODD"
    ? "EVEN"
    : "ODD";

  const dice =
    result === "ODD"
      ? [1, 3, 5][Math.floor(Math.random() * 3)]
      : [2, 4, 6][Math.floor(Math.random() * 3)];

  return { dice, result };
}

export async function POST(req: Request) {
  const connection = await db.getConnection();

  try {
    const body = await req.json();
    const { gameId, doubleChoice } = body;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    if (!gameId || !doubleChoice || !["ODD", "EVEN"].includes(doubleChoice)) {
      return NextResponse.json(
        { success: false, message: "엎기 홀/짝 선택이 필요합니다." },
        { status: 400 }
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
        { success: false, message: "엎기 가능한 게임이 없습니다." },
        { status: 400 }
      );
    }

    const game = games[0];
    const { dice, result } = getDiceResult(doubleChoice);

    const doubleWin = doubleChoice === result;
    const payoutAmount = doubleWin ? Math.floor(game.bet_amount * 3.8) : 0;

    if (doubleWin) {
      await connection.query(
        "UPDATE users SET dotori = dotori + ? WHERE id = ?",
        [payoutAmount, userId]
      );
    }

    await connection.query(
      `
      UPDATE dice_game_logs
      SET
        final_action = 'DOUBLE',
        second_choice = ?,
        second_dice = ?,
        second_result = ?,
        double_win = ?,
        payout_amount = ?,
        status = ?,
        completed_at = NOW()
      WHERE id = ?
      `,
      [
        doubleChoice,
        dice,
        result,
        doubleWin ? 1 : 0,
        payoutAmount,
        doubleWin ? "DOUBLE_SUCCESS" : "DOUBLE_FAIL",
        gameId,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      dice,
      result,
      doubleChoice,
      doubleWin,
      payoutAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { success: false, message: "엎기 처리 실패" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}