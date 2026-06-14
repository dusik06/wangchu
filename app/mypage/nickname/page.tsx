import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function NicknamePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-xl mx-auto bg-[#151522] border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-4">닉네임 변경</h1>

        <p className="text-zinc-400 mb-4">
          닉네임은 하루 1회만 변경 가능하고, 2~8글자 / 한글·영문·숫자만 가능합니다.
        </p>

        <form action="/api/mypage/nickname" method="POST" className="space-y-4">
          <input
            name="nickname"
            defaultValue={user?.nickname || ""}
            maxLength={8}
            className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10"
            placeholder="새 닉네임"
            required
          />

          <button className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 font-bold">
            변경하기
          </button>
        </form>

        <Link href="/mypage" className="block text-center mt-4 text-zinc-400">
          마이페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}