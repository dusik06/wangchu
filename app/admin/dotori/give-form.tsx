"use client";

import { useState } from "react";

export default function DotoriGiveForm({ userId }: { userId: number }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("관리자 지급");
  const [loading, setLoading] = useState(false);

  async function changeDotori(action: "give" | "deduct") {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert("수량을 1개 이상 입력해주세요.");
      return;
    }

    if (action === "deduct" && !confirm(`${numericAmount.toLocaleString()} 도토리를 차감할까요?`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin-dotori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: numericAmount, reason, action }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[100px_160px_auto_auto]">
      <input value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="수량" className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유" className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500" />
      <button disabled={loading} onClick={() => changeDotori("give")} className="rounded-lg bg-pink-500 px-4 py-2 font-bold disabled:opacity-50">지급</button>
      <button disabled={loading} onClick={() => changeDotori("deduct")} className="rounded-lg bg-red-600 px-4 py-2 font-bold disabled:opacity-50">차감</button>
    </div>
  );
}
