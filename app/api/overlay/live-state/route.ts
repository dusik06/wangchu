import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [missionRows]: any = await db.query(`
      SELECT
        id,
        title,
        description,
        image_url,
        goal_dotori,
        current_dotori,
        status,
        is_selected
      FROM broadcast_missions
      WHERE is_selected = 1
        AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `);

    const mission = missionRows[0] || null;

    return NextResponse.json({
      success: true,
      mission,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        mission: null,
      },
      { status: 500 }
    );
  }
}