import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ success: false, message: "로그인이 필요합니다." });

  const [adminRows]: any = await db.query("SELECT role FROM users WHERE email = ? LIMIT 1", [session.user.email]);
  if (!adminRows.length || adminRows[0].role !== "admin") return NextResponse.json({ success: false, message: "관리자 권한이 없습니다." });

  const body = await req.json();
  const userId = Number(body.userId);
  const amount = Math.floor(Number(body.amount));
  const action = body.action === "deduct" ? "deduct" : "give";
  const reason = String(body.reason || (action === "deduct" ? "관리자 차감" : "관리자 지급")).trim();

  if (!userId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ success: false, message: "수량을 1개 이상 입력해주세요." });

  if (action === "deduct") {
    const [result]: any = await db.query("UPDATE users SET dotori = dotori - ? WHERE id = ? AND dotori >= ?", [amount, userId, amount]);
    if (!result.affectedRows) return NextResponse.json({ success: false, message: "보유 도토리가 부족하거나 사용자를 찾을 수 없습니다." });
    await db.query("INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)", [userId, -amount, reason || "관리자 차감"]);
    return NextResponse.json({ success: true, message: `도토리 ${amount.toLocaleString()}개 차감 완료` });
  }

  const [result]: any = await db.query("UPDATE users SET dotori = dotori + ? WHERE id = ?", [amount, userId]);
  if (!result.affectedRows) return NextResponse.json({ success: false, message: "사용자를 찾을 수 없습니다." });
  await db.query("INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)", [userId, amount, reason || "관리자 지급"]);
  return NextResponse.json({ success: true, message: `도토리 ${amount.toLocaleString()}개 지급 완료` });
}
