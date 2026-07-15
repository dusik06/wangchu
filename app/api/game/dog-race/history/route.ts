import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const [users]: any = await db.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length) {
    return NextResponse.json({ success: false, message: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const [rows]: any = await db.query(
    `
    SELECT
      b.id,
      b.race_id,
      b.selected_lane,
      b.bet_amount,
      b.odds,
      b.payout_amount,
      b.status,
      b.created_at,
      r.winner_lane,
      e.dog_name AS selected_dog_name
    FROM dog_race_bets b
    INNER JOIN dog_races r ON r.id = b.race_id
    LEFT JOIN dog_race_entries e
      ON e.race_id = b.race_id
     AND e.lane_no = b.selected_lane
    WHERE b.user_id = ?
    ORDER BY b.id DESC
    LIMIT 30
    `,
    [users[0].id]
  );

  return NextResponse.json({ success: true, history: rows });
}
