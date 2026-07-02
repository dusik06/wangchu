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
        message: "예측 ID가 없습니다.",
      });
    }

    if (mode === "delete") {
      const [result]: any = await db.query(
        "DELETE FROM prediction_games WHERE id = ? AND status = 'OPEN'",
        [id]
      );

      return NextResponse.json({
        success: true,
        message: "삭제 완료",
        affectedRows: result.affectedRows,
      });
    }

    if (!title || !winLabel || !loseLabel || !bettingDeadline) {
      return NextResponse.json({
        success: false,
        message: "주제, 선택지, 마감시간은 필수입니다.",
      });
    }

    const [result]: any = await db.query(
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
        Number(winOdds || 1.9),
        Number(loseOdds || 1.9),
        Number(minBet || 10),
        Number(maxBet || 10000),
        bettingDeadline,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: "수정할 수 없는 예측입니다. 이미 정산 완료됐거나 존재하지 않습니다.",
      });
    }

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