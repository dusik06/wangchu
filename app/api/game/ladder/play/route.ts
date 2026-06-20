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

function makeResult() {
  const side = Math.random() >= 0.5 ? "left" : "right";
  const line = Math.random() >= 0.5 ? 3 : 4;
  const oddEven = line === 3 ? "odd" : "even";

  const sideText = side === "left" ? "좌" : "우";
  const oddEvenText = oddEven === "odd" ? "홀" : "짝";

  return {
    side,
    line,
    oddEven,
    code: `${side}${line}`,
    text: `${sideText}${line}${oddEvenText}`,
  };
}

export async function POST(req: Request) {
  let connection: any;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: "로그인이 필요합니다." });
    }

    const body = await req.json();
    const betType = String(body.betType || "");
    const betAmount = Number(body.betAmount || 0);

    if (!MULTIPLIERS[betType]) {
      return NextResponse.json({ success: false, message: "배팅 항목이 올바르지 않습니다." });
    }

    if (!betAmount || betAmount <= 0) {
      return NextResponse.json({ success: false, message: "배팅 도토리를 입력하세요." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT id, email, nickname, dotori FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );

    if (!users.length) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "유저 정보를 찾을 수 없습니다." });
    }

    const user = users[0];

    if (Number(user.dotori) < betAmount) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "도토리가 부족합니다." });
    }

    const result = makeResult();

    const isWin =
      betType === result.side ||
      betType === result.oddEven ||
      betType === `line${result.line}` ||
      betType === result.code;

    const multiplier = MULTIPLIERS[betType];
    const payoutAmount = isWin ? Math.floor(betAmount * multiplier) : 0;

    await connection.query(
      "UPDATE users SET dotori = dotori - ? + ? WHERE id = ?",
      [betAmount, payoutAmount, user.id]
    );

    await connection.query(
      `
      INSERT INTO ladder_game_logs
      (
        user_id, user_email, nickname, bet_type, bet_amount,
        result_side, result_line, result_code, result_text,
        multiplier, is_win, payout_amount
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
        result.line,
        result.code,
        result.text,
        multiplier,
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
      ? `사다리 배팅 성공 (${betType})`
      : `사다리 배팅 실패 (${betType})`,
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
      `사다리 당첨금 지급 (${betType})`,
    ]
  );
}

    await connection.commit();

    return NextResponse.json({
      success: true,
      result,
      isWin,
      payout: payoutAmount,
      multiplier,
    });
  } catch (error: any) {
    if (connection) await connection.rollback();

    return NextResponse.json({
      success: false,
      message: error?.message || "사다리게임 처리 중 오류가 발생했습니다.",
    });
  } finally {
    if (connection) connection.release();
  }
}