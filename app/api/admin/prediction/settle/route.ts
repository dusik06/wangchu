import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const connection = await db.getConnection();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { gameId, result } = body;

    if (!gameId || !result) {
      return NextResponse.json(
        { success: false, message: "값 부족" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [games]: any = await connection.query(
      "SELECT * FROM prediction_games WHERE id = ? LIMIT 1",
      [gameId]
    );

    if (!games.length) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "게임 없음" },
        { status: 404 }
      );
    }

    const game = games[0];

    const [bets]: any = await connection.query(
      "SELECT * FROM prediction_bets WHERE game_id = ?",
      [gameId]
    );

    for (const bet of bets) {
      const isWin = bet.choice === result;
      const payout = isWin
        ? Math.floor(Number(bet.bet_amount) * Number(bet.odds))
        : 0;

      if (isWin) {
        await connection.query(
          "UPDATE users SET dotori = dotori + ? WHERE id = ?",
          [payout, bet.user_id]
        );
      }

      await connection.query(
        `
        UPDATE prediction_bets
        SET
          payout_amount = ?,
          status = ?,
          settled_at = NOW()
        WHERE id = ?
        `,
        [
          payout,
          isWin ? "WIN" : "LOSE",
          bet.id,
        ]
      );
    }

    await connection.query(
      `
      UPDATE prediction_games
      SET
        status = 'SETTLED',
        result = ?,
        settled_at = NOW()
      WHERE id = ?
      `,
      [result, gameId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "정산 완료",
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { success: false, message: "정산 실패" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}