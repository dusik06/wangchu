"use client";

import { useEffect, useState } from "react";

export default function MyDotori() {
  const [dotori, setDotori] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;

        if (data.user) {
          setDotori(Number(data.user.dotori || 0));
        }

        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="rounded-xl bg-slate-800 p-5">
      🌰 보유 도토리
      <p className="mt-2 text-2xl font-bold">
        {!loaded ? "불러오는 중..." : dotori === null ? "로그인 필요" : `${dotori.toLocaleString()}개`}
      </p>
    </div>
  );
}