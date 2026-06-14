"use client";

import { useState } from "react";

export default function CommentForm({
  postId,
  parentId,
}: {
  postId: number;
  parentId?: number;
}) {
  const [content, setContent] = useState("");

  async function submitComment() {
    const res = await fetch("/api/community-comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        content,
        parentId,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-5 mt-6">
      <h2 className="text-xl font-bold mb-4">
        {parentId ? "답글 작성" : "댓글 작성"}
      </h2>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="댓글을 입력하세요."
        className="w-full h-28 bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none resize-none"
      />

      <button
        onClick={submitComment}
        className="bg-pink-500 px-5 py-3 rounded-xl font-bold"
      >
        등록
      </button>
    </div>
  );
}