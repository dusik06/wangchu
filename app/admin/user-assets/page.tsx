import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function AdminUserAssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <main className="min-h-screen bg-[#09090f] text-white p-8">로그인이 필요합니다.</main>;
  }

  const [admins]: any = await db.query(
    "SELECT * FROM users WHERE email = ? AND role = 'admin' LIMIT 1",
    [session.user.email]
  );

  if (admins.length === 0) {
    return <main className="min-h-screen bg-[#09090f] text-white p-8">관리자만 접근 가능합니다.</main>;
  }

  const [users]: any = await db.query(
    "SELECT id, email, nickname, dotori FROM users ORDER BY id DESC"
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-purple-300 font-bold mb-2">ADMIN</p>
            <h1 className="text-3xl font-extrabold">유저 칭호 / 아이템 지급</h1>
          </div>

          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
          >
            관리자 홈으로
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <section className="bg-[#151522] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-2">칭호 지급</h2>
            <p className="text-zinc-400 mb-5">선택한 유저에게 새 칭호를 지급합니다.</p>

            <form action="/api/admin/user-assets/grant-title" method="POST" className="space-y-4">
              <select name="userId" className="w-full h-12 px-4 rounded-xl bg-[#0b0b13] border border-white/10 text-white">
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.id}번 / {user.nickname || "닉네임 없음"} / {user.email}
                  </option>
                ))}
              </select>

              <input
                name="titleName"
                placeholder="칭호명 입력 예: 관리자"
                className="w-full h-12 px-4 rounded-xl bg-[#0b0b13] border border-white/10 text-white placeholder:text-zinc-500"
                required
              />

              <button className="w-full h-12 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold">
                칭호 지급하기
              </button>
            </form>
          </section>

          <section className="bg-[#151522] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-2">아이템 지급</h2>
            <p className="text-zinc-400 mb-5">아이템 이름, 수량, 이미지 주소를 지급합니다.</p>

            <form action="/api/admin/user-assets/grant-item" method="POST" className="space-y-4">
              <select name="userId" className="w-full h-12 px-4 rounded-xl bg-[#0b0b13] border border-white/10 text-white">
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.id}번 / {user.nickname || "닉네임 없음"} / {user.email}
                  </option>
                ))}
              </select>

              <input
                name="itemName"
                placeholder="아이템명 입력 예: 황금 도토리"
                className="w-full h-12 px-4 rounded-xl bg-[#0b0b13] border border-white/10 text-white placeholder:text-zinc-500"
                required
              />

              <input
                name="itemCount"
                type="number"
                min="1"
                defaultValue="1"
                className="w-full h-12 px-4 rounded-xl bg-[#0b0b13] border border-white/10 text-white"
                required
              />

              <input
                name="itemImage"
                placeholder="이미지 URL 선택사항 예: /items/gold-acorn.png"
                className="w-full h-12 px-4 rounded-xl bg-[#0b0b13] border border-white/10 text-white placeholder:text-zinc-500"
              />

              <button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold">
                아이템 지급하기
              </button>
            </form>
          </section>
        </div>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold mb-5">유저 목록</h2>

          <div className="grid md:grid-cols-2 gap-3">
            {users.map((user: any) => (
              <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-lg">
                      {user.id}번 / {user.nickname || "닉네임 없음"}
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">{user.email}</div>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-300 text-sm font-bold shrink-0">
                    도토리 {user.dotori || 0}개
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}