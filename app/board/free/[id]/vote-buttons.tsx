"use client";

import { useState } from "react";

export default function VoteButtons({ postId }: { postId: number }) {
  const [loading, setLoading] = useState(false);

  async function vote(type: "like" | "dislike") {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/community-post-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, type }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) window.location.reload();
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => vote("like")}
        disabled={loading}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        👍 추천
      </button>

      <button
        onClick={() => vote("dislike")}
        disabled={loading}
        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        👎 비추천
      </button>
    </>
  );
}
