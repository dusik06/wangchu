import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

async function checkAdmin(email: string) {
  const [rows]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows.length > 0 && rows[0].role === "admin";
}

export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." });
  }

  const isAdmin = await checkAdmin(session.user.email);

  if (!isAdmin) {
    return NextResponse.json({ success: false, message: "관리자 권한이 없습니다." });
  }

  const [coupons]: any = await db.query(
    "SELECT * FROM coupons ORDER BY id DESC"
  );

  return NextResponse.json({ success: true, coupons });
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." });
  }

  const isAdmin = await checkAdmin(session.user.email);

  if (!isAdmin) {
    return NextResponse.json({ success: false, message: "관리자 권한이 없습니다." });
  }

  const body = await req.json();

  const code = String(body.code || "").trim().toUpperCase();
  const reward = Number(body.reward);
  const maxUsage = Number(body.maxUsage);
  const expiredAt = body.expiredAt || null;

  if (!code || !reward || !maxUsage) {
    return NextResponse.json({
      success: false,
      message: "쿠폰코드, 보상, 사용횟수를 입력해주세요.",
    });
  }

  await db.query(
    `
    INSERT INTO coupons (code, reward, max_usage, expired_at)
    VALUES (?, ?, ?, ?)
    `,
    [code, reward, maxUsage, expiredAt || null]
  );

  return NextResponse.json({
    success: true,
    message: "쿠폰 생성 완료",
  });
}