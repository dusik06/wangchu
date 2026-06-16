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

  const postId = Number(body.postId);
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];

  if (!postId || !title || !content) {
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
      message: "회원 정보 없음",
    });
  }

  const userId = users[0].id;
  const role = users[0].role;

  const [posts]: any = await db.query(
    "SELECT user_id FROM community_posts WHERE id = ? LIMIT 1",
    [postId]
  );

  if (!posts.length) {
    return NextResponse.json({
      success: false,
      message: "게시글 없음",
    });
  }

  if (role !== "admin" && posts[0].user_id !== userId) {
    return NextResponse.json({
      success: false,
      message: "수정 권한 없음",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "UPDATE community_posts SET title = ?, content = ? WHERE id = ?",
      [title, content, postId]
    );

    for (const imageUrl of imageUrls) {
      const cleanUrl = String(imageUrl || "").trim();

      if (!cleanUrl) continue;

      await connection.query(
        `
        INSERT INTO post_images
          (post_id, image_url)
        VALUES
          (?, ?)
        `,
        [postId, cleanUrl]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "게시글 수정 완료",
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "게시글 수정 중 오류가 발생했습니다.",
    });
  } finally {
    connection.release();
  }
}