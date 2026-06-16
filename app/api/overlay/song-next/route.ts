import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows]: any = await db.query(
      `
      SELECT 
        q.id,
        q.nickname,
        s.title,
        s.audio_url
      FROM song_play_queue q
      JOIN song_items s ON q.song_id = s.id
      WHERE q.status = 'pending'
      ORDER BY q.id ASC
      LIMIT 1
      `
    );

    const item = rows[0];

    if (!item) {
      return NextResponse.json({ item: null });
    }

    await db.query(
      "UPDATE song_play_queue SET status = 'playing' WHERE id = ?",
      [item.id]
    );

    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "노래 대기열 조회 오류" }, { status: 500 });
  }
}