"use client";

import { useState } from "react";
import ImageDeleteButton from "../image-delete-button";

type ExistingImage = {
  id: number;
  image_url: string;
};

export default function EditForm({
  postId,
  defaultTitle,
  defaultContent,
  defaultImages,
}: {
  postId: number;
  defaultTitle: string;
  defaultContent: string;
  defaultImages: ExistingImage[];
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function uploadImage(file: File) {
    if (uploading) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/community-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "업로드 실패");
        return;
      }

      setImageUrls((prev) => [...prev, data.imageUrl]);
    } catch (error) {
      console.error(error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function removeNewImage(url: string) {
    setImageUrls((prev) => prev.filter((item) => item !== url));
  }

  async function submitEdit() {
    if (submitting) return;

    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/community-post-edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          title,
          content,
          imageUrls,
        }),
      });

      const data = await res.json();

      alert(data.message || "처리되었습니다.");

      if (data.success) {
        window.location.href = `/board/free/${postId}`;
      }
    } catch (error) {
      console.error(error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-80 bg-slate-800 rounded-xl px-4 py-3 mb-4 outline-none resize-none"
      />

      <div className="mb-4">
        <label className="block mb-2 text-sm text-gray-300">
          기존 이미지 / GIF
        </label>

        {defaultImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {defaultImages.map((image) => (
              <div key={image.id} className="relative">
                <img
                  src={image.image_url}
                  alt="첨부 이미지"
                  className="w-full h-32 object-cover rounded-xl"
                />

                <ImageDeleteButton imageId={image.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">기존 이미지가 없습니다.</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block mb-2 text-sm text-gray-300">
          새 이미지 / GIF 추가
        </label>

        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage(file);
            e.target.value = "";
          }}
          className="w-full bg-slate-800 rounded-xl px-4 py-3"
        />

        {uploading && (
          <p className="text-sm text-pink-400 mt-2">업로드 중...</p>
        )}

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {imageUrls.map((url) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt="새 첨부 이미지"
                  className="w-full h-32 object-cover rounded-xl"
                />

                <button
                  type="button"
                  onClick={() => removeNewImage(url)}
                  className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={submitEdit}
        disabled={uploading || submitting}
        className="bg-blue-600 px-6 py-3 rounded-xl font-bold disabled:opacity-50"
      >
        {submitting ? "수정 중..." : "수정 완료"}
      </button>
    </div>
  );
}