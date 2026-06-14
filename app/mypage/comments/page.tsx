import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function CommentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  const [comments]: any = await db.query(
    `
    SELECT 
      c.id,
      c.post_id,
      c.content,
      c.created_at,
      p.title AS post_title
    FROM community_comments c
    LEFT JOIN community_posts p ON c.post_id = p.id
    WHERE c.user_id = ?
    ORDER BY c.id DESC
    `,
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">내가 쓴 댓글</h1>
          <Link href="/mypage" className="text-zinc-400 hover:text-white">마이페이지로</Link>
        </div>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6">
          <div className="space-y-3">
            {comments.length === 0 && (
              <p className="text-zinc-400">작성한 댓글이 없습니다.</p>
            )}

            {comments.map((comment: any) => (
              <Link
                key={comment.id}
                href={`/board/free/${comment.post_id}`}
                className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4"
              >
                <div className="text-sm text-purple-300 mb-2">
                  원글: {comment.post_title || "삭제된 게시글"}
                </div>

                <div className="text-lg leading-relaxed">
                  {comment.content}
                </div>

                <div className="text-sm text-zinc-400 mt-3">
                  작성일 {formatDate(comment.created_at)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}