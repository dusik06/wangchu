import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session?.user?.email]
  );

  const user = users[0];

  const [items]: any = await db.query(
    "SELECT * FROM user_inventory WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">내 아이템</h1>

        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="bg-[#151522] border border-white/10 rounded-2xl p-5"
            >
              <div className="w-full h-36 bg-black/30 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                {item.item_image ? (
                  <img
                    src={item.item_image}
                    alt={item.item_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🎁</span>
                )}
              </div>

              <h2 className="text-xl font-bold">{item.item_name}</h2>
              <p className="text-zinc-400 mt-2">수량 {item.item_count}개</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}