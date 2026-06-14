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
  const type = String(body.type);

  if (!postId || !["like", "dislike"].includes(type)) {
    return NextResponse.json({
      success: false,
      message: "잘못된 요청입니다.",
    });
  }

  const [exists]: any = await db.query(
    "SELECT id FROM post_likes WHERE post_id = ? AND user_email = ? LIMIT 1",
    [postId, session.user.email]
  );

  if (exists.length) {
    return NextResponse.json({
      success: false,
      message: "이미 추천 또는 비추천을 했습니다.",
    });
  }

  await db.query(
    "INSERT INTO post_likes (post_id, user_email, type) VALUES (?, ?, ?)",
    [postId, session.user.email, type]
  );

  if (type === "like") {
  await db.query(
    "UPDATE community_posts SET likes = likes + 1 WHERE id = ?",
    [postId]
  );

  const [posts]: any = await db.query(
    "SELECT likes FROM community_posts WHERE id = ? LIMIT 1",
    [postId]
  );

  if (posts.length && posts[0].likes >= 5) {
    await db.query(
      "UPDATE community_posts SET is_best = 1 WHERE id = ?",
      [postId]
    );
  }
} else {
    await db.query(
      "UPDATE community_posts SET dislikes = dislikes + 1 WHERE id = ?",
      [postId]
    );
  }

  return NextResponse.json({
    success: true,
    message: type === "like" ? "추천 완료!" : "비추천 완료!",
  });
}