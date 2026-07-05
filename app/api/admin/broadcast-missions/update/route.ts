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
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const goalDotori = Number(body.goalDotori || 0);

    if (!missionId) {
      return NextResponse.json(
        { success: false, message: "미션 ID가 없습니다." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, message: "미션 제목을 입력해주세요." },
        { status: 400 }
      );
    }

    if (goalDotori <= 0) {
      return NextResponse.json(
        { success: false, message: "목표 도토리를 1 이상 입력해주세요." },
        { status: 400 }
      );
    }

    await db.query(
      `
      UPDATE broadcast_missions
      SET title = ?,
          description = ?,
          image_url = ?,
          goal_dotori = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [title, description, imageUrl, goalDotori, missionId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "미션 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}