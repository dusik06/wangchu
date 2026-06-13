"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function LoginButton() {
  const { data: session, status } = useSession();
  const [me, setMe] = useState<any>(null);

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

  if (status === "loading") {
    return <span>확인중...</span>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={session.user?.image || ""}
          alt="profile"
          className="w-10 h-10 rounded-full"
        />

        <span>{me?.nickname || "닉네임 확인중"}</span>

        {me?.role === "admin" && (
          <a
            href="/admin"
            className="bg-purple-600 px-4 py-2 rounded-lg font-bold"
          >
            관리자 설정
          </a>
        )}

        <button
          onClick={() => signOut()}
          className="bg-gray-700 px-4 py-2 rounded-lg"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="bg-pink-500 px-4 py-2 rounded-lg"
    >
      구글 로그인
    </button>
  );
}