"use client";

import { useState } from "react";

export default function CommentForm({
  postId,
  parentId,
}: {
  postId: number;
  parentId?: number;
}) {
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(!parentId);
  const [submitting, setSubmitting] = useState(false);

  async function submitComment() {
    if (submitting) return;
    if (!content.trim()) {
      alert(parentId ? "답글을 입력해주세요." : "댓글을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/community-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content, parentId }),
      });

      const data = await res.json();
      alert(data.message);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      alert("댓글 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (parentId && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex min-h-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
      >
        ↳ 답글
      </button>
    );
  }

  return (
    <div
      className={
        parentId
          ? "mt-3 rounded-xl border border-white/10 bg-black/15 p-3"
          : "rounded-2xl border border-white/10 bg-[#151027] p-3 shadow-lg sm:p-4"
      }
    >
      {!parentId && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-black text-zinc-200">댓글 쓰기</span>
          <span className="text-xs text-zinc-500">{content.length}자</span>
        </div>
      )}

      {parentId && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-black text-purple-300">답글 작성</span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setContent("");
            }}
            className="min-h-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-500 hover:text-white"
          >
            닫기
          </button>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "답글을 입력해주세요." : "댓글을 남겨보세요."}
        className={`w-full resize-none rounded-xl border border-white/10 bg-[#0b0718] px-3 py-3 text-[15px] leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-purple-400/60 ${
          parentId ? "h-24" : "h-28 sm:h-24"
        }`}
      />

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={submitComment}
          disabled={submitting}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-black text-white transition active:scale-[.98] disabled:opacity-50"
        >
          {submitting ? "등록 중..." : parentId ? "답글 등록" : "댓글 등록"}
        </button>
      </div>
    </div>
  );
}
