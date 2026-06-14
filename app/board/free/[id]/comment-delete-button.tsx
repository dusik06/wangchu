"use client";

export default function CommentDeleteButton({
  commentId,
}: {
  commentId: number;
}) {
  async function deleteComment() {
    if (!confirm("댓글을 삭제할까요?")) {
      return;
    }

    const res = await fetch("/api/community-comment-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commentId,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  return (
    <button
      onClick={deleteComment}
      className="bg-red-600 px-3 py-1 rounded-lg text-sm"
    >
      삭제
    </button>
  );
}