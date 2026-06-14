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

  const [titles]: any = await db.query(
    "SELECT * FROM user_titles WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  const equippedTitle = titles.find((title: any) => title.id === user.current_title_id);

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">마이페이지</h1>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-6">
            <img
              src={user.profile_image || user.image || "/default-profile.png"}
              alt="profile"
              className="w-24 h-24 rounded-full object-cover border border-white/20 bg-black/30"
            />

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">{user.nickname || "닉네임 없음"}</h2>

                {equippedTitle && (
                  <span className="px-3 py-1 rounded-full bg-yellow-500 text-black text-sm font-bold">
                    {equippedTitle.title_name}
                  </span>
                )}
              </div>

              <p className="mt-2 text-zinc-300">
                도토리: <span className="text-yellow-300 font-bold">{user.dotori || 0}</span>개
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                <Link
                  href="/mypage/profile"
                  className="text-center rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 font-bold"
                >
                  프로필 사진 변경
                </Link>

                <Link
                  href="/mypage/nickname"
                  className="text-center rounded-xl bg-green-600 hover:bg-green-500 px-4 py-3 font-bold"
                >
                  닉네임 변경
                </Link>

                <Link
                  href="/mypage/titles"
                  className="text-center rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-3 font-bold"
                >
                  칭호 변경
                </Link>

                <Link
                  href="/mypage/inventory"
                  className="text-center rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 font-bold"
                >
                  내 아이템
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/mypage/posts"
            className="bg-[#151522] border border-white/10 rounded-2xl p-6 hover:bg-[#1c1c2b] transition"
          >
            <h2 className="text-2xl font-bold mb-2">내가 쓴 게시글</h2>
            <p className="text-zinc-400">내가 작성한 게시글 전체 보기</p>
          </Link>

          <Link
            href="/mypage/comments"
            className="bg-[#151522] border border-white/10 rounded-2xl p-6 hover:bg-[#1c1c2b] transition"
          >
            <h2 className="text-2xl font-bold mb-2">내가 쓴 댓글</h2>
            <p className="text-zinc-400">내가 작성한 댓글 전체 보기</p>
          </Link>
        </div>
      </div>
    </main>
  );
}