import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({
        success: true,
        unreadCount: 0,
        notifications: [],
      });
    }

    const [users]: any = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!users.length) {
      return NextResponse.json({
        success: true,
        unreadCount: 0,
        notifications: [],
      });
    }

    const userId = users[0].id;

    const [countRows]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = ?
        AND is_read = 0
      `,
      [userId]
    );

    const [rows]: any = await db.query(
      `
      SELECT
        id,
        type,
        actor_nickname,
        post_id,
        post_title,
        comment_id,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 20
      `,
      [userId]
    );

    return NextResponse.json({
      success: true,
      unreadCount: Number(countRows[0]?.count || 0),
      notifications: rows,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      unreadCount: 0,
      notifications: [],
    });
  }
}