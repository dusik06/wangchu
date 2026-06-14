"use client";

export default function CommentEditButton({
  commentId,
  defaultContent,
}: {
  commentId: number;
  defaultContent: string;
}) {
  async function editComment() {
    const content = prompt("댓글 수정", defaultContent);

    if (!content) return;

    const res = await fetch("/api/community-comment-edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commentId,
        content,
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
      onClick={editComment}
      className="bg-blue-600 px-3 py-1 rounded-lg text-sm"
    >
      수정
    </button>
  );
}