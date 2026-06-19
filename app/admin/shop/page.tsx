import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { redirect } from "next/navigation";
import ShopItemCreateForm from "./shop-item-create-form";
import DeleteButton from "./delete-button";
import ShopItemEditForm from "./shop-item-edit-form";

export default async function AdminShopPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length || users[0].role !== "admin") {
    redirect("/");
  }

  const [items]: any = await db.query(
    "SELECT * FROM shop_items ORDER BY id DESC"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black">아이템 생성</h1>

          <a
            href="/admin"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-700"
          >
            관리자 홈
          </a>
        </div>

        <ShopItemCreateForm />

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-bold">등록된 아이템</h2>

          {items.length === 0 ? (
            <p className="text-slate-400">등록된 아이템이 없습니다.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-800 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.item_type === "signature"
                          ? "bg-pink-500 text-white"
                          : "bg-slate-600 text-white"
                      }`}
                    >
                      {item.item_type === "signature"
                        ? "시그아이템"
                        : "일반아이템"}
                    </span>

                    <span className="text-sm font-bold text-yellow-300">
                      {Number(item.price).toLocaleString()} 도토리
                    </span>
                  </div>

                  {item.item_image ? (
                    <img
                      src={item.item_image}
                      alt={item.item_name}
                      className="mb-3 h-32 w-full rounded-xl object-contain bg-black/30"
                    />
                  ) : (
                    <div className="mb-3 flex h-32 w-full items-center justify-center rounded-xl bg-black/30 text-4xl">
                      🎁
                    </div>
                  )}

                  <h3 className="text-lg font-black">{item.item_name}</h3>

                  {item.item_audio ? (
                    <p className="mt-2 text-xs text-emerald-300">노래 등록됨</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">노래 없음</p>
                  )}

                  <ShopItemEditForm item={item} />

                  <DeleteButton
                    itemId={item.id}
                    itemName={item.item_name}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}