import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import UserNameWithTitle from "@/components/UserNameWithTitle";
import TitleEquipCard from "@/components/TitleEquipCard";

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
          <Link href="/mypage" className="text-zinc-400 hover:text-white cursor-pointer">
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
              <TitleEquipCard
                key={title.id}
                title={title}
                user={user}
                isEquipped={user.current_title_id === title.id}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}