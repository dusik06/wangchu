"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export default function LoginButton() {
  const { data: session, status } = useSession();
  const [me, setMe] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.user || !data.user.nickname) {
            window.location.href = "/nickname";
            return;
          }

          setMe(data.user);
        });
    }
  }, [status]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!mobileRef.current) return;
      if (!mobileRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  if (status === "loading") {
    return <span>확인중...</span>;
  }

  if (session) {
    return (
      <>
        <div ref={mobileRef} className="relative flex items-center lg:hidden">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-[#0d1018] px-2 py-1.5">
            <img
              src={session.user?.image || ""}
              alt="profile"
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
            <span className="max-w-[72px] truncate text-xs font-black text-white">
              {me?.nickname || "확인중"}
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl font-black text-zinc-300 active:bg-white/10"
              aria-label="사용자 메뉴"
            >
              ⋯
            </button>
          </div>

          {mobileOpen && (
            <div className="absolute right-0 top-[46px] z-[10000] w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1018] p-2 shadow-2xl">
              <a
                href="/mypage"
                className="block rounded-xl px-4 py-3 text-sm font-black text-white active:bg-white/10"
              >
                마이페이지
              </a>
              {me?.role === "admin" && (
                <a
                  href="/admin"
                  className="block rounded-xl px-4 py-3 text-sm font-black text-[#f7d36b] active:bg-white/10"
                >
                  관리자 설정
                </a>
              )}
              <button
                onClick={() => signOut()}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-zinc-300 active:bg-white/10"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <img
            src={session.user?.image || ""}
            alt="profile"
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="whitespace-nowrap">{me?.nickname || "닉네임 확인중"}</span>

          {me?.role === "admin" && (
            <a
              href="/admin"
              className="whitespace-nowrap rounded-lg bg-purple-600 px-4 py-2 font-bold"
            >
              관리자 설정
            </a>
          )}

          <button
            onClick={() => signOut()}
            className="whitespace-nowrap rounded-lg bg-gray-700 px-4 py-2"
          >
            로그아웃
          </button>
        </div>
      </>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="whitespace-nowrap rounded-lg bg-pink-500 px-3 py-2 text-xs font-black sm:px-4 sm:text-sm"
    >
      구글 로그인
    </button>
  );
}