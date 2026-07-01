import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

async function checkAdmin(email: string) {
  const [admins]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return admins.length > 0 && admins[0].role === "admin";
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const isAdmin = await checkAdmin(session.user.email);

  if (!isAdmin) {
    return NextResponse.json({
      success: false,
      message: "권한이 없습니다.",
    });
  }

  const formData = await req.formData();

  const mode = String(formData.get("mode") || "create");
  const id = Number(formData.get("id") || 0);
  const scheduleDate = String(formData.get("schedule_date") || "");
  const scheduleTime = String(formData.get("schedule_time") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isImportant = formData.get("is_important") ? 1 : 0;
  const isOffday = formData.get("is_offday") ? 1 : 0;

  if (mode === "delete") {
    if (!id) {
      return NextResponse.json({
        success: false,
        message: "삭제할 일정 정보가 없습니다.",
      });
    }

    await db.query("DELETE FROM broadcast_schedules WHERE id = ?", [id]);

    return NextResponse.redirect(new URL("/admin/schedule", req.url));
  }

  if (!scheduleDate || !title) {
    return NextResponse.json({
      success: false,
      message: "날짜와 제목은 필수입니다.",
    });
  }

  if (mode === "update") {
    if (!id) {
      return NextResponse.json({
        success: false,
        message: "수정할 일정 정보가 없습니다.",
      });
    }

    await db.query(
      `
      UPDATE broadcast_schedules
      SET
        schedule_date = ?,
        schedule_time = ?,
        title = ?,
        description = ?,
        is_important = ?,
        is_offday = ?
      WHERE id = ?
      `,
      [
        scheduleDate,
        scheduleTime || null,
        title,
        description || null,
        isImportant,
        isOffday,
        id,
      ]
    );

    return NextResponse.redirect(new URL("/admin/schedule", req.url));
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