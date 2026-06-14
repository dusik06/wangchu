import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function CommentsPage() {
  const session = await getServerSession(authOptions);

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session?.user?.email]
  );

  const user = users[0];

  const [comments]: any = await db.query(
    "SELECT * FROM community_comments WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">내가 쓴 댓글</h1>

      <div className="space-y-3">
        {comments.map((comment: any) => (
          <Link
            key={comment.id}
            href={`/board/free/${comment.post_id}`}
            className="block bg-zinc-900 p-4 rounded-xl"
          >
            <div>{comment.content}</div>
            <div className="text-sm text-zinc-400 mt-2">
              {new Date(comment.created_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}