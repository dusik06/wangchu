import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function checkLiveStatus() {
  const [rows]: any = await db.query(
    "SELECT live_status FROM site_settings LIMIT 1"
  );

  return rows[0]?.live_status === "on";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const inventoryId = Number(body.inventoryId);
  const message = String(body.message || "").trim();

  if (!inventoryId) {
    return NextResponse.json(
      { error: "아이템 정보가 없습니다." },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { error: "메세지를 적어주세요." },
      { status: 400 }
    );
  }

  if (message.length > 80) {
    return NextResponse.json(
      { error: "메세지는 최대 80자까지 가능합니다." },
      { status: 400 }
    );
  }

  const isLive = await checkLiveStatus();

  if (!isLive) {
    return NextResponse.json(
      { error: "현재 실시간 방송 중이 아니라 사용할 수 없습니다." },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT id, nickname FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    const user = users[0];

    if (!user) {
      await connection.rollback();

      return NextResponse.json(
        { error: "유저 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const [items]: any = await connection.query(
      `
      SELECT id, item_name, item_image, item_audio, item_count
      FROM user_inventory
      WHERE id = ?
        AND user_id = ?
        AND item_count > 0
      LIMIT 1
      `,
      [inventoryId, user.id]
    );

    const item = items[0];

    if (!item) {
      await connection.rollback();

      return NextResponse.json(
        { error: "사용 가능한 아이템이 없습니다." },
        { status: 400 }
      );
    }

    await connection.query(
      `
      UPDATE user_inventory
      SET item_count = item_count - 1
      WHERE id = ?
        AND user_id = ?
        AND item_count > 0
      `,
      [item.id, user.id]
    );

    await connection.query(
      `
      DELETE FROM user_inventory
      WHERE id = ?
        AND user_id = ?
        AND item_count <= 0
      `,
      [item.id, user.id]
    );

    await connection.query(
      `
      INSERT INTO item_use_alerts
        (
          user_id,
          nickname,
          item_name,
          item_image,
          item_audio,
          message,
          status
        )
      VALUES
        (?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        user.id,
        user.nickname || "익명",
        item.item_name,
        item.item_image || null,
        item.item_audio || null,
        message,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { error: "아이템 사용 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}