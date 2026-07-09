export default function AdminLadderGamePage() {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="mb-2 text-sm font-bold text-blue-600">
              ADMIN LADDER GAME
            </p>
  
            <h1 className="text-3xl font-black text-zinc-900">
              🪜 사다리게임 기록
            </h1>
  
            <p className="mt-3 text-sm text-zinc-500">
              사다리게임 기록 페이지는 준비 중입니다.
            </p>
  
            <a
              href="/admin/game"
              className="mt-6 inline-block rounded-2xl bg-zinc-950 px-5 py-3 font-black text-white"
            >
              게임관리로 돌아가기
            </a>
          </section>
        </div>
      </main>
    );
  }