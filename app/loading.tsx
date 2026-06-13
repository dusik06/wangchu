export default function LoadingPage() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
  
          <h1 className="text-2xl font-black">불러오는 중...</h1>
  
          <p className="mt-3 text-zinc-400">
            잠시만 기다려주세요.
          </p>
        </div>
      </main>
    );
  }