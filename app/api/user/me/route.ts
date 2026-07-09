import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const [rows]: any = await db.query(
    `
    SELECT id, nickname, email, role, dotori
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [session.user.email]
  );

  if (!rows.length) {
    return NextResponse.json({
      success: false,
      message: "유저 정보를 찾을 수 없습니다.",
    });
  }

  return NextResponse.json({
    success: true,
    user: rows[0],
    dotori: Number(rows[0].dotori || 0),
  });
}