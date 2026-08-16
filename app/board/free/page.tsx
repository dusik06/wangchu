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

function formatKstShort(date: any) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

export default async function FreeBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; page?: string; sort?: string; category?: string }>;
}) {
  const params = await searchParams;
  const keyword = params?.keyword || "";
  const currentPage = Math.max(1, Number(params?.page || "1") || 1);
  const sort = params?.sort || "latest";
  const selectedCategory = params?.category && categoryMap[params.category] ? params.category : "free";
  const boardTitle = categoryMap[selectedCategory];

  const limit = 10;
  const offset = (currentPage - 1) * limit;
  let orderBy = "p.is_notice DESC, p.id DESC";
  if (sort === "likes") orderBy = "p.is_notice DESC, p.likes DESC, p.id DESC";
  if (sort === "views") orderBy = "p.is_notice DESC, p.views DESC, p.id DESC";

  const [countRows]: any = await db.query(
    `SELECT COUNT(*) AS total FROM community_posts WHERE category = ? AND is_blind = 0 AND (title LIKE ? OR content LIKE ?)`,
    [selectedCategory, `%${keyword}%`, `%${keyword}%`]
  );

  const totalPosts = Number(countRows[0]?.total || 0);
  const totalPages = Math.ceil(totalPosts / limit);

  const [posts]: any = await db.query(
    `
    SELECT
      p.id, p.title, p.views, p.likes, p.is_notice, p.is_best, p.created_at,
      u.nickname, u.role, u.profile_image, u.image,
      t.title_name, t.title_color,
      (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM post_images pi WHERE pi.post_id = p.id) AS image_count
    FROM community_posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN user_titles t ON u.current_title_id = t.id
    WHERE p.category = ? AND p.is_blind = 0 AND (p.title LIKE ? OR p.content LIKE ?)
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
    `,
    [selectedCategory, `%${keyword}%`, `%${keyword}%`, limit, offset]
  );

  const sortHref = (value: string) =>
    `/board/free?category=${selectedCategory}&sort=${value}&keyword=${encodeURIComponent(keyword)}`;

  return (
    <main className="min-h-screen bg-[#0b0718] text-white">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-purple-300">왕츄 카페</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{boardTitle}</h1>
          </div>
          <a
            href="/board/free/write"
            className="shrink-0 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-black text-white shadow-lg transition active:scale-[.98]"
          >
            글쓰기
          </a>
        </div>

        <nav className="-mx-3 mb-4 overflow-x-auto border-y border-white/10 bg-[#151027] px-3 sm:mx-0 sm:rounded-2xl sm:border">
          <div className="flex min-w-max gap-1 py-2">
            {Object.entries(categoryMap).map(([key, label]) => (
              <a
                key={key}
                href={`/board/free?category=${key}`}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-black transition ${
                  selectedCategory === key ? "bg-purple-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex rounded-xl border border-white/10 bg-[#151027] p-1">
            {[{ key: "latest", label: "최신" }, { key: "likes", label: "추천" }, { key: "views", label: "조회" }].map((item) => (
              <a
                key={item.key}
                href={sortHref(item.key)}
                className={`rounded-lg px-3 py-2 text-xs font-black ${sort === item.key ? "bg-white/10 text-white" : "text-zinc-500"}`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <span className="text-xs font-bold text-zinc-500">총 {totalPosts}개</span>
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151027] shadow-xl sm:rounded-3xl">
          <div className="hidden grid-cols-[80px_1fr_220px_70px_70px_90px] border-b border-white/10 bg-black/15 px-4 py-3 text-xs font-black text-zinc-500 md:grid">
            <span className="text-center">번호</span>
            <span>제목</span>
            <span>작성자</span>
            <span className="text-center">조회</span>
            <span className="text-center">추천</span>
            <span className="text-center">작성일</span>
          </div>

          <div className="divide-y divide-white/[0.07]">
            {posts.map((post: any) => (
              <a
                key={post.id}
                href={`/board/free/${post.id}`}
                className="block px-4 py-4 transition hover:bg-white/[0.035] md:grid md:grid-cols-[80px_1fr_220px_70px_70px_90px] md:items-center md:py-3"
              >
                <div className="hidden text-center text-xs font-bold text-zinc-600 md:block">
                  {post.is_notice ? "공지" : post.id}
                </div>

                <div className="min-w-0 pr-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {Number(post.is_notice) === 1 ? (
                      <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-black">공지</span>
                    ) : Number(post.is_best) === 1 ? (
                      <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">BEST</span>
                    ) : null}
                    <span className="truncate text-[15px] font-bold text-zinc-100 md:text-sm">{post.title}</span>
                    {Number(post.image_count) > 0 ? <span className="shrink-0 text-xs text-purple-300">▣</span> : null}
                    {Number(post.comment_count) > 0 ? (
                      <span className="shrink-0 text-xs font-black text-purple-300">[{post.comment_count}]</span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 md:hidden">
                    <div className="min-w-0">
                      <UserNameWithTitle
                        nickname={post.nickname}
                        profileImage={post.profile_image || post.image}
                        titleName={post.title_name}
                        titleColor={post.title_color}
                        size="sm"
                      />
                    </div>
                    <div className="shrink-0 text-right text-[11px] leading-5 text-zinc-500">
                      <div>{formatKstShort(post.created_at)}</div>
                      <div>조회 {post.views} · 추천 {post.likes}</div>
                    </div>
                  </div>
                </div>

                <div className="hidden min-w-0 md:block">
                  <UserNameWithTitle
                    nickname={post.nickname}
                    profileImage={post.profile_image || post.image}
                    titleName={post.title_name}
                    titleColor={post.title_color}
                    size="sm"
                  />
                </div>
                <div className="hidden text-center text-xs text-zinc-400 md:block">{post.views}</div>
                <div className="hidden text-center text-xs text-zinc-400 md:block">{post.likes}</div>
                <div className="hidden text-center text-xs text-zinc-500 md:block">{formatKstShort(post.created_at)}</div>
              </a>
            ))}

            {posts.length === 0 ? (
              <div className="px-4 py-14 text-center text-sm text-zinc-500">게시글이 없습니다.</div>
            ) : null}
          </div>
        </section>

        {totalPages > 1 ? (
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <a
                key={page}
                href={`/board/free?page=${page}&keyword=${encodeURIComponent(keyword)}&sort=${sort}&category=${selectedCategory}`}
                className={`flex h-10 min-h-0 w-10 items-center justify-center rounded-xl text-sm font-black ${
                  currentPage === page ? "bg-purple-600 text-white" : "border border-white/10 bg-[#151027] text-zinc-400"
                }`}
              >
                {page}
              </a>
            ))}
          </div>
        ) : null}

        <form action="/board/free" method="GET" className="mt-5 flex gap-2 rounded-2xl border border-white/10 bg-[#151027] p-2 sm:mx-auto sm:max-w-xl">
          <input type="hidden" name="category" value={selectedCategory} />
          <input
            name="keyword"
            defaultValue={keyword}
            placeholder="게시글 검색"
            className="min-w-0 flex-1 rounded-xl bg-[#0b0718] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
          <button type="submit" className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-white">검색</button>
        </form>
      </div>
    </main>
  );
}
