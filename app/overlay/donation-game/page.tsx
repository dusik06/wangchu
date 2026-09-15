"use client";

import { subscribeOverlayEvents } from "@/lib/overlay-realtime-client";
import { useEffect, useState } from "react";

type State = Record<string, any>;
function rgba(hex: string, opacity: number) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0,2),16)||0, g=parseInt(h.slice(2,4),16)||0, b=parseInt(h.slice(4,6),16)||0;
  return `rgba(${r},${g},${b},${Math.max(0,Math.min(100,opacity))/100})`;
}
const money = (n: any) => Math.max(0, Number(n)||0).toLocaleString("ko-KR") + "원";

export default function DonationGameOverlay() {
  const [s, setS] = useState<State | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const r=await fetch(`/api/donation-game?t=${Date.now()}`,{cache:"no-store"}); const j=await r.json(); if(active&&j.state)setS(j.state); } catch {}
    };
    void load(); // 화면을 처음 열 때 딱 1회만 상태를 읽음
    const unsub = subscribeOverlayEvents((e) => { if (e.kind === "donation-game") void load(); });
    return () => { active=false; unsub(); };
  }, []);
  if (!s) return <Transparent />;
  const scale=(Number(s.compact_scale)||100)/100;
  const total=(Number(s.left_amount)||0)+(Number(s.right_amount)||0);
  const shadow=Number(s.shadow_enabled) ? "0 8px 28px rgba(0,0,0,.30)" : "none";
  return <><Transparent/><main style={{padding:8,fontFamily:'Pretendard,"Noto Sans KR",sans-serif',color:"white"}}>
    <section style={{width:`min(${720*scale}px, 100%)`,borderRadius:14,overflow:"hidden",background:rgba(s.panel_color,Number(s.panel_opacity)),border:`1px solid ${rgba(s.border_color,Number(s.border_opacity))}`,boxShadow:shadow,backdropFilter:"blur(5px)"}}>
      <div style={{height:3,background:s.accent_color}} />
      <div style={{padding:`${8*scale}px ${16*scale}px ${5*scale}px`,textAlign:"center",fontSize:`${19*scale}px`,fontWeight:950,lineHeight:1.1,color:s.title_color,textShadow:"0 2px 4px rgba(0,0,0,.75)"}}>{s.title}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:12,padding:`${5*scale}px ${18*scale}px ${8*scale}px`}}>
        <Side name={s.left_name} amount={s.left_amount} nameColor={s.name_color} amountColor={s.left_amount_color} scale={scale}/>
        <div style={{fontSize:`${12*scale}px`,fontWeight:950,color:s.accent_color,opacity:.95}}>VS</div>
        <Side name={s.right_name} amount={s.right_amount} nameColor={s.name_color} amountColor={s.right_amount_color} scale={scale}/>
      </div>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:9,borderTop:`1px solid ${rgba(s.border_color,Math.min(100,Number(s.border_opacity)+2))}`,padding:`${6*scale}px ${14*scale}px ${7*scale}px`,background:"rgba(0,0,0,.12)"}}>
        <span style={{fontSize:`${11*scale}px`,fontWeight:850,color:s.total_label_color,textShadow:"0 1px 3px rgba(0,0,0,.8)"}}>{s.bottom_label}</span>
        <strong style={{fontSize:`${18*scale}px`,fontWeight:950,color:s.total_amount_color,fontVariantNumeric:"tabular-nums",textShadow:"0 2px 4px rgba(0,0,0,.8)"}}>{money(total)}</strong>
      </div>
    </section>
  </main></>;
}
function Side({name,amount,nameColor,amountColor,scale}:any){return <div style={{minWidth:0,textAlign:"center"}}><div style={{fontSize:`${12*scale}px`,fontWeight:850,color:nameColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textShadow:"0 1px 3px rgba(0,0,0,.85)"}}>{name}</div><div style={{marginTop:1,fontSize:`${22*scale}px`,lineHeight:1.05,fontWeight:950,color:amountColor,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap",textShadow:"0 2px 4px rgba(0,0,0,.85)"}}>{money(amount)}</div></div>}
function Transparent(){return <style jsx global>{`html,body{margin:0!important;padding:0!important;background:transparent!important} body,body>div,#__next,[data-nextjs-scroll-focus-boundary]{background:transparent!important} body>header,body>nav,body>footer,body>div>header,body>div>nav,body>div>footer{display:none!important} *{box-sizing:border-box}`}</style>}
