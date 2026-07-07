import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

function normalizeType(type: string | null) {
  if (type === "mission") return "mission";
  return "item";
}

export async function POST(req: Request) {
  const conn = await (db as any).getConnection();

  try {
    const body = await req.json();

    const command = String(body?.command || "none");
    const targetType = body?.targetType ? normalizeType(String(body.targetType)) : null;
    const targetId = body?.targetId ? Number(body.targetId) : null;

    if (!["refresh", "skip", "replay"].includes(command)) {
      return NextResponse.json(
        {
          success: false,
          message: "알 수 없는 명령입니다.",
        },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    if (command === "refresh") {
      await conn.query(`
        UPDATE overlay_queue_control
        SET command = 'refresh',
            target_type = NULL,
            target_id = NULL,
            updated_at = NOW()
        WHERE id = 1
      `);

      await conn.commit();

      return NextResponse.json({ success: true });
    }

    if (command === "skip") {
      await conn.query(`
        UPDATE overlay_queue_control
        SET command = 'skip',
            target_type = NULL,
            target_id = NULL,
            updated_at = NOW()
        WHERE id = 1
      `);

      await conn.commit();

      return NextResponse.json({ success: true });
    }

    if (command === "replay") {
      if (!targetType || !targetId) {
        await conn.rollback();

        return NextResponse.json(
          {
            success: false,
            message: "재생할 항목이 없습니다.",
          },
          { status: 400 }
        );
      }

      await conn.query(
        `
        UPDATE overlay_queue_control
        SET command = 'replay',
            target_type = ?,
            target_id = ?,
            updated_at = NOW()
        WHERE id = 1
        `,
        [targetType, targetId]
      );

      await conn.commit();

      return NextResponse.json({ success: true });
    }

    await conn.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "명령 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}