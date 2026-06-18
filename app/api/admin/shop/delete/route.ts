import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

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

  if (!users.length || users[0].role !== "admin") {
    return NextResponse.json(
      { error: "관리자만 가능합니다." },
      { status: 403 }
    );
  }

  const { itemId } = await req.json();

  await db.query("DELETE FROM shop_items WHERE id = ?", [itemId]);

  return NextResponse.json({
    success: true,
  });
}