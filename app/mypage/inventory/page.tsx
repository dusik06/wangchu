import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  const [items]: any = await db.query(
    "SELECT * FROM user_inventory WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">내 아이템</h1>
          <Link href="/mypage" className="text-zinc-400 hover:text-white">마이페이지로</Link>
        </div>

        <section className="bg-[#151522] border border-white/10 rounded-2xl p-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.length === 0 && (
              <p className="text-zinc-400">보유한 아이템이 없습니다.</p>
            )}

            {items.map((item: any) => (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="w-full h-32 rounded-xl bg-black/30 flex items-center justify-center mb-4 overflow-hidden">
                  {item.item_image ? (
                    <img src={item.item_image} alt={item.item_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🎁</span>
                  )}
                </div>

                <h2 className="text-xl font-bold">{item.item_name}</h2>
                <p className="text-zinc-400 mt-2">수량: {item.item_count}개</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}