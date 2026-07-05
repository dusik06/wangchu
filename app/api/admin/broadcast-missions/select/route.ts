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

export async function POST(req: Request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "관리자만 사용할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const missionId = Number(body.missionId || 0);

    await db.query(`
      UPDATE broadcast_missions
      SET is_selected = 0, updated_at = NOW()
    `);

    if (missionId > 0) {
      await db.query(
        `
        UPDATE broadcast_missions
        SET is_selected = 1, updated_at = NOW()
        WHERE id = ?
          AND status = 'active'
        `,
        [missionId]
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "미션 선택 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}