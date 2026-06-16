"use client";

import { useState } from "react";

export default function LiveStatusForm({
  liveStatus,
  liveForce,
}: {
  liveStatus: string;
  liveForce: string;
}) {
  const [status, setStatus] = useState(liveStatus);
  const [force, setForce] = useState(liveForce);
  const [loading, setLoading] = useState(false);

  async function save(nextForce: string, nextStatus: string) {
    setLoading(true);

    const res = await fetch("/api/admin/live-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        liveForce: nextForce,
        liveStatus: nextStatus,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "저장 실패");
      return;
    }

    setForce(nextForce);
    setStatus(nextStatus);
    alert("라이브 상태가 저장되었습니다.");
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
      <div className="mb-6 rounded-2xl bg-slate-800 p-5">
        <p className="text-sm text-slate-400">현재 상태</p>
        <h2 className="mt-2 text-4xl font-black">
          {status === "on" ? (
            <span className="text-green-400">LIVE ON</span>
          ) : (
            <span className="text-red-400">LIVE OFF</span>
          )}
        </h2>

        <p className="mt-3 text-slate-300">
          현재 모드:{" "}
          <span className="font-bold text-yellow-300">
            {force === "auto"
              ? "자동"
              : force === "on"
              ? "강제 ON"
              : "강제 OFF"}
          </span>
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button
          disabled={loading}
          onClick={() => save("auto", status)}
          className="rounded-xl bg-slate-700 px-4 py-4 font-black hover:bg-slate-600 disabled:opacity-50"
        >
          자동 감지
        </button>

        <button
          disabled={loading}
          onClick={() => save("on", "on")}
          className="rounded-xl bg-green-600 px-4 py-4 font-black hover:bg-green-500 disabled:opacity-50"
        >
          강제 ON
        </button>

        <button
          disabled={loading}
          onClick={() => save("auto", "off")}
          className="rounded-xl bg-red-600 px-4 py-4 font-black hover:bg-red-500 disabled:opacity-50"
        >
          강제 OFF
        </button>
      </div>

      <p className="mt-5 text-sm text-slate-400">
        자동 감지는 유튜브 API가 성공하면 ON/OFF를 자동 반영하고, 강제 ON이면 유튜브 API와 상관없이 아이템 사용이 가능합니다.
      </p>
    </section>
  );
}