import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const [admins]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    return NextResponse.json({
      success: false,
      message: "권한이 없습니다.",
    });
  }

  const body = await req.json();
  const inventoryId = Number(body.inventoryId);

  if (!inventoryId) {
    return NextResponse.json({
      success: false,
      message: "아이템 정보가 없습니다.",
    });
  }

  await db.query("DELETE FROM user_inventory WHERE id = ?", [inventoryId]);

  return NextResponse.json({
    success: true,
    message: "아이템 삭제 완료",
  });
}