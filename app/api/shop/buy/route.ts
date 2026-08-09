import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type CartRequestItem = {
  itemId: number;
  quantity: number;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json();
  const rawItems: any[] = Array.isArray(body.items)
    ? body.items
    : body.itemId
      ? [{ itemId: body.itemId, quantity: body.quantity || 1 }]
      : [];

  if (!rawItems.length) {
    return NextResponse.json({ error: "장바구니가 비어 있습니다." }, { status: 400 });
  }

  const cartMap = new Map<number, number>();

  for (const rawItem of rawItems) {
    const itemId = Math.floor(Number(rawItem?.itemId));
    const quantity = Math.floor(Number(rawItem?.quantity || 1));

    if (!itemId || quantity < 1 || quantity > 99) {
      return NextResponse.json(
        { error: "구매 수량은 상품별 1개부터 99개까지 가능합니다." },
        { status: 400 }
      );
    }

    const nextQuantity = (cartMap.get(itemId) || 0) + quantity;
    if (nextQuantity > 99) {
      return NextResponse.json(
        { error: "같은 상품은 한 번에 최대 99개까지 구매할 수 있습니다." },
        { status: 400 }
      );
    }

    cartMap.set(itemId, nextQuantity);
  }

  const cart: CartRequestItem[] = Array.from(cartMap.entries()).map(([itemId, quantity]) => ({
    itemId,
    quantity,
  }));

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT id, dotori FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );

    const user = users[0];

    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });
    }

    const itemIds = cart.map((row) => row.itemId);
    const placeholders = itemIds.map(() => "?").join(",");
    const [items]: any = await connection.query(
      `SELECT * FROM shop_items WHERE is_active = 1 AND id IN (${placeholders})`,
      itemIds
    );

    if (items.length !== itemIds.length) {
      await connection.rollback();
      return NextResponse.json(
        { error: "장바구니에 판매가 종료된 아이템이 있습니다. 새로고침 후 다시 확인해주세요." },
        { status: 400 }
      );
    }

    const shopItemMap = new Map<number, any>(items.map((item: any) => [Number(item.id), item]));
    let totalPrice = 0;
    let totalQuantity = 0;

    for (const row of cart) {
      const item = shopItemMap.get(row.itemId);
      const price = Number(item?.price) || 0;

      if (!item || price <= 0) {
        await connection.rollback();
        return NextResponse.json({ error: "상품 가격이 올바르지 않습니다." }, { status: 400 });
      }

      totalPrice += price * row.quantity;
      totalQuantity += row.quantity;
    }

    const currentDotori = Number(user.dotori) || 0;

    if (currentDotori < totalPrice) {
      await connection.rollback();
      return NextResponse.json({ error: "도토리가 부족합니다." }, { status: 400 });
    }

    const [updateResult]: any = await connection.query(
      `
      UPDATE users
      SET dotori = dotori - ?
      WHERE id = ?
        AND dotori >= ?
      `,
      [totalPrice, user.id, totalPrice]
    );

    if (!updateResult.affectedRows) {
      await connection.rollback();
      return NextResponse.json({ error: "도토리가 부족합니다." }, { status: 400 });
    }

    const itemSummary = cart
      .map((row) => {
        const item = shopItemMap.get(row.itemId);
        return `${item.item_name} ${row.quantity}개`;
      })
      .join(", ");

    await connection.query(
      "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
      [user.id, -totalPrice, `상점 장바구니 구매: ${itemSummary}`]
    );

    for (const row of cart) {
      const item = shopItemMap.get(row.itemId);

      const [inventoryRows]: any = await connection.query(
        "SELECT * FROM user_inventory WHERE user_id = ? AND item_name = ? LIMIT 1",
        [user.id, item.item_name]
      );

      const inventory = inventoryRows[0];
      const mediaType = item.media_type === "video" ? "video" : "image";
      const itemImage = mediaType === "video" ? null : item.item_image || null;
      const itemAudio = mediaType === "video" ? null : item.item_audio || null;
      const itemVideo = mediaType === "video" ? item.item_video || null : null;

      if (inventory) {
        await connection.query(
          `
          UPDATE user_inventory
          SET
            item_count = item_count + ?,
            media_type = ?,
            item_image = ?,
            item_audio = ?,
            item_video = ?,
            overlay_text = ?
          WHERE id = ?
          `,
          [
            row.quantity,
            mediaType,
            itemImage,
            itemAudio,
            itemVideo,
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
              media_type,
              item_image,
              item_audio,
              item_video,
              overlay_text,
              item_count
            )
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            user.id,
            item.item_name,
            mediaType,
            itemImage,
            itemAudio,
            itemVideo,
            item.overlay_text || null,
            row.quantity,
          ]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      ok: true,
      message: "구매 완료",
      totalQuantity,
      totalPrice,
      remainingDotori: currentDotori - totalPrice,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { error: "구매 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
