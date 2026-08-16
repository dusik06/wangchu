"use client";

import { useState } from "react";

export default function CommentEditButton({
  commentId,
  defaultContent,
}: {
  commentId: number;
  defaultContent: string;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(defaultContent);
  const [saving, setSaving] = useState(false);

  async function saveComment() {
    if (saving) return;
    if (!content.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/community-comment-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content }),
      });

      const data = await res.json();
      alert(data.message);

      if (data.success) window.location.reload();
    } catch (error) {
      console.error(error);
      alert("댓글 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-h-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
      >
        수정
      </button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-xl border border-white/10 bg-black/15 p-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="h-24 w-full resize-none rounded-xl border border-white/10 bg-[#0b0718] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-purple-400/60"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setContent(defaultContent);
          }}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-400"
        >
          취소
        </button>
        <button
          type="button"
          onClick={saveComment}
          disabled={saving}
          className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
