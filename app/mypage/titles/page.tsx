import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function TitlesPage() {
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
    "SELECT * FROM user_titles WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  const equippedTitle = titles.find((title: any) => title.id === user.current_title_id);

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">칭호 변경</h1>
          <Link href="/mypage" className="text-zinc-400 hover:text-white">마이페이지로</Link>
        </div>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6 mb-6">
          <p className="text-zinc-400 mb-3">현재 장착중</p>
          <div className="inline-flex px-5 py-3 rounded-xl bg-yellow-500 text-black font-bold text-lg">
            {equippedTitle ? equippedTitle.title_name : "장착한 칭호 없음"}
          </div>
        </section>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">보유 칭호</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {titles.length === 0 && (
              <p className="text-zinc-400">보유한 칭호가 없습니다.</p>
            )}

            {titles.map((title: any) => (
              <div key={title.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="mb-3 text-sm text-zinc-400">미리보기</div>

                <div className="mb-4">
                  <span className="inline-flex px-4 py-2 rounded-full bg-yellow-500 text-black font-bold">
                    {title.title_name}
                  </span>
                </div>

                {user.current_title_id === title.id ? (
                  <div className="w-full text-center py-2 rounded-lg bg-zinc-700 text-yellow-300 font-bold">
                    장착중
                  </div>
                ) : (
                  <form action="/api/mypage/title-equip" method="POST">
                    <input type="hidden" name="titleId" value={title.id} />
                    <button className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                      이 칭호로 변경
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}