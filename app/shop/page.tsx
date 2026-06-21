import db from "@/lib/db";
import ShopBuyButton from "./ShopBuyButton";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [items]: any = await db.query(
    `
    SELECT *
    FROM shop_items
    WHERE is_active = 1
    ORDER BY price ASC, id DESC
    `
  );

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-6">상점</h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#151522] p-8 text-center text-zinc-400">
            등록된 아이템이 없습니다.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-[#151522] p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      item.item_type === "signature"
                        ? "bg-pink-500 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {item.item_type === "signature"
                      ? "시그아이템"
                      : "일반아이템"}
                  </span>

                  <span className="text-yellow-300 font-black">
                    {Number(item.price).toLocaleString()} 도토리
                  </span>
                </div>

                <div className="w-full h-40 bg-black/30 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                  {item.item_image ? (
                    <img
                      src={item.item_image}
                      alt={item.item_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-5xl">🎁</span>
                  )}
                </div>

                <h2 className="text-xl font-black">{item.item_name}</h2>

                {item.item_audio && (
                  <p className="mt-2 text-sm text-pink-300">
                    방송 알림 노래 포함
                  </p>
                )}

                <ShopBuyButton
                  itemId={item.id}
                  itemName={item.item_name}
                  price={item.price}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}