import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { redirect } from "next/navigation";

export default async function NicknameLogsPage() {
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

  const [logs]: any = await db.query(`
    SELECT
      l.id,
      u.nickname AS current_nickname,
      l.old_nickname,
      l.new_nickname,
      l.changed_at
    FROM nickname_change_logs l
    INNER JOIN users u
      ON u.id = l.user_id
    ORDER BY l.id DESC
    LIMIT 100
  `);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-black">닉네임 변경 기록</h1>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-4 text-left">현재 닉네임</th>
                <th className="px-4 py-4 text-left">이전 닉네임</th>
                <th className="px-4 py-4 text-left">변경 후 닉네임</th>
                <th className="px-4 py-4 text-left">변경 시간</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log: any) => (
                <tr
                  key={log.id}
                  className="border-t border-white/10 bg-slate-900"
                >
                  <td className="px-4 py-4">{log.current_nickname}</td>
                  <td className="px-4 py-4">{log.old_nickname}</td>
                  <td className="px-4 py-4">{log.new_nickname}</td>
                  <td className="px-4 py-4">
                    {new Date(log.changed_at).toLocaleString("ko-KR")}
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