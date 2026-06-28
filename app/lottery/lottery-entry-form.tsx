"use client";

import { useState } from "react";

export default function LotteryEntryForm({ roundId }: { roundId: number }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleNumber(num: number) {
    if (loading) return;

    if (selected.includes(num)) {
      setSelected(selected.filter((item) => item !== num));
      return;
    }

    if (selected.length >= 5) {
      alert("번호는 5개까지만 선택할 수 있습니다.");
      return;
    }

    setSelected([...selected, num]);
  }

  async function submitEntry() {
    if (selected.length !== 5) {
      alert("번호 5개를 선택해주세요.");
      return;
    }

    if (loading) return;

    const ok = confirm(
      `선택 번호: ${selected.sort((a, b) => a - b).join(", ")}\n참가비 50도토리를 사용하시겠습니까?`
    );

    if (!ok) return;

    setLoading(true);

    const res = await fetch("/api/lottery/enter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roundId,
        numbers: selected.sort((a, b) => a - b),
      }),
    });

    const data = await res.json();

    alert(data.message || "처리되었습니다.");

    if (data.success) {
      location.reload();
    }

    setLoading(false);
  }

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => toggleNumber(num)}
            className={`rounded-xl px-3 py-3 font-black ${
              selected.includes(num)
                ? "bg-yellow-400 text-black"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {num}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          선택한 번호:{" "}
          <span className="font-black text-yellow-300">
            {selected.sort((a, b) => a - b).join(", ") || "없음"}
          </span>
        </p>

        <button
          onClick={submitEntry}
          disabled={loading}
          className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black disabled:opacity-50"
        >
          {loading ? "참여 중..." : "참여하기"}
        </button>
      </div>
    </div>
  );
}