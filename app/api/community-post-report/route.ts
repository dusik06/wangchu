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
  const reason = String(body.reason || "").trim();

  if (!postId) {
    return NextResponse.json({
      success: false,
      message: "잘못된 요청입니다.",
    });
  }

  const [exists]: any = await db.query(
    "SELECT id FROM post_reports WHERE post_id = ? AND user_email = ? LIMIT 1",
    [postId, session.user.email]
  );

  if (exists.length) {
    return NextResponse.json({
      success: false,
      message: "이미 신고했습니다.",
    });
  }

  await db.query(
    "INSERT INTO post_reports (post_id, user_email, reason) VALUES (?, ?, ?)",
    [postId, session.user.email, reason]
  );

await db.query(
  "UPDATE community_posts SET reports = reports + 1 WHERE id = ?",
  [postId]
);

const [posts]: any = await db.query(
  "SELECT reports FROM community_posts WHERE id = ? LIMIT 1",
  [postId]
);

if (posts.length && posts[0].reports >= 3) {
  await db.query(
    "UPDATE community_posts SET is_blind = 1 WHERE id = ?",
    [postId]
  );
}

  return NextResponse.json({
    success: true,
    message: "신고 완료!",
  });
}