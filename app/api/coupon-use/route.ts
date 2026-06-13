import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const body = await req.json();
  const code = String(body.code || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({
      success: false,
      message: "쿠폰 코드를 입력해주세요.",
    });
  }

  const [users]: any = await db.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length) {
    return NextResponse.json({
      success: false,
      message: "회원 정보를 찾을 수 없습니다.",
    });
  }

  const userId = users[0].id;

  const [coupons]: any = await db.query(
    "SELECT * FROM coupons WHERE code = ? LIMIT 1",
    [code]
  );

  if (!coupons.length) {
    return NextResponse.json({
      success: false,
      message: "존재하지 않는 쿠폰입니다.",
    });
  }

  const coupon = coupons[0];

  if (!coupon.is_active) {
    return NextResponse.json({
      success: false,
      message: "사용 중지된 쿠폰입니다.",
    });
  }

  if (coupon.expired_at && new Date(coupon.expired_at) < new Date()) {
    return NextResponse.json({
      success: false,
      message: "만료된 쿠폰입니다.",
    });
  }

  if (coupon.used_count >= coupon.max_usage) {
    return NextResponse.json({
      success: false,
      message: "사용 횟수가 모두 소진된 쿠폰입니다.",
    });
  }

  const [history]: any = await db.query(
    "SELECT id FROM coupon_history WHERE coupon_id = ? AND user_id = ?",
    [coupon.id, userId]
  );

  if (history.length) {
    return NextResponse.json({
      success: false,
      message: "이미 사용한 쿠폰입니다.",
    });
  }

  await db.query(
    "INSERT INTO coupon_history (coupon_id, user_id) VALUES (?, ?)",
    [coupon.id, userId]
  );

  await db.query(
    "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?",
    [coupon.id]
  );

  await db.query(
    "UPDATE users SET dotori = dotori + ? WHERE id = ?",
    [coupon.reward, userId]
  );

  await db.query(
    "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
    [userId, coupon.reward, `쿠폰 사용: ${coupon.code}`]
  );

  return NextResponse.json({
    success: true,
    message: `쿠폰 사용 완료! 도토리 ${coupon.reward}개 지급`,
    reward: coupon.reward,
  });
}