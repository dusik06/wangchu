"use client";

export default function ReportButton({
  postId,
}: {
  postId: number;
}) {
  async function reportPost() {
    const reason = prompt("신고 사유를 입력하세요.");

    if (!reason) return;

    const res = await fetch("/api/community-post-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        reason,
      }),
    });

    const data = await res.json();
    alert(data.message);
  }

  return (
    <button
      onClick={reportPost}
      className="bg-yellow-600 px-5 py-2 rounded-lg font-bold"
    >
      🚨 신고
    </button>
  );
}