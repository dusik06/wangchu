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
  let category = String(body.category || "free");
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
  const wantsMainPost = body.isMainPost === true;

  if (!title || !content) {
    return NextResponse.json({
      success: false,
      message: "제목과 내용을 입력해주세요.",
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

  // 허용 카테고리 검증
  const allCategories = [
    "free",
    "notice",
    "suggestion",
    "from_wangchu",
    "to_wangchu",
  ];

  if (!allCategories.includes(category)) {
    category = "free";
  }

  // 관리자 전용 카테고리 차단
  if (
    role !== "admin" &&
    (category === "notice" || category === "from_wangchu")
  ) {
    return NextResponse.json({
      success: false,
      message: "해당 게시판에 글을 작성할 권한이 없습니다.",
    });
  }

  let noticeValue = 0;

  if (category === "notice") {
    noticeValue = 1;
  }

  const postReward = 20;
  const postDailyLimit = 3;

  const [todayRewardPosts]: any = await db.query(
    "SELECT COUNT(*) AS count FROM community_posts WHERE user_id = ? AND reward_given = 1 AND DATE(created_at) = CURDATE()",
    [userId]
  );

  let rewardGiven = 0;

  if (todayRewardPosts[0].count < postDailyLimit) {
    rewardGiven = 1;
  }

  const [result]: any = await db.query(
    `
    INSERT INTO community_posts
    (user_id, title, content, reward_given, category, is_notice)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [userId, title, content, rewardGiven, category, noticeValue]
  );

  const postId = result.insertId;

  // 관리자만 홈페이지 최상단 메인글을 지정할 수 있습니다.
  // 별도 매핑 테이블을 사용해 기존 community_posts 구조는 건드리지 않습니다.
  if (role === "admin" && wantsMainPost) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS community_main_posts (
        post_id INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    // 메인글은 한 번에 하나만 노출되도록 가장 최근 지정 글로 교체합니다.
    await db.query("DELETE FROM community_main_posts");
    await db.query(
      "INSERT INTO community_main_posts (post_id) VALUES (?)",
      [postId]
    );
  }

  for (const imageUrl of imageUrls) {
    await db.query(
      "INSERT INTO post_images (post_id, image_url) VALUES (?, ?)",
      [postId, imageUrl]
    );
  }

  if (rewardGiven) {
    await db.query(
      "UPDATE users SET dotori = dotori + ? WHERE id = ?",
      [postReward, userId]
    );

    await db.query(
      "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
      [userId, postReward, "게시글 작성 보상"]
    );
  }

  return NextResponse.json({
    success: true,
    message: rewardGiven
      ? `게시글 작성 완료! 도토리 ${postReward}개 지급`
      : "게시글 작성 완료! (오늘 보상 횟수 초과)",
    postId,
  });
}