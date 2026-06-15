import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await req.formData();

  const titleId = Number(formData.get("titleId"));
  const titleColor = String(formData.get("titleColor") || "#facc15").trim();

  const allowedColors = [
    "#facc15",
    "#fb7185",
    "#c084fc",
    "#38bdf8",
    "#34d399",
    "#f8fafc",
  ];

  const safeColor = allowedColors.includes(titleColor) ? titleColor : "#facc15";

  if (!titleId) {
    return NextResponse.json({ error: "칭호 정보가 없습니다." }, { status: 400 });
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  if (!user) {
    return NextResponse.json({ error: "유저 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const [titles]: any = await db.query(
    "SELECT * FROM user_titles WHERE id = ? AND user_id = ? LIMIT 1",
    [titleId, user.id]
  );

  if (titles.length === 0) {
    return NextResponse.json({ error: "보유하지 않은 칭호입니다." }, { status: 403 });
  }

  await db.query(
    "UPDATE user_titles SET equipped = 0 WHERE user_id = ?",
    [user.id]
  );

  await db.query(
    "UPDATE user_titles SET equipped = 1, title_color = ? WHERE id = ? AND user_id = ?",
    [safeColor, titleId, user.id]
  );

  await db.query(
    "UPDATE users SET current_title_id = ? WHERE id = ?",
    [titleId, user.id]
  );

  return NextResponse.redirect(new URL("/mypage/titles", req.url));
}