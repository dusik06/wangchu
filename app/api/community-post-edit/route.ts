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

  await db.query(
    "UPDATE community_posts SET title = ?, content = ? WHERE id = ?",
    [title, content, postId]
  );

  return NextResponse.json({
    success: true,
    message: "게시글 수정 완료",
  });
}