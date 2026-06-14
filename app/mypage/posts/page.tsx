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

export default async function PostsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  const [posts]: any = await db.query(
    "SELECT id, title, category, views, likes, created_at FROM community_posts WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">내가 쓴 게시글</h1>
          <Link href="/mypage" className="text-zinc-400 hover:text-white">마이페이지로</Link>
        </div>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6">
          <div className="space-y-3">
            {posts.length === 0 && (
              <p className="text-zinc-400">작성한 게시글이 없습니다.</p>
            )}

            {posts.map((post: any) => (
              <Link
                key={post.id}
                href={`/board/free/${post.id}`}
                className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <div className="text-sm text-purple-300 mb-1">
                      {post.category || "free"}
                    </div>
                    <h2 className="text-lg font-bold">{post.title}</h2>
                  </div>

                  <div className="text-right text-sm text-zinc-400 shrink-0">
                    <div>{formatDate(post.created_at)}</div>
                    <div className="mt-1">
                      조회 {post.views || 0} · 추천 {post.likes || 0}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}