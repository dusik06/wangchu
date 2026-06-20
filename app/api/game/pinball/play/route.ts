import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

const COLORS_3 = ["red", "blue", "yellow"];
const COLORS_5 = ["red", "blue", "yellow", "green", "purple"];

function shuffleArray<T>(array: T[]) {
  const copied = [...array];

  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }

  return copied;
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const body = await req.json();
  const ballCount = Number(body.ballCount);
  const selectedColor = String(body.selectedColor || "");
  const betAmount = Number(body.betAmount);

  if (ballCount !== 3 && ballCount !== 5) {
    return NextResponse.json({
      success: false,
      message: "공 개수가 올바르지 않습니다.",
    });
  }

  const colors = ballCount === 3 ? COLORS_3 : COLORS_5;

  if (!colors.includes(selectedColor)) {
    return NextResponse.json({
      success: false,
      message: "선택 색상이 올바르지 않습니다.",
    });
  }

  if (!betAmount || betAmount <= 0) {
    return NextResponse.json({
      success: false,
      message: "배팅 도토리를 입력하세요.",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      `
      SELECT id, dotori
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [session.user.email]
    );

    if (!users || users.length === 0) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "유저 정보를 찾을 수 없습니다.",
      });
    }

    const user = users[0];
    const currentDotori = Number(user.dotori || 0);

    if (currentDotori < betAmount) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "도토리가 부족합니다.",
      });
    }

    const finishOrder = shuffleArray(colors);
    const winnerColor = finishOrder[finishOrder.length - 1];

    const multiplier = ballCount === 3 ? 2.7 : 4.3;
    const isWin = selectedColor === winnerColor;
    const payoutAmount = isWin ? Math.floor(betAmount * multiplier) : 0;

    await connection.query(
      `
      UPDATE users
      SET dotori = dotori - ?
      WHERE id = ?
      `,
      [betAmount, user.id]
    );

    if (isWin && payoutAmount > 0) {
      await connection.query(
        `
        UPDATE users
        SET dotori = dotori + ?
        WHERE id = ?
        `,
        [payoutAmount, user.id]
      );
    }

    await connection.query(
      `
      INSERT INTO pinball_game_logs
      (user_email, ball_count, selected_color, loser_color, bet_amount, is_win, payout_amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        session.user.email,
        ballCount,
        selectedColor,
        winnerColor,
        betAmount,
        isWin ? 1 : 0,
        payoutAmount,
      ]
    );
await connection.query(
  `
  INSERT INTO dotori_logs (user_id, amount, reason)
  VALUES (?, ?, ?)
  `,
  [
    user.id,
    -betAmount,
    isWin
      ? `핀볼 배팅 성공 (${selectedColor})`
      : `핀볼 배팅 실패 (${selectedColor})`,
  ]
);

if (isWin && payoutAmount > 0) {
  await connection.query(
    `
    INSERT INTO dotori_logs (user_id, amount, reason)
    VALUES (?, ?, ?)
    `,
    [
      user.id,
      payoutAmount,
      `핀볼 당첨금 지급 (${winnerColor})`,
    ]
  );
}

    await connection.commit();

    return NextResponse.json({
      success: true,
      finishOrder,
      loserColor: winnerColor,
      winnerColor,
      isWin,
      payoutAmount,
      multiplier,
    });
  } catch (error) {
    console.error(error);
    await connection.rollback();

    return NextResponse.json({
      success: false,
      message: "핀볼 처리 중 오류가 발생했습니다.",
    });
  } finally {
    connection.release();
  }
}