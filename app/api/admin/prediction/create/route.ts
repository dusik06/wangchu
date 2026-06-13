import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      title,
      description,
      winLabel,
      loseLabel,
      winOdds,
      loseOdds,
      minBet,
      maxBet,
      bettingDeadline,
    } = body;

    if (
      !title ||
      !winLabel ||
      !loseLabel ||
      !bettingDeadline
    ) {
      return NextResponse.json(
        { success: false, message: "필수값이 부족합니다." },
        { status: 400 }
      );
    }

    const [result]: any = await db.query(
      `
      INSERT INTO prediction_games (
        title,
        description,
        win_label,
        lose_label,
        win_odds,
        lose_odds,
        min_bet,
        max_bet,
        betting_deadline,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description || null,
        winLabel,
        loseLabel,
        Number(winOdds || 1.9),
        Number(loseOdds || 1.9),
        Number(minBet || 10),
        Number(maxBet || 10000),
        bettingDeadline,
        session.user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      gameId: result.insertId,
      message: "예측 게임 생성 완료",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "예측 게임 생성 실패" },
      { status: 500 }
    );
  }
}