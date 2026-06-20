import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";

export default async function AdminUsersPage() {
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

  const [users]: any = await db.query(`
    SELECT id, email, nickname, role, dotori, created_at, last_seen,
    CASE
      WHEN last_seen >= DATE_SUB(NOW(), INTERVAL 1 MINUTE) THEN 1
      ELSE 0
    END AS is_online
    FROM users
    ORDER BY is_online DESC, id DESC
  `);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">회원 관리</h1>

          <a href="/admin" className="bg-slate-800 px-4 py-2 rounded-lg">
            관리자 홈
          </a>
        </div>

        <div className="bg-slate-900 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">상태</th>
                <th className="p-4">닉네임</th>
                <th className="p-4">이메일</th>
                <th className="p-4">권한</th>
                <th className="p-4">도토리</th>
                <th className="p-4">가입일</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-t border-slate-800">
                  <td className="p-4">{user.id}</td>

                  <td className="p-4">
                    {user.is_online ? (
                      <span className="bg-green-600 px-3 py-1 rounded-lg">
                        접속중
                      </span>
                    ) : (
                      <span className="bg-gray-600 px-3 py-1 rounded-lg">
                        오프라인
                      </span>
                    )}
                  </td>

                  <td className="p-4 font-bold">
                    <a
                      href={`/admin/users/${user.id}`}
                      className="text-cyan-400 hover:underline"
                    >
                      {user.nickname}
                    </a>
                  </td>

                  <td className="p-4 text-gray-300">{user.email}</td>

                  <td className="p-4">
                    <span
                      className={
                        user.role === "admin"
                          ? "bg-purple-600 px-3 py-1 rounded-lg"
                          : "bg-slate-700 px-3 py-1 rounded-lg"
                      }
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="p-4">{user.dotori}개</td>

                  <td className="p-4 text-gray-400">
                    {String(user.created_at).slice(0, 10)}
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