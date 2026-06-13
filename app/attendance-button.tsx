"use client";

import { useState } from "react";

export default function AttendanceButton() {
  const [message, setMessage] = useState("");

  async function checkAttendance() {
    const res = await fetch("/api/attendance", {
      method: "POST",
    });

    const data = await res.json();
    setMessage(data.message);

    if (data.success) {
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  }

  return (
    <div>
      <button
        onClick={checkAttendance}
        className="w-full bg-slate-800 hover:bg-slate-700 rounded-xl p-5 text-left"
      >
        📅 출석체크
        <p className="text-pink-400 font-bold mt-2">도토리 받기</p>
      </button>

      {message && (
        <p className="text-sm text-pink-400 mt-2">
          {message}
        </p>
      )}
    </div>
  );
}