import db from "@/lib/db";
import { notFound } from "next/navigation";
import CommentForm from "./comment-form";

export const dynamic = "force-dynamic";

export default async function FreeBoardDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const postId = Number(params.id);

  if (!postId) {
    notFound();
  }

  await db.query(
    "UPDATE community_posts SET views = views + 1 WHERE id = ?",
    [postId]
  );

  const [posts]: any = await db.query(
    `
    SELECT 
      p.id,
      p.title,
      p.content,
      p.views,
      p.created_at,
      u.nickname,
      u.role
    FROM community_posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
    LIMIT 1
    `,
    [postId]
  );

  if (!posts.length) {
    notFound();
  }

  const post = posts[0];

  const [comments]: any = await db.query(
    `
    SELECT 
      c.id,
      c.content,
      c.created_at,
      u.nickname,
      u.role
    FROM community_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.id ASC
    `,
    [postId]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">
            자유게시판
          </h1>

          <a href="/board/free" className="bg-slate-800 px-4 py-2 rounded-lg">
            목록으로
          </a>
        </div>

        <article className="bg-slate-900 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">
            {post.title}
          </h2>

          <div className="flex gap-4 text-gray-400 text-sm mb-6">
            <span>
              작성자:{" "}
              {post.role === "admin" && (
                <span className="bg-purple-600 text-white px-2 py-1 rounded-md mr-1">
                  관리자
                </span>
              )}
              {post.nickname}
            </span>

            <span>조회수: {post.views}</span>
            <span>{String(post.created_at).slice(0, 10)}</span>
          </div>

          <div className="whitespace-pre-wrap leading-8 text-gray-100 border-t border-slate-800 pt-6">
            {post.content}
          </div>
        </article>

        <section className="bg-slate-900 rounded-2xl p-5 mt-6">
          <h2 className="text-xl font-bold mb-4">
            댓글 {comments.length}개
          </h2>

          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div
                key={comment.id}
                className="bg-slate-800 rounded-xl p-4"
              >
                <div className="flex justify-between mb-2">
                  <p className="font-bold">
                    {comment.role === "admin" && (
                      <span className="bg-purple-600 text-white px-2 py-1 rounded-md text-xs mr-1">
                        관리자
                      </span>
                    )}
                    {comment.nickname}
                  </p>

                  <p className="text-gray-500 text-sm">
                    {String(comment.created_at).slice(0, 10)}
                  </p>
                </div>

                <p className="text-gray-200 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-gray-400">
                아직 댓글이 없습니다.
              </p>
            )}
          </div>
        </section>

        <CommentForm postId={postId} />
      </div>
    </main>
  );
}