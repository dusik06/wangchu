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
    "SELECT item_type FROM shop_items WHERE id = ? LIMIT 1",
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

  await db.query(
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
      item.item_type === "signature" ? mediaType : "image",
      item.item_type === "signature" && mediaType === "image" ? itemImage : null,
      item.item_type === "signature" && mediaType === "image" ? itemAudio : null,
      item.item_type === "signature" && mediaType === "video" ? itemVideo : null,
      overlayText || null,
      itemId,
    ]
  );

  return NextResponse.json({ ok: true });
}
