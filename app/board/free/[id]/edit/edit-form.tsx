"use client";

import { useState } from "react";
import ImageDeleteButton from "../image-delete-button";

type ExistingImage = { id: number; image_url: string };

export default function EditForm({
  postId,
  defaultTitle,
  defaultContent,
  defaultImages,
  isAdmin,
  defaultIsMainPost,
}: {
  postId: number;
  defaultTitle: string;
  defaultContent: string;
  defaultImages: ExistingImage[];
  isAdmin: boolean;
  defaultIsMainPost: boolean;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isMainPost, setIsMainPost] = useState(defaultIsMainPost);

  async function uploadImages(files: File[]) {
    if (uploading || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/community-upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok || !data.success) {
          alert(`${file.name}: ${data.message || "업로드 실패"}`);
          continue;
        }
        setImageUrls((prev) => [...prev, data.imageUrl]);
      }
    } catch (error) {
      console.error(error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function submitEdit() {
    if (submitting) return;
    if (!title.trim()) return alert("제목을 입력해주세요.");
    if (!content.trim()) return alert("내용을 입력해주세요.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/community-post-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, title, content, imageUrls, isMainPost }),
      });
      const data = await res.json();
      alert(data.message || "처리되었습니다.");
      if (data.success) window.location.href = `/board/free/${postId}`;
    } catch (error) {
      console.error(error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151027] shadow-2xl sm:rounded-3xl">
      <div className="border-b border-white/10 px-4 py-3 sm:px-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="제목을 입력해주세요"
          className="w-full bg-transparent py-2 text-lg font-black text-white outline-none placeholder:text-zinc-600 sm:text-xl"
        />
      </div>

      {isAdmin && (
        <div className="border-b border-white/10 bg-purple-500/5 px-4 py-3 sm:px-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3">
            <input
              type="checkbox"
              checked={isMainPost}
              onChange={(e) => setIsMainPost(e.target.checked)}
              className="mt-1 h-4 w-4 accent-purple-500"
            />
            <span>
              <span className="block text-sm font-black text-purple-100">메인글로 표시</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-400">체크하면 홈페이지 최상단 메인글로 노출됩니다. 체크를 해제하면 현재 메인글에서 내려갑니다.</span>
            </span>
          </label>
        </div>
      )}

      <div className="border-b border-white/10 bg-black/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold ${uploading ? "pointer-events-none opacity-50" : ""}`}>
            <span>📷</span>
            <span>{uploading ? "업로드 중..." : "사진 / GIF 추가"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,.gif"
              multiple
              disabled={uploading}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) uploadImages(files);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
          <span className="text-xs text-zinc-500">GIF 움짤 포함 · 파일당 20MB 이하 · 여러 장 가능</span>
        </div>

        {(defaultImages.length > 0 || imageUrls.length > 0) && (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {defaultImages.map((image) => (
              <div key={image.id} className="w-28 shrink-0">
                <img src={image.image_url} alt="기존 첨부" className="h-24 w-28 rounded-xl border border-white/10 object-cover" />
                <div className="mt-1"><ImageDeleteButton imageId={image.id} /></div>
              </div>
            ))}
            {imageUrls.map((url) => (
              <div key={url} className="relative h-24 w-28 shrink-0">
                <img src={url} alt="새 첨부" className="h-full w-full rounded-xl border border-white/10 object-cover" />
                <button type="button" onClick={() => setImageUrls((prev) => prev.filter((item) => item !== url))} className="absolute right-1 top-1 min-h-0 rounded-lg bg-black/80 px-2 py-1 text-xs font-black text-white">삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[48vh] w-full resize-y bg-transparent text-base leading-7 text-white outline-none sm:min-h-[420px]"
        />
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-white/10 bg-[#151027]/95 p-3 backdrop-blur sm:justify-end sm:p-4">
        <a href={`/board/free/${postId}`} className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-zinc-300 sm:flex-none">취소</a>
        <button onClick={submitEdit} disabled={uploading || submitting} className="flex-1 rounded-xl bg-purple-600 px-6 py-3 font-black text-white disabled:opacity-50 sm:flex-none">
          {submitting ? "수정 중..." : "수정 완료"}
        </button>
      </div>
    </div>
  );
}
