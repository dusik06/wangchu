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

  const [titles]: any = await db.query(
    "SELECT * FROM user_titles WHERE user_id = ? ORDER BY id DESC LIMIT 4",
    [user.id]
  );

  const [inventory]: any = await db.query(
    "SELECT * FROM user_inventory WHERE user_id = ? ORDER BY id DESC LIMIT 4",
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">마이페이지</h1>

        <section className="bg-[#151522] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-5">
            <img
              src={user.profile_image || "/default-profile.png"}
              alt="profile"
              className="w-24 h-24 rounded-full object-cover"
            />

            <div>
              <h2 className="text-3xl font-bold">{user.nickname}</h2>
              <p className="mt-2">
                도토리: <span className="text-yellow-300">{user.dotori}</span>개
              </p>

              <div className="flex gap-2 mt-4">
                <Link href="/mypage/profile" className="bg-purple-600 px-4 py-2 rounded">
                  프로필 사진 변경
                </Link>
                <Link href="/mypage/nickname" className="bg-green-600 px-4 py-2 rounded">
                  닉네임 변경
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">

          <Link href="/mypage/posts" className="bg-[#151522] rounded-2xl p-5 block">
            <h2 className="text-2xl font-bold mb-3">내가 쓴 게시글</h2>
            <p className="text-zinc-400">전체 내역 보기</p>
          </Link>

          <Link href="/mypage/comments" className="bg-[#151522] rounded-2xl p-5 block">
            <h2 className="text-2xl font-bold mb-3">내가 쓴 댓글</h2>
            <p className="text-zinc-400">전체 내역 보기</p>
          </Link>

          <Link href="/mypage/titles" className="bg-[#151522] rounded-2xl p-5 block">
            <h2 className="text-2xl font-bold mb-3">칭호</h2>
            <div className="space-y-2 mt-3">
              {titles.map((title: any) => (
                <div key={title.id} className="bg-white/5 p-3 rounded">
                  {title.title_name}
                </div>
              ))}
            </div>
          </Link>

          <Link href="/mypage/inventory" className="bg-[#151522] rounded-2xl p-5 block">
            <h2 className="text-2xl font-bold mb-3">내 아이템</h2>
            <div className="space-y-2 mt-3">
              {inventory.length === 0 && (
                <p className="text-zinc-400">보유 아이템 없음</p>
              )}

              {inventory.map((item: any) => (
                <div key={item.id} className="bg-white/5 p-3 rounded">
                  {item.item_name} x {item.item_count}
                </div>
              ))}
            </div>
          </Link>

        </div>
      </div>
    </main>
  );
}