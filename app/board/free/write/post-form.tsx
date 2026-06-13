"use client";

import { useState } from "react";

export default function PostForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function submitPost() {
    const res = await fetch("/api/community-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, content }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        window.location.href = "/board/free";
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6">
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

      <button
        onClick={submitPost}
        className="bg-pink-500 px-6 py-3 rounded-xl font-bold"
      >
        글 등록하기
      </button>
    </div>
  );
}