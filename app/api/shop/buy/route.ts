import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json();
  const itemId = Number(body.itemId);
  const quantity = Math.floor(Number(body.quantity || 1));

  if (!itemId) {
    return NextResponse.json({ error: "아이템 정보가 없습니다." }, { status: 400 });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    const user = users[0];

    const [items]: any = await connection.query(
      "SELECT * FROM shop_items WHERE id = ? LIMIT 1",
      [itemId]
    );

    const item = items[0];
    const totalPrice = Number(item.price) * quantity;

    await connection.query(
      "UPDATE users SET dotori = dotori - ? WHERE id = ?",
      [totalPrice, user.id]
    );

    const [inventoryRows]: any = await connection.query(
      "SELECT * FROM user_inventory WHERE user_id = ? AND item_name = ? LIMIT 1",
      [user.id, item.item_name]
    );

    const inventory = inventoryRows[0];

    if (inventory) {
      await connection.query(
        `
        UPDATE user_inventory
        SET
          item_count = item_count + ?,
          item_image = ?,
          item_audio = ?,
          overlay_text = ?
        WHERE id = ?
        `,
        [
          quantity,
          item.item_image || null,
          item.item_audio || null,
          item.overlay_text || null,
          inventory.id,
        ]
      );
    } else {
      await connection.query(
        `
        INSERT INTO user_inventory
        (
          user_id,
          item_name,
          item_image,
          item_audio,
          overlay_text,
          item_count
        )
        VALUES
        (?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          item.item_name,
          item.item_image || null,
          item.item_audio || null,
          item.overlay_text || null,
          quantity,
        ]
      );
    }

    await connection.commit();

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { error: "구매 실패" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}