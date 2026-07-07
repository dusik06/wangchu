import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

type OverlayType = "item" | "mission";

async function getMission(conn: any) {
  const [rows]: any = await conn.query(`
    SELECT
      id,
      title,
      image_url,
      goal_dotori,
      current_dotori
    FROM broadcast_missions
    WHERE is_selected = 1
      AND status = 'active'
    ORDER BY id DESC
    LIMIT 1
  `);

  return rows[0] || null;
}

async function getItem(conn: any, id: number) {
  const [rows]: any = await conn.query(
    `
    SELECT
      id,
      'item' AS type,
      NULL AS alert_type,
      nickname,
      item_name AS title,
      item_image,
      item_audio,
      message,
      overlay_text,
      0 AS dotori_amount,
      status,
      locked_by,
      started_at,
      created_at
    FROM item_use_alerts
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function getMissionAlert(conn: any, id: number) {
  const [rows]: any = await conn.query(
    `
    SELECT
      id,
      'mission' AS type,
      alert_type,
      nickname,
      mission_title AS title,
      NULL AS item_image,
      NULL AS item_audio,
      '' AS message,
      NULL AS overlay_text,
      dotori_amount,
      status,
      locked_by,
      started_at,
      created_at
    FROM mission_overlay_alerts
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function getCurrentItem(
  conn: any,
  type: string | null,
  id: number | null
) {
  if (!type || !id) return null;

  if (type === "mission") {
    return getMissionAlert(conn, id);
  }

  if (type === "item") {
    return getItem(conn, id);
  }

  return null;
}

async function clearEngineCurrent(conn: any) {
  await conn.query(`
    UPDATE overlay_engine_state
    SET current_type = NULL,
        current_id = NULL,
        current_started_at = NULL,
        current_key = NULL,
        updated_at = NOW()
    WHERE id = 1
  `);
}

async function getNextPending(conn: any) {
  const [itemRows]: any = await conn.query(`
    SELECT
      id,
      'item' AS type,
      NULL AS alert_type,
      nickname,
      item_name AS title,
      item_image,
      item_audio,
      message,
      overlay_text,
      0 AS dotori_amount,
      status,
      locked_by,
      started_at,
      created_at
    FROM item_use_alerts
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    FOR UPDATE
  `);

  const [missionRows]: any = await conn.query(`
    SELECT
      id,
      'mission' AS type,
      alert_type,
      nickname,
      mission_title AS title,
      NULL AS item_image,
      NULL AS item_audio,
      '' AS message,
      NULL AS overlay_text,
      dotori_amount,
      status,
      locked_by,
      started_at,
      created_at
    FROM mission_overlay_alerts
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    FOR UPDATE
  `);

  const candidates = [...itemRows, ...missionRows];

  candidates.sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();

    if (aTime !== bTime) return aTime - bTime;

    const typeOrder =
      String(a.type) === String(b.type)
        ? 0
        : String(a.type) === "mission"
        ? -1
        : 1;

    if (typeOrder !== 0) return typeOrder;

    return Number(a.id) - Number(b.id);
  });

  return candidates[0] || null;
}

async function markAsPlaying(
  conn: any,
  item: any,
  clientId: string
): Promise<any> {
  const type = item.type as OverlayType;
  const id = Number(item.id);

  if (type === "mission") {
    await conn.query(
      `
      UPDATE mission_overlay_alerts
      SET status = 'playing',
          locked_by = ?,
          started_at = NOW()
      WHERE id = ?
        AND status = 'pending'
      `,
      [clientId, id]
    );

    return getMissionAlert(conn, id);
  }

  await conn.query(
    `
    UPDATE item_use_alerts
    SET status = 'playing',
        locked_by = ?,
        started_at = NOW()
    WHERE id = ?
      AND status = 'pending'
    `,
    [clientId, id]
  );

  return getItem(conn, id);
}

async function applySkip(conn: any) {
  await conn.query(`
    UPDATE item_use_alerts
    SET status = 'skipped',
        played_at = NOW()
    WHERE status = 'playing'
  `);

  await conn.query(`
    UPDATE mission_overlay_alerts
    SET status = 'skipped',
        played_at = NOW()
    WHERE status = 'playing'
  `);

  await clearEngineCurrent(conn);
}

async function resetControl(conn: any) {
  await conn.query(`
    UPDATE overlay_queue_control
    SET command = 'none',
        target_type = NULL,
        target_id = NULL,
        updated_at = NOW()
    WHERE id = 1
  `);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = (url.searchParams.get("clientId") || "").trim();

  if (!clientId) {
    return NextResponse.json(
      {
        success: false,
        command: "missing-client",
        item: null,
        mission: null,
        isOwner: false,
      },
      { status: 400 }
    );
  }

  const conn = await (db as any).getConnection();

  try {
    const [lockRows]: any = await conn.query(
      "SELECT GET_LOCK('wangchu_overlay_engine_lock', 2) AS got_lock"
    );

    if (Number(lockRows[0]?.got_lock || 0) !== 1) {
      return NextResponse.json({
        success: true,
        command: "locked",
        item: null,
        mission: null,
        isOwner: false,
      });
    }

    await conn.beginTransaction();

    await conn.query(`
      INSERT IGNORE INTO overlay_engine_state
      (id, owner_client_id, owner_seen_at, current_type, current_id, current_started_at, current_key, updated_at)
      VALUES
      (1, NULL, NULL, NULL, NULL, NULL, NULL, NOW())
    `);

    const [stateRows]: any = await conn.query(`
      SELECT
        id,
        owner_client_id,
        owner_seen_at,
        current_type,
        current_id,
        current_started_at,
        current_key,
        TIMESTAMPDIFF(SECOND, owner_seen_at, NOW()) AS owner_age
      FROM overlay_engine_state
      WHERE id = 1
      LIMIT 1
      FOR UPDATE
    `);

    const state = stateRows[0] || {};
    const ownerClientId = state.owner_client_id || null;
    const ownerAge = Number(state.owner_age || 9999);

    const isOwner =
      !ownerClientId || ownerClientId === clientId || ownerAge >= 8;

    if (isOwner) {
      await conn.query(
        `
        UPDATE overlay_engine_state
        SET owner_client_id = ?,
            owner_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = 1
        `,
        [clientId]
      );
    }

    const mission = await getMission(conn);

    const [controlRows]: any = await conn.query(`
      SELECT command, target_type, target_id
      FROM overlay_queue_control
      WHERE id = 1
      LIMIT 1
      FOR UPDATE
    `);

    const control = controlRows[0] || {
      command: "none",
      target_type: null,
      target_id: null,
    };

    if (isOwner && control.command === "refresh") {
      await resetControl(conn);
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "refresh",
        item: null,
        mission,
        isOwner,
      });
    }

    if (isOwner && control.command === "skip") {
      await applySkip(conn);
      await resetControl(conn);
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "skip",
        item: null,
        mission,
        isOwner,
      });
    }

    if (isOwner && control.command === "replay" && control.target_id) {
      const replayType =
        control.target_type === "mission" ? "mission" : "item";

      const replayItem = await getCurrentItem(
        conn,
        replayType,
        Number(control.target_id)
      );

      if (replayItem) {
        await conn.query(
          `
          UPDATE overlay_engine_state
          SET current_type = ?,
              current_id = ?,
              current_started_at = NOW(),
              current_key = ?,
              updated_at = NOW()
          WHERE id = 1
          `,
          [
            replayType,
            Number(control.target_id),
            `${replayType}-${Number(control.target_id)}-replay-${Date.now()}`,
          ]
        );
      }

      await resetControl(conn);
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "replay",
        item: replayItem || null,
        mission,
        isOwner,
      });
    }

    let currentItem = await getCurrentItem(
      conn,
      state.current_type || null,
      state.current_id ? Number(state.current_id) : null
    );

    if (currentItem && currentItem.status !== "playing") {
      await clearEngineCurrent(conn);
      currentItem = null;
    }

    if (currentItem) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: isOwner ? "playing" : "observe",
        item: currentItem,
        mission,
        isOwner,
      });
    }

    if (!isOwner) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "none",
        item: null,
        mission,
        isOwner,
      });
    }

    const nextItem = await getNextPending(conn);

    if (!nextItem) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "none",
        item: null,
        mission,
        isOwner,
      });
    }

    const lockedItem = await markAsPlaying(conn, nextItem, clientId);

    await conn.query(
      `
      UPDATE overlay_engine_state
      SET current_type = ?,
          current_id = ?,
          current_started_at = NOW(),
          current_key = ?,
          updated_at = NOW()
      WHERE id = 1
      `,
      [
        nextItem.type,
        Number(nextItem.id),
        `${nextItem.type}-${Number(nextItem.id)}`,
      ]
    );

    await conn.commit();

    return NextResponse.json({
      success: true,
      command: "play",
      item: lockedItem || nextItem,
      mission,
      isOwner,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        command: "error",
        item: null,
        mission: null,
        isOwner: false,
      },
      { status: 500 }
    );
  } finally {
    try {
      await conn.query("SELECT RELEASE_LOCK('wangchu_overlay_engine_lock')");
    } catch {}

    conn.release();
  }
}