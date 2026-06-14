"use client";

import { useState } from "react";

export default function EditForm({
  postId,
  defaultTitle,
  defaultContent,
}: {
  postId: number;
  defaultTitle: string;
  defaultContent: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);

  async function submitEdit() {
    const res = await fetch("/api/community-post-edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        title,
        content,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.href = `/board/free/${postId}`;
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-80 bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none resize-none"
      />

      <button
        onClick={submitEdit}
        className="bg-blue-600 px-6 py-3 rounded-xl font-bold"
      >
        수정 완료
      </button>
    </div>
  );
}