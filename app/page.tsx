import VideoPlayer from "./video-player";
import AttendanceButton from "./attendance-button";
import LoginButton from "./login-button";
import GameHighlights from "@/components/game/GameHighlights";
import GameRanking from "@/components/game/GameRanking";
import ShortsSlider from "@/components/home/ShortsSlider";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DailyQuestCard from "@/components/home/DailyQuestCard";
import BroadcastMissionCard from "@/components/home/BroadcastMissionCard";
import NotificationBell from "@/components/NotificationBell";

async function safeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows]: any = await db.query(query, params);
    return rows || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getYoutubeVideo() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.xn--9l5bo4l.com";
    const res = await fetch(`${baseUrl}/api/youtube`, { cache: "no-store" });

    if (!res.ok) throw new Error("youtube api failed");

    return res.json();
  } catch {
    return {
      isLive: false,
      title: "유튜브 영상을 불러오는 중 문제가 발생했습니다.",
      videos: [],
      shorts: [],
      liveStatus: "off",
      liveForce: "auto",
    };
  }
}

async function getCurrentUser(email?: string | null) {
  if (!email) return null;

  const rows = await safeQuery(
    `
    SELECT id, email, nickname, role, dotori
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
}

async function getSiteSettings() {
  const rows = await safeQuery(`
    SELECT site_logo, live_status, live_force
    FROM site_settings
    LIMIT 1
  `);

  return {
    siteLogo: rows[0]?.site_logo || null,
    liveStatus: rows[0]?.live_status || "off",
    liveForce: rows[0]?.live_force || "auto",
  };
}

async function getMainData() {
  const [
    noticePosts,
    recentPosts,
    bestPosts,
    recentComments,
    shopItems,
    dotoriRanking,
    stockPreview,
    lotteryRoundRows,
    lotteryWinners,
  ] = await Promise.all([
    safeQuery(`
      SELECT id, title
      FROM community_posts
      WHERE is_notice = 1
        AND is_blind = 0
      ORDER BY id DESC
      LIMIT 5
    `),

    safeQuery(`
      SELECT id, title
      FROM community_posts
      WHERE is_blind = 0
      ORDER BY id DESC
      LIMIT 5
    `),

    safeQuery(`
      SELECT id, title, likes
      FROM community_posts
      WHERE is_best = 1
        AND is_blind = 0
      ORDER BY likes DESC, id DESC
      LIMIT 5
    `),

    safeQuery(`
      SELECT c.id, c.content, c.post_id, u.nickname
      FROM community_comments c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.id DESC
      LIMIT 5
    `),

    safeQuery(`
      SELECT id, item_name, item_image, price, item_type
      FROM shop_items
      WHERE is_active = 1
      ORDER BY id DESC
      LIMIT 6
    `),

    safeQuery(`
      SELECT id, nickname, dotori
      FROM users
      WHERE role != 'admin'
      ORDER BY dotori DESC
      LIMIT 5
    `),

    safeQuery(`
  SELECT
    s.*,
    p2.price AS prev_price
  FROM stock_items s
  LEFT JOIN stock_price_logs p1
    ON p1.stock_id = s.id
    AND p1.id = (
      SELECT MAX(id)
      FROM stock_price_logs
      WHERE stock_id = s.id
    )
  LEFT JOIN stock_price_logs p2
    ON p2.stock_id = s.id
    AND p2.id = (
      SELECT MAX(id)
      FROM stock_price_logs
      WHERE stock_id = s.id
        AND id < IFNULL(p1.id, 0)
    )
  ORDER BY s.is_listed DESC, s.current_price DESC
  LIMIT 5
`),

    safeQuery(`
  SELECT
      r.*,
      COUNT(e.id) AS participant_count

  FROM lottery_rounds r

  LEFT JOIN lottery_entries e
    ON e.round_id = r.id

  WHERE r.status='OPEN'

  GROUP BY r.id

  ORDER BY r.id DESC

  LIMIT 1
`),

    safeQuery(`
      SELECT nickname, rank_position, reward_amount
      FROM lottery_winners
      ORDER BY id DESC
      LIMIT 5
    `),
  ]);

  return {
    noticePosts,
    recentPosts,
    bestPosts,
    recentComments,
    shopItems,
    dotoriRanking,
    stockPreview,
    lotteryPreview: {
      current: lotteryRoundRows[0] || null,
      winners: lotteryWinners,
    },
  };
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  const [currentUser, video, siteSettings, mainData] = await Promise.all([
    getCurrentUser(session?.user?.email),
    getYoutubeVideo(),
    getSiteSettings(),
    getMainData(),
  ]);

  const isAdmin = currentUser?.role === "admin";
  const siteLogo = siteSettings.siteLogo;
  const isLiveOn = video?.isLive === true;
  const videos = Array.isArray(video?.videos) ? video.videos : [];
  const shorts = Array.isArray(video?.shorts)
    ? video.shorts.slice(0, 10)
    : videos.slice(0, 10);

  const {
    noticePosts,
    recentPosts,
    bestPosts,
    recentComments,
    shopItems,
    dotoriRanking,
    stockPreview,
    lotteryPreview,
  } = mainData;

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
                loading="eager"
                decoding="async"
                className="h-12 max-w-[170px] object-contain"
              />
            ) : (
              <div>
                <p className="text-4xl font-black text-[#f7d36b]">왕츄</p>
                <p className="text-xs font-bold text-zinc-400">팬사이트 v1.0</p>
              </div>
            )}
          </a>

          <NotificationBell />

          <nav className="hidden items-center gap-7 text-sm font-black text-zinc-300 lg:flex">
            <a href="/" className="hover:text-[#f7d36b]">홈</a>

            <div className="group relative">
              <button className="hover:text-[#f7d36b]">게시판 ▾</button>
              <div className="invisible absolute left-0 top-8 w-52 rounded-2xl border border-[#3b321f] bg-[#0d1018] p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <a href="/board/free?category=free" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">자유게시판</a>
                <a href="/board/free?category=notice" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">공지사항</a>
                <a href="/board/free?category=suggestion" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">건의사항</a>
                <a href="/board/free?category=from_wangchu" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">왕츄가 팬한테</a>
                <a href="/board/free?category=to_wangchu" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">팬이 왕츄한테</a>
                {currentUser && (
                  <a href="/board/my" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">내 활동</a>
                )}
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
                <a href="/game/ladder" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">사다리게임</a>
                <a href="/game/pinball" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">핀볼게임</a>
                <a href="/lottery" className="block rounded-xl px-4 py-3 hover:bg-[#2b2415]">도토리 로또</a>
              </div>
            </div>

            <a href="/stock" className="hover:text-[#f7d36b]">주식</a>

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
                  <a href="/admin/lottery" className="block rounded-xl px-4 py-3 text-[#f7d36b] hover:bg-[#2b2415]">로또 관리</a>
                </div>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden items-center gap-2 rounded-xl border border-[#3b321f] bg-[#0d1018] px-4 py-2 lg:flex">
                <span className="text-lg">🌰</span>
                <span className="whitespace-nowrap text-sm font-black text-white">
                  {Number(currentUser.dotori || 0).toLocaleString()}개
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

              <a
                href="https://www.youtube.com/@%EB%B0%95%EC%99%95%EC%B8%84"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-black text-white hover:bg-red-500"
              >
                라이브 보러가기
              </a>
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
              <div className="grid grid-cols-6 gap-3">
                <a href="/schedule" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">📅</div>
                  <div className="mt-2 text-xs font-black">방송일정</div>
                </a>

                <a href="/missions" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">📢</div>
                  <div className="mt-2 text-xs font-black">방송미션</div>
                </a>

                <a href="https://www.instagram.com/parkwangchu/" target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">📸</div>
                  <div className="mt-2 text-xs font-black">인스타</div>
                </a>

                <a href="https://www.tiktok.com/@parkwangchu" target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">🎵</div>
                  <div className="mt-2 text-xs font-black">틱톡</div>
                </a>

                <a href="https://toon.at/donate/wonywangchu" target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 text-center hover:bg-[#2b2415]">
                  <div className="text-3xl">💰</div>
                  <div className="mt-2 text-xs font-black">투네이션</div>
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
              <DailyQuestCard userId={currentUser?.id || null} />
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

                <a href="/game/pinball" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 hover:bg-[#2b2415]">
                  <div className="text-4xl">🕹️</div>
                  <p className="mt-3 font-black">핀볼</p>
                  <p className="text-xs text-zinc-500">게임하기</p>
                </a>

                <a href="/lottery" className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4 hover:bg-[#2b2415]">
                  <div className="text-4xl">🎟️</div>
                  <p className="mt-3 font-black">도토리 로또</p>
                  <p className="text-xs text-zinc-500">참여하기</p>
                </a>
              </div>
            </div>

            <BroadcastMissionCard isAdmin={isAdmin} />

            <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-[#f7d36b]">🎟 도토리 로또</h2>

                <a href="/lottery" className="text-xs font-bold text-zinc-400 hover:text-[#f7d36b]">
                  참여하기 〉
                </a>
              </div>

              {lotteryPreview?.current ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-[#151925] p-4">
                      <p className="text-sm text-zinc-400">현재 회차</p>
                      <p className="mt-1 text-xl font-black">
                        {lotteryPreview.current.round_number}회차
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#151925] p-4">
                      <p className="text-sm text-zinc-400">누적 상금</p>
                      <p className="mt-1 text-xl font-black text-yellow-300">
                        {Number(lotteryPreview.current.total_reward).toLocaleString()} 도토리
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#151925] p-4">
                      <p className="text-sm text-zinc-400">참여자</p>
                      <p className="mt-1 text-xl font-black">
                        {Number(lotteryPreview.current.participant_count)}명
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#151925] p-4">
                    <p className="mb-2 text-sm font-black text-[#f7d36b]">최근 당첨자</p>

                    {lotteryPreview.winners.length === 0 ? (
                      <p className="text-sm text-zinc-400">아직 당첨 기록이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {lotteryPreview.winners.map((winner: any, index: number) => (
                          <div key={index} className="text-sm text-zinc-300">
                            {winner.nickname} · {winner.rank_position}등 ·{" "}
                            <span className="font-black text-yellow-300">
                              {Number(winner.reward_amount).toLocaleString()}개
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-400">진행 중인 로또가 없습니다.</p>
              )}
            </div>
          </div>

          <aside id="ranking" className="space-y-5">
            <GameRanking dotoriRanking={dotoriRanking} />

            <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-[#f7d36b]">📈 주식 현황</h2>

                <a href="/stock" className="text-xs font-bold text-zinc-400 hover:text-[#f7d36b]">
                  전체 보기 〉
                </a>
              </div>

              {stockPreview.length === 0 ? (
                <p className="text-sm text-zinc-400">등록된 주식이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {stockPreview.map((stock: any) => {
                    const prev = Number(stock.prev_price || 0);
                    const stockCurrent = Number(stock.current_price || 0);
                    const diff = stockCurrent - prev;
                    const rate = prev > 0 ? Math.floor((diff / prev) * 100) : 0;

                    return (
                      <a
                        key={stock.id}
                        href={`/stock/${stock.id}`}
                        className="block rounded-2xl border border-[#2c2f3a] bg-[#151925] p-4 hover:border-[#f7d36b]/60"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black">{stock.stock_name}</span>

                          {stock.is_listed ? (
                            <span className="text-xs text-emerald-400">상장중</span>
                          ) : (
                            <span className="text-xs text-red-400">상장폐지</span>
                          )}
                        </div>

                        <p className="mt-2 text-lg font-black text-[#f7d36b]">
                          {stockCurrent.toLocaleString()} 도토리
                        </p>

                        <p
                          className={`mt-1 text-sm font-bold ${
                            diff > 0
                              ? "text-red-400"
                              : diff < 0
                              ? "text-blue-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {diff > 0 && "▲"}
                          {diff < 0 && "▼"}
                          {diff === 0
                            ? "변동 없음"
                            : `${Math.abs(diff).toLocaleString()} (${Math.abs(rate)}%)`}
                        </p>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
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
                          loading="lazy"
                          decoding="async"
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