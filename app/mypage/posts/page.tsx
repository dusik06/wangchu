import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function PostsPage() {
  const session = await getServerSession(authOptions);

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session?.user?.email]
  );

  const user = users[0];

  const [posts]: any = await db.query(
    "SELECT * FROM community_posts WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">내가 쓴 게시글</h1>

      <div className="space-y-3">
        {posts.map((post: any) => (
          <Link
            key={post.id}
            href={`/board/free/${post.id}`}
            className="block bg-zinc-900 p-4 rounded-xl"
          >
            <div className="font-bold">{post.title}</div>
            <div className="text-sm text-zinc-400 mt-2">
              조회수 {post.views} / 추천 {post.likes} / {new Date(post.created_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}