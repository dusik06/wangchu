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
    isAdmin = Boolean(users.length && users[0].role === "admin");
  }

  return (
    <main className="min-h-screen bg-[#0b0718] text-white">
      <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <div>
            <p className="text-xs font-bold text-purple-300">왕츄 카페</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">게시글 쓰기</h1>
          </div>
          <a href="/board/free" className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200">목록</a>
        </div>
        <PostForm isAdmin={isAdmin} />
      </div>
    </main>
  );
}
