import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { redirect } from "next/navigation";
import LiveStatusForm from "./live-status-form";

export default async function AdminLiveStatusPage() {
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

  const [settingsRows]: any = await db.query(
    "SELECT live_status, live_force FROM site_settings LIMIT 1"
  );

  const settings = settingsRows[0] || {
    live_status: "off",
    live_force: "auto",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black">라이브 상태 관리</h1>

          <a
            href="/admin"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold hover:bg-slate-700"
          >
            관리자 홈
          </a>
        </div>

        <LiveStatusForm
          liveStatus={settings.live_status || "off"}
          liveForce={settings.live_force || "auto"}
        />
      </div>
    </main>
  );
}