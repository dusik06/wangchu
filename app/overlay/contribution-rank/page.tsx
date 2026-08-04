"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
};

type Participant = {
  id: number;
  rankName: string;
  streamerName: string;
  contribution: number;
  amounts: Record<string, number>;
};

type RankData = {
  title: string;
  showTitle: boolean;
  categories: Category[];
  participants: Participant[];
};

const rowColors = ["#ef3340", "#00b94f", "#1769e8"];

function formatMoney(value: number) {
  return Math.trunc(Number(value || 0)).toLocaleString("ko-KR");
}

export default function ContributionRankOverlay() {
  const [data, setData] = useState<RankData>({
    title: "기여도 순위",
    showTitle: true,
    categories: [],
    participants: [],
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/contribution-rank?t=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (active) setData(json);
      } catch {}
    }

    load();
    const timer = window.setInterval(load, 700);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const columns = useMemo(
    () => [
      { key: "rank", label: "직급", width: "0.85fr" },
      { key: "streamer", label: "스트리머", width: "1.15fr" },
      ...data.categories.map((category) => ({
        key: `category-${category.id}`,
        label: category.name,
        width: "1fr",
      })),
      { key: "contribution", label: "기여도", width: "0.72fr" },
    ],
    [data.categories]
  );

  const gridTemplateColumns = columns.map((column) => column.width).join(" ");

  return (
    <main className="min-h-screen bg-transparent p-3 font-sans text-white">
      <div className="mx-auto w-full max-w-[1200px] rounded-[18px] border-[5px] border-[#bfc2c7] bg-[#090b0d] p-[5px] shadow-[0_0_0_2px_#36393e,0_0_0_7px_#e4e5e7,0_8px_30px_rgba(0,0,0,.48)]">
        <section className="overflow-hidden rounded-[8px] border-2 border-[#555a60] bg-[#090b0d]">
          {data.showTitle && data.title.trim() && (
            <header className="px-3 pb-2.5 pt-3 text-center">
              <h1 className="truncate text-[clamp(16px,2.35vw,27px)] font-black tracking-tight">
                {data.title}
              </h1>
            </header>
          )}

          <div
            className="grid items-center border-b-2 border-[#d61d66] px-2 text-center text-[clamp(10px,1.15vw,15px)] font-black"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column) => (
              <div key={column.key} className="min-w-0 px-1 py-2">
                <span className="block truncate">{column.label}</span>
              </div>
            ))}
          </div>

          <div>
            {data.participants.map((participant, index) => (
              <div
                key={participant.id}
                className="grid items-center text-center text-[clamp(11px,1.25vw,17px)] font-black leading-none"
                style={{
                  gridTemplateColumns,
                  background: index < 3 ? rowColors[index] : "rgba(255,255,255,.025)",
                  borderBottom: "1px solid rgba(255,255,255,.07)",
                  minHeight: "42px",
                }}
              >
                <div className="min-w-0 truncate px-1.5 py-2">{participant.rankName}</div>
                <div className="min-w-0 truncate px-1.5 py-2">{participant.streamerName}</div>
                {data.categories.map((category) => (
                  <div key={category.id} className="min-w-0 truncate px-1.5 py-2 tabular-nums">
                    {formatMoney(participant.amounts[String(category.id)] || 0)}
                  </div>
                ))}
                <div className="min-w-0 truncate px-1.5 py-2 tabular-nums">
                  {participant.contribution}
                </div>
              </div>
            ))}

            {data.participants.length === 0 && (
              <div className="py-16 text-center text-lg font-bold text-white/50">
                등록된 인원이 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
