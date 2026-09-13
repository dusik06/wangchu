import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

const MEMBER_RECOMMEND_REWARD = 20;
const ADMIN_RECOMMEND_REWARD = 50;

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "잘못된 요청입니다." });
  }

  const postId = Number(body.postId);
  const type = String(body.type);

  if (!Number.isInteger(postId) || postId <= 0 || !["like", "dislike"].includes(type)) {
    return NextResponse.json({
      success: false,
      message: "잘못된 요청입니다.",
    });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [users]: any = await conn.query(
      "SELECT id, email, role FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );
    if (!users.length) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "회원 정보를 찾을 수 없습니다." });
    }

    const voter = users[0];
    const [posts]: any = await conn.query(
      "SELECT id, user_id, is_blind FROM community_posts WHERE id = ? LIMIT 1 FOR UPDATE",
      [postId]
    );
    if (!posts.length || Number(posts[0].is_blind || 0) === 1) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "추천할 수 없는 게시글입니다." });
    }

    const post = posts[0];
    const recommendReward = voter.role === "admin"
      ? ADMIN_RECOMMEND_REWARD
      : MEMBER_RECOMMEND_REWARD;
    if (Number(post.user_id) === Number(voter.id)) {
      await conn.rollback();
      return NextResponse.json({
        success: false,
        message: "자기 글에는 추천 또는 비추천할 수 없습니다.",
      });
    }

    try {
      await conn.query(
        `INSERT INTO community_post_votes
          (post_id, voter_user_id, voter_email, vote_type, reward_amount, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [postId, voter.id, voter.email, type, type === "like" ? recommendReward : 0]
      );
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY") {
        await conn.rollback();
        return NextResponse.json({
          success: false,
          message: "이미 추천 또는 비추천을 했습니다.",
        });
      }
      throw error;
    }

    await conn.query(
      "INSERT INTO post_likes (post_id, user_email, type) VALUES (?, ?, ?)",
      [postId, voter.email, type]
    );

    if (type === "like") {
      await conn.query(
        `UPDATE community_posts
         SET likes = likes + 1,
             is_best = IF(likes + 1 >= 5, 1, is_best)
         WHERE id = ?`,
        [postId]
      );
      await conn.query(
        "UPDATE users SET dotori = dotori + ? WHERE id = ?",
        [recommendReward, post.user_id]
      );
      await conn.query(
        "INSERT INTO dotori_logs (user_id, amount, reason) VALUES (?, ?, ?)",
        [post.user_id, recommendReward, `게시글 추천 보상 (글번호 ${postId})`]
      );
    } else {
      await conn.query(
        "UPDATE community_posts SET dislikes = dislikes + 1 WHERE id = ?",
        [postId]
      );
    }

    await conn.commit();
    return NextResponse.json({
      success: true,
      message: type === "like"
        ? `추천 완료! 작성자에게 도토리 ${recommendReward}개가 지급되었습니다.`
        : "비추천 완료!",
    });
  } catch (error) {
    await conn.rollback();
    console.error("community post vote error", error);
    return NextResponse.json({ success: false, message: "처리 중 오류가 발생했습니다." });
  } finally {
    conn.release();
  }
}
