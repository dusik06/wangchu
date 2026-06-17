import VideoPlayer from "./video-player";
import MyDotori from "./my-dotori";
import AttendanceButton from "./attendance-button";
import LoginButton from "./login-button";
import GameHighlights from "@/components/game/GameHighlights";
import GameRanking from "@/components/game/GameRanking";
import ShortsSlider from "@/components/home/ShortsSlider";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const YOUTUBE_LIVE_URL = "https://www.youtube.com/watch?v=P9fMwfGrucU";

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
  } catch {
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
      "SELECT id, email, nickname, role, dotori FROM users WHERE email = ? LIMIT 1",
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

async function getShopItems() {
  try {
    const [rows]: any = await db.query(`
      SELECT id, item_name, item_image, price, item_type
      FROM shop_items
      WHERE is_active = 1
      ORDER BY id DESC
      LIMIT 6
    `);

    return rows;
  } catch {
    return [];
  }
}

async function getDotoriRanking() {
  try {
    const [rows]: any = await db.query(`
      SELECT id, nickname, dotori
      FROM users
      WHERE role != 'admin'
      ORDER BY dotori DESC
      LIMIT 5
    `);

    return rows;
  } catch {
    return [];
  }
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
    shopItems,
    dotoriRanking,
  ] = await Promise.all([
    getCurrentUser(session?.user?.email),
    getYoutubeVideo(),
    getLiveSettings(),
    getSiteLogo(),
    getNoticePosts(),
    getRecentPosts(),
    getBestPosts(),
    getRecentComments(),
    getShopItems(),
    getDotoriRanking(),
  ]);

  const isAdmin = currentUser?.role === "admin";
  const isLiveOn = video?.isLive === true;
  const videos = Array.isArray(video?.videos) ? video.videos : [];
  const shorts = Array.isArray(video?.shorts)
  ? video.shorts.slice(0, 10)
  : videos.slice(0, 10);

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(199,151,56,0.18),transparent_32%),linear-gradient(180deg,#070912,#03040a)]" />

      <header className="sticky top-0 z-50 border-b border-[#3b321f] bg-[#05070d]/95 backdrop-blur-xl">
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
                <p className="text-4xl font-black text-[#f7d36b]">왕츄</p>
                <p className="text-xs font-bold text-zinc-400">팬사이트 v1.0</p>
              </div>
            )}
          </a>

          <nav className="hidden items-center gap-7 text-sm font-black text-zinc-300 lg:flex">
            <a href="/" className="hover:text-[#f7d36b]">홈</a>

            <div className="group relative">
              <button className="hover:text-[#f7d36b]">게시판 ▾</button>
              <div className="invisible absolute left-0 top-8 w-52 rounded-2xl border border-[#3b321f] bg-[#0d1018] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/board/free" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">자유게시판</a>
                {currentUser && <a href="/board/my" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">내 활동</a>}
              </div>
            </div>

            <div className="group relative">
              <button className="hover:text-[#f7d36b]">상점 ▾</button>
              <div className="invisible absolute left-0 top-8 w-56 rounded-2xl border border-[#3b321f] bg-[#0d1018] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/shop" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">전체 상점</a>
                {currentUser && <a href="/mypage/inventory" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">내 아이템</a>}
                {isAdmin && <a href="/admin/shop" className="block rounded-xl px-4 py-3 text-[#f7d36b] hover:bg-[#2b2415]">아이템 생성</a>}
              </div>
            </div>

            <div className="group relative">
              <button className="hover:text-[#f7d36b]">게임 ▾</button>
              <div className="invisible absolute left-0 top-8 w-56 rounded-2xl border border-[#3b321f] bg-[#0d1018] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/game" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">주사위 홀짝</a>
                <a href="/prediction" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">승패 예측</a>
                <a href="/game/ladder" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">
  사다리게임
</a>
                <span className="block rounded-xl px-4 py-3 text-zinc-500">뽑기 준비중</span>
                <span className="block rounded-xl px-4 py-3 text-zinc-500">핀볼 준비중</span>
              </div>
            </div>

            <div className="group relative">
              <button className="hover:text-[#f7d36b]">랭킹 ▾</button>
              <div className="invisible absolute left-0 top-8 w-52 rounded-2xl border border-[#3b321f] bg-[#0d1018] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="#ranking" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">도토리랭킹</a>
                <a href="#ranking" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">배팅랭킹</a>
              </div>
            </div>

            {currentUser && (
              <div className="group relative">
                <button className="hover:text-[#f7d36b]">마이페이지 ▾</button>
                <div className="invisible absolute left-0 top-8 w-56 rounded-2xl border border-[#3b321f] bg-[#0d1018] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                  <a href="/mypage" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">마이페이지</a>
                  <a href="/mypage/inventory" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">내 아이템</a>
                  <a href="/mypage/titles" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">칭호 변경</a>
                  <a href="/mypage/posts" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">내가 쓴 글</a>
                  <a href="/mypage/comments" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">내가 쓴 댓글</a>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="group relative">
                <button className="text-[#f7d36b] hover:text-white">관리자 ▾</button>
                <div className="invisible absolute right-0 top-8 w-60 rounded-2xl border border-[#3b321f] bg-[#0d1018] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                  <a href="/admin" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">관리자 대시보드</a>
                  <a href="/admin/live-status" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">라이브 상태 관리</a>
                  <a href="/admin/shop" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">아이템 생성</a>
                  <a href="/admin/dotori" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">도토리 지급</a>
                  <a href="/admin/board" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">게시판 관리</a>
                </div>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
          {currentUser && (
  <div className="hidden items-center gap-2 rounded-xl border border-[#3b321f] bg-[#0d1018] px-4 py-2 lg:flex">
    <span className="text-lg">🌰</span>
    <span className="whitespace-nowrap text-sm font-black text-white">
      {currentUser.dotori?.toLocaleString() || 0}개
    </span>
  </div>
)}


            <LoginButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-5">
        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.9fr_360px]">
          <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-xl font-black text-[#f7d36b]">왕츄 LIVE</h2>
              <span className={`rounded-md px-2 py-1 text-xs font-black ${isLiveOn ? "bg-red-600 text-white" : "bg-zinc-700 text-zinc-200"}`}>
                {isLiveOn ? "LIVE" : "OFF"}
              </span>
            </div>

            <div className="space-y-5">
            <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-3xl border border-[#3b321f] bg-black">
                <VideoPlayer videos={videos} />
              </div>

                <ShortsSlider videos={shorts} />
              </div>
            </div>

          <div className="space-y-5">
            <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5">
              <h2 className="mb-4 text-xl font-black text-[#f7d36b]">바로가기</h2>
              <div className="grid grid-cols-5 gap-3">
                <a href={YOUTUBE_LIVE_URL} target="_blank" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">📅</div>
                  <div className="mt-2 text-xs font-black">방송일정</div>
                </a>
                <div className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center">
                  <div className="text-3xl">✅</div>
                  <div className="mt-2 text-xs font-black">출석체크</div>
                </div>
                <a href="/coupon" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">🎫</div>
                  <div className="mt-2 text-xs font-black">쿠폰입력</div>
                </a>
                <a href="/shop" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">🛒</div>
                  <div className="mt-2 text-xs font-black">상점</div>
                </a>
                <a href="/board/free" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">💬</div>
                  <div className="mt-2 text-xs font-black">게시판</div>
                </a>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-black text-[#f7d36b]">출석 현황</h2>
                <span className="text-sm font-black text-[#f7d36b]">연속 출석</span>
              </div>
              <AttendanceButton />
            </div>

            <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-[#f7d36b]">게임 현황</h2>
                <a href="/game" className="text-xs text-zinc-400 hover:text-[#f7d36b]">
                  전체 게임 바로가기 〉
                </a>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <a href="/game" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 hover:bg-[#2b2415]">
                  <div className="text-4xl">🎲</div>
                  <p className="mt-3 font-black">주사위 홀짝</p>
                  <p className="text-xs text-zinc-500">게임하기</p>
                </a>
                <a href="/prediction" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 hover:bg-[#2b2415]">
                  <div className="text-4xl">📊</div>
                  <p className="mt-3 font-black">승패 예측</p>
                  <p className="text-xs text-zinc-500">예측하기</p>
                </a>
                <a href="/game/ladder" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 hover:bg-[#2b2415]">
  <div className="text-4xl">🪜</div>
  <p className="mt-3 font-black">사다리게임</p>
  <p className="text-xs text-zinc-500">게임하기</p>
</a>
                <div className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 opacity-75">
                  <div className="text-4xl">🎁</div>
                  <p className="mt-3 font-black">뽑기</p>
                  <p className="text-xs text-zinc-500">COMING SOON</p>
                </div>
                <div className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 opacity-75">
                  <div className="text-4xl">🕹️</div>
                  <p className="mt-3 font-black">핀볼</p>
                  <p className="text-xs text-zinc-500">COMING SOON</p>
                </div>
                <div className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 opacity-60">
                  <div className="text-4xl">?</div>
                  <p className="mt-3 font-black">준비중</p>
                  <p className="text-xs text-zinc-500">COMING SOON</p>
                </div>
              </div>
            </div>
          </div>

          <aside id="ranking" className="space-y-5">
            <GameRanking dotoriRanking={dotoriRanking} />

            
          </aside>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.5fr]">
          <GameHighlights />

          <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#f7d36b]">상점 추천 아이템</h2>
              <a href="/shop" className="text-xs font-bold text-zinc-400 hover:text-[#f7d36b]">
                전체 보기 〉
              </a>
            </div>

            {shopItems.length === 0 ? (
              <p className="rounded-2xl border border-[#2c2f3a] bg-[#151925] p-5 text-sm text-zinc-400">
                등록된 상점 아이템이 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                {shopItems.map((item: any) => (
                  <a
                    key={item.id}
                    href="/shop"
                    className="rounded-2xl border border-[#2c2f3a] bg-[#151925] p-3 text-center hover:border-[#f7d36b]/60"
                  >
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-black/25">
                      {item.item_image ? (
                        <img
                          src={item.item_image}
                          alt={item.item_name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-4xl">🎁</span>
                      )}
                    </div>
                    <p className="mt-3 truncate text-sm font-black">{item.item_name}</p>
                    <p className="mt-1 text-sm font-black text-[#f7d36b]">
                      🌰 {Number(item.price).toLocaleString()}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="notice" className="mt-5 grid gap-5 lg:grid-cols-5">
          <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
            <h2 className="mb-4 text-lg font-black text-[#f7d36b]">공지사항</h2>
            <div className="space-y-3">
              {noticePosts.length > 0 ? (
                noticePosts.map((post: any) => (
                  <a key={post.id} href={`/board/free/${post.id}`} className="block truncate text-sm text-zinc-300 hover:text-[#f7d36b]">
                    📌 {post.title}
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">아직 공지가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
            <h2 className="mb-4 text-lg font-black text-[#f7d36b]">인기글</h2>
            <div className="space-y-3">
              {bestPosts.length > 0 ? (
                bestPosts.map((post: any, index: number) => (
                  <a key={post.id} href={`/board/free/${post.id}`} className="flex items-center justify-between gap-2 text-sm text-zinc-300 hover:text-[#f7d36b]">
                    <span className="truncate">{index + 1}. {post.title}</span>
                    <span className="text-[#f7d36b]">👍 {post.likes}</span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">인기글이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
            <h2 className="mb-4 text-lg font-black text-[#f7d36b]">최근 게시글</h2>
            <div className="space-y-3">
              {recentPosts.length > 0 ? (
                recentPosts.map((post: any) => (
                  <a key={post.id} href={`/board/free/${post.id}`} className="block truncate text-sm text-zinc-300 hover:text-[#f7d36b]">
                    {post.title}
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">게시글이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
            <h2 className="mb-4 text-lg font-black text-[#f7d36b]">최근 댓글</h2>
            <div className="space-y-3">
              {recentComments.length > 0 ? (
                recentComments.map((comment: any) => (
                  <a key={comment.id} href={`/board/free/${comment.post_id}`} className="block text-sm text-zinc-300 hover:text-[#f7d36b]">
                    <p className="truncate">{comment.content}</p>
                    <p className="mt-1 text-xs text-zinc-500">{comment.nickname || "익명"}</p>
                  </a>
                ))
              ) : (
                <p className="text-sm text-zinc-400">최근 댓글이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-5">
            <h2 className="mb-4 text-lg font-black text-[#f7d36b]">내 활동</h2>
            {currentUser ? (
              <div className="space-y-3 text-sm">
                <a href="/mypage/posts" className="flex justify-between rounded-xl bg-[#151925] px-4 py-3 hover:bg-[#2b2415]">
                  <span>내가 쓴 글</span>
                  <span className="text-[#f7d36b]">보기</span>
                </a>
                <a href="/mypage/comments" className="flex justify-between rounded-xl bg-[#151925] px-4 py-3 hover:bg-[#2b2415]">
                  <span>내가 쓴 댓글</span>
                  <span className="text-[#f7d36b]">보기</span>
                </a>
                <a href="/mypage/inventory" className="flex justify-between rounded-xl bg-[#151925] px-4 py-3 hover:bg-[#2b2415]">
                  <span>보유 아이템</span>
                  <span className="text-[#f7d36b]">보기</span>
                </a>
                <a href="/mypage/titles" className="flex justify-between rounded-xl bg-[#151925] px-4 py-3 hover:bg-[#2b2415]">
                  <span>칭호 변경</span>
                  <span className="text-[#f7d36b]">보기</span>
                </a>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">로그인하면 내 활동을 확인할 수 있습니다.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}