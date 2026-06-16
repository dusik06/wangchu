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

  if (!quantity || quantity < 1 || quantity > 99) {
    return NextResponse.json({ error: "구매 수량은 1개부터 99개까지 가능합니다." }, { status: 400 });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    const user = users[0];

    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });
    }

    const [items]: any = await connection.query(
      "SELECT * FROM shop_items WHERE id = ? AND is_active = 1 LIMIT 1",
      [itemId]
    );

    const item = items[0];

    if (!item) {
      await connection.rollback();
      return NextResponse.json({ error: "아이템이 없습니다." }, { status: 404 });
    }

    const price = Number(item.price) || 0;
    const totalPrice = price * quantity;

    if (totalPrice <= 0) {
      await connection.rollback();
      return NextResponse.json({ error: "상품 가격이 올바르지 않습니다." }, { status: 400 });
    }

    if ((Number(user.dotori) || 0) < totalPrice) {
      await connection.rollback();
      return NextResponse.json({ error: "도토리가 부족합니다." }, { status: 400 });
    }

    await connection.query(
      "UPDATE users SET dotori = dotori - ? WHERE id = ?",
      [totalPrice, user.id]
    );

    await connection.query(
      "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
      [user.id, -totalPrice, `${item.item_name} ${quantity}개 구매`]
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
          item_audio = ?
        WHERE id = ?
        `,
        [quantity, item.item_image || null, item.item_audio || null, inventory.id]
      );
    } else {
      await connection.query(
        `
        INSERT INTO user_inventory
          (user_id, item_name, item_image, item_audio, item_count)
        VALUES
          (?, ?, ?, ?, ?)
        `,
        [user.id, item.item_name, item.item_image || null, item.item_audio || null, quantity]
      );
    }

    await connection.commit();

    return NextResponse.json({
      ok: true,
      message: "구매 완료",
      quantity,
      totalPrice,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return NextResponse.json({ error: "구매 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    connection.release();
  }
}