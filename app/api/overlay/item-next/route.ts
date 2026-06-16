import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows]: any = await db.query(
      `
      SELECT
        id,
        nickname,
        item_name,
        item_image,
        item_audio,
        message
      FROM item_use_alerts
      WHERE status = 'pending'
      ORDER BY id ASC
      LIMIT 1
      `
    );

    const item = rows[0];

    if (!item) {
      return NextResponse.json({ item: null });
    }

    await db.query(
      "UPDATE item_use_alerts SET status = 'playing' WHERE id = ?",
      [item.id]
    );

    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "아이템 알림 조회 오류" },
      { status: 500 }
    );
  }
}