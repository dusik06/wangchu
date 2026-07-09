import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function isAdmin(email: string) {
  const [rows]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows.length > 0 && rows[0].role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const admin = await isAdmin(session.user.email);

  if (!admin) {
    return NextResponse.json({
      success: false,
      message: "관리자만 접근할 수 있습니다.",
    });
  }

  try {
    const [logs]: any = await db.query(`
      SELECT
        r.id,
        r.session_id,
        r.user_id,
        u.email,
        u.nickname,
        u.role,
        r.step,
        r.bet_choice,
        r.bet_amount,
        r.start_number,
        r.result_number,
        r.is_win,
        r.display_multiplier,
        r.real_win_rate,
        r.payout_amount,
        r.created_at
      FROM updown_game_rounds r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.id DESC
      LIMIT 300
    `);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "업다운게임 기록을 불러오지 못했습니다.",
    });
  }
}