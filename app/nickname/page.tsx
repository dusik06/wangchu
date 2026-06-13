"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NicknamePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");

  async function saveNickname() {
    const res = await fetch("/api/nickname", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nickname }),
    });

    const data = await res.json();

    if (data.success) {
      router.push("/");
    } else {
      setMessage(data.message || "저장 실패");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="bg-slate-900 rounded-2xl p-8 w-full max-w-md border border-slate-800">
        <h1 className="text-3xl font-bold text-pink-400 mb-3">
          닉네임 설정
        </h1>

        <p className="text-gray-300 mb-6">
          왕츄 팬사이트에서 사용할 닉네임을 입력해주세요.
        </p>

        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임 입력"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4 outline-none"
        />

        <button
          onClick={saveNickname}
          className="w-full bg-pink-500 py-3 rounded-xl font-bold"
        >
          닉네임 저장하기
        </button>

        {message && (
          <p className="text-red-400 text-sm mt-4">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}