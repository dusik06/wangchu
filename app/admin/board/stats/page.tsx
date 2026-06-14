import db from "@/lib/db";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export default async function BoardStatsPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        로그인 필요
      </main>
    );
  }

  const [users]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length || users[0].role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        관리자만 접근 가능
      </main>
    );
  }

  const [postCount]: any = await db.query(
    "SELECT COUNT(*) AS total FROM community_posts"
  );

  const [commentCount]: any = await db.query(
    "SELECT COUNT(*) AS total FROM community_comments"
  );

  const [todayPosts]: any = await db.query(
    "SELECT COUNT(*) AS total FROM community_posts WHERE DATE(created_at) = CURDATE()"
  );

  const [todayComments]: any = await db.query(
    "SELECT COUNT(*) AS total FROM community_comments WHERE DATE(created_at) = CURDATE()"
  );

  const [blindPosts]: any = await db.query(
    "SELECT COUNT(*) AS total FROM community_posts WHERE is_blind = 1"
  );

  const [reportTop]: any = await db.query(
    `
    SELECT id, title, reports
    FROM community_posts
    WHERE reports > 0
    ORDER BY reports DESC
    LIMIT 5
    `
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-pink-400 mb-8">
          게시판 통계
        </h1>

        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-gray-400">총 게시글</p>
            <p className="text-2xl font-bold">{postCount[0].total}</p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-gray-400">총 댓글</p>
            <p className="text-2xl font-bold">{commentCount[0].total}</p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-gray-400">오늘 게시글</p>
            <p className="text-2xl font-bold">{todayPosts[0].total}</p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-gray-400">오늘 댓글</p>
            <p className="text-2xl font-bold">{todayComments[0].total}</p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-gray-400">블라인드 글</p>
            <p className="text-2xl font-bold text-red-400">
              {blindPosts[0].total}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-red-400">
            🚨 신고 TOP 5
          </h2>

          <div className="space-y-3">
            {reportTop.map((post: any) => (
              <a
                key={post.id}
                href={`/board/free/${post.id}`}
                className="block bg-slate-800 rounded-xl p-4"
              >
                <p className="font-bold">{post.title}</p>
                <p className="text-sm text-red-400 mt-2">
                  신고 {post.reports}회
                </p>
              </a>
            ))}

            {reportTop.length === 0 && (
              <p className="text-gray-400">신고된 게시글 없음</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}