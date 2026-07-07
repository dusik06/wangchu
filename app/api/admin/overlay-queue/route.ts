import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stateRows]: any = await db.query(`
      SELECT current_type, current_id
      FROM overlay_engine_state
      WHERE id = 1
      LIMIT 1
    `);

    const state = stateRows[0] || {};
    let playing = null;

    if (state.current_type === "item" && state.current_id) {
      const [rows]: any = await db.query(
        `
        SELECT
          id,
          'item' AS type,
          nickname,
          item_name AS title,
          status,
          created_at,
          played_at
        FROM item_use_alerts
        WHERE id = ?
        LIMIT 1
        `,
        [state.current_id]
      );
      playing = rows[0] || null;
    }

    if (state.current_type === "mission" && state.current_id) {
      const [rows]: any = await db.query(
        `
        SELECT
          id,
          'mission' AS type,
          nickname,
          mission_title AS title,
          status,
          created_at,
          played_at
        FROM mission_overlay_alerts
        WHERE id = ?
        LIMIT 1
        `,
        [state.current_id]
      );
      playing = rows[0] || null;
    }

    const [itemWaiting]: any = await db.query(`
      SELECT
        id,
        'item' AS type,
        nickname,
        item_name AS title,
        status,
        created_at,
        played_at
      FROM item_use_alerts
      WHERE status = 'pending'
      ORDER BY created_at ASC, id ASC
      LIMIT 30
    `);

    const [missionWaiting]: any = await db.query(`
      SELECT
        id,
        'mission' AS type,
        nickname,
        mission_title AS title,
        status,
        created_at,
        played_at
      FROM mission_overlay_alerts
      WHERE status = 'pending'
      ORDER BY created_at ASC, id ASC
      LIMIT 30
    `);

    const waiting = [...itemWaiting, ...missionWaiting].sort((a, b) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();

      if (at !== bt) return at - bt;
      return Number(a.id) - Number(b.id);
    });

    const [itemLogs]: any = await db.query(`
      SELECT
        id,
        'item' AS type,
        nickname,
        item_name AS title,
        status,
        created_at,
        played_at
      FROM item_use_alerts
      WHERE status IN ('done', 'skipped')
      ORDER BY played_at DESC, id DESC
      LIMIT 20
    `);

    const [missionLogs]: any = await db.query(`
      SELECT
        id,
        'mission' AS type,
        nickname,
        mission_title AS title,
        status,
        created_at,
        played_at
      FROM mission_overlay_alerts
      WHERE status IN ('done', 'skipped')
      ORDER BY played_at DESC, id DESC
      LIMIT 20
    `);

    const recentLogs = [...itemLogs, ...missionLogs]
      .sort((a, b) => {
        const at = new Date(a.played_at || a.created_at || 0).getTime();
        const bt = new Date(b.played_at || b.created_at || 0).getTime();

        if (at !== bt) return bt - at;
        return Number(b.id) - Number(a.id);
      })
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      playing,
      waiting,
      recentLogs,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        playing: null,
        waiting: [],
        recentLogs: [],
      },
      { status: 500 }
    );
  }
}