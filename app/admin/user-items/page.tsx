import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import DeleteItemButton from "./delete-item-button";

export const dynamic = "force-dynamic";

export default async function AdminUserItemsPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    notFound();
  }

  const [admins]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    notFound();
  }

  const [items]: any = await db.query(`
    SELECT
      i.id,
      i.user_id,
      i.item_name,
      i.item_image,
      i.item_audio,
      i.overlay_text,
      i.item_count,
      i.acquired_at,
      u.nickname,
      u.email
    FROM user_inventory i
    JOIN users u ON i.user_id = u.id
    WHERE i.item_count > 0
    ORDER BY u.nickname ASC, i.id DESC
  `);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-pink-400">
              유저 보유 아이템 관리
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              유저가 보유한 아이템을 확인하고 삭제할 수 있습니다.
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"
          >
            관리자 메인
          </a>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-4">유저</th>
                <th className="p-4">아이템</th>
                <th className="p-4">이미지</th>
                <th className="p-4">오디오</th>
                <th className="p-4">수량</th>
                <th className="p-4">관리</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="p-4">
                    <p className="font-black">
                      {item.nickname || "닉네임 없음"}
                    </p>
                    <p className="text-xs text-slate-500">{item.email}</p>
                  </td>

                  <td className="p-4 font-bold">{item.item_name}</td>

                  <td className="p-4">
                    {item.item_image ? (
                      <img
                        src={item.item_image}
                        alt={item.item_name}
                        className="h-16 w-16 rounded-xl bg-black/30 object-contain"
                      />
                    ) : (
                      <span className="text-slate-500">없음</span>
                    )}
                  </td>

                  <td className="p-4">
                    {item.item_audio ? (
                      <span className="rounded-full bg-purple-500 px-3 py-1 text-xs font-black">
                        있음
                      </span>
                    ) : (
                      <span className="text-slate-500">없음</span>
                    )}
                  </td>

                  <td className="p-4 font-black text-yellow-300">
                    {Number(item.item_count).toLocaleString()}개
                  </td>

                  <td className="p-4">
                    <DeleteItemButton
                      inventoryId={item.id}
                      itemName={item.item_name}
                    />
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    보유 아이템이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}