import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

async function getItem(id: number) {
  const [rows]: any = await db.query(
    `
    SELECT
      id,
      'item' AS type,
      nickname,
      item_name AS title,
      item_image,
      item_audio,
      message,
      overlay_text,
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
      created_at
    FROM mission_overlay_alerts
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

export async function GET() {
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
      });
    }

    await conn.beginTransaction();

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

    if (control.command === "refresh") {
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
      });
    }

    if (control.command === "skip") {
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
      });
    }

    if (control.command === "replay" && control.target_id) {
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
      });
    }

    const [playingRows]: any = await conn.query(`
      SELECT *
      FROM (
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
          created_at
        FROM item_use_alerts
        WHERE status = 'playing'

        UNION ALL

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
          created_at
        FROM mission_overlay_alerts
        WHERE status = 'playing'
      ) q
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `);

    if (playingRows[0]) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "playing",
        item: playingRows[0],
      });
    }

    const [nextRows]: any = await conn.query(`
      SELECT *
      FROM (
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
          created_at
        FROM item_use_alerts
        WHERE status = 'pending'

        UNION ALL

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
          created_at
        FROM mission_overlay_alerts
        WHERE status = 'pending'
      ) q
      ORDER BY created_at ASC, id ASC
      LIMIT 1
      FOR UPDATE
    `);

    const nextItem = nextRows[0];

    if (!nextItem) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        command: "none",
        item: null,
      });
    }

    if (nextItem.type === "mission") {
      await conn.query(
        `
        UPDATE mission_overlay_alerts
        SET status = 'playing'
        WHERE id = ?
          AND status = 'pending'
        `,
        [nextItem.id]
      );
    } else {
      await conn.query(
        `
        UPDATE item_use_alerts
        SET status = 'playing'
        WHERE id = ?
          AND status = 'pending'
        `,
        [nextItem.id]
      );
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      command: "play",
      item: nextItem,
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