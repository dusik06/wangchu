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

  const body = await req.json();
  const imageId = Number(body.imageId);

  if (!imageId) {
    return NextResponse.json({
      success: false,
      message: "잘못된 요청입니다.",
    });
  }

  await db.query(
    "DELETE FROM post_images WHERE id = ?",
    [imageId]
  );

  return NextResponse.json({
    success: true,
    message: "이미지 삭제 완료",
  });
}