"use client";

export default function AdminBoardActions({
  postId,
  isBlind,
}: {
  postId: number;
  isBlind: number;
}) {
  async function toggleBlind() {
    const res = await fetch("/api/admin/community-post-blind", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        isBlind: isBlind ? 0 : 1,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  async function deletePost() {
    if (!confirm("정말 이 게시글을 삭제할까요?")) {
      return;
    }

    const res = await fetch("/api/admin/community-post-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={toggleBlind}
        className={`px-3 py-1 rounded-lg text-sm font-bold ${
          isBlind ? "bg-green-600" : "bg-yellow-600"
        }`}
      >
        {isBlind ? "해제" : "블라인드"}
      </button>

      <button
        onClick={deletePost}
        className="bg-red-700 px-3 py-1 rounded-lg text-sm font-bold"
      >
        삭제
      </button>
    </div>
  );
}