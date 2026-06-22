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

  const [users]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length || users[0].role !== "admin") {
    return NextResponse.json({
      success: false,
      message: "권한이 없습니다.",
    });
  }

  const body = await req.json();

  const postId = Number(body.postId);
  const category = String(body.category || "free");

  await db.query(
    "UPDATE community_posts SET category = ? WHERE id = ?",
    [category, postId]
  );

  return NextResponse.json({
    success: true,
    message: "게시판 이동 완료",
  });
}