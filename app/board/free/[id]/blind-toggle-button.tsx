"use client";

export default function BlindToggleButton({
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

  return (
    <button
      onClick={toggleBlind}
      className={`rounded-xl px-4 py-2 text-sm font-bold ${
        isBlind
          ? "bg-green-600 hover:bg-green-500"
          : "bg-yellow-600 hover:bg-yellow-500"
      }`}
    >
      {isBlind ? "블라인드 해제" : "블라인드 처리"}
    </button>
  );
}