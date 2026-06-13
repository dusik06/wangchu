"use client";

import { useState } from "react";

export default function CreateCouponForm() {
  const [code, setCode] = useState("");
  const [reward, setReward] = useState("");
  const [maxUsage, setMaxUsage] = useState("");
  const [expiredAt, setExpiredAt] = useState("");

  async function createCoupon() {
    const res = await fetch("/api/admin-coupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        reward,
        maxUsage,
        expiredAt: expiredAt ? expiredAt + " 23:59:59" : null,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6 mb-6">
      <h2 className="text-2xl font-bold mb-5">쿠폰 생성</h2>

      <div className="grid grid-cols-4 gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="쿠폰코드 예: WANGCHU500"
          className="bg-slate-800 rounded-lg px-4 py-3"
        />

        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="지급 도토리"
          className="bg-slate-800 rounded-lg px-4 py-3"
        />

        <input
          value={maxUsage}
          onChange={(e) => setMaxUsage(e.target.value)}
          placeholder="최대 사용 인원"
          className="bg-slate-800 rounded-lg px-4 py-3"
        />

        <input
          type="date"
          value={expiredAt}
          onChange={(e) => setExpiredAt(e.target.value)}
          className="bg-slate-800 rounded-lg px-4 py-3"
        />
      </div>

      <button
        onClick={createCoupon}
        className="bg-pink-500 px-5 py-3 rounded-lg mt-4 font-bold"
      >
        쿠폰 생성하기
      </button>
    </div>
  );
}