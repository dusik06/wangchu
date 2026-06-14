import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#09090f] text-white px-4 py-8">
      <div className="max-w-xl mx-auto bg-[#151522] border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-4">프로필 사진 변경</h1>

        <p className="text-zinc-400 mb-4">
          JPG, PNG, WEBP, GIF 파일을 업로드할 수 있습니다. 최대 5MB까지 가능합니다.
        </p>

        <form
          action="/api/mypage/profile-image"
          method="POST"
          encType="multipart/form-data"
          className="space-y-4"
        >
          <input
            type="file"
            name="profileImage"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10"
            required
          />

          <button className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold">
            업로드
          </button>
        </form>

        <Link href="/mypage" className="block text-center mt-4 text-zinc-400">
          마이페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}