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

  if (!postId) {
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

  const userId = users[0].id;
  const role = users[0].role;

  const [posts]: any = await db.query(
    "SELECT user_id FROM community_posts WHERE id = ? LIMIT 1",
    [postId]
  );

  if (!posts.length) {
    return NextResponse.json({
      success: false,
      message: "게시글이 없습니다.",
    });
  }

  const postOwnerId = posts[0].user_id;

  if (role !== "admin" && userId !== postOwnerId) {
    return NextResponse.json({
      success: false,
      message: "삭제 권한이 없습니다.",
    });
  }

  await db.query("DELETE FROM post_images WHERE post_id = ?", [postId]);
  await db.query("DELETE FROM post_likes WHERE post_id = ?", [postId]);
  await db.query("DELETE FROM post_reports WHERE post_id = ?", [postId]);
  await db.query("DELETE FROM community_comments WHERE post_id = ?", [postId]);
  await db.query("DELETE FROM community_posts WHERE id = ?", [postId]);

  return NextResponse.json({
    success: true,
    message: "게시글 삭제 완료",
  });
}