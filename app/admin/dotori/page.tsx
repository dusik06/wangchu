import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import DotoriGiveForm from "./give-form";

export default async function AdminDotoriPage() {
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

  const [users]: any = await db.query(
    "SELECT id, nickname, email, dotori FROM users ORDER BY id DESC"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">
            도토리 지급
          </h1>

          <a href="/admin" className="bg-slate-800 px-4 py-2 rounded-lg">
            관리자 홈
          </a>
        </div>

        <div className="space-y-4">
          {users.map((user: any) => (
            <div
              key={user.id}
              className="bg-slate-900 rounded-xl p-5 flex items-center justify-between"
            >
              <div>
                <p className="font-bold">{user.nickname}</p>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <p className="text-pink-400 mt-1">
                  현재 도토리: {user.dotori}개
                </p>
              </div>

              <DotoriGiveForm userId={user.id} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}