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
  const content = String(body.content || "").trim();
  const parentId = body.parentId ? Number(body.parentId) : null;

  if (!postId || !content) {
    return NextResponse.json({
      success: false,
      message: "댓글 내용을 입력해주세요.",
    });
  }

  const [users]: any = await db.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length) {
    return NextResponse.json({
      success: false,
      message: "회원 정보를 찾을 수 없습니다.",
    });
  }

  const userId = users[0].id;

  const commentReward = 5;
  const commentDailyLimit = 5;
  const adminPostCommentReward = 10;
  const adminPostCommentDailyLimit = 1;

  const [posts]: any = await db.query(
    `
    SELECT u.role
    FROM community_posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
    LIMIT 1
    `,
    [postId]
  );

  const isAdminPost = posts.length > 0 && posts[0].role === "admin";

  let rewardGiven = 0;
  let finalReward = 0;

  if (isAdminPost) {
    const [todayAdminComments]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM community_comments
      WHERE user_id = ?
        AND reward_given = 2
        AND DATE(created_at) = CURDATE()
      `,
      [userId]
    );

    if (todayAdminComments[0].count < adminPostCommentDailyLimit) {
      rewardGiven = 2;
      finalReward = adminPostCommentReward;
    }
  } else {
    const [todayRewardComments]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM community_comments
      WHERE user_id = ?
        AND reward_given = 1
        AND DATE(created_at) = CURDATE()
      `,
      [userId]
    );

    if (todayRewardComments[0].count < commentDailyLimit) {
      rewardGiven = 1;
      finalReward = commentReward;
    }
  }

  await db.query(
    `
    INSERT INTO community_comments
    (post_id, user_id, content, parent_id, reward_given)
    VALUES (?, ?, ?, ?, ?)
    `,
    [postId, userId, content, parentId, rewardGiven]
  );

  if (rewardGiven) {
    await db.query(
      "UPDATE users SET dotori = dotori + ? WHERE id = ?",
      [finalReward, userId]
    );

    await db.query(
      "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
      [
        userId,
        finalReward,
        rewardGiven === 2 ? "관리자 글 댓글 보상" : "댓글 작성 보상",
      ]
    );
  }

  return NextResponse.json({
    success: true,
    message: rewardGiven
      ? `댓글 작성 완료! 도토리 ${finalReward}개 지급`
      : isAdminPost
      ? "댓글 작성 완료! (오늘 관리자 글 댓글 보상 횟수 초과)"
      : "댓글 작성 완료! (오늘 댓글 보상 횟수 초과)",
  });
}