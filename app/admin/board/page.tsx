import db from "@/lib/db";
import { getServerSession } from "next-auth";
import AdminBoardActions from "./admin-board-actions";

export const dynamic = "force-dynamic";

export default async function AdminBoardPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        로그인 필요
      </main>
    );
  }

  const [users]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length || users[0].role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        관리자만 접근 가능
      </main>
    );
  }

  const [posts]: any = await db.query(
    `
    SELECT
      p.id,
      p.title,
      p.views,
      p.likes,
      p.dislikes,
      p.reports,
      p.is_blind,
      p.created_at,
      u.nickname
    FROM community_posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.id DESC
    `
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold text-pink-400">
            게시판 관리
          </h1>

          <a
            href="/admin/board/stats"
            className="bg-pink-500 px-4 py-2 rounded-lg font-bold"
          >
            통계 보기
          </a>
        </div>

        <div className="bg-slate-900 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800">
              <tr>
                <th className="p-4">번호</th>
                <th className="p-4">제목</th>
                <th className="p-4">작성자</th>
                <th className="p-4">조회</th>
                <th className="p-4">추천</th>
                <th className="p-4">신고</th>
                <th className="p-4">상태</th>
                <th className="p-4">관리</th>
              </tr>
            </thead>

            <tbody>
              {posts.map((post: any) => (
                <tr key={post.id} className="border-t border-slate-800">
                  <td className="p-4">{post.id}</td>

                  <td className="p-4">
                    <a
                      href={`/board/free/${post.id}`}
                      className="hover:text-pink-400"
                    >
                      {post.title}
                    </a>
                  </td>

                  <td className="p-4">{post.nickname}</td>
                  <td className="p-4">{post.views}</td>
                  <td className="p-4">{post.likes}</td>
                  <td className="p-4 text-red-400">{post.reports}</td>

                  <td className="p-4">
                    {post.is_blind ? (
                      <span className="text-red-400">블라인드</span>
                    ) : (
                      <span className="text-green-400">정상</span>
                    )}
                  </td>

                  <td className="p-4">
                    <AdminBoardActions
                      postId={post.id}
                      isBlind={post.is_blind}
                    />
                  </td>
                </tr>
              ))}

              {posts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    게시글이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}