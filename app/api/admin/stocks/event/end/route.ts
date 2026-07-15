import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSeasonNowText } from "@/lib/stock-market";

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

    const now = getSeasonNowText();

    await connection.query(
      `
      UPDATE stock_events
      SET is_active = 0,
          ends_at = ?
      WHERE id = ?
      `,
      [now, eventId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${event.stock_name}의 ${event.event_title} 이벤트가 종료되었습니다.`,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    console.error("Stock event end error:", error);

    return NextResponse.json(
      { success: false, message: "이벤트 종료 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
