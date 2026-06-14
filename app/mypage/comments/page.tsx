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

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session?.user?.email]
  );

  const user = users[0];

  const [comments]: any = await db.query(`
    SELECT c.*, p.title AS post_title
    FROM community_comments c
    LEFT JOIN community_posts p ON c.post_id = p.id
    WHERE c.user_id = ${user.id}
    ORDER BY c.id DESC
  `);

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">내가 쓴 댓글</h1>

        <div className="space-y-4">
          {comments.map((comment: any) => (
            <Link
              key={comment.id}
              href={`/board/free/${comment.post_id}`}
              className="block bg-[#151522] border border-white/10 rounded-2xl p-5 hover:bg-[#1b1b2a]"
            >
              <p className="text-purple-400 font-bold mb-2">
                원글: {comment.post_title}
              </p>

              <p className="text-lg line-clamp-2">
                {comment.content}
              </p>

              <p className="text-sm text-zinc-400 mt-3">
                작성일 {formatDate(comment.created_at)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}