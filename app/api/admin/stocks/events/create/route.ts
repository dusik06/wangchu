import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const [admins]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    return NextResponse.json(
      { success: false, message: "관리자만 가능합니다." },
      { status: 403 }
    );
  }

  const body = await req.json();

  const stockId = Number(body.stockId);
  const eventTitle = String(body.eventTitle || "").trim();
  const eventType = String(body.eventType || "up");
  const eventRate = Number(body.eventRate || 0);
  const durationMinutes = Number(body.durationMinutes || 30);

  if (!stockId || !eventTitle) {
    return NextResponse.json(
      { success: false, message: "필수값이 없습니다." },
      { status: 400 }
    );
  }

  await db.query(
    `
    INSERT INTO stock_events
    (
      stock_id,
      event_title,
      event_type,
      event_rate,
      starts_at,
      ends_at,
      is_active,
      created_at
    )
    VALUES
    (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 1, NOW())
    `,
    [
      stockId,
      eventTitle,
      eventType === "down" ? "down" : "up",
      eventRate,
      durationMinutes,
    ]
  );

  return NextResponse.json({
    success: true,
  });
}