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
      id,
      mode,
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

    if (!id) {
      return NextResponse.json({
        success: false,
        message: "예측 ID 없음",
      });
    }

    if (mode === "delete") {
      await db.query(
        "DELETE FROM prediction_games WHERE id = ? AND status = 'OPEN'",
        [id]
      );

      return NextResponse.json({
        success: true,
        message: "삭제 완료",
      });
    }

    await db.query(
      `
      UPDATE prediction_games
      SET
        title = ?,
        description = ?,
        win_label = ?,
        lose_label = ?,
        win_odds = ?,
        lose_odds = ?,
        min_bet = ?,
        max_bet = ?,
        betting_deadline = ?
      WHERE id = ?
      AND status = 'OPEN'
      `,
      [
        title,
        description || null,
        winLabel,
        loseLabel,
        Number(winOdds),
        Number(loseOdds),
        Number(minBet),
        Number(maxBet),
        bettingDeadline,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "수정 완료",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "수정 실패",
    });
  }
}