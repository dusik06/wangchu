import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const MULTIPLIERS: Record<string, number> = {
  left: 1.9,
  right: 1.9,
  odd: 1.9,
  even: 1.9,
  line3: 1.9,
  line4: 1.9,
  left3: 3.9,
  right4: 3.9,
  left4: 3.9,
  right3: 3.9,
};

function randomResult() {
  const side = Math.random() > 0.5 ? "left" : "right";
  const line = Math.random() > 0.5 ? 3 : 4;
  const oddEven = line === 3 ? "odd" : "even";

  return {
    side,
    line,
    oddEven,
    code: `${side}${line}`,
    text: `${side === "left" ? "좌" : "우"}${line} / ${
      oddEven === "odd" ? "홀" : "짝"
    }`,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        message: "로그인이 필요합니다.",
      });
    }

    const body = await req.json();
    const betType = String(body.betType || "");
    const betAmount = Number(body.betAmount || 0);

    if (!betType || !MULTIPLIERS[betType]) {
      return NextResponse.json({
        success: false,
        message: "배팅 항목이 올바르지 않습니다.",
      });
    }

    if (!betAmount || betAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: "배팅 도토리를 입력하세요.",
      });
    }

    const [users]: any = await db.query(
      "SELECT id, email, nickname, dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!users.length) {
      return NextResponse.json({
        success: false,
        message: "유저 정보를 찾을 수 없습니다.",
      });
    }

    const user = users[0];

    if (Number(user.dotori) < betAmount) {
      return NextResponse.json({
        success: false,
        message: "도토리가 부족합니다.",
      });
    }

    const result = randomResult();

    const isWin =
      betType === result.side ||
      betType === result.oddEven ||
      betType === `line${result.line}` ||
      betType === result.code;

    const multiplier = MULTIPLIERS[betType];
    const payoutAmount = isWin ? Math.floor(betAmount * multiplier) : 0;

    await db.query("UPDATE users SET dotori = dotori - ? + ? WHERE id = ?", [
      betAmount,
      payoutAmount,
      user.id,
    ]);

    await db.query(
      `
      INSERT INTO ladder_game_logs
      (
        user_id,
        user_email,
        nickname,
        bet_type,
        bet_amount,
        result_side,
        result_line,
        result_code,
        result_text,
        multiplier,
        is_win,
        payout_amount
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        user.email,
        user.nickname || "익명",
        betType,
        betAmount,
        result.side,
        String(result.line),
        result.code,
        result.text,
        multiplier,
        isWin ? 1 : 0,
        payoutAmount,
      ]
    );

    return NextResponse.json({
      success: true,
      result,
      isWin,
      payout: payoutAmount,
    });
  } catch (error) {
    console.error("ladder play error:", error);

    return NextResponse.json({
      success: false,
      message: "사다리게임 처리 중 오류가 발생했습니다.",
    });
  }
}