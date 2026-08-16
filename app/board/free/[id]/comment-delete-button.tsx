"use client";

export default function CommentDeleteButton({ commentId }: { commentId: number }) {
  async function deleteComment() {
    if (!confirm("댓글을 삭제할까요?")) return;

    const res = await fetch("/api/community-comment-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={deleteComment}
      className="min-h-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
    >
      삭제
    </button>
  );
}
