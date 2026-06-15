import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import UserNameWithTitle from "@/components/UserNameWithTitle";

const titleColors = [
  { name: "골드", value: "#facc15" },
  { name: "핑크", value: "#fb7185" },
  { name: "보라", value: "#c084fc" },
  { name: "하늘", value: "#38bdf8" },
  { name: "민트", value: "#34d399" },
  { name: "화이트", value: "#f8fafc" },
];

export default async function TitlesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [users]: any = await db.query(
    `
    SELECT 
      u.*,
      t.title_name AS current_title_name,
      t.title_color AS current_title_color
    FROM users u
    LEFT JOIN user_titles t ON u.current_title_id = t.id
    WHERE u.email = ?
    LIMIT 1
    `,
    [session.user.email]
  );

  const user = users[0];

  const [titles]: any = await db.query(
    "SELECT * FROM user_titles WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">칭호 변경</h1>
          <Link href="/mypage" className="text-zinc-400 hover:text-white">
            마이페이지로
          </Link>
        </div>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6 mb-6">
          <p className="text-zinc-400 mb-4">현재 표시 모습</p>

          <UserNameWithTitle
            nickname={user.nickname}
            profileImage={user.profile_image || user.image}
            titleName={user.current_title_name}
            titleColor={user.current_title_color}
            size="lg"
          />
        </section>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">보유 칭호</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {titles.length === 0 && (
              <p className="text-zinc-400">보유한 칭호가 없습니다.</p>
            )}

            {titles.map((title: any) => (
              <div key={title.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-zinc-400 mb-3">미리보기</p>

                <UserNameWithTitle
                  nickname={user.nickname}
                  profileImage={user.profile_image || user.image}
                  titleName={title.title_name}
                  titleColor={title.title_color || "#facc15"}
                  size="md"
                />

                <form action="/api/mypage/title-equip" method="POST" className="mt-5">
                  <input type="hidden" name="titleId" value={title.id} />

                  <p className="text-sm text-zinc-400 mb-2">칭호 색상 선택</p>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {titleColors.map((color) => (
                      <label
                        key={color.value}
                        className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="titleColor"
                          value={color.value}
                          defaultChecked={(title.title_color || "#facc15") === color.value}
                        />
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-sm">{color.name}</span>
                      </label>
                    ))}
                  </div>

                  {user.current_title_id === title.id ? (
                    <button className="w-full py-3 rounded-xl bg-zinc-700 text-yellow-300 font-bold" disabled>
                      현재 장착중
                    </button>
                  ) : (
                    <button className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                      이 칭호로 변경
                    </button>
                  )}
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}