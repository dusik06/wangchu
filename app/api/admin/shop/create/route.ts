import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "관리자만 가능합니다." },
      { status: 403 }
    );
  }

  const body = await req.json();

  const itemType = body.itemType;
  const itemName = String(body.itemName || "").trim();
  const price = Number(body.price || 0);
  const itemImage = String(body.itemImage || "").trim();
  const itemAudio = String(body.itemAudio || "").trim();
  const overlayText = String(body.overlayText || "").trim();

  if (!itemName) {
    return NextResponse.json(
      { error: "아이템 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  if (price < 0) {
    return NextResponse.json(
      { error: "가격이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  await db.query(
    `
    INSERT INTO shop_items
    (
      item_name,
      item_type,
      price,
      item_image,
      item_audio,
      overlay_text,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, 1)
    `,
    [
      itemName,
      itemType,
      price,
      itemImage || null,
      itemAudio || null,
      overlayText || null,
    ]
  );

  return NextResponse.json({
    ok: true,
    message: "아이템 생성 완료",
  });
}