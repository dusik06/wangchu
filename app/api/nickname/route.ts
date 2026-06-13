import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

const adminEmails = ["wonnie8181@gmail.com", "cksqls06@gmail.com"];

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." });
  }

  const body = await req.json();
  const nickname = body.nickname;

  if (!nickname || nickname.length < 2) {
    return NextResponse.json({ success: false, message: "닉네임은 2글자 이상이어야 합니다." });
  }

  const email = session.user.email;
  const image = session.user.image || "";
  const role = adminEmails.includes(email) ? "admin" : "user";

  await db.query(
    `
    INSERT INTO users (email, nickname, image, role, dotori)
    VALUES (?, ?, ?, ?, 0)
    ON DUPLICATE KEY UPDATE
      nickname = VALUES(nickname),
      image = VALUES(image),
      role = VALUES(role)
    `,
    [email, nickname, image, role]
  );

  return NextResponse.json({ success: true, role });
}