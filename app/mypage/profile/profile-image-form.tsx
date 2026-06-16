"use client";

import { useState } from "react";

export default function ProfileImageForm({
  currentImage,
}: {
  currentImage: string;
}) {
  const [preview, setPreview] = useState(currentImage);
  const [uploading, setUploading] = useState(false);

  async function uploadProfileImage(file: File) {
    if (uploading) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "업로드 실패");
        return;
      }

      setPreview(data.imageUrl);
    } catch (error) {
      console.error(error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-4">
        <div className="h-40 w-40 overflow-hidden rounded-full border border-white/20 bg-black/30">
          {preview ? (
            <img
              src={preview}
              alt="프로필 사진"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">
              🐿️
            </div>
          )}
        </div>

        <p className="text-sm text-zinc-400">
          PNG, JPG, WEBP, GIF / 최대 5MB
        </p>
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadProfileImage(file);
          e.target.value = "";
        }}
        className="w-full rounded-xl bg-slate-800 px-4 py-3"
      />

      {uploading && (
        <p className="mt-3 text-sm font-bold text-pink-400">업로드 중...</p>
      )}

      <div className="mt-6 rounded-xl bg-black/20 p-4 text-sm text-zinc-400">
        사진을 선택하면 바로 변경됩니다. 변경 후 마이페이지와 게시판 닉네임 옆
        프로필 사진에 적용됩니다.
      </div>
    </div>
  );
}