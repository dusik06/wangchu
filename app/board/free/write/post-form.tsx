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
    <div className="bg-slate-900 rounded-2xl p-6">
      <div className="mb-4">
        <label className="block mb-2 text-sm text-gray-300">
          게시판 카테고리
        </label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-slate-800 rounded-xl px-4 py-3 outline-none"
        >
          {/* 전체 가능 */}
          <option value="free">자유게시판</option>
          <option value="suggestion">건의사항</option>
          <option value="to_wangchu">팬이 왕츄한테</option>

          {/* 관리자 전용 */}
          {isAdmin && (
            <>
              <option value="notice">공지사항</option>
              <option value="from_wangchu">왕츄가 팬한테</option>
            </>
          )}
        </select>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="w-full bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요."
        className="w-full h-80 bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none resize-none"
      />

      <div className="mb-4">
        <label className="block mb-2 text-sm text-gray-300">
          이미지 / GIF 첨부
        </label>

        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage(file);
            e.target.value = "";
          }}
          className="w-full bg-slate-800 rounded-xl px-4 py-3"
        />

        {uploading && (
          <p className="text-sm text-pink-400 mt-2">업로드 중...</p>
        )}

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {imageUrls.map((url) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt="첨부 이미지"
                  className="w-full h-32 object-cover rounded-xl"
                />

                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={submitPost}
        disabled={uploading || submitting}
        className="bg-pink-500 px-6 py-3 rounded-xl font-bold disabled:opacity-50"
      >
        {submitting ? "등록 중..." : "글 등록하기"}
      </button>
    </div>
  );
}