import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

async function checkAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) return false;

  const [rows]: any = await db.query(
    `
    SELECT role
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [session.user.email]
  );

  return rows[0]?.role === "admin";
}

export async function GET() {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "관리자만 사용할 수 있습니다." },
        { status: 403 }
      );
    }

    const [playing]: any = await db.query(`
      SELECT *
      FROM (
        SELECT
          id,
          'item' AS type,
          nickname,
          item_name AS title,
          status,
          created_at,
          played_at
        FROM item_use_alerts
        WHERE status = 'playing'

        UNION ALL

        SELECT
          q.id,
          'song' AS type,
          q.nickname,
          s.title,
          q.status,
          q.created_at,
          q.played_at
        FROM song_play_queue q
        JOIN song_items s ON q.song_id = s.id
        WHERE q.status = 'playing'
      ) queue
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `);

    const [waiting]: any = await db.query(`
      SELECT *
      FROM (
        SELECT
          id,
          'item' AS type,
          nickname,
          item_name AS title,
          status,
          created_at,
          played_at
        FROM item_use_alerts
        WHERE status = 'pending'

        UNION ALL

        SELECT
          q.id,
          'song' AS type,
          q.nickname,
          s.title,
          q.status,
          q.created_at,
          q.played_at
        FROM song_play_queue q
        JOIN song_items s ON q.song_id = s.id
        WHERE q.status = 'pending'
      ) queue
      ORDER BY created_at ASC, id ASC
      LIMIT 30
    `);

    const [recentLogs]: any = await db.query(`
      SELECT *
      FROM (
        SELECT
          id,
          'item' AS type,
          nickname,
          item_name AS title,
          status,
          created_at,
          played_at
        FROM item_use_alerts
        WHERE status IN ('done', 'skipped')

        UNION ALL

        SELECT
          q.id,
          'song' AS type,
          q.nickname,
          s.title,
          q.status,
          q.created_at,
          q.played_at
        FROM song_play_queue q
        JOIN song_items s ON q.song_id = s.id
        WHERE q.status IN ('done', 'skipped')
      ) queue
      ORDER BY played_at DESC, created_at DESC, id DESC
      LIMIT 30
    `);

    return NextResponse.json({
      success: true,
      playing: playing[0] || null,
      waiting,
      recentLogs,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "큐 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}