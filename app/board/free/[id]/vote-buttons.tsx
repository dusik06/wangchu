"use client";

export default function VoteButtons({ postId }: { postId: number }) {
  async function vote(type: "like" | "dislike") {
    const res = await fetch("/api/community-post-vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId, type }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  return (
    <>
      <button
        onClick={() => vote("like")}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500"
      >
        👍 추천
      </button>

      <button
        onClick={() => vote("dislike")}
        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold hover:bg-rose-500"
      >
        👎 비추천
      </button>
    </>
  );
}