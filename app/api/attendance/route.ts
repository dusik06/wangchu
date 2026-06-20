import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
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

  const [settings]: any = await db.query(
    "SELECT setting_value FROM settings WHERE setting_key = 'attendance_reward'"
  );

  const reward = settings.length ? Number(settings[0].setting_value) : 10;

  const [todayRows]: any = await db.query(
    "SELECT CURDATE() AS today"
  );

  const today = todayRows[0].today;

  const [already]: any = await db.query(
    "SELECT id FROM attendance WHERE user_id = ? AND attendance_date = ?",
    [userId, today]
  );

  if (already.length) {
    return NextResponse.json({
      success: false,
      message: "이미 오늘 출석체크를 했습니다.",
    });
  }

  await db.query(
    "INSERT INTO attendance (user_id, attendance_date, reward) VALUES (?, ?, ?)",
    [userId, today, reward]
  );

  await db.query(
    "UPDATE users SET dotori = dotori + ? WHERE id = ?",
    [reward, userId]
  );

  await db.query(
    "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
    [userId, reward, "\uCD9C\uC11D \uBCF4\uC0C1"]
  );

  return NextResponse.json({
    success: true,
    message: `출석 완료! 도토리 ${reward}개 지급`,
    reward,
  });
}