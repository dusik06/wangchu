"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: number; name: string };
type Participant = { id: number; rankName: string; streamerName: string; contribution: number; amounts: Record<string, number> };
type DisplaySettings = {
  titleFontSize: number; headerFontSize: number; bodyFontSize: number; rowHeight: number;
  scalePercent: number; borderWidth: number; borderRadius: number; showShadow: boolean;
  titleAlign: "left" | "center" | "right"; columnGap: number; useCommas: boolean;
  firstColor: string; secondColor: string; thirdColor: string;
};
type RankData = { title: string; showTitle: boolean; display: DisplaySettings; categories: Category[]; participants: Participant[] };

const defaultDisplay: DisplaySettings = { titleFontSize:24, headerFontSize:13, bodyFontSize:15, rowHeight:42, scalePercent:100, borderWidth:5, borderRadius:18, showShadow:true, titleAlign:"center", columnGap:0, useCommas:true, firstColor:"#ef3340", secondColor:"#00b94f", thirdColor:"#1769e8" };

export default function ContributionRankOverlay() {
  const [data, setData] = useState<RankData>({ title:"기여도 순위", showTitle:true, display:defaultDisplay, categories:[], participants:[] });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/contribution-rank?t=${Date.now()}`, { cache:"no-store" });
        const json = await res.json();
        if (active) setData({ ...json, display: { ...defaultDisplay, ...(json.display || {}) } });
      } catch {}
    }
    load();
    const timer = window.setInterval(load, 700);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const columns = useMemo(() => [
    { key:"rank", label:"직급", width:"0.85fr" },
    { key:"streamer", label:"스트리머", width:"1.15fr" },
    ...data.categories.map(c => ({ key:`category-${c.id}`, label:c.name, width:"1fr" })),
    { key:"contribution", label:"기여도", width:"0.72fr" },
  ], [data.categories]);
  const gridTemplateColumns = columns.map(c => c.width).join(" ");
  const d = data.display || defaultDisplay;
  const colors = [d.firstColor, d.secondColor, d.thirdColor];
  const formatNumber = (v:number) => d.useCommas ? Math.trunc(Number(v||0)).toLocaleString("ko-KR") : String(Math.trunc(Number(v||0)));

  return (
    <main className="min-h-screen bg-transparent p-2 font-sans text-white">
      <div className="mx-auto origin-top w-full max-w-[1200px]" style={{ transform:`scale(${d.scalePercent/100})`, transformOrigin:"top center" }}>
        <div style={{ borderWidth:d.borderWidth, borderRadius:d.borderRadius, borderColor:"#bfc2c7", borderStyle:"solid", background:"transparent", padding:5, boxShadow:d.showShadow ? "0 0 0 2px #36393e,0 0 0 7px #e4e5e7,0 8px 30px rgba(0,0,0,.48)" : "0 0 0 2px #36393e,0 0 0 7px #e4e5e7" }}>
          <section style={{ overflow:"hidden", borderRadius:Math.max(0,d.borderRadius-10), border:"2px solid #555a60", background:"#090b0d" }}>
            {data.showTitle && data.title.trim() && (
              <header style={{ padding:"10px 12px 8px", textAlign:d.titleAlign }}>
                <h1 style={{ margin:0, fontSize:d.titleFontSize, fontWeight:900, lineHeight:1.15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{data.title}</h1>
              </header>
            )}
            <div style={{ display:"grid", gridTemplateColumns, gap:d.columnGap, alignItems:"center", borderBottom:"2px solid #d61d66", padding:"0 8px", textAlign:"center", fontSize:d.headerFontSize, fontWeight:900 }}>
              {columns.map(c => <div key={c.key} style={{ minWidth:0, padding:"8px 4px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.label}</div>)}
            </div>
            <div>
              {data.participants.map((p,index) => (
                <div key={p.id} style={{ display:"grid", gridTemplateColumns, gap:d.columnGap, alignItems:"center", minHeight:d.rowHeight, textAlign:"center", fontSize:d.bodyFontSize, fontWeight:900, lineHeight:1, background:index<3?colors[index]:"rgba(255,255,255,.025)", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ minWidth:0, padding:"8px 6px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.rankName}</div>
                  <div style={{ minWidth:0, padding:"8px 6px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.streamerName}</div>
                  {data.categories.map(c => <div key={c.id} style={{ minWidth:0, padding:"8px 6px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontVariantNumeric:"tabular-nums" }}>{formatNumber(p.amounts[String(c.id)]||0)}</div>)}
                  <div style={{ minWidth:0, padding:"8px 6px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontVariantNumeric:"tabular-nums" }}>{formatNumber(p.contribution)}</div>
                </div>
              ))}
              {data.participants.length===0 && <div style={{ padding:"55px 12px", textAlign:"center", fontSize:d.bodyFontSize, fontWeight:700, color:"rgba(255,255,255,.5)" }}>등록된 인원이 없습니다.</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
