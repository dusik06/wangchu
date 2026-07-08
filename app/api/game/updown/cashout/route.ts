import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const body = await req.json().catch(() => null);
  const sessionId = Number(body?.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({
      success: false,
      message: "게임 정보를 찾을 수 없습니다.",
    });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [users]: any = await conn.query(
      "SELECT id FROM users WHERE email = ? FOR UPDATE",
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

    const [sessions]: any = await conn.query(
      `
      SELECT *
      FROM updown_game_sessions
      WHERE id = ? AND user_id = ? AND status = 'active'
      FOR UPDATE
      `,
      [sessionId, user.id]
    );

    if (!sessions.length) {
      await conn.rollback();
      return NextResponse.json({
        success: false,
        message: "받기 가능한 게임이 없습니다.",
      });
    }

    const game = sessions[0];
    const payout = Number(game.accumulated_payout);

    if (!Number.isInteger(payout) || payout <= 0) {
      await conn.rollback();
      return NextResponse.json({
        success: false,
        message: "받을 당첨금이 없습니다.",
      });
    }

    await conn.query(
      "UPDATE users SET dotori = dotori + ? WHERE id = ?",
      [payout, user.id]
    );

    await conn.query(
      `
      UPDATE updown_game_sessions
      SET status = 'cashed_out', ended_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [sessionId, user.id]
    );

    await conn.query(
      "INSERT INTO dotori_logs (user_id, amount, reason, created_at) VALUES (?, ?, ?, NOW())",
      [user.id, payout, "업다운게임 당첨금 받기"]
    );

    await conn.commit();

    return NextResponse.json({
      success: true,
      payout,
    });
  } catch (error) {
    await conn.rollback();

    return NextResponse.json({
      success: false,
      message: "당첨금 받기 중 오류가 발생했습니다.",
    });
  } finally {
    conn.release();
  }
}