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

  await db.query(
    `
    UPDATE stock_items
    SET
      stock_name = ?,
      current_price = ?,
      normal_rate = ?,
      special_chance = ?,
      special_rate = ?
    WHERE id = ?
    `,
    [
      String(body.stockName || "").trim(),
      Number(body.currentPrice || 0),
      Number(body.normalRate || 0),
      Number(body.specialChance || 0),
      Number(body.specialRate || 0),
      Number(body.stockId),
    ]
  );

  return NextResponse.json({ success: true });
}