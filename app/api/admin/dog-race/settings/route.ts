import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const [users]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length || users[0].role !== "admin") {
    return NextResponse.json({ success: false, message: "관리자만 가능합니다." }, { status: 403 });
  }

  const form = await req.formData();
  const minBet = Math.max(1, Number(form.get("minBet") || 10));
  const maxBet = Math.max(minBet, Number(form.get("maxBet") || 10000));
  const payoutRate = Math.max(0.5, Math.min(1, Number(form.get("payoutRate") || 0.92)));
  const isActive = Number(form.get("isActive") || 0) === 1 ? 1 : 0;

  await db.query(
    `
    UPDATE dog_race_settings
    SET min_bet = ?, max_bet = ?, payout_rate = ?, is_active = ?, updated_at = NOW()
    WHERE id = 1
    `,
    [minBet, maxBet, payoutRate, isActive]
  );

  return NextResponse.redirect(new URL("/admin/dog-race", req.url));
}
