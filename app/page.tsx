import VideoPlayer from "./video-player";
import MyDotori from "./my-dotori";
import AttendanceButton from "./attendance-button";
import OnlineUsers from "./online-users";
import LoginButton from "./login-button";
import GameHighlights from "@/components/game/GameHighlights";
import GameRanking from "@/components/game/GameRanking";
import HomePredictionBox from "@/components/prediction/HomePredictionBox";
import db from "@/lib/db";

async function getYoutubeVideo() {
  try {
    const baseUrl =
      process.env.NEXTAUTH_URL || "https://www.xn--9l5bo4l.com";

    const res = await fetch(`${baseUrl}/api/youtube`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("youtube api failed");
    }

    return res.json();
  } catch {
    return {
      isLive: false,
      title: "유튜브 영상을 불러오는 중 문제가 발생했습니다.",
      videos: [],
    };
  }
}

async function getSiteLogo() {
  const [rows]: any = await db.query(
    "SELECT site_logo FROM site_settings LIMIT 1"
  );

  return rows[0]?.site_logo || null;
}

async function getNoticePosts() {
  const [rows]: any = await db.query(
    `
    SELECT id, title
    FROM community_posts
    WHERE is_notice = 1
    ORDER BY id DESC
    LIMIT 5
    `
  );

  return rows;
}

async function getRecentPosts() {
  const [rows]: any = await db.query(
    `
    SELECT id, title
    FROM community_posts
    WHERE is_blind = 0
    ORDER BY id DESC
    LIMIT 5
    `
  );

  return rows;
}

async function getBestPosts() {
  const [rows]: any = await db.query(
    `
    SELECT id, title, likes
    FROM community_posts
    WHERE is_best = 1
    AND is_blind = 0
    ORDER BY likes DESC
    LIMIT 5
    `
  );

  return rows;
}

export default async function Home() {
  const video = await getYoutubeVideo();
  const siteLogo = await getSiteLogo();
  const noticePosts = await getNoticePosts();
  const recentPosts = await getRecentPosts();
  const bestPosts = await getBestPosts();

  return (
    <main className="min-h-screen bg-[#0b0718] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0718]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            {siteLogo ? (
              <img
                src={siteLogo}
                alt="왕츄 로고"
                className="h-10 max-w-[160px] object-contain"
              />
            ) : (
              <span className="text-2xl font-black text-pink-400">왕츄</span>
            )}
          </a>

          <nav className="hidden gap-6 text-sm font-bold text-zinc-300 md:flex">
            <a href="/">홈</a>
            <a href="/board/free">게시판</a>
            <a href="/board/my">내 활동</a>
          </nav>

          <LoginButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-[420px_1fr_300px]">
          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-4 shadow-2xl">
            <VideoPlayer videos={video.videos} />
          </div>

          <div className="rounded-[28px] border border-pink-400/20 bg-gradient-to-br from-[#24123d] via-[#171026] to-[#0d0a18] p-8 shadow-2xl">
            <h1 className="text-4xl font-black leading-tight">
              왕츄와 함께하는
              <br />
              노리터 💕
            </h1>

            <div className="mt-8 rounded-3xl bg-white/10 p-5">
              <h2 className="line-clamp-2 text-2xl font-black">
                {video.title}
              </h2>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-[#151027] p-5">
              <MyDotori />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#151027] p-5">
              <AttendanceButton />
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-[#151027] p-5">
              <GameHighlights />
            </div>

            <HomePredictionBox />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-5">
            <GameRanking />
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-4">
          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-6">
            <h2 className="mb-4 text-xl font-black">📢 공지사항</h2>
            <div className="space-y-2">
              {noticePosts.map((post: any) => (
                <a key={post.id} href={`/board/free/${post.id}`} className="block text-sm hover:text-pink-400">
                  {post.title}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-6">
            <h2 className="mb-4 text-xl font-black">🔥 인기글</h2>
            <div className="space-y-2">
              {bestPosts.map((post: any) => (
                <a key={post.id} href={`/board/free/${post.id}`} className="block text-sm hover:text-pink-400">
                  [{post.likes}] {post.title}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-6">
            <h2 className="mb-4 text-xl font-black">💬 최근 게시글</h2>
            <div className="space-y-2">
              {recentPosts.map((post: any) => (
                <a key={post.id} href={`/board/free/${post.id}`} className="block text-sm hover:text-pink-400">
                  {post.title}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-6">
            <h2 className="mb-4 text-xl font-black">👀 실시간 접속자</h2>
            <OnlineUsers />
          </div>
        </section>
      </div>
    </main>
  );
}