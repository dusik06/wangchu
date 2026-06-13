"use client";

import { useEffect, useState } from "react";

export default function MyDotori() {
  const [dotori, setDotori] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setDotori(data.user.dotori);
        }
      });
  }, []);

  return (
    <div className="bg-slate-800 rounded-xl p-5">
      🌰 보유 도토리
      <p className="text-2xl font-bold mt-2">
        {dotori === null ? "로그인 필요" : `${dotori}개`}
      </p>
    </div>
  );
}