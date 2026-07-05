import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [activeMissions]: any = await db.query(`
      SELECT
        id,
        title,
        description,
        image_url,
        goal_dotori,
        current_dotori,
        status,
        is_selected,
        created_at
      FROM broadcast_missions
      WHERE status = 'active'
      ORDER BY is_selected DESC, id DESC
    `);

    const [pastMissions]: any = await db.query(`
      SELECT
        id,
        title,
        description,
        image_url,
        goal_dotori,
        current_dotori,
        status,
        created_at,
        ended_at
      FROM broadcast_missions
      WHERE status <> 'active'
      ORDER BY id DESC
      LIMIT 30
    `);

    return NextResponse.json({
      success: true,
      activeMissions,
      pastMissions,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "미션 정보를 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}