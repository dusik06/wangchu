import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        message: "로그인이 필요합니다.",
      });
    }

    const body = await req.json();
    const notificationId = Number(body.notificationId || 0);

    const [users]: any = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!users.length) {
      return NextResponse.json({
        success: false,
        message: "회원 정보를 찾을 수 없습니다.",
      });
    }

    if (notificationId > 0) {
      await db.query(
        `
        UPDATE notifications
        SET is_read = 1,
            read_at = NOW()
        WHERE id = ?
          AND user_id = ?
        `,
        [notificationId, users[0].id]
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "알림 읽음 처리 실패",
      },
      { status: 500 }
    );
  }
}