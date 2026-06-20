import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const { id } = await params;

  const [adminRows]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!adminRows.length || adminRows[0].role !== "admin") {
    redirect("/");
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [id]
  );

  const user = users[0];

  if (!user) {
    redirect("/admin/users");
  }

  const [logs]: any = await db.query(
    `
    SELECT *
    FROM dotori_logs
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 100
    `,
    [id]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-yellow-300">
            {user.nickname} 도토리 내역
          </h1>

          <a href="/admin/users" className="bg-slate-800 px-4 py-2 rounded-lg">
            뒤로가기
          </a>
        </div>

        <div className="rounded-2xl bg-slate-900 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800">
              <tr>
                <th className="p-4">금액</th>
                <th className="p-4">사유</th>
                <th className="p-4">시간</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-t border-slate-800">
                  <td
                    className={`p-4 font-bold ${
                      log.amount > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {log.amount > 0 ? "+" : ""}
                    {log.amount}
                  </td>

                  <td className="p-4">{log.reason}</td>

                  <td className="p-4 text-gray-400">
                    {String(log.created_at).slice(0, 16)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}