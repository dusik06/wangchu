import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type Choice = "up" | "same" | "down";

function isChoice(value: any): value is Choice {
  return value === "up" || value === "same" || value === "down";
}

function getCount(current: number, choice: Choice) {
  if (choice === "down") return current - 1;
  if (choice === "same") return 1;
  return 9 - current;
}

function getDisplayMultiplier(current: number, choice: Choice) {
  const count = getCount(current, choice);
  if (count <= 0) return 0;
  return Math.round((9 / count) * 100) / 100;
}

function getCorrection(step: number) {
  if (step <= 1) return 0.9;
  if (step === 2) return 0.85;
  if (step === 3) return 0.8;
  if (step === 4) return 0.75;
  return 0.7;
}

function pickResultNumber(current: number, choice: Choice, step: number) {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const winNumbers = all.filter((n) => {
    if (choice === "down") return n < current;
    if (choice === "same") return n === current;
    return n > current;
  });

  const loseNumbers = all.filter((n) => !winNumbers.includes(n));

  const baseWinRate = winNumbers.length / 9;
  const realWinRate = baseWinRate * getCorrection(step);
  const isWin = Math.random() < realWinRate;

  const pool = isWin ? winNumbers : loseNumbers;
  const resultNumber = pool[Math.floor(Math.random() * pool.length)];

  return {
    resultNumber,
    isWin,
    realWinRate,
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const body = await req.json().catch(() => null);
  const betAmount = Number(body?.betAmount);
  const choice = body?.choice;

  if (!Number.isInteger(betAmount) || betAmount <= 0) {
    return NextResponse.json({
      success: false,
      message: "배팅 도토리를 정확히 입력해주세요.",
    });
  }

  if (!isChoice(choice)) {
    return NextResponse.json({
      success: false,
      message: "업 / 같음 / 다운 중 하나를 선택해주세요.",
    });
  }

  const currentNumber = 5;
  const step = 1;
  const displayMultiplier = getDisplayMultiplier(currentNumber, choice);

  if (displayMultiplier <= 0) {
    return NextResponse.json({
      success: false,
      message: "선택할 수 없는 방향입니다.",
    });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [users]: any = await conn.query(
      "SELECT id, dotori FROM users WHERE email = ? FOR UPDATE",
      [session.user.email]
    );

    if (!users.length) {
      await conn.rollback();
      return NextResponse.json({
        success: false,
        message: "유저 정보를 찾을 수 없습니다.",
      });
    }

    const user = users[0];

    if (Number(user.dotori) < betAmount) {
      await conn.rollback();
      return NextResponse.json({
        success: false,
        message: "도토리가 부족합니다.",
      });
    }

    await conn.query(
      "UPDATE updown_game_sessions SET status = 'lost', ended_at = NOW() WHERE user_id = ? AND status = 'active'",
      [user.id]
    );

    await conn.query(
      "UPDATE users SET dotori = dotori - ? WHERE id = ?",
      [betAmount, user.id]
    );

    await conn.query(
      "INSERT INTO dotori_logs (user_id, amount, reason, created_at) VALUES (?, ?, ?, NOW())",
      [user.id, -betAmount, "업다운게임 배팅"]
    );

    const picked = pickResultNumber(currentNumber, choice, step);
    const payoutAmount = picked.isWin
      ? Math.floor(betAmount * displayMultiplier)
      : 0;

    const [sessionResult]: any = await conn.query(
      `
      INSERT INTO updown_game_sessions
      (user_id, bet_amount, current_number, step, accumulated_payout, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        user.id,
        betAmount,
        picked.resultNumber,
        picked.isWin ? 2 : 1,
        payoutAmount,
        picked.isWin ? "active" : "lost",
      ]
    );

    const sessionId = sessionResult.insertId;

    await conn.query(
      `
      INSERT INTO updown_game_rounds
      (session_id, user_id, step, bet_choice, bet_amount, start_number, result_number, is_win, display_multiplier, real_win_rate, payout_amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        sessionId,
        user.id,
        step,
        choice,
        betAmount,
        currentNumber,
        picked.resultNumber,
        picked.isWin ? 1 : 0,
        displayMultiplier,
        picked.realWinRate,
        payoutAmount,
      ]
    );

    await conn.commit();

    return NextResponse.json({
      success: true,
      sessionId,
      status: picked.isWin ? "active" : "lost",
      startNumber: currentNumber,
      resultNumber: picked.resultNumber,
      currentNumber: picked.resultNumber,
      choice,
      isWin: picked.isWin,
      step: picked.isWin ? 2 : 1,
      betAmount,
      accumulatedPayout: payoutAmount,
      displayMultiplier,
      realWinRate: picked.realWinRate,
    });
  } catch (error) {
    await conn.rollback();

    return NextResponse.json({
      success: false,
      message: "업다운게임 시작 중 오류가 발생했습니다.",
    });
  } finally {
    conn.release();
  }
}