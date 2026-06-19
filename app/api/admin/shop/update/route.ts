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
  const itemImage = String(body.itemImage || "").trim();
  const itemAudio = String(body.itemAudio || "").trim();
  const overlayText = String(body.overlayText || "").trim();

  if (!itemId) {
    return NextResponse.json({ error: "아이템 정보가 없습니다." }, { status: 400 });
  }

  if (!itemName) {
    return NextResponse.json({ error: "아이템 이름을 입력해주세요." }, { status: 400 });
  }

  await db.query(
    `
    UPDATE shop_items
    SET
      item_name = ?,
      price = ?,
      item_image = ?,
      item_audio = ?,
      overlay_text = ?
    WHERE id = ?
    `,
    [
      itemName,
      price,
      itemImage || null,
      itemAudio || null,
      overlayText || null,
      itemId,
    ]
  );

  return NextResponse.json({ ok: true });
}