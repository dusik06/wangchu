import db from "@/lib/db";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export default async function MyBoardPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        로그인 후 이용 가능합니다.
      </main>
    );
  }

  const [users]: any = await db.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        회원 정보 없음
      </main>
    );
  }

  const userId = users[0].id;

  const [posts]: any = await db.query(
    `
    SELECT id, title, created_at, views, likes
    FROM community_posts
    WHERE user_id = ?
    ORDER BY id DESC
    `,
    [userId]
  );

  const [comments]: any = await db.query(
    `
    SELECT c.id, c.content, c.created_at, c.post_id
    FROM community_comments c
    WHERE c.user_id = ?
    ORDER BY c.id DESC
    `,
    [userId]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-pink-400 mb-8">
          내 활동 내역
        </h1>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">내 게시글</h2>

          <div className="space-y-3">
            {posts.map((post: any) => (
              <a
                key={post.id}
                href={`/board/free/${post.id}`}
                className="block bg-slate-900 rounded-xl p-4"
              >
                <p className="font-bold">{post.title}</p>

                <div className="text-sm text-gray-400 mt-2 flex gap-4">
                  <span>조회 {post.views}</span>
                  <span>추천 {post.likes}</span>
                  <span>{String(post.created_at).slice(0, 10)}</span>
                </div>
              </a>
            ))}

            {posts.length === 0 && (
              <p className="text-gray-400">작성한 게시글 없음</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">내 댓글</h2>

          <div className="space-y-3">
            {comments.map((comment: any) => (
              <a
                key={comment.id}
                href={`/board/free/${comment.post_id}`}
                className="block bg-slate-900 rounded-xl p-4"
              >
                <p>{comment.content}</p>

                <div className="text-sm text-gray-400 mt-2">
                  {String(comment.created_at).slice(0, 10)}
                </div>
              </a>
            ))}

            {comments.length === 0 && (
              <p className="text-gray-400">작성한 댓글 없음</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}