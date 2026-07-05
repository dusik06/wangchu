import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id || 0);

    if (!id) {
      return NextResponse.json({
        success: false,
        message: "알림 ID가 없습니다.",
      }, { status: 400 });
    }

    await db.query(
      `
      UPDATE donation_alerts
      SET status = 'done', finished_at = NOW()
      WHERE id = ? AND status = 'playing'
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: "후원알림 종료 처리 실패",
    }, { status: 500 });
  }
}