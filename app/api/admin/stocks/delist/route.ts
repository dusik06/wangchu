import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const [admins]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    return NextResponse.json({ success: false, message: "관리자만 가능합니다." }, { status: 403 });
  }

  const body = await req.json();
  const stockId = Number(body.stockId);

  await db.query(
    `
    UPDATE stock_items
    SET is_listed = 0,
        current_price = 0,
        last_updated_at = NOW()
    WHERE id = ?
    `,
    [stockId]
  );

  await db.query(
    `
    INSERT INTO stock_price_logs
    (stock_id, price, change_amount, change_rate, event_title, created_at)
    VALUES (?, 0, 0, -100, '관리자 상장폐지', NOW())
    `,
    [stockId]
  );

  return NextResponse.json({ success: true });
}