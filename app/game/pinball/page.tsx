import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PinballMainPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 rounded-3xl border border-yellow-400/30 bg-zinc-950 p-8 shadow-[0_0_35px_rgba(250,204,21,0.12)]">
          <p className="mb-3 text-sm font-black text-yellow-400">WANGCHU PINBALL</p>
          <h1 className="text-4xl font-black">핀볼 게임</h1>
          <p className="mt-4 text-zinc-400">
            원하는 방식으로 핀볼을 즐길 수 있습니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/game/pinball/draw"
            className="group rounded-3xl border border-cyan-400/30 bg-zinc-950 p-7 transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_0_35px_rgba(34,211,238,0.18)]"
          >
            <div className="mb-5 text-5xl">🎯</div>
            <h2 className="text-2xl font-black text-cyan-400">닉네임 추첨 핀볼</h2>
            <p className="mt-3 leading-7 text-zinc-400">
              참여자 닉네임을 입력하고 공으로 추첨합니다. 마지막에 들어간 사람이 WIN!
            </p>
            <div className="mt-6 rounded-2xl bg-cyan-400 px-4 py-3 text-center font-black text-black">
              추첨하러 가기
            </div>
          </Link>

          <Link
            href="/game/pinball/bet"
            className="group rounded-3xl border border-purple-400/30 bg-zinc-950 p-7 transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.18)]"
          >
            <div className="mb-5 text-5xl">🌰</div>
            <h2 className="text-2xl font-black text-purple-400">도토리 배팅 핀볼</h2>
            <p className="mt-3 leading-7 text-zinc-400">
              도토리를 걸고 WIN 색상을 맞추는 기존 배팅식 핀볼입니다.
            </p>
            <div className="mt-6 rounded-2xl bg-purple-600 px-4 py-3 text-center font-black text-white">
              배팅하러 가기
            </div>
          </Link>

          <Link
            href="/game/pinball/maps"
            className="group rounded-3xl border border-emerald-400/30 bg-zinc-950 p-7 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_0_35px_rgba(52,211,153,0.18)]"
          >
            <div className="mb-5 text-5xl">🗺️</div>
            <h2 className="text-2xl font-black text-emerald-400">공유 맵 보기</h2>
            <p className="mt-3 leading-7 text-zinc-400">
              저장된 핀볼 맵을 확인하고 원하는 맵을 선택해서 사용할 수 있습니다.
            </p>
            <div className="mt-6 rounded-2xl bg-emerald-500 px-4 py-3 text-center font-black text-black">
              맵 보러가기
            </div>
          </Link>

          <Link
            href="/admin/pinball-map"
            className="group rounded-3xl border border-yellow-400/30 bg-zinc-950 p-7 transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-[0_0_35px_rgba(250,204,21,0.18)]"
          >
            <div className="mb-5 text-5xl">🛠️</div>
            <h2 className="text-2xl font-black text-yellow-400">맵 만들기</h2>
            <p className="mt-3 leading-7 text-zinc-400">
              핀, 고정벽, 회전벽을 직접 배치해서 고정맵을 만들 수 있습니다.
            </p>
            <div className="mt-6 rounded-2xl bg-yellow-400 px-4 py-3 text-center font-black text-black">
              맵 만들러가기
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}