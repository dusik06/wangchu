import db from "@/lib/db";
import UserNameWithTitle from "@/components/UserNameWithTitle";

export const dynamic = "force-dynamic";

const categoryMap: Record<string, string> = {
  free: "자유게시판",
  notice: "공지사항",
  suggestion: "건의사항",
  from_wangchu: "왕츄가 팬한테",
  to_wangchu: "팬이 왕츄한테",
};

function formatMonthDay(date: any) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${month}/${day}`;
}

export default async function FreeBoardPage({
  searchParams,
}: {
  searchParams?: {
    keyword?: string;
    page?: string;
    sort?: string;
    category?: string;
  };
}) {
  const keyword = searchParams?.keyword || "";
  const currentPage = Number(searchParams?.page || "1");
  const sort = searchParams?.sort || "latest";

  const selectedCategory =
    searchParams?.category && categoryMap[searchParams.category]
      ? searchParams.category
      : "free";

  const boardTitle = categoryMap[selectedCategory];

  const limit = 10;
  const offset = (currentPage - 1) * limit;

  let orderBy = "p.is_notice DESC, p.id DESC";

  if (sort === "likes") {
    orderBy = "p.is_notice DESC, p.likes DESC, p.id DESC";
  }

  if (sort === "views") {
    orderBy = "p.is_notice DESC, p.views DESC, p.id DESC";
  }

  const [countRows]: any = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM community_posts
    WHERE category = ?
    AND is_blind = 0
    AND (title LIKE ? OR content LIKE ?)
    `,
    [selectedCategory, `%${keyword}%`, `%${keyword}%`]
  );

  const totalPosts = countRows[0].total;
  const totalPages = Math.ceil(totalPosts / limit);

  const [posts]: any = await db.query(
    `
    SELECT 
      p.id,
      p.title,
      p.views,
      p.likes,
      p.is_notice,
      p.is_best,
      p.created_at,
      u.nickname,
      u.role,
      u.profile_image,
      u.image,
      t.title_name,
      t.title_color,
      COUNT(c.id) AS comment_count
    FROM community_posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN user_titles t ON u.current_title_id = t.id
    LEFT JOIN community_comments c ON p.id = c.post_id
    WHERE p.category = ?
    AND p.is_blind = 0
    AND (p.title LIKE ? OR p.content LIKE ?)
    GROUP BY 
      p.id,
      p.title,
      p.views,
      p.likes,
      p.is_notice,
      p.is_best,
      p.created_at,
      u.nickname,
      u.role,
      u.profile_image,
      u.image,
      t.title_name,
      t.title_color
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
    `,
    [selectedCategory, `%${keyword}%`, `%${keyword}%`, limit, offset]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* 카테고리 탭 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.entries(categoryMap).map(([key, label]) => (
            <a
              key={key}
              href={`/board/free?category=${key}`}
              className={`px-4 py-2 rounded-lg font-bold cursor-pointer ${
                selectedCategory === key ? "bg-pink-500" : "bg-slate-800"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">{boardTitle}</h1>

          <div className="flex gap-2">
            <a
              href="/"
              className="bg-slate-800 px-4 py-2 rounded-lg cursor-pointer"
            >
              메인
            </a>

            <a
              href="/board/free/write"
              className="bg-pink-500 px-4 py-2 rounded-lg font-bold cursor-pointer"
            >
              글쓰기
            </a>
          </div>
        </div>

        <form action="/board/free" method="GET" className="flex gap-2 mb-4">
          <input type="hidden" name="category" value={selectedCategory} />

          <input
            name="keyword"
            defaultValue={keyword}
            placeholder="제목 또는 내용 검색"
            className="flex-1 bg-slate-800 rounded-xl px-4 py-3 outline-none"
          />

          <button
            type="submit"
            className="bg-pink-500 px-5 rounded-xl font-bold cursor-pointer"
          >
            검색
          </button>
        </form>

        <div className="flex gap-2 mb-4">
          <a
            href={`/board/free?category=${selectedCategory}&sort=latest&keyword=${keyword}`}
            className="bg-slate-800 px-4 py-2 rounded-lg cursor-pointer"
          >
            최신순
          </a>

          <a
            href={`/board/free?category=${selectedCategory}&sort=likes&keyword=${keyword}`}
            className="bg-slate-800 px-4 py-2 rounded-lg cursor-pointer"
          >
            추천순
          </a>

          <a
            href={`/board/free?category=${selectedCategory}&sort=views&keyword=${keyword}`}
            className="bg-slate-800 px-4 py-2 rounded-lg cursor-pointer"
          >
            조회순
          </a>
        </div>

        <div className="bg-slate-900 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800">
              <tr>
                <th className="p-4 w-20">번호</th>
                <th className="p-4">제목</th>
                <th className="p-4 w-56">작성자</th>
                <th className="p-4 w-24">조회</th>
                <th className="p-4 w-24">추천</th>
                <th className="p-4 w-32">작성일</th>
              </tr>
            </thead>

            <tbody>
              {posts.map((post: any) => (
                <tr key={post.id} className="border-t border-slate-800">
                  <td className="p-4 text-gray-400">
                    {post.is_notice ? "공지" : post.id}
                  </td>

                  <td className="p-4">
                    <a
                      href={`/board/free/${post.id}`}
                      className="hover:text-pink-400 cursor-pointer"
                    >
                      {post.is_best && (
                        <span className="text-green-400 mr-2 font-bold">
                          BEST
                        </span>
                      )}

                      {post.title}

                      {post.comment_count > 0 && (
                        <span className="text-pink-400 ml-2">
                          [{post.comment_count}]
                        </span>
                      )}
                    </a>
                  </td>

                  <td className="p-4">
                    <UserNameWithTitle
                      nickname={post.nickname}
                      profileImage={post.profile_image || post.image}
                      titleName={post.title_name}
                      titleColor={post.title_color}
                      size="sm"
                    />
                  </td>

                  <td className="p-4">{post.views}</td>
                  <td className="p-4">{post.likes}</td>
                  <td className="p-4">{formatMonthDay(post.created_at)}</td>
                </tr>
              ))}

              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    게시글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <a
              key={page}
              href={`/board/free?page=${page}&keyword=${keyword}&sort=${sort}&category=${selectedCategory}`}
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                currentPage === page ? "bg-pink-500" : "bg-slate-800"
              }`}
            >
              {page}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}