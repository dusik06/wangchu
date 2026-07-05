import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id = Number(body.id || 0);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    await db.query(
      `
      UPDATE item_use_alerts
      SET status = 'done',
          played_at = NOW()
      WHERE id = ?
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "완료 처리 실패" },
      { status: 500 }
    );
  }
}