"use client";

import { useState } from "react";
import ContributionRankAdmin from "@/app/admin/contribution-rank/contribution-rank-admin";
import DoganiAdmin from "./dogani-admin";

type Tab = "contribution" | "dogani";

export default function BroadcastOverlayTool() {
  const [tab, setTab] = useState<Tab>("contribution");

  return (
    <div className="min-h-screen bg-[#090613] text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#090613]/95 px-3 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black text-violet-400">방송용 오버레이</div>
            <div className="text-xl font-black md:text-2xl">방송 오버레이 관리</div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setTab("contribution")}
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black transition ${
                tab === "contribution"
                  ? "bg-violet-600 text-white"
                  : "border border-white/10 bg-white/5 text-white/70"
              }`}
            >
              기여도표
            </button>
            <button
              type="button"
              onClick={() => setTab("dogani")}
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black transition ${
                tab === "dogani"
                  ? "bg-rose-600 text-white"
                  : "border border-white/10 bg-white/5 text-white/70"
              }`}
            >
              도가니게임
            </button>
            <a
              href="/admin"
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/70"
            >
              관리자 홈
            </a>
          </div>
        </div>
      </div>

      {tab === "contribution" ? <ContributionRankAdmin /> : <DoganiAdmin />}
    </div>
  );
}
