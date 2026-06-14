import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminUserAssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [admins]: any = await db.query(
    "SELECT * FROM users WHERE email = ? AND role = 'admin' LIMIT 1",
    [session.user.email]
  );

  if (admins.length === 0) {
    return <div className="p-6 text-white">관리자만 접근 가능합니다.</div>;
  }

  const [users]: any = await db.query(
    "SELECT id, email, nickname, dotori FROM users ORDER BY id DESC"
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">유저 칭호 / 아이템 지급</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-[#151522] border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">칭호 지급</h2>

            <form action="/api/admin/user-assets/grant-title" method="POST" className="space-y-4">
              <select name="userId" className="w-full p-3 rounded bg-black/40 border border-white/10">
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.id}번 / {user.nickname || "닉네임 없음"} / {user.email}
                  </option>
                ))}
              </select>

              <input
                name="titleName"
                placeholder="칭호명 예: 관리자"
                className="w-full p-3 rounded bg-black/40 border border-white/10"
                required
              />

              <button className="w-full py-3 rounded bg-yellow-500 text-black font-bold">
                칭호 지급
              </button>
            </form>
          </section>

          <section className="bg-[#151522] border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">아이템 지급</h2>

            <form action="/api/admin/user-assets/grant-item" method="POST" className="space-y-4">
              <select name="userId" className="w-full p-3 rounded bg-black/40 border border-white/10">
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.id}번 / {user.nickname || "닉네임 없음"} / {user.email}
                  </option>
                ))}
              </select>

              <input
                name="itemName"
                placeholder="아이템명 예: 황금 도토리"
                className="w-full p-3 rounded bg-black/40 border border-white/10"
                required
              />

              <input
                name="itemCount"
                type="number"
                min="1"
                defaultValue="1"
                className="w-full p-3 rounded bg-black/40 border border-white/10"
                required
              />

              <input
                name="itemImage"
                placeholder="아이템 이미지 URL 선택사항 예: /items/gold-acorn.png"
                className="w-full p-3 rounded bg-black/40 border border-white/10"
              />

              <button className="w-full py-3 rounded bg-blue-600 font-bold">
                아이템 지급
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 bg-[#151522] border border-white/10 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">유저 목록</h2>

          <div className="space-y-2">
            {users.map((user: any) => (
              <div key={user.id} className="bg-white/5 rounded-xl p-4">
                <div className="font-bold">
                  {user.id}번 / {user.nickname || "닉네임 없음"}
                </div>
                <div className="text-zinc-400 text-sm">
                  {user.email} / 도토리 {user.dotori || 0}개
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}