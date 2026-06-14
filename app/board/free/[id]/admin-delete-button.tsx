"use client";

export default function AdminDeleteButton({ postId }: { postId: number }) {
  async function deletePost() {
    if (!confirm("정말 이 게시글을 삭제할까요?")) {
      return;
    }

    const res = await fetch("/api/admin/community-post-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.href = "/board/free";
    }
  }

  return (
    <button
      onClick={deletePost}
      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600"
    >
      관리자 삭제
    </button>
  );
}