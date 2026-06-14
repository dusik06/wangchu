import VideoPlayer from "./video-player";
import MyDotori from "./my-dotori";
import AttendanceButton from "./attendance-button";
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
  } catch (error) {
    console.error("유튜브 정보를 불러오지 못했습니다:", error);

    return {
      isLive: false,
      title: "유튜브 영상을 불러오는 중 문제가 발생했습니다.",
      videos: [],
    };
  }
}

async function getSiteLogo() {
  try {
    const [rows]: any = await db.query(
      "SELECT site_logo FROM site_settings LIMIT 1"
    );

    return rows[0]?.site_logo || null;
  } catch {
    return null;
  }
}

async function getNoticePosts() {
  try {
    const [rows]: any = await db.query(`
      SELECT id, title
      FROM community_posts
      WHERE is_notice = 1
      AND is_blind = 0
      ORDER BY id DESC
      LIMIT 5
    `);

    return rows;
  } catch {
    return [];
  }
}

async function getRecentPosts() {
  try {
    const [rows]: any = await db.query(`
      SELECT id, title
      FROM community_posts
      WHERE is_blind = 0
      ORDER BY id DESC
      LIMIT 5
    `);

    return rows;
  } catch {
    return [];
  }
}

async function getBestPosts() {
  try {
    const [rows]: any = await db.query(`
      SELECT id, title, likes
      FROM community_posts
      WHERE is_best = 1
      AND is_blind = 0
      ORDER BY likes DESC, id DESC
      LIMIT 5
    `);

    return rows;
  } catch {
    return [];
  }
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
          <a href="/" className="flex cursor-pointer items-center gap-3">
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
            <a className="cursor-pointer hover:text-pink-400" href="/">
              홈
            </a>

            <a className="cursor-pointer hover:text-pink-400" href="#notice">
              공지사항
            </a>

            <a
              className="cursor-pointer hover:text-pink-400"
              href="/board/free"
            >
              게시판
            </a>

            <a className="cursor-pointer hover:text-pink-400" href="#">
              상점
            </a>

            <div className="group relative">
              <button className="cursor-pointer hover:text-pink-400">
                게임
              </button>

              <div className="invisible absolute left-0 top-8 z-50 w-52 rounded-2xl border border-white/10 bg-[#151027] p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <a
                  href="/game"
                  className="block cursor-pointer rounded-xl px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-pink-500 hover:text-white"
                >
                  🎲 주사위 홀짝
                </a>

                <a
                  href="/prediction"
                  className="block cursor-pointer rounded-xl px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-purple-500 hover:text-white"
                >
                  📊 승패 예측
                </a>
              </div>
            </div>

            <a className="cursor-pointer hover:text-pink-400" href="#">
              랭킹
            </a>
          </nav>

          <LoginButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-[420px_1fr_300px]">
          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-4 shadow-2xl">
            <VideoPlayer videos={video.videos} />
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-pink-400/20 bg-gradient-to-br from-[#24123d] via-[#171026] to-[#0d0a18] p-8 shadow-2xl">
            <div className="relative">
              <div
                className={`mb-5 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                  video.isLive
                    ? "bg-red-500 text-white"
                    : "bg-zinc-700 text-zinc-200"
                }`}
              >
                {video.isLive ? "🔴 라이브 ON" : "⚫ 라이브 OFF"}
              </div>

              <p className="mb-2 text-sm font-bold text-pink-300">
                박왕츄 공식 팬사이트
              </p>

              <h1 className="text-4xl font-black leading-tight">
                왕츄와 함께하는
                <br />
                노리터 💕
              </h1>

              <p className="mt-4 max-w-xl text-zinc-300">
                왕츄관련 정보, 게시판, 게임까지 한 곳에서 즐기는 왕츄 커뮤니티입니다.
              </p>

              <div className="mt-8 rounded-3xl bg-white/10 p-5">
                <h2 className="line-clamp-2 text-2xl font-black">
                  {video.title}
                </h2>

                <p className="mt-3 text-sm text-zinc-300">
                  {video.isLive
                    ? "지금 유튜브에서 방송 중입니다!"
                    : "현재 방송 종료, 최근 다시보기 영상입니다."}
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <a
                  href="/game"
                  className="cursor-pointer rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 p-5 text-center font-black shadow-lg transition hover:scale-[1.02]"
                >
                  🎲 게임 하러가기
                </a>

                <a
                  href="/prediction"
                  className="cursor-pointer rounded-2xl bg-white/10 p-5 text-center font-black transition hover:scale-[1.02] hover:bg-white/15"
                >
                  📊 승패 예측
                </a>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-[#151027] p-5 shadow-xl">
              <p className="mb-3 text-sm font-bold text-zinc-400">내 정보</p>
              <MyDotori />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#151027] p-5 shadow-xl">
              <AttendanceButton />
            </div>

            <a
              href="/coupon"
              className="block cursor-pointer rounded-[24px] border border-white/10 bg-[#151027] p-5 shadow-xl transition hover:scale-[1.02]"
            >
              <p className="font-black">🎫 쿠폰 입력</p>
              <p className="mt-2 text-sm text-zinc-400">
                이벤트 코드를 입력하세요.
              </p>
            </a>

            <a
              href="/game"
              className="block cursor-pointer rounded-[24px] border border-pink-400/30 bg-gradient-to-br from-pink-500/20 to-purple-500/20 p-5 shadow-xl transition hover:scale-[1.02]"
            >
              <p className="font-black">🎲 주사위 게임</p>
              <p className="mt-2 text-sm text-zinc-300">
                홀짝 맞히고 도토리 획득!
              </p>
            </a>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-[#151027] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">🔥 게임 현황</h2>

                <a
                  href="/game"
                  className="cursor-pointer rounded-full bg-pink-500 px-4 py-2 text-sm font-black transition hover:bg-pink-400"
                >
                  게임하기
                </a>
              </div>

              <GameHighlights />
            </div>

            <HomePredictionBox />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-5 shadow-xl">
            <GameRanking />
          </div>
        </section>

        <section id="notice" className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-black">📢 공지사항</h2>

            <div className="space-y-2">
              {noticePosts.length > 0 ? (
                noticePosts.map((post: any) => (
                  <a
                    key={post.id}
                    href={`/board/free/${post.id}`}
                    className="block truncate text-sm text-zinc-300 hover:text-pink-400"
                  >
                    {post.title}
                  </a>
                ))
              ) : (
                <p className="text-zinc-400">아직 공지가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-black">🔥 인기글</h2>

            <div className="space-y-2">
              {bestPosts.length > 0 ? (
                bestPosts.map((post: any) => (
                  <a
                    key={post.id}
                    href={`/board/free/${post.id}`}
                    className="block truncate text-sm text-zinc-300 hover:text-pink-400"
                  >
                    [{post.likes}] {post.title}
                  </a>
                ))
              ) : (
                <p className="text-zinc-400">인기글이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151027] p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-black">💬 최근 게시글</h2>

            <div className="space-y-2">
              {recentPosts.length > 0 ? (
                recentPosts.map((post: any) => (
                  <a
                    key={post.id}
                    href={`/board/free/${post.id}`}
                    className="block truncate text-sm text-zinc-300 hover:text-pink-400"
                  >
                    {post.title}
                  </a>
                ))
              ) : (
                <p className="text-zinc-400">게시글이 없습니다.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}