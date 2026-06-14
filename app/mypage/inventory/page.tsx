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
    <main className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">내 아이템</h1>

      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className="bg-zinc-900 p-4 rounded-xl">
            {item.item_name} x {item.item_count}
          </div>
        ))}
      </div>
    </main>
  );
}