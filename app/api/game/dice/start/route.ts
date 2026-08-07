import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GAME_BET_MAX, validateGameBet } from "@/lib/game-bet-limit";

function getDiceResult(choice: string) {
  const winChance = 45;
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
    const { choice } = body;
    const betAmount = Math.floor(Number(body.betAmount));

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    if (!choice || !betAmount) {
      return NextResponse.json(
        { success: false, message: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "배팅 금액이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (betAmount > GAME_BET_MAX) {
      return NextResponse.json(
        { success: false, message: `한 번에 최대 ${GAME_BET_MAX.toLocaleString()}도토리까지 배팅할 수 있습니다.` },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!users.length) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "유저를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const user = users[0];

    const betValidation = await validateGameBet(connection, {
      userId: user.id,
      userEmail: String(user.email || session.user.email || ""),
      betAmount,
    });

    if (!betValidation.ok) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: betValidation.message }, { status: 400 });
    }

    if (user.dotori < betAmount) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "도토리가 부족합니다." },
        { status: 400 }
      );
    }

    await connection.query(
      "UPDATE users SET dotori = dotori - ? WHERE id = ?",
      [betAmount, userId]
    );

    const { dice, result } = getDiceResult(choice);
    const firstWin = choice === result;
    const status = firstWin ? "PENDING_CHOICE" : "LOSE";

    const [gameResult]: any = await connection.query(
      `
      INSERT INTO dice_game_logs (
        user_id,
        nickname,
        bet_amount,
        choice,
        first_dice,
        first_result,
        first_win,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        user.nickname,
        betAmount,
        choice,
        dice,
        result,
        firstWin ? 1 : 0,
        status,
      ]
    );

    await connection.query(
      `
      INSERT INTO dotori_logs (user_id, amount, reason)
      VALUES (?, ?, ?)
      `,
      [userId, -betAmount, `주사위 배팅 (${choice})`]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      gameId: gameResult.insertId,
      dice,
      result,
      firstWin,
      status,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { success: false, message: "게임 처리 중 오류 발생" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}