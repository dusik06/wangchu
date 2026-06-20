import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const connection = await db.getConnection();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { gameId, choice, betAmount } = body;

    await connection.beginTransaction();

    const [alreadyBet]: any = await connection.query(
      `
      SELECT id
      FROM prediction_bets
      WHERE game_id = ? AND user_id = ?
      LIMIT 1
      `,
      [gameId, session.user.id]
    );

    if (alreadyBet.length) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "이미 참여한 예측입니다.",
      });
    }

    const [users]: any = await connection.query(
      "SELECT dotori, role FROM users WHERE id = ? LIMIT 1",
      [session.user.id]
    );

    if (!users.length) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "유저 없음",
      });
    }

    if (users[0].role === "admin") {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "관리자는 참여 불가",
      });
    }

    if (users[0].dotori < betAmount) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "도토리 부족",
      });
    }

    const [games]: any = await connection.query(
      "SELECT * FROM prediction_games WHERE id = ? LIMIT 1",
      [gameId]
    );

    const game = games[0];

    const odds =
      choice === "WIN"
        ? Number(game.win_odds)
        : Number(game.lose_odds);

    await connection.query(
      "UPDATE users SET dotori = dotori - ? WHERE id = ?",
      [betAmount, session.user.id]
    );

    await connection.query(
      `
      INSERT INTO prediction_bets (
        game_id,
        user_id,
        choice,
        bet_amount,
        odds
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        gameId,
        session.user.id,
        choice,
        betAmount,
        odds,
      ]
    );
await connection.query(
  `
  INSERT INTO dotori_logs (user_id, amount, reason)
  VALUES (?, ?, ?)
  `,
  [
    session.user.id,
    -betAmount,
    `승패예측 배팅 (${choice})`,
  ]
);

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "배팅 완료",
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "배팅 실패",
    });
  } finally {
    connection.release();
  }
}