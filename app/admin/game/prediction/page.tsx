export default function AdminPredictionGamePage() {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="mb-2 text-sm font-bold text-emerald-600">
              ADMIN PREDICTION GAME
            </p>
  
            <h1 className="text-3xl font-black text-zinc-900">
              📊 승패예측 기록
            </h1>
  
            <p className="mt-3 text-sm text-zinc-500">
              승패예측 기록 페이지는 준비 중입니다.
            </p>
  
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/admin/prediction"
                className="inline-block rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"
              >
                예측 생성 관리
              </a>
  
              <a
                href="/admin/prediction/settle"
                className="inline-block rounded-2xl bg-orange-500 px-5 py-3 font-black text-white"
              >
                예측 정산 관리
              </a>
  
              <a
                href="/admin/game"
                className="inline-block rounded-2xl bg-zinc-950 px-5 py-3 font-black text-white"
              >
                게임관리로 돌아가기
              </a>
            </div>
          </section>
        </div>
      </main>
    );
  }