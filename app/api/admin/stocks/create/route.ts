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

  const stockName = String(body.stockName || "").trim();
  const currentPrice = Number(body.currentPrice || 0);
  const normalRate = Number(body.normalRate || 5);
  const specialChance = Number(body.specialChance || 5);
  const specialRate = Number(body.specialRate || 20);

  if (!stockName) {
    return NextResponse.json({ success: false, message: "주식 이름을 입력해주세요." }, { status: 400 });
  }

  await db.query(
    `
    INSERT INTO stock_items
    (stock_name, current_price, normal_rate, special_chance, special_rate, is_listed, last_updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
    `,
    [stockName, currentPrice, normalRate, specialChance, specialRate]
  );

  return NextResponse.json({ success: true });
}