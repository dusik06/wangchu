import PostForm from "./post-form";

export default function FreeBoardWritePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">
            자유게시판 글쓰기
          </h1>

          <a href="/board/free" className="bg-slate-800 px-4 py-2 rounded-lg">
            목록으로
          </a>
        </div>

        <PostForm />
      </div>
    </main>
  );
}