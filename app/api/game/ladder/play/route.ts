import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

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
  const oddEven = line % 2 === 1 ? "odd" : "even";

  return {
    side,
    line,
    oddEven,
    code: `${side}${line}`,
    text: `${side === "left" ? "좌" : "우"}${line} / ${oddEven === "odd" ? "홀" : "짝"}`,
  };
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." });
  }

  const { betType, betAmount } = await req.json();

  if (!betType || !betAmount || Number(betAmount) <= 0) {
    return NextResponse.json({ success: false, message: "배팅 정보를 확인해주세요." });
  }

  const multiplier = MULTIPLIERS[betType];

  if (!multiplier) {
    return NextResponse.json({ success: false, message: "존재하지 않는 배팅 항목입니다." });
  }

  const [users]: any = await db.query(
    "SELECT id, email, nickname, dotori FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length) {
    return NextResponse.json({ success: false, message: "유저를 찾을 수 없습니다." });
  }

  const user = users[0];
  const amount = Number(betAmount);

  if (Number(user.dotori) < amount) {
    return NextResponse.json({ success: false, message: "도토리가 부족합니다." });
  }

  const result = randomResult();

  let isWin = false;

  if (betType === result.side) isWin = true;
  if (betType === result.oddEven) isWin = true;
  if (betType === `line${result.line}`) isWin = true;
  if (betType === result.code) isWin = true;

  const payout = isWin ? Math.floor(amount * multiplier) : 0;

  await db.query(
    "UPDATE users SET dotori = dotori - ? + ? WHERE id = ?",
    [amount, payout, user.id]
  );

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
      amount,
      result.side,
      result.line,
      result.code,
      result.text,
      multiplier,
      isWin ? 1 : 0,
      payout,
    ]
  );

  return NextResponse.json({
    success: true,
    result,
    isWin,
    payout,
    multiplier,
  });
}