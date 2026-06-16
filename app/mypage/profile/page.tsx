import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import db from "@/lib/db";
import Link from "next/link";
import ProfileImageForm from "./profile-image-form";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>;
  }

  const [users]: any = await db.query(
    `
    SELECT *
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [session.user.email]
  );

  const user = users[0];

  if (!user) {
    return <div className="p-6 text-white">유저 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black">프로필 사진 변경</h1>

          <Link
            href="/mypage"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
          >
            마이페이지로
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#151522] p-6">
          <ProfileImageForm
            currentImage={user.profile_image || user.image || ""}
          />
        </section>
      </div>
    </main>
  );
}