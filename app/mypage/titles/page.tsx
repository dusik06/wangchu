import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function TitlesPage() {
  const session = await getServerSession(authOptions);

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session?.user?.email]
  );

  const user = users[0];

  const [titles]: any = await db.query(
    "SELECT * FROM user_titles WHERE user_id = ? ORDER BY id DESC",
    [user.id]
  );

  return (
    <main className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">보유 칭호</h1>

      <div className="space-y-3">
        {titles.map((title: any) => (
          <div key={title.id} className="bg-zinc-900 p-4 rounded-xl">
            {title.title_name}
          </div>
        ))}
      </div>
    </main>
  );
}