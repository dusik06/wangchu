"use client";

import { useState } from "react";

export default function PostForm({ isAdmin }: { isAdmin: boolean }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("free");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function uploadImage(file: File) {
    if (uploading) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/community-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "업로드 실패");
        return;
      }

      setImageUrls((prev) => [...prev, data.imageUrl]);
    } catch (error) {
      console.error(error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((item) => item !== url));
  }

  async function submitPost() {
    if (submitting) return;

    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/community-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          category,
          imageUrls,
        }),
      });

      const data = await res.json();

      alert(data.message || "처리되었습니다.");

      if (data.success) {
        window.location.href = `/board/${category}`;
      }
    } catch (error) {
      console.error(error);
      alert("글 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151027] shadow-2xl sm:rounded-3xl">
      <div className="border-b border-white/10 bg-black/15 p-4 sm:p-5">
        <label className="mb-2 block text-xs font-black text-zinc-400">게시판 선택</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0b0718] px-4 py-3 font-bold text-white outline-none focus:border-purple-400"
        >
          <option value="free">자유게시판</option>
          <option value="suggestion">건의사항</option>
          <option value="to_wangchu">팬이 왕츄한테</option>
          {isAdmin && (
            <>
              <option value="notice">공지사항</option>
              <option value="from_wangchu">왕츄가 팬한테</option>
            </>
          )}
        </select>
      </div>

      <div className="border-b border-white/10 px-4 py-3 sm:px-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          maxLength={120}
          className="w-full bg-transparent py-2 text-lg font-black text-white outline-none placeholder:text-zinc-600 sm:text-xl"
        />
      </div>

      <div className="border-b border-white/10 bg-black/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
            <span className="text-lg">📷</span>
            <span>{uploading ? "업로드 중..." : "사진 / GIF"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
          <span className="text-xs text-zinc-500">사진을 첨부하면 글 아래에 함께 등록됩니다.</span>
        </div>

        {imageUrls.length > 0 && (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {imageUrls.map((url) => (
              <div key={url} className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
                <img src={url} alt="첨부 이미지" className="h-full w-full rounded-xl object-cover" />
                <button type="button" onClick={() => removeImage(url)} className="absolute right-1 top-1 min-h-0 rounded-lg bg-black/80 px-2 py-1 text-xs font-black text-white">삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력해주세요.\n\n서로 편하게 이야기하는 왕츄 팬카페 공간입니다."
          className="min-h-[48vh] w-full resize-y bg-transparent text-base leading-7 text-white outline-none placeholder:text-zinc-600 sm:min-h-[420px]"
        />
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-white/10 bg-[#151027]/95 p-3 backdrop-blur sm:justify-end sm:p-4">
        <a href="/board/free" className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-center font-bold text-zinc-300 sm:flex-none">취소</a>
        <button
          onClick={submitPost}
          disabled={uploading || submitting}
          className="flex-1 rounded-xl bg-purple-600 px-6 py-3 font-black text-white shadow-lg transition active:scale-[.98] disabled:opacity-50 sm:flex-none"
        >
          {submitting ? "등록 중..." : "등록하기"}
        </button>
      </div>
    </div>
  );
}