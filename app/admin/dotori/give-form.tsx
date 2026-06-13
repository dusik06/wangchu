"use client";

import { useState } from "react";

export default function DotoriGiveForm({ userId }: { userId: number }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("관리자 지급");

  async function giveDotori() {
    const res = await fetch("/api/admin-dotori", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        amount,
        reason,
      }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.reload();
    }
  }

  return (
    <div className="flex gap-2">
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="수량"
        className="bg-slate-800 rounded-lg px-3 py-2 w-24"
      />

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="사유"
        className="bg-slate-800 rounded-lg px-3 py-2 w-40"
      />

      <button
        onClick={giveDotori}
        className="bg-pink-500 px-4 py-2 rounded-lg"
      >
        지급
      </button>
    </div>
  );
}