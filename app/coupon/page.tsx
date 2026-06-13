"use client";

import { useState } from "react";

export default function CouponPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function useCoupon() {
    const res = await fetch("/api/coupon-use", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setMessage(data.message);

    if (data.success) {
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="bg-slate-900 rounded-2xl p-8 w-full max-w-md border border-slate-800">
        <h1 className="text-3xl font-bold text-pink-400 mb-3">
          쿠폰 입력
        </h1>

        <p className="text-gray-300 mb-6">
          방송에서 공개된 쿠폰 코드를 입력하면 도토리를 받을 수 있어요.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="예: WANGCHU500"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4 outline-none"
        />

        <button
          onClick={useCoupon}
          className="w-full bg-pink-500 py-3 rounded-xl font-bold"
        >
          쿠폰 사용하기
        </button>

        {message && (
          <p className="text-pink-400 text-sm mt-4">
            {message}
          </p>
        )}

        <a
          href="/"
          className="block text-center text-gray-400 mt-5"
        >
          메인으로 돌아가기
        </a>
      </div>
    </main>
  );
}