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
  const eventId = Number(body.eventId);

  if (!eventId) {
    return NextResponse.json(
      { success: false, message: "이벤트 정보가 없습니다." },
      { status: 400 }
    );
  }

  await db.query("DELETE FROM stock_events WHERE id = ?", [eventId]);

  return NextResponse.json({
    success: true,
  });
}