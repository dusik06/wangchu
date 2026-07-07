import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const conn = await (db as any).getConnection();

  try {
    const body = await req.json();
    const id = Number(body?.id || 0);
    const type = String(body?.type || "");
    const clientId = String(body?.clientId || "").trim();

    if (!id || !clientId || (type !== "item" && type !== "mission")) {
      return NextResponse.json(
        {
          success: false,
          message: "잘못된 요청입니다.",
        },
        { status: 400 }
      );
    }

    const [lockRows]: any = await conn.query(
      "SELECT GET_LOCK('wangchu_overlay_queue_done_lock', 2) AS got_lock"
    );

    if (Number(lockRows[0]?.got_lock || 0) !== 1) {
      return NextResponse.json({
        success: true,
        message: "잠시 후 다시 처리됩니다.",
      });
    }

    await conn.beginTransaction();

    const [stateRows]: any = await conn.query(`
      SELECT owner_client_id
      FROM overlay_runtime_state
      WHERE id = 1
      LIMIT 1
      FOR UPDATE
    `);

    const ownerClientId = stateRows[0]?.owner_client_id || "";

    if (ownerClientId !== clientId) {
      await conn.commit();

      return NextResponse.json({
        success: true,
        ignored: true,
        message: "대표 재생자가 아니므로 완료 처리를 무시했습니다.",
      });
    }

    if (type === "mission") {
      await conn.query(
        `
        UPDATE mission_overlay_alerts
        SET status = 'done',
            played_at = NOW()
        WHERE id = ?
          AND status = 'playing'
        `,
        [id]
      );
    } else {
      await conn.query(
        `
        UPDATE item_use_alerts
        SET status = 'done',
            played_at = NOW()
        WHERE id = ?
          AND status = 'playing'
        `,
        [id]
      );
    }

    await conn.query(
      `
      UPDATE overlay_runtime_state
      SET owner_seen_at = NOW(),
          updated_at = NOW()
      WHERE id = 1
        AND owner_client_id = ?
      `,
      [clientId]
    );

    await conn.commit();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "완료 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    try {
      await conn.query("SELECT RELEASE_LOCK('wangchu_overlay_queue_done_lock')");
    } catch {}

    conn.release();
  }
}