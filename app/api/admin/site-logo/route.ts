import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const [rows]: any = await db.query(
    "SELECT site_logo FROM site_settings LIMIT 1"
  );

  return NextResponse.json({
    success: true,
    siteLogo: rows[0]?.site_logo || null,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { siteLogo } = body;

    await db.query(
      "UPDATE site_settings SET site_logo = ? WHERE id = 1",
      [siteLogo]
    );

    return NextResponse.json({
      success: true,
      message: "로고 저장 완료",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "로고 저장 실패" },
      { status: 500 }
    );
  }
}