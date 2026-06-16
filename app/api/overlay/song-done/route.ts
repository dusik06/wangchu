import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });
    }

    await db.query(
      "UPDATE song_play_queue SET status = 'done', played_at = NOW() WHERE id = ?",
      [id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "재생 완료 처리 오류" }, { status: 500 });
  }
}