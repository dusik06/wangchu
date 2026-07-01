import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const formData = await req.formData();

  const scheduleDate = String(formData.get("schedule_date") || "");
  const scheduleTime = String(formData.get("schedule_time") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isImportant = formData.get("is_important") ? 1 : 0;
  const isOffday = formData.get("is_offday") ? 1 : 0;

  if (!scheduleDate || !title) {
    return NextResponse.json({
      success: false,
      message: "날짜와 제목은 필수입니다.",
    });
  }

  const [admins]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    return NextResponse.json({
      success: false,
      message: "권한이 없습니다.",
    });
  }

  await db.query(
    `
    INSERT INTO broadcast_schedules
    (
      schedule_date,
      schedule_time,
      title,
      description,
      is_important,
      is_offday,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      scheduleDate,
      scheduleTime || null,
      title,
      description || null,
      isImportant,
      isOffday,
    ]
  );

  return NextResponse.redirect(new URL("/admin/schedule", req.url));
}