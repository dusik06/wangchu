"use client";

export default function ImageDeleteButton({
  imageId,
}: {
  imageId: number;
}) {
  async function deleteImage() {
    if (!confirm("이미지를 삭제할까요?")) {
      return;
    }

    const res = await fetch("/api/community-image-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageId,
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
      onClick={deleteImage}
      className="bg-red-600 px-3 py-2 rounded-lg text-sm mt-2"
    >
      이미지 삭제
    </button>
  );
}