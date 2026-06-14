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
  const commentId = Number(body.commentId);

  if (!commentId) {
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
      message: "회원 없음",
    });
  }

  const userId = users[0].id;
  const role = users[0].role;

  const [comments]: any = await db.query(
    "SELECT user_id FROM community_comments WHERE id = ? LIMIT 1",
    [commentId]
  );

  if (!comments.length) {
    return NextResponse.json({
      success: false,
      message: "댓글 없음",
    });
  }

  if (role !== "admin" && comments[0].user_id !== userId) {
    return NextResponse.json({
      success: false,
      message: "삭제 권한 없음",
    });
  }

  await db.query(
    "DELETE FROM community_comments WHERE id = ? OR parent_id = ?",
    [commentId, commentId]
  );

  return NextResponse.json({
    success: true,
    message: "댓글 삭제 완료",
  });
}