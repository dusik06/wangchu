"use client";

import { useState } from "react";

export default function PostForm({ isAdmin }: { isAdmin: boolean }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("free");
  const [isNotice, setIsNotice] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File) {
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/community-upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      setImageUrls((prev) => [...prev, data.imageUrl]);
    }

    setUploading(false);
  }

  async function submitPost() {
    const res = await fetch("/api/community-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content,
        category,
        isNotice: isAdmin ? isNotice : false,
        imageUrls,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.href = "/board/free";
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
          <option value="free">자유게시판</option>
        </select>
      </div>

      {isAdmin && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isNotice}
            onChange={(e) => setIsNotice(e.target.checked)}
          />
          <span className="text-sm text-yellow-400">
            공지로 등록
          </span>
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="w-full bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요. 20자 이상 작성하면 하루 최대 3회까지 도토리를 받을 수 있어요."
        className="w-full h-80 bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none resize-none"
      />

      <div className="mb-4">
        <label className="block mb-2 text-sm text-gray-300">
          이미지 / GIF 첨부
        </label>

        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage(file);
          }}
          className="w-full bg-slate-800 rounded-xl px-4 py-3"
        />

        {uploading && (
          <p className="text-sm text-pink-400 mt-2">업로드 중...</p>
        )}

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {imageUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt="첨부 이미지"
                className="w-full h-32 object-cover rounded-xl"
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={submitPost}
        className="bg-pink-500 px-6 py-3 rounded-xl font-bold"
      >
        글 등록하기
      </button>
    </div>
  );
}