import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length || users[0].role !== "admin") {
    return NextResponse.json({ error: "관리자만 가능합니다." }, { status: 403 });
  }

  const body = await req.json();

  const itemId = Number(body.itemId);
  const itemName = String(body.itemName || "").trim();
  const price = Number(body.price || 0);
  const mediaType = body.mediaType === "video" ? "video" : "image";
  const itemImage = String(body.itemImage || "").trim();
  const itemAudio = String(body.itemAudio || "").trim();
  const itemVideo = String(body.itemVideo || "").trim();
  const overlayText = String(body.overlayText || "").trim();

  if (!itemId) {
    return NextResponse.json({ error: "아이템 정보가 없습니다." }, { status: 400 });
  }

  if (!itemName) {
    return NextResponse.json(
      { error: "아이템 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  const [items]: any = await db.query(
    "SELECT item_type, item_name FROM shop_items WHERE id = ? LIMIT 1",
    [itemId]
  );

  const item = items[0];

  if (!item) {
    return NextResponse.json({ error: "아이템이 없습니다." }, { status: 404 });
  }

  if (item.item_type === "signature") {
    if (mediaType === "image" && (!itemImage || !itemAudio)) {
      return NextResponse.json(
        { error: "이미지형 시그는 이미지 URL과 노래 URL이 필요합니다." },
        { status: 400 }
      );
    }

    if (mediaType === "video" && !itemVideo) {
      return NextResponse.json(
        { error: "영상 URL이 필요합니다." },
        { status: 400 }
      );
    }
  }

  const nextMediaType = item.item_type === "signature" ? mediaType : "image";
  const nextItemImage =
    item.item_type === "signature" && mediaType === "image" ? itemImage : null;
  const nextItemAudio =
    item.item_type === "signature" && mediaType === "image" ? itemAudio : null;
  const nextItemVideo =
    item.item_type === "signature" && mediaType === "video" ? itemVideo : null;
  const nextOverlayText = overlayText || null;
  const oldItemName = String(item.item_name || "");

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE shop_items
      SET
        item_name = ?,
        price = ?,
        media_type = ?,
        item_image = ?,
        item_audio = ?,
        item_video = ?,
        overlay_text = ?
      WHERE id = ?
      `,
      [
        itemName,
        price,
        nextMediaType,
        nextItemImage,
        nextItemAudio,
        nextItemVideo,
        nextOverlayText,
        itemId,
      ]
    );

    // 이미 구매해서 보관함에 들어가 있는 같은 아이템도 상점 수정값과 함께 갱신한다.
    // 기존 구조는 user_inventory에 shop_item_id가 없으므로 수정 전 아이템명으로 연결한다.
    await connection.query(
      `
      UPDATE user_inventory
      SET
        item_name = ?,
        media_type = ?,
        item_image = ?,
        item_audio = ?,
        item_video = ?,
        overlay_text = ?
      WHERE item_name = ?
      `,
      [
        itemName,
        nextMediaType,
        nextItemImage,
        nextItemAudio,
        nextItemVideo,
        nextOverlayText,
        oldItemName,
      ]
    );

    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return NextResponse.json(
      { error: "아이템 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
