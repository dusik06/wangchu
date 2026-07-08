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
        AND status <> 'deleted'
      ORDER BY id DESC
      LIMIT 30
    `);

    const [supportRows]: any = await db.query(`
      SELECT
        mission_id,
        nickname,
        dotori_amount,
        created_at
      FROM broadcast_mission_supports
      ORDER BY created_at DESC, id DESC
    `);

    const supportsByMission: Record<number, any[]> = {};

    for (const row of supportRows) {
      const missionId = Number(row.mission_id || 0);

      if (!supportsByMission[missionId]) {
        supportsByMission[missionId] = [];
      }

      supportsByMission[missionId].push({
        nickname: row.nickname || "익명",
        dotori_amount: Number(row.dotori_amount || 0),
        created_at: row.created_at,
      });
    }

    return NextResponse.json({
      success: true,
      activeMissions,
      pastMissions,
      supportsByMission,
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