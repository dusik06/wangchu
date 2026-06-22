"use client";

import { useState } from "react";

const categories = [
  { value: "free", label: "자유게시판" },
  { value: "notice", label: "공지사항" },
  { value: "suggestion", label: "건의사항" },
  { value: "from_wangchu", label: "왕츄가 팬한테" },
  { value: "to_wangchu", label: "팬이 왕츄한테" },
];

export default function MoveCategory({
  postId,
  currentCategory,
}: {
  postId: number;
  currentCategory: string;
}) {
  const [category, setCategory] = useState(currentCategory);
  const [loading, setLoading] = useState(false);

  async function movePost() {
    if (loading) return;

    setLoading(true);

    const res = await fetch("/api/admin/community-post-move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId, category }),
    });

    const data = await res.json();

    alert(data.message);

    if (data.success) {
      location.reload();
    }

    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-xl bg-slate-800 px-3 py-2 text-sm"
      >
        {categories.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <button
        onClick={movePost}
        disabled={loading}
        className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black"
      >
        이동
      </button>
    </div>
  );
}