import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [admins]: any = await db.query(
    "SELECT id FROM users WHERE email = ? AND role = 'admin' LIMIT 1",
    [session.user.email]
  );

  if (admins.length === 0) {
    return NextResponse.json({ error: "관리자만 가능합니다." }, { status: 403 });
  }

  const formData = await req.formData();

  const userId = Number(formData.get("userId"));
  const itemName = String(formData.get("itemName") || "").trim();
  const itemCount = Number(formData.get("itemCount") || 1);
  const itemImage = String(formData.get("itemImage") || "").trim();

  if (!userId || !itemName || itemCount < 1) {
    return NextResponse.json({ error: "입력값이 부족합니다." }, { status: 400 });
  }

  await db.query(
    "INSERT INTO user_inventory (user_id, item_name, item_count, item_image, acquired_at) VALUES (?, ?, ?, ?, NOW())",
    [userId, itemName, itemCount, itemImage || null]
  );

  return NextResponse.redirect(new URL("/admin/user-assets", req.url));
}