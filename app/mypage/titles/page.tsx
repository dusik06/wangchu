import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function TitlesPage() {
  const session = await getServerSession(authOptions);

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session?.user?.email]
  );

  const user = users[0];

  const [titles]: any = await db.query(
    "SELECT * FROM user_titles WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  const equipped = titles.find((t: any) => t.id === user.current_title_id);

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">칭호 변경</h1>

        <div className="bg-[#151522] rounded-2xl p-6 mb-6">
          <p className="text-zinc-400 mb-3">현재 장착중</p>

          <div className="inline-block px-5 py-3 rounded-full bg-yellow-500 text-black font-bold">
            {equipped?.title_name || "장착한 칭호 없음"}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {titles.map((title: any) => (
            <div
              key={title.id}
              className="bg-[#151522] border border-white/10 rounded-2xl p-5"
            >
              <p className="text-zinc-400 mb-3">미리보기</p>

              <div className="inline-block px-4 py-2 rounded-full bg-yellow-500 text-black font-bold mb-4">
                {title.title_name}
              </div>

              <form action="/api/mypage/title-equip" method="POST">
                <input type="hidden" name="titleId" value={title.id} />
                <button className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl">
                  이 칭호로 변경
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}