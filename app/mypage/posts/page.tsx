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

function getCategoryName(category: string) {
  if (category === "free") return "자유게시판";
  return category;
}

export default async function PostsPage() {
  const session = await getServerSession(authOptions);

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session?.user?.email]
  );

  const user = users[0];

  const [posts]: any = await db.query(
    "SELECT id, title, category, views, likes, created_at FROM community_posts WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">내가 쓴 게시글</h1>

        <div className="space-y-4">
          {posts.map((post: any) => (
            <Link
              key={post.id}
              href={`/board/free/${post.id}`}
              className="block bg-[#151522] border border-white/10 rounded-2xl p-5 hover:bg-[#1b1b2a]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-purple-400 text-sm mb-2">
                    {getCategoryName(post.category)}
                  </p>
                  <h2 className="text-xl font-bold">{post.title}</h2>
                </div>

                <div className="text-right text-sm text-zinc-400">
                  <p>{formatDate(post.created_at)}</p>
                  <p>조회 {post.views} · 추천 {post.likes}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}