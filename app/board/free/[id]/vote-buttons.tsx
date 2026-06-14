"use client";

export default function VoteButtons({
  postId,
}: {
  postId: number;
}) {
  async function vote(type: "like" | "dislike") {
    const res = await fetch("/api/community-post-vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        type,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  return (
    <div className="flex gap-4 mt-8">
      <button
        onClick={() => vote("like")}
        className="bg-green-600 px-5 py-2 rounded-lg font-bold"
      >
        👍 추천
      </button>

      <button
        onClick={() => vote("dislike")}
        className="bg-red-600 px-5 py-2 rounded-lg font-bold"
      >
        👎 비추천
      </button>
    </div>
  );
}