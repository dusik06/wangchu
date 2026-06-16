import VideoPlayer from "./video-player";
import MyDotori from "./my-dotori";
import AttendanceButton from "./attendance-button";
import LoginButton from "./login-button";
import GameHighlights from "@/components/game/GameHighlights";
import GameRanking from "@/components/game/GameRanking";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function getYoutubeVideo() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.xn--9l5bo4l.com";

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
      liveStatus: "off",
      liveForce: "auto",
    };
  }
}

async function getCurrentUser(email?: string | null) {
  if (!email) return null;

  try {
    const [rows]: any = await db.query(
      "SELECT id, email, nickname, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    return rows[0] || null;
  } catch {
    return null;
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

async function getLiveSettings() {
  try {
    const [rows]: any = await db.query(
      "SELECT live_status, live_force FROM site_settings LIMIT 1"
    );

    return {
      liveStatus: rows[0]?.live_status || "off",
      liveForce: rows[0]?.live_force || "auto",
    };
  } catch {
    return {
      liveStatus: "off",
      liveForce: "auto",
    };
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

async function getRecentComments() {
  try {
    const [rows]: any = await db.query(`
      SELECT c.id, c.content, c.post_id, u.nickname
      FROM community_comments c
      LEFT JOIN users u ON c.user_email = u.email
      ORDER BY c.id DESC
      LIMIT 5
    `);

    return rows;
  } catch {
    return [];
  }
}

function getVideoTitle(video: any) {
  return video?.title || video?.snippet?.title || "왕츄 쇼츠";
}

function getVideoThumbnail(video: any) {
  return (
    video?.thumbnail ||
    video?.thumbnailUrl ||
    video?.snippet?.thumbnails?.medium?.url ||
    video?.snippet?.thumbnails?.high?.url ||
    ""
  );
}

function getVideoId(video: any) {
  return video?.videoId || video?.id?.videoId || video?.id || "";
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  const [
    currentUser,
    video,
    liveSettings,
    siteLogo,
    noticePosts,
    recentPosts,
    bestPosts,
    recentComments,
  ] = await Promise.all([
    getCurrentUser(session?.user?.email),
    getYoutubeVideo(),
    getLiveSettings(),
    getSiteLogo(),
    getNoticePosts(),
    getRecentPosts(),
    getBestPosts(),
    getRecentComments(),
  ]);

  const isAdmin = currentUser?.role === "admin";
  const isLiveOn = liveSettings.liveStatus === "on";
  const shorts = Array.isArray(video?.videos) ? video.videos.slice(1, 6) : [];

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.2),transparent_30%),linear-gradient(180deg,#07071a,#02040d)]" />

      <header className="sticky top-0 z-50 border-b border-pink-400/20 bg-[#050816]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            {siteLogo ? (
              <img
                src={siteLogo}
                alt="왕츄 로고"
                className="h-12 max-w-[170px] object-contain"
              />
            ) : (
              <div>
                <div className="text-4xl font-black text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.85)]">
                  왕츄
                </div>
                <div className="text-xs font-bold text-pink-200">
                  팬사이트 v1.0
                </div>
              </div>
            )}
          </a>

          <nav className="hidden items-center gap-7 text-sm font-bold text-zinc-300 lg:flex">
            <a href="/" className="hover:text-pink-400">
              🏠 홈
            </a>

            <div className="group relative">
              <button className="hover:text-pink-400">📋 게시판 ▾</button>
              <div className="invisible absolute left-0 top-8 w-52 rounded-2xl border border-white/10 bg-[#11172c] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/board/free" className="block rounded-xl px-4 py-3 hover:bg-pink-500">
                  자유게시판
                </a>
                {currentUser && (
                  <a href="/board/my" className="block rounded-xl px-4 py-3 hover:bg-purple-500">
                    내 활동
                  </a>
                )}
              </div>
            </div>

            <div className="group relative">
              <button className="hover:text-pink-400">🛒 상점 ▾</button>
              <div className="invisible absolute left-0 top-8 w-56 rounded-2xl border border-white/10 bg-[#11172c] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/shop" className="block rounded-xl px-4 py-3 hover:bg-yellow-500 hover:text-black">
                  전체 상점
                </a>
                {currentUser && (
                  <a href="/mypage/inventory" className="block rounded-xl px-4 py-3 hover:bg-blue-500">
                    내 아이템
                  </a>
                )}
                {isAdmin && (
                  <a href="/admin/shop" className="block rounded-xl px-4 py-3 text-yellow-300 hover:bg-yellow-500 hover:text-black">
                    아이템 생성
                  </a>
                )}
              </div>
            </div>

            <div className="group relative">
              <button className="hover:text-pink-400">🎮 게임 ▾</button>
              <div className="invisible absolute left-0 top-8 w-56 rounded-2xl border border-white/10 bg-[#11172c] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/game" className="block rounded-xl px-4 py-3 hover:bg-pink-500">
                  주사위 홀짝
                </a>
                <a href="/prediction" className="block rounded-xl px-4 py-3 hover:bg-purple-500">
                  승패 예측
                </a>
                <span className="block rounded-xl px-4 py-3 text-zinc-500">
                  사다리게임 준비중
                </span>
                <span className="block rounded-xl px-4 py-3 text-zinc-500">
                  뽑기 준비중
                </span>
                <span className="block rounded-xl px-4 py-3 text-zinc-500">
                  핀볼 준비중
                </span>
              </div>
            </div>

            <div className="group relative">
              <button className="hover:text-pink-400">🏆 랭킹 ▾</button>
              <div className="invisible absolute left-0 top-8 w-52 rounded-2xl border border-white/10 bg-[#11172c] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/ranking/dotori" className="block rounded-xl px-4 py-3 hover:bg-yellow-500 hover:text-black">
                  🌰 도토리랭킹
                </a>
                <a href="#ranking" className="block rounded-xl px-4 py-3 hover:bg-indigo-500">
                  🏆 배팅랭킹
                </a>
              </div>
            </div>

            {currentUser && (
              <div className="group relative">
                <button className="hover:text-pink-400">👤 마이페이지 ▾</button>
                <div className="invisible absolute left-0 top-8 w-56 rounded-2xl border border-white/10 bg-[#11172c] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                  <a href="/mypage" className="block rounded-xl px-4 py-3 hover:bg-pink-500">
                    마이페이지
                  </a>
                  <a href="/mypage/inventory" className="block rounded-xl px-4 py-3 hover:bg-blue-500">
                    내 아이템
                  </a>
                  <a href="/mypage/titles" className="block rounded-xl px-4 py-3 hover:bg-yellow-500 hover:text-black">
                    칭호 변경
                  </a>
                  <a href="/mypage/posts" className="block rounded-xl px-4 py-3 hover:bg-purple-500">
                    내가 쓴 글
                  </a>
                  <a href="/mypage/comments" className="block rounded-xl px-4 py-3 hover:bg-purple-500">
                    내가 쓴 댓글
                  </a>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="group relative">
                <button className="text-yellow-300 hover:text-yellow-200">
                  ⚙ 관리자 ▾
                </button>
                <div className="invisible absolute right-0 top-8 w-60 rounded-2xl border border-yellow-300/20 bg-[#11172c] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                  <a href="/admin" className="block rounded-xl px-4 py-3 hover:bg-yellow-500 hover:text-black">
                    관리자 대시보드
                  </a>
                  <a href="/admin/live-status" className="block rounded-xl px-4 py-3 hover:bg-red-500">
                    라이브 상태 관리
                  </a>
                  <a href="/admin/shop" className="block rounded-xl px-4 py-3 hover:bg-cyan-500 hover:text-black">
                    아이템 생성
                  </a>
                  <a href="/admin/dotori" className="block rounded-xl px-4 py-3 hover:bg-pink-500">
                    도토리 지급
                  </a>
                  <a href="/admin/board" className="block rounded-xl px-4 py-3 hover:bg-purple-500">
                    게시판 관리
                  </a>
                </div>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 lg:block">
                <p className="text-xs font-bold text-zinc-400">보유 도토리</p>
                <MyDotori />
              </div>
            )}

            {currentUser && (
              <a
                href="/mypage"
                className="hidden items-center gap-3 rounded-2xl border border-pink-400/20 bg-white/5 px-3 py-2 lg:flex"
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="프로필"
                    className="h-10 w-10 rounded-full border border-pink-400/50 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 font-black">
                    왕
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-pink-300">
                    {currentUser.nickname || "왕츄팬"}
                  </p>
                  <p className="text-xs text-zinc-400">왕츄 사랑해❤</p>
                </div>
              </a>
            )}

            <LoginButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-5">
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr_360px]">
          <div className="rounded-[22px] border border-pink-400/20 bg-[#0b1022]/80 p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-black text-pink-200">왕츄 LIVE</h2>
              <span className={`rounded-md px-2 py-1 text-xs font-black ${isLiveOn ? "bg-red-500" : "bg-zinc-700"}`}>
                {isLiveOn ? "LIVE" : "OFF"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-[250px_1fr]">
              <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div className="aspect-[9/16]">
                  <VideoPlayer videos={video.videos} />
                </div>
              </div>

              <div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/20 to-purple-500/10 p-5">
                  <p className="text-sm font-bold text-pink-300">
                    박왕츄 공식 방송
                  </p>
                  <h1 className="mt-2 line-clamp-3 text-3xl font-black">
                    {video.title}
                  </h1>
                  <p className="mt-3 text-sm text-zinc-300">
                    {isLiveOn
                      ? "지금 유튜브에서 방송 중입니다!"
                      : "현재 라이브는 OFF 상태입니다."}
                  </p>
                  <a
                    href="https://www.youtube.com/"
                    target="_blank"
                    className="mt-5 inline-flex rounded-xl bg-pink-500 px-5 py-3 text-sm font-black hover:bg-pink-400"
                  >
                    ▶ 방송 보러가기
                  </a>
                </div>

                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black">최근 쇼츠</h3>
                    <a href="https://www.youtube.com/" className="text-xs text-zinc-400 hover:text-pink-300">
                      전체 보기 〉
                    </a>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {shorts.length > 0 ? (
                      shorts.map((item: any, index: number) => {
                        const thumbnail = getVideoThumbnail(item);
                        const videoId = getVideoId(item);

                        return (
                          <a
                            key={`${videoId}-${index}`}
                            href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : "#"}
                            target="_blank"
                            className="group overflow-hidden rounded-xl border border-white/10 bg-white/5"
                          >
                            <div className="aspect-[9/16] bg-[#11172c]">
                              {thumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={getVideoTitle(item)}
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-2xl">
                                  💕
                                </div>
                              )}
                            </div>
                            <p className="line-clamp-2 px-2 py-2 text-xs text-zinc-300">
                              {getVideoTitle(item)}
                            </p>
                          </a>
                        );
                      })
                    ) : (
                      <div className="col-span-5 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
                        최근 쇼츠를 불러오는 중입니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-4">
              <h2 className="mb-4 text-lg font-black text-pink-200">바로가기</h2>
              <div className="grid grid-cols-5 gap-3">
                <div className="rounded-2xl border border-pink-400/20 bg-white/5 p-3 text-center">
                  <div className="text-3xl">🗓️</div>
                  <div className="mt-2 text-xs font-black">출석체크</div>
                </div>
                <a href="/coupon" className="rounded-2xl border border-pink-400/20 bg-white/5 p-3 text-center hover:bg-pink-500/20">
                  <div className="text-3xl">🎫</div>
                  <div className="mt-2 text-xs font-black">쿠폰입력</div>
                </a>
                <a href="/shop" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center hover:bg-yellow-500/20">
                  <div className="text-3xl">🛒</div>
                  <div className="mt-2 text-xs font-black">상점</div>
                </a>
                <a href="/board/free" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center hover:bg-purple-500/20">
                  <div className="text-3xl">💬</div>
                  <div className="mt-2 text-xs font-black">게시판</div>
                </a>
                <a href="/prediction" className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center hover:bg-indigo-500/20">
                  <div className="text-3xl">📊</div>
                  <div className="mt-2 text-xs font-black">승패예측</div>
                </a>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black text-pink-200">출석 현황</h2>
                <span className="text-sm font-black text-emerald-300">
                  연속 출석
                </span>
              </div>
              <AttendanceButton />
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-pink-200">게임 현황</h2>
                <a href="/game" className="text-xs text-zinc-400 hover:text-pink-300">
                  전체 게임 바로가기 〉
                </a>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <a href="/game" className="rounded-2xl border border-pink-400/20 bg-white/5 p-4 hover:bg-pink-500/20">
                  <div className="text-4xl">🎲</div>
                  <p className="mt-3 font-black">주사위 홀짝</p>
                  <p className="text-xs text-zinc-400">게임하기</p>
                </a>
                <a href="/prediction" className="rounded-2xl border border-purple-400/20 bg-white/5 p-4 hover:bg-purple-500/20">
                  <div className="text-4xl">📊</div>
                  <p className="mt-3 font-black">승패 예측</p>
                  <p className="text-xs text-zinc-400">예측하기</p>
                </a>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-80">
                  <div className="text-4xl">🪜</div>
                  <p className="mt-3 font-black">사다리게임</p>
                  <p className="text-xs text-zinc-500">COMING SOON</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-80">
                  <div className="text-4xl">🎁</div>
                  <p className="mt-3 font-black">제비뽑기</p>
                  <p className="text-xs text-zinc-500">COMING SOON</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-80">
                  <div className="text-4xl">🕹️</div>
                  <p className="mt-3 font-black">핀볼</p>
                  <p className="text-xs text-zinc-500">COMING SOON</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 opacity-60">
                  <div className="text-4xl">?</div>
                  <p className="mt-3 font-black">준비중</p>
                  <p className="text-xs text-zinc-500">COMING SOON</p>
                </div>
              </div>
            </div>
          </div>

          <aside id="ranking" className="space-y-5">
            <div className="rounded-[22px] border border-pink-400/20 bg-[#0b1022]/80 p-4">
              <h2 className="mb-4 text-lg font-black text-pink-200">랭킹</h2>
              <GameRanking />
            </div>

            <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-pink-500/20 to-purple-500/20 p-5">
              <p className="text-lg font-black">🎲 주사위 게임</p>
              <p className="mt-2 text-sm text-zinc-300">
                출첵 말고 도토리 GET!
              </p>
              <a
                href="/game"
                className="mt-4 inline-flex rounded-xl bg-pink-500 px-5 py-3 text-sm font-black hover:bg-pink-400"
              >
                게임 바로가기
              </a>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-4">
              <h2 className="mb-3 text-lg font-black text-pink-200">내 정보</h2>
              <MyDotori />
              <div className="mt-4 grid gap-2">
                <a href="/mypage" className="rounded-xl bg-pink-500 px-4 py-3 text-center text-sm font-black hover:bg-pink-400">
                  마이페이지
                </a>
                <a href="/mypage/inventory" className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-black hover:bg-white/15">
                  아이템 보기
                </a>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.6fr]">
          <div className="rounded-[22px] border border-pink-400/20 bg-[#0b1022]/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-pink-200">게임 하이라이트</h2>
              <a href="/game" className="text-xs text-zinc-400 hover:text-pink-300">
                전체 보기 〉
              </a>
            </div>
            <GameHighlights />
          </div>

          <div className="rounded-[22px] border border-pink-400/20 bg-[#0b1022]/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-pink-200">상점 추천 아이템</h2>
              <a href="/shop" className="text-xs text-zinc-400 hover:text-pink-300">
                전체 보기 〉
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {[
                ["왕츄 후드티", "3,000", "🧥"],
                ["왕츄 키링", "800", "🔑"],
                ["왕츄 포토카드", "1,500", "🃏"],
                ["왕츄 마우스패드", "1,200", "🖱️"],
                ["왕츄 응원봉", "2,000", "💖"],
                ["왕츄 스티커", "500", "🎀"],
              ].map((item) => (
                <a
                  key={item[0]}
                  href="/shop"
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center hover:bg-pink-500/10"
                >
                  <div className="text-4xl">{item[2]}</div>
                  <p className="mt-3 truncate text-sm font-black">{item[0]}</p>
                  <p className="mt-1 text-sm font-black text-yellow-300">
                    🌰 {item[1]}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="notice" className="mt-5 grid gap-5 lg:grid-cols-5">
          <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-5">
            <h2 className="mb-4 text-lg font-black text-pink-200">공지사항</h2>
            <div className="space-y-3">
              {noticePosts.length > 0 ? (
                noticePosts.map((post: any) => (
                  <a key={post.id} href={`/board/free/${post.id}`} className="block truncate text-sm text-zinc-300 hover:text-pink-400">
                    📌 {post.title}
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">아직 공지가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-5">
            <h2 className="mb-4 text-lg font-black text-pink-200">인기글</h2>
            <div className="space-y-3">
              {bestPosts.length > 0 ? (
                bestPosts.map((post: any, index: number) => (
                  <a key={post.id} href={`/board/free/${post.id}`} className="flex items-center justify-between gap-2 text-sm text-zinc-300 hover:text-pink-400">
                    <span className="truncate">
                      {index + 1}. {post.title}
                    </span>
                    <span className="text-yellow-300">👍 {post.likes}</span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">인기글이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-5">
            <h2 className="mb-4 text-lg font-black text-pink-200">최근 게시글</h2>
            <div className="space-y-3">
              {recentPosts.length > 0 ? (
                recentPosts.map((post: any) => (
                  <a key={post.id} href={`/board/free/${post.id}`} className="block truncate text-sm text-zinc-300 hover:text-pink-400">
                    {post.title}
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">게시글이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-5">
            <h2 className="mb-4 text-lg font-black text-pink-200">최근 댓글</h2>
            <div className="space-y-3">
              {recentComments.length > 0 ? (
                recentComments.map((comment: any) => (
                  <a key={comment.id} href={`/board/free/${comment.post_id}`} className="block text-sm text-zinc-300 hover:text-pink-400">
                    <p className="truncate">{comment.content}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {comment.nickname || "익명"}
                    </p>
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">최근 댓글이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[#0b1022]/80 p-5">
            <h2 className="mb-4 text-lg font-black text-pink-200">내 활동</h2>
            {currentUser ? (
              <div className="space-y-3 text-sm">
                <a href="/mypage/posts" className="flex justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10">
                  <span>내가 쓴 글</span>
                  <span className="text-pink-300">보기</span>
                </a>
                <a href="/mypage/comments" className="flex justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10">
                  <span>내가 쓴 댓글</span>
                  <span className="text-pink-300">보기</span>
                </a>
                <a href="/mypage/inventory" className="flex justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10">
                  <span>보유 아이템</span>
                  <span className="text-pink-300">보기</span>
                </a>
                <a href="/mypage/titles" className="flex justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10">
                  <span>칭호 변경</span>
                  <span className="text-pink-300">보기</span>
                </a>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                로그인하면 내 활동을 확인할 수 있습니다.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}