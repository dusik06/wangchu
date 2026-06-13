import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import CreateCouponForm from "./create-form";

export default async function AdminCouponsPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const [adminRows]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!adminRows.length || adminRows[0].role !== "admin") {
    redirect("/");
  }

  const [coupons]: any = await db.query(
    "SELECT * FROM coupons ORDER BY id DESC"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">
            쿠폰 관리
          </h1>

          <a href="/admin" className="bg-slate-800 px-4 py-2 rounded-lg">
            관리자 홈
          </a>
        </div>

        <CreateCouponForm />

        <div className="bg-slate-900 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">쿠폰코드</th>
                <th className="p-4">보상</th>
                <th className="p-4">사용</th>
                <th className="p-4">만료일</th>
                <th className="p-4">상태</th>
              </tr>
            </thead>

            <tbody>
              {coupons.map((coupon: any) => (
                <tr key={coupon.id} className="border-t border-slate-800">
                  <td className="p-4">{coupon.id}</td>

                  <td className="p-4 font-bold text-pink-400">
                    {coupon.code}
                  </td>

                  <td className="p-4">
                    {coupon.reward} 도토리
                  </td>

                  <td className="p-4">
                    {coupon.used_count} / {coupon.max_usage}
                  </td>

                  <td className="p-4 text-gray-400">
                    {coupon.expired_at
                      ? String(coupon.expired_at).slice(0, 10)
                      : "없음"}
                  </td>

                  <td className="p-4">
                    {coupon.is_active ? (
                      <span className="bg-green-600 px-3 py-1 rounded-lg">
                        사용중
                      </span>
                    ) : (
                      <span className="bg-gray-600 px-3 py-1 rounded-lg">
                        중지
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {coupons.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-400" colSpan={6}>
                    생성된 쿠폰이 없습니다.
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