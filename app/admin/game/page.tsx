const games = [
  {
    href: "/admin/game/dice",
    icon: "🎲",
    title: "주사위 홀짝",
    desc: "주사위 게임 배팅 / 엎기 / 지급 기록",
    color: "bg-yellow-500 text-black hover:bg-yellow-400",
  },
  {
    href: "/admin/game/updown",
    icon: "🔼",
    title: "업다운게임",
    desc: "업 / 같음 / 다운 배팅 기록",
    color: "bg-purple-600 text-white hover:bg-purple-500",
  },
  {
    href: "/admin/game/ladder",
    icon: "🪜",
    title: "사다리게임",
    desc: "사다리 배팅 기록",
    color: "bg-blue-600 text-white hover:bg-blue-500",
  },
  {
    href: "/admin/game/pinball",
    icon: "🕹️",
    title: "핀볼",
    desc: "핀볼 배팅 / 결과 기록",
    color: "bg-pink-600 text-white hover:bg-pink-500",
  },
  {
    href: "/admin/game/prediction",
    icon: "📊",
    title: "승패예측",
    desc: "예측 참여 / 정산 기록",
    color: "bg-emerald-600 text-white hover:bg-emerald-500",
  },
  {
    href: "/admin/game/lottery",
    icon: "🎟️",
    title: "도토리 로또",
    desc: "로또 참여 / 당첨 기록",
    color: "bg-orange-500 text-black hover:bg-orange-400",
  },
  {
    href: "/admin/game/stock",
    icon: "📈",
    title: "주식",
    desc: "주식 매수 / 매도 / 손익 기록",
    color: "bg-slate-800 text-white hover:bg-slate-700",
  },
];

export default function AdminGameHubPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[28px] border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-yellow-400">
                ADMIN GAME CENTER
              </p>

              <h1 className="text-3xl font-black">
                🎮 게임 관리
              </h1>

              <p className="mt-3 text-sm text-slate-400">
                게임별 배팅 기록, 지급 기록, 운영 상태를 분리해서 관리합니다.
              </p>
            </div>

            <a
              href="/admin"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-yellow-100"
            >
              관리자 홈으로
            </a>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <a
              key={game.href}
              href={game.href}
              className={`rounded-[28px] p-6 shadow-lg transition ${game.color}`}
            >
              <div className="text-5xl">{game.icon}</div>

              <h2 className="mt-5 text-2xl font-black">
                {game.title}
              </h2>

              <p className="mt-3 text-sm opacity-80">
                {game.desc}
              </p>

              <div className="mt-6 text-sm font-black opacity-90">
                관리하기 〉
              </div>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}