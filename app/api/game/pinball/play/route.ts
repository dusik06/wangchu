import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const COLORS_3 = ["red", "blue", "yellow"];
const COLORS_5 = ["red", "blue", "yellow", "green", "purple"];

function shuffleArray(arr: string[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function POST(req: Request) {
  const connection = await db.getConnection();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({
        success: false,
        message: "로그인이 필요합니다.",
      });
    }

    const body = await req.json();
    const { ballCount, selectedColor, betAmount } = body;

    if (![3, 5].includes(Number(ballCount))) {
      return NextResponse.json({
        success: false,
        message: "잘못된 게임 모드",
      });
    }

    if (!betAmount || Number(betAmount) <= 0) {
      return NextResponse.json({
        success: false,
        message: "배팅 금액 오류",
      });
    }

    const colors =
      Number(ballCount) === 3 ? COLORS_3 : COLORS_5;

    if (!colors.includes(selectedColor)) {
      return NextResponse.json({
        success: false,
        message: "잘못된 색상 선택",
      });
    }

    await connection.beginTransaction();

    const [users]: any = await connection.query(
      `
      SELECT id, nickname, dotori
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [session.user.id]
    );

    if (!users.length) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "유저 없음",
      });
    }

    const user = users[0];

    if (Number(user.dotori) < Number(betAmount)) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "도토리 부족",
      });
    }

    await connection.query(
      `
      UPDATE users
      SET dotori = dotori - ?
      WHERE id = ?
      `,
      [betAmount, session.user.id]
    );

    const finishOrder = shuffleArray(colors);
    const loserColor = finishOrder[finishOrder.length - 1];

    const multiplier =
      Number(ballCount) === 3 ? 2.7 : 4.5;

    const isWin = loserColor === selectedColor ? 1 : 0;

    const payoutAmount = isWin
      ? Math.floor(Number(betAmount) * multiplier)
      : 0;

    if (isWin) {
      await connection.query(
        `
        UPDATE users
        SET dotori = dotori + ?
        WHERE id = ?
        `,
        [payoutAmount, session.user.id]
      );
    }

    await connection.query(
      `
      INSERT INTO pinball_game_logs (
        user_id,
        user_email,
        nickname,
        ball_count,
        selected_color,
        loser_color,
        finish_order,
        bet_amount,
        multiplier,
        is_win,
        payout_amount,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        session.user.id,
        session.user.email,
        user.nickname || "익명",
        Number(ballCount),
        selectedColor,
        loserColor,
        JSON.stringify(finishOrder),
        Number(betAmount),
        multiplier,
        isWin,
        payoutAmount,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      finishOrder,
      loserColor,
      isWin,
      payoutAmount,
      multiplier,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "핀볼 처리 실패",
    });
  } finally {
    connection.release();
  }
}