"use client";

import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: number;
  type: string;
  actor_nickname: string | null;
  post_id: number | null;
  post_title: string | null;
  comment_id: number | null;
  is_read: number;
  created_at: string;
};

function timeAgo(value: string) {
  const date = new Date(value);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(diff)) return "";
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function shorten(text: string, max = 26) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readingAll, setReadingAll] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setUnreadCount(Number(data.unreadCount || 0));
        setNotifications(data.notifications || []);
      }
    } catch {
      return;
    }
  }

  async function markAllAsRead() {
    if (readingAll || unreadCount === 0) return;
    setReadingAll(true);

    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "알림 모두 읽음 처리에 실패했습니다.");
        return;
      }

      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: 1 }))
      );
    } catch {
      alert("알림 모두 읽음 처리에 실패했습니다.");
    } finally {
      setReadingAll(false);
    }
  }

  async function openNotification(item: NotificationItem) {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: item.id }),
      });
    } catch {}

    if (item.post_id) {
      window.location.href = `/board/free/${item.post_id}#comment-${item.comment_id}`;
    }
  }

  useEffect(() => {
    loadNotifications();

    function handleClickOutside(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          loadNotifications();
        }}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-xl shadow-xl backdrop-blur transition hover:scale-105 hover:bg-black/70 sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl"
        aria-label="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff2d55] px-1.5 text-xs font-black text-white shadow-lg">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[74px] z-[10001] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1018] shadow-2xl sm:absolute sm:left-0 sm:right-auto sm:top-auto sm:mt-3 sm:w-[360px]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="shrink-0 text-lg font-black text-white">🔔 알림</div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={readingAll}
                  className="rounded-lg bg-purple-600/20 px-2.5 py-1.5 text-xs font-black text-purple-200 transition hover:bg-purple-600/35 disabled:opacity-50"
                >
                  {readingAll ? "처리 중..." : "모두 읽음"}
                </button>
              )}
              <button
                onClick={loadNotifications}
                className="text-xs font-bold text-zinc-400 hover:text-white"
              >
                새로고침
              </button>
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-500">
                아직 알림이 없습니다.
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openNotification(item)}
                  className={[
                    "mb-2 w-full rounded-2xl border px-4 py-4 text-left transition hover:border-[#f7d36b]/70",
                    Number(item.is_read) === 0
                      ? "border-purple-500/30 bg-[#25193b]"
                      : "border-white/10 bg-[#151925]",
                  ].join(" ")}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="font-black text-[#8dff8d]">
                      {item.actor_nickname || "익명"}
                    </span>
                    <span className="text-sm text-zinc-300">님이</span>
                  </div>

                  <div className="leading-6">
                    <span className="font-black text-white">
                      &quot;{shorten(item.post_title || "게시글")}&quot;
                    </span>
                    <span className="text-sm font-bold text-zinc-300">
                      에 댓글을 남겼습니다.
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-zinc-500">
                    {timeAgo(item.created_at)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
