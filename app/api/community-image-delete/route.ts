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

  const [users]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length) {
    return NextResponse.json({
      success: false,
      message: "회원 정보를 찾을 수 없습니다.",
    });
  }

  const [images]: any = await db.query(
    `
    SELECT i.id, p.user_id
    FROM post_images i
    JOIN community_posts p ON i.post_id = p.id
    WHERE i.id = ?
    LIMIT 1
    `,
    [imageId]
  );

  if (!images.length) {
    return NextResponse.json({
      success: false,
      message: "이미지를 찾을 수 없습니다.",
    });
  }

  const isAdmin = users[0].role === "admin";
  const isOwner = users[0].id === images[0].user_id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({
      success: false,
      message: "삭제 권한이 없습니다.",
    });
  }

  await db.query("DELETE FROM post_images WHERE id = ?", [imageId]);

  return NextResponse.json({
    success: true,
    message: "이미지 삭제 완료",
  });
}