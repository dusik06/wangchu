import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

async function isAdmin() {
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

export async function POST(req: Request) {
  try {
    const admin = await isAdmin();

    if (!admin) {
      return NextResponse.json({
        success: false,
        message: "관리자만 사용할 수 있습니다.",
      }, { status: 403 });
    }

    const body = await req.json();
    const command = String(body.command || "none");
    const targetAlertId = body.targetAlertId ? Number(body.targetAlertId) : null;

    if (!["none", "skip", "replay", "refresh"].includes(command)) {
      return NextResponse.json({
        success: false,
        message: "잘못된 명령입니다.",
      }, { status: 400 });
    }

    await db.query(
      `
      UPDATE donation_alert_control
      SET command = ?, target_alert_id = ?, updated_at = NOW()
      WHERE id = 1
      `,
      [command, targetAlertId]
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: "컨트롤 명령 실패",
    }, { status: 500 });
  }
}