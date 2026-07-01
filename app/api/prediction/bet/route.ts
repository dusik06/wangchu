import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function isValidChoice(choice: any) {
  return choice === "WIN" || choice === "LOSE";
}

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
    const gameId = Number(body.gameId);
    const choice = body.choice;
    const betAmount = Number(body.betAmount);

    if (!gameId || !isValidChoice(choice)) {
      return NextResponse.json({
        success: false,
        message: "배팅 정보가 올바르지 않습니다.",
      });
    }

    if (!Number.isInteger(betAmount) || betAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: "배팅 도토리를 올바르게 입력해주세요.",
      });
    }

    await connection.beginTransaction();

    const [games]: any = await connection.query(
      `
      SELECT *
      FROM prediction_games
      WHERE id = ?
      LIMIT 1
      `,
      [gameId]
    );

    if (!games.length) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "예측 정보를 찾을 수 없습니다.",
      });
    }

    const game = games[0];

    if (game.status !== "OPEN") {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "이미 종료된 예측입니다.",
      });
    }

    const now = new Date();
    const deadline = new Date(game.betting_deadline);

    if (!game.betting_deadline || Number.isNaN(deadline.getTime())) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "마감시간 설정이 올바르지 않습니다.",
      });
    }

    if (now.getTime() > deadline.getTime()) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "배팅 마감되었습니다.",
      });
    }

    const minBet = Number(game.min_bet || 0);
    const maxBet = Number(game.max_bet || 0);

    if (minBet > 0 && betAmount < minBet) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: `최소 배팅은 ${minBet.toLocaleString()} 도토리입니다.`,
      });
    }

    if (maxBet > 0 && betAmount > maxBet) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: `최대 배팅은 ${maxBet.toLocaleString()} 도토리입니다.`,
      });
    }

    const [alreadyBet]: any = await connection.query(
      `
      SELECT id
      FROM prediction_bets
      WHERE game_id = ?
      AND user_id = ?
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
        message: "유저 정보를 찾을 수 없습니다.",
      });
    }

    if (users[0].role === "admin") {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "관리자는 참여 불가",
      });
    }

    if (Number(users[0].dotori) < betAmount) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "도토리가 부족합니다.",
      });
    }

    const odds =
      choice === "WIN" ? Number(game.win_odds) : Number(game.lose_odds);

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
      [gameId, session.user.id, choice, betAmount, odds]
    );

    await connection.query(
      `
      INSERT INTO dotori_logs (user_id, amount, reason)
      VALUES (?, ?, ?)
      `,
      [
        session.user.id,
        -betAmount,
        `승패예측 배팅 (${choice === "WIN" ? game.win_label : game.lose_label})`,
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