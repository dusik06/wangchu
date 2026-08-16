"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function NicknamePage() {
  const router = useRouter();
  const { status } = useSession();
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  async function saveNickname(event?: FormEvent) {
    event?.preventDefault();
    if (saving) return;

    const value = nickname.trim();
    if (!/^[가-힣a-zA-Z0-9]{2,8}$/.test(value)) {
      setMessage("닉네임은 한글/영문/숫자 2~8자로 입력해주세요.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: value }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.replace("/");
        router.refresh();
        return;
      }

      setMessage(data.message || "저장 실패");
    } catch {
      setMessage("닉네임 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-4 text-white">
        <div className="text-sm font-bold text-zinc-400">로그인 확인중...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-4 py-10 text-white">
      <form
        onSubmit={saveNickname}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151522] p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-2 text-sm font-black text-pink-400">WELCOME TO 왕츄.COM</div>
        <h1 className="text-3xl font-black">닉네임 설정</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          처음 한 번만 설정하면 됩니다. 왕츄 사이트에서 사용할 닉네임을 직접 정해주세요.
        </p>

        <label className="mt-7 block text-sm font-black text-zinc-200">닉네임</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            if (message) setMessage("");
          }}
          maxLength={8}
          autoFocus
          autoComplete="off"
          placeholder="2~8자 닉네임 입력"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-base font-bold outline-none transition focus:border-pink-500"
        />
        <p className="mt-2 text-xs text-zinc-500">한글, 영문, 숫자 사용 가능 · 중복 닉네임 사용 불가</p>

        <button
          type="submit"
          disabled={saving || status !== "authenticated"}
          className="mt-6 w-full rounded-2xl bg-pink-500 py-4 text-base font-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "저장중..." : "이 닉네임으로 시작하기"}
        </button>

        {message && (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
