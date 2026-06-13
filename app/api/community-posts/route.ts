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
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();

  if (!title || !content) {
    return NextResponse.json({
      success: false,
      message: "제목과 내용을 입력해주세요.",
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

  const [settings]: any = await db.query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('post_reward', 'post_daily_limit')"
  );

  let postReward = 5;
  let postDailyLimit = 3;

  settings.forEach((item: any) => {
    if (item.setting_key === "post_reward") {
      postReward = Number(item.setting_value);
    }

    if (item.setting_key === "post_daily_limit") {
      postDailyLimit = Number(item.setting_value);
    }
  });

  const [todayRewardPosts]: any = await db.query(
    "SELECT COUNT(*) AS count FROM community_posts WHERE user_id = ? AND reward_given = 1 AND DATE(created_at) = CURDATE()",
    [userId]
  );

  let rewardGiven = 0;

  if (content.length >= 20 && todayRewardPosts[0].count < postDailyLimit) {
    rewardGiven = 1;
  }

  const [result]: any = await db.query(
    "INSERT INTO community_posts (user_id, title, content, reward_given) VALUES (?, ?, ?, ?)",
    [userId, title, content, rewardGiven]
  );

  if (rewardGiven) {
    await db.query(
      "UPDATE users SET dotori = dotori + ? WHERE id = ?",
      [postReward, userId]
    );

    await db.query(
      "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
      [userId, postReward, "게시글 작성"]
    );
  }

  return NextResponse.json({
    success: true,
    message: rewardGiven
      ? `게시글 작성 완료! 도토리 ${postReward}개 지급`
      : "게시글 작성 완료!",
    postId: result.insertId,
  });
}