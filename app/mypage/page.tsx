import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function MyPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  if (!user) {
    return <div className="p-6 text-white">유저 정보를 찾을 수 없습니다.</div>;
  }

  const [posts]: any = await db.query(
    "SELECT id, title, created_at FROM community_posts WHERE user_id = ? ORDER BY id DESC LIMIT 5",
    [user.id]
  );

  const [comments]: any = await db.query(
    "SELECT id, post_id, content, created_at FROM community_comments WHERE user_id = ? ORDER BY id DESC LIMIT 5",
    [user.id]
  );

  const [titles]: any = await db.query(
    "SELECT * FROM user_titles WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  const [inventory]: any = await db.query(
    "SELECT * FROM user_inventory WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  const equippedTitle = titles.find((t: any) => t.id === user.current_title_id);

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">마이페이지</h1>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-5">
            <img
              src={user.profile_image || user.image || "/default-profile.png"}
              alt="profile"
              className="w-24 h-24 rounded-full object-cover border border-white/20"
            />

            <div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {user.nickname || "닉네임 없음"}
                {equippedTitle && (
                  <span className="text-sm bg-yellow-500 text-black px-2 py-1 rounded-full">
                    {equippedTitle.title_name}
                  </span>
                )}
              </div>

              <div className="text-zinc-400 mt-2">
                도토리: <span className="text-yellow-300 font-bold">{user.dotori || 0}</span>개
              </div>

              <div className="flex gap-2 mt-4">
                <Link href="/mypage/profile" className="px-4 py-2 rounded-lg bg-purple-600">
                  프로필 사진 변경
                </Link>
                <Link href="/mypage/nickname" className="px-4 py-2 rounded-lg bg-green-600">
                  닉네임 변경
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-[#151522] border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-4">내가 쓴 게시글</h2>
            <div className="space-y-2">
              {posts.length === 0 && <p className="text-zinc-400">작성한 게시글이 없습니다.</p>}
              {posts.map((post: any) => (
                <Link
                  key={post.id}
                  href={`/board/free/${post.id}`}
                  className="block bg-white/5 rounded-lg p-3"
                >
                  {post.title}
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[#151522] border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-4">내가 쓴 댓글</h2>
            <div className="space-y-2">
              {comments.length === 0 && <p className="text-zinc-400">작성한 댓글이 없습니다.</p>}
              {comments.map((comment: any) => (
                <Link
                  key={comment.id}
                  href={`/board/free/${comment.post_id}`}
                  className="block bg-white/5 rounded-lg p-3"
                >
                  {comment.content}
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[#151522] border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-4">칭호</h2>
            <div className="space-y-2">
              {titles.length === 0 && <p className="text-zinc-400">보유한 칭호가 없습니다.</p>}
              {titles.map((title: any) => (
                <div key={title.id} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                  <span>{title.title_name}</span>
                  {user.current_title_id === title.id ? (
                    <span className="text-yellow-300 text-sm">장착중</span>
                  ) : (
                    <form action="/api/mypage/title-equip" method="POST">
                      <input type="hidden" name="titleId" value={title.id} />
                      <button className="px-3 py-1 rounded bg-yellow-500 text-black">
                        장착
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#151522] border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-4">내 아이템</h2>
            <div className="space-y-2">
              {inventory.length === 0 && <p className="text-zinc-400">보유 아이템이 없습니다.</p>}
              {inventory.map((item: any) => (
                <div key={item.id} className="bg-white/5 rounded-lg p-3">
                  {item.item_name} x {item.item_count}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}