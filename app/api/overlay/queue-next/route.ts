import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

type OverlayType = "item" | "mission";

async function getItem(id: number) {
  const [rows]: any = await db.query(
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

async function getMissionAlert(id: number) {
  const [rows]: any = await db.query(
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

async function getPlaying(conn: any) {
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
    WHERE status = 'playing'
    ORDER BY started_at ASC, created_at ASC, id ASC
    LIMIT 1
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
    WHERE status = 'playing'
    ORDER BY started_at ASC, created_at ASC, id ASC
    LIMIT 1
  `);

  const candidates = [...itemRows, ...missionRows];

  candidates.sort((a, b) => {
    const aTime = new Date(a.started_at || a.created_at || 0).getTime();
    const bTime = new Date(b.started_at || b.created_at || 0).getTime();

    if (aTime !== bTime) return aTime - bTime;
    return Number(a.id) - Number(b.id);
  });

  return candidates[0] || null;
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
    return Number(a.id) - Number(b.id);
  });

  return candidates[0] || null;
}

async function setPlaying(
  conn: any,
  type: OverlayType,
  id: number,
  clientId: string
) {
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

    return;
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
        isOwner: false,
      },
      { status: 400 }
    );
  }

  const conn = await (db as any).getConnection();

  try {
    const [lockRows]: any = await conn.query(
      "SELECT GET_LOCK('wangchu_overlay_queue_lock', 2) AS got_lock"
    );

    if (Number(lockRows[0]?.got_lock || 0) !== 1) {
      return NextResponse.json({
        success: true,
        command: "locked",
        item: null,
        isOwner: false,
      });
    }

    await conn.beginTransaction();

    await conn.query(`
      INSERT IGNORE INTO overlay_runtime_state
      (id, owner_client_id, owner_seen_at, updated_at)
      VALUES
      (1, NULL, NULL, NOW())
    `);

    const [stateRows]: any = await conn.query(`
      SELECT
        id,
        owner_client_id,
        owner_seen_at,
        TIMESTAMPDIFF(SECOND, owner_seen_at, NOW()) AS owner_age
      FROM overlay_runtime_state
      WHERE id = 1
      LIMIT 1
      FOR UPDATE
    `);

    const state = stateRows[0] || null;
    const ownerClientId = state?.owner_client_id || null;
    const ownerAge = Number(state?.owner_age || 9999);

    const shouldTakeOwner =
      !ownerClientId || ownerClientId === clientId || ownerAge >= 10;

    let isOwner = false;

    if (shouldTakeOwner) {
      await conn.query(
        `
        UPDATE overlay_runtime_state
        SET owner_client_id = ?,
            owner_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = 1
        `,
        [clientId]
      );

      isOwner = true;
    }

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

    if (control.command === "refresh" && isOwner) {
      await conn.query(`
        UPDATE overlay_queue_control
        SET command = 'none',
            target_type = NULL,
            target_id = NULL,
            updated_at = NOW()
        WHERE id = 1
      `);

      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "refresh",
        item: null,
        isOwner,
      });
    }

    if (control.command === "skip" && isOwner) {
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

      await conn.query(`
        UPDATE overlay_queue_control
        SET command = 'none',
            target_type = NULL,
            target_id = NULL,
            updated_at = NOW()
        WHERE id = 1
      `);

      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "skip",
        item: null,
        isOwner,
      });
    }

    if (control.command === "replay" && control.target_id && isOwner) {
      await conn.query(`
        UPDATE overlay_queue_control
        SET command = 'none',
            target_type = NULL,
            target_id = NULL,
            updated_at = NOW()
        WHERE id = 1
      `);

      await conn.commit();

      const item =
        control.target_type === "mission"
          ? await getMissionAlert(Number(control.target_id))
          : await getItem(Number(control.target_id));

      return NextResponse.json({
        success: true,
        command: "replay",
        item,
        isOwner,
      });
    }

    const playing = await getPlaying(conn);

    if (playing) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: isOwner ? "playing" : "observe",
        item: playing,
        isOwner,
      });
    }

    if (!isOwner) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "none",
        item: null,
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
        isOwner,
      });
    }

    await setPlaying(conn, nextItem.type, Number(nextItem.id), clientId);

    const lockedItem =
      nextItem.type === "mission"
        ? await getMissionAlert(Number(nextItem.id))
        : await getItem(Number(nextItem.id));

    await conn.commit();

    return NextResponse.json({
      success: true,
      command: "play",
      item: lockedItem || nextItem,
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
        isOwner: false,
      },
      { status: 500 }
    );
  } finally {
    try {
      await conn.query("SELECT RELEASE_LOCK('wangchu_overlay_queue_lock')");
    } catch {}

    conn.release();
  }
}