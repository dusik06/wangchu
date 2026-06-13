import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." });
  }

  const [adminRows]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!adminRows.length || adminRows[0].role !== "admin") {
    return NextResponse.json({ success: false, message: "관리자 권한이 없습니다." });
  }

  const body = await req.json();
  const userId = Number(body.userId);
  const amount = Number(body.amount);
  const reason = body.reason || "관리자 지급";

  if (!userId || !amount) {
    return NextResponse.json({ success: false, message: "값이 부족합니다." });
  }

  await db.query(
    "UPDATE users SET dotori = dotori + ? WHERE id = ?",
    [amount, userId]
  );

  await db.query(
    "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
    [userId, amount, reason]
  );

  return NextResponse.json({
    success: true,
    message: "도토리 지급 완료",
  });
}