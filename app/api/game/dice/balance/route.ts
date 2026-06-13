import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const [rows]: any = await db.query(
      "SELECT dotori FROM users WHERE id = ? LIMIT 1",
      [session.user.id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, message: "유저를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dotori: rows[0].dotori,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "도토리 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}