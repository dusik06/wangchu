"use client";

export default function ErrorPage({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <p className="mb-3 text-sm font-bold text-red-400">SERVER ERROR</p>

        <h1 className="text-5xl font-black">문제가 발생했습니다.</h1>

        <p className="mt-4 text-zinc-400">
          잠시 후 다시 시도해주세요.
        </p>

        <button
          onClick={() => reset()}
          className="mt-8 cursor-pointer rounded-2xl bg-red-500 px-6 py-4 font-black transition hover:bg-red-400"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}