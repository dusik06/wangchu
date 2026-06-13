import db from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FreeBoardPage() {
  const [posts]: any = await db.query(`
    SELECT 
      p.id,
      p.title,
      p.views,
      p.created_at,
      u.nickname,
      u.role,
      COUNT(c.id) AS comment_count
    FROM community_posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN community_comments c ON p.id = c.post_id
    GROUP BY p.id
    ORDER BY p.id DESC
  `);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">
            자유게시판
          </h1>

          <div className="flex gap-2">
            <a href="/" className="bg-slate-800 px-4 py-2 rounded-lg">
              메인
            </a>

            <a href="/board/free/write" className="bg-pink-500 px-4 py-2 rounded-lg font-bold">
              글쓰기
            </a>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800">
              <tr>
                <th className="p-4 w-20">번호</th>
                <th className="p-4">제목</th>
                <th className="p-4 w-40">작성자</th>
                <th className="p-4 w-24">조회</th>
                <th className="p-4 w-32">작성일</th>
              </tr>
            </thead>

            <tbody>
              {posts.map((post: any) => (
                <tr key={post.id} className="border-t border-slate-800">
                  <td className="p-4 text-gray-400">{post.id}</td>

                  <td className="p-4">
                    <a href={`/board/free/${post.id}`} className="hover:text-pink-400">
                      {post.title}
                      {post.comment_count > 0 && (
                        <span className="text-pink-400 ml-2">
                          [{post.comment_count}]
                        </span>
                      )}
                    </a>
                  </td>

                  <td className="p-4">
                    {post.role === "admin" && (
                      <span className="bg-purple-600 px-2 py-1 rounded-md text-xs mr-2">
                        관리자
                      </span>
                    )}
                    {post.nickname}
                  </td>

                  <td className="p-4 text-gray-400">{post.views}</td>

                  <td className="p-4 text-gray-400">
                    {String(post.created_at).slice(0, 10)}
                  </td>
                </tr>
              ))}

              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    아직 게시글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}