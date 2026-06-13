export default function NotFoundPage() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="mb-3 text-sm font-bold text-pink-400">404 ERROR</p>
  
          <h1 className="text-5xl font-black">페이지를 찾을 수 없습니다.</h1>
  
          <p className="mt-4 text-zinc-400">
            요청하신 페이지가 존재하지 않거나 삭제되었습니다.
          </p>
  
          <a
            href="/"
            className="mt-8 inline-block cursor-pointer rounded-2xl bg-pink-500 px-6 py-4 font-black transition hover:bg-pink-400"
          >
            메인으로 돌아가기
          </a>
        </div>
      </main>
    );
  }