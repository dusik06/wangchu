import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";

function formatReason(reason: string | null) {
  if (!reason || reason.includes("???")) {
    return "이전 깨진 기록";
  }

  if (reason.includes("구매")) return `🛒 아이템 구매 - ${reason}`;
  if (reason.includes("출석")) return `✅ 출석 보상 - ${reason}`;
  if (reason.includes("주사위")) return `🎲 주사위 게임 - ${reason}`;
  if (reason.includes("사다리")) return `🪜 사다리 게임 - ${reason}`;
  if (reason.includes("핀볼")) return `🕹️ 핀볼 게임 - ${reason}`;
  if (reason.includes("예측")) return `📊 승패예측 - ${reason}`;
  if (reason.includes("관리자")) return `👑 관리자 지급 - ${reason}`;

  return reason;
}

function formatDate(date: any) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleString("ko-KR");
}

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
    SELECT id, amount, reason, created_at
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
                <th className="p-4">내역</th>
                <th className="p-4">시간</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-t border-slate-800">
                  <td
                    className={`p-4 font-bold ${
                      Number(log.amount) > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {Number(log.amount) > 0 ? "+" : ""}
                    {Number(log.amount).toLocaleString()}개
                  </td>

                  <td className="p-4">{formatReason(log.reason)}</td>

                  <td className="p-4 text-gray-400">
                    {formatDate(log.created_at)}
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