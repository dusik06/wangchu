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
  const nickname = String(formData.get("nickname") || "").trim();

  if (!/^[가-힣a-zA-Z0-9]{2,8}$/.test(nickname)) {
    return NextResponse.json(
      { error: "닉네임은 2~8글자, 한글/영문/숫자만 가능합니다." },
      { status: 400 }
    );
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  if (!user) {
    return NextResponse.json({ error: "유저 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const [duplicate]: any = await db.query(
    "SELECT id FROM users WHERE nickname = ? AND email != ? LIMIT 1",
    [nickname, session.user.email]
  );

  if (duplicate.length > 0) {
    return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 400 });
  }

  if (user.nickname_changed_at) {
    const lastChanged = new Date(user.nickname_changed_at).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - lastChanged < oneDay) {
      return NextResponse.json(
        { error: "닉네임은 하루 1회만 변경할 수 있습니다." },
        { status: 400 }
      );
    }
  }

  await db.query(
    "INSERT INTO nickname_change_logs (user_id, old_nickname, new_nickname, changed_at) VALUES (?, ?, ?, NOW())",
    [user.id, user.nickname, nickname]
  );

  await db.query(
    "UPDATE users SET nickname = ?, nickname_changed_at = NOW() WHERE id = ?",
    [nickname, user.id]
  );

  return NextResponse.redirect(new URL("/mypage", req.url));
}