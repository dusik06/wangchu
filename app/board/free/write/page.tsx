import { getServerSession } from "next-auth";
import db from "@/lib/db";
import PostForm from "./post-form";

export const dynamic = "force-dynamic";

export default async function FreeBoardWritePage() {
  const session = await getServerSession();

  let isAdmin = false;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT role FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (users.length && users[0].role === "admin") {
      isAdmin = true;
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">
            자유게시판 글쓰기
          </h1>

          <a href="/board/free" className="bg-slate-800 px-4 py-2 rounded-lg">
            목록으로
          </a>
        </div>

        <PostForm isAdmin={isAdmin} />
      </div>
    </main>
  );
}