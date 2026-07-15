import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function toInteger(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const eventId = toInteger(body.eventId);

  if (eventId <= 0) {
    return NextResponse.json(
      { success: false, message: "이벤트 정보가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [adminRows]: any = await connection.query(
      "SELECT role FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );

    if (!adminRows.length || adminRows[0].role !== "admin") {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const [eventRows]: any = await connection.query(
      `
      SELECT e.*, s.stock_name
      FROM stock_events e
      INNER JOIN stock_items s ON s.id = e.stock_id
      WHERE e.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [eventId]
    );

    const event = eventRows[0];

    if (!event) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "이벤트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await connection.query(
      "DELETE FROM stock_events WHERE id = ?",
      [eventId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${event.stock_name}의 ${event.event_title} 이벤트 기록이 삭제되었습니다.`,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    console.error("Stock event delete error:", error);

    return NextResponse.json(
      { success: false, message: "이벤트 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
