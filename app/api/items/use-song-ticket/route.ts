import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT id, nickname FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    const user = users[0];

    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: "유저 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const [inventory]: any = await connection.query(
      `
      SELECT id, item_count
      FROM user_inventory
      WHERE user_id = ?
        AND item_name = '노래재생권'
        AND item_count > 0
      LIMIT 1
      `,
      [user.id]
    );

    const item = inventory[0];

    if (!item) {
      await connection.rollback();
      return NextResponse.json({ error: "노래재생권이 없습니다." }, { status: 400 });
    }

    const [songs]: any = await connection.query(
      "SELECT id FROM song_items WHERE is_active = 1 ORDER BY id ASC LIMIT 1"
    );

    const song = songs[0];

    if (!song) {
      await connection.rollback();
      return NextResponse.json({ error: "등록된 노래가 없습니다." }, { status: 400 });
    }

    await connection.query(
      "UPDATE user_inventory SET item_count = item_count - 1 WHERE id = ? AND item_count > 0",
      [item.id]
    );

    await connection.query(
      `
      INSERT INTO song_play_queue (user_id, nickname, song_id, status)
      VALUES (?, ?, ?, 'pending')
      `,
      [user.id, user.nickname || "익명", song.id]
    );

    await connection.commit();

    return NextResponse.json({ ok: true, message: "노래 재생 요청이 등록되었습니다." });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return NextResponse.json({ error: "노래재생권 사용 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    connection.release();
  }
}