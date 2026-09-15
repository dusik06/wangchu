"use client";
import { useEffect, useMemo, useState } from "react";

type S = Record<string, any>;
const fields=[
  ["title_color","제목"],["name_color","이름"],["left_amount_color","왼쪽 금액"],["right_amount_color","오른쪽 금액"],
  ["total_label_color","하단 문구"],["total_amount_color","총 금액"],["accent_color","포인트"],["panel_color","패널"],["border_color","테두리"]
];
const money=(n:any)=>Math.max(0,Number(n)||0).toLocaleString("ko-KR");
export default function DonationGameAdmin(){
 const [s,setS]=useState<S|null>(null),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[customL,setCustomL]=useState(""),[customR,setCustomR]=useState("");
 const overlayUrl=useMemo(()=>typeof window==="undefined"?"/overlay/donation-game":`${window.location.origin}/overlay/donation-game`,[]);
 useEffect(()=>{(async()=>{try{const r=await fetch(`/api/donation-game?t=${Date.now()}`,{cache:"no-store"});const j=await r.json();setS(j.state)}catch{setMsg("불러오지 못했습니다.")}})()},[]); // 관리자 화면 진입 시 1회
 async function send(body:any){setBusy(true);setMsg("");try{const r=await fetch("/api/admin/donation-game",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||"처리하지 못했습니다.");if(j.state)setS(j.state);return true}catch(e){setMsg(e instanceof Error?e.message:"오류가 발생했습니다.");return false}finally{setBusy(false)}}
 async function add(side:"left"|"right",delta:number){await send({action:"amount",side,delta})}
 async function direct(side:"left"|"right",v:string){const n=Number(v.replace(/[^0-9]/g,""));if(!Number.isFinite(n)){setMsg("금액을 확인해주세요.");return}if(await send({action:"set_amount",side,amount:n})){side==="left"?setCustomL(""):setCustomR("")}}
 if(!s)return <main className="p-6 text-white">{msg||"불러오는 중..."}</main>;
 return <main className="min-h-screen bg-[#090613] px-3 py-5 text-white md:px-6"><div className="mx-auto max-w-[1100px] space-y-5">
  <div><div className="text-sm font-black text-pink-400">기부가 좋다</div><h1 className="text-2xl font-black">기부금 오버레이 관리</h1><p className="mt-2 text-sm text-white/50">자동 새로고침 없음 · 버튼을 누르거나 설정을 저장할 때만 명령을 보냅니다.</p></div>
  {msg&&<div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">{msg}</div>}
  <section className="rounded-2xl border border-white/10 bg-[#151027] p-4"><div className="mb-2 font-black">방송 오버레이 주소</div><div className="flex gap-2"><input readOnly value={overlayUrl} className="min-w-0 flex-1 rounded-xl bg-black/30 px-3 py-3 text-sm"/><button onClick={()=>navigator.clipboard.writeText(overlayUrl)} className="rounded-xl bg-violet-600 px-4 font-black">복사</button></div></section>
  <section className="grid gap-4 md:grid-cols-2">
   <Player title={s.left_name} amount={s.left_amount} value={customL} setValue={setCustomL} disabled={busy} onAdd={(n:number)=>add("left",n)} onDirect={()=>direct("left",customL)}/>
   <Player title={s.right_name} amount={s.right_amount} value={customR} setValue={setCustomR} disabled={busy} onAdd={(n:number)=>add("right",n)} onDirect={()=>direct("right",customR)}/>
  </section>
  <section className="rounded-2xl border border-white/10 bg-[#151027] p-4 md:p-5"><div className="flex items-center justify-between"><div><div className="font-black">현재 총 기부금</div><div className="mt-1 text-2xl font-black">{money(Number(s.left_amount)+Number(s.right_amount))}원</div></div><button disabled={busy} onClick={()=>{if(confirm("양쪽 기부금을 모두 0원으로 초기화할까요?"))send({action:"reset_amounts"})}} className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200">금액 초기화</button></div></section>
  <section className="rounded-2xl border border-white/10 bg-[#151027] p-4 md:p-5"><h2 className="mb-4 text-lg font-black">문구 · 디자인</h2>
   <div className="grid gap-3 md:grid-cols-2">{[["title","상단 제목"],["left_name","왼쪽 이름"],["right_name","오른쪽 이름"],["bottom_label","하단 문구"]].map(([k,l])=><label key={k} className="text-sm font-bold text-white/70">{l}<input value={s[k]||""} onChange={e=>setS({...s,[k]:e.target.value})} className="mt-1 block min-h-11 w-full rounded-xl border border-white/10 bg-[#090613] px-3 text-white outline-none"/></label>)}</div>
   <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">{fields.map(([k,l])=><label key={k} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-bold text-white/65"><span>{l} 색상</span><div className="mt-2 flex items-center gap-2"><input type="color" value={s[k]} onChange={e=>setS({...s,[k]:e.target.value.toUpperCase()})} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"/><span className="text-[11px]">{s[k]}</span></div></label>)}</div>
   <div className="mt-4 grid gap-4 md:grid-cols-3"><Range label={`패널 투명도 ${s.panel_opacity}%`} value={s.panel_opacity} onChange={(v)=>setS({...s,panel_opacity:v})}/><Range label={`테두리 투명도 ${s.border_opacity}%`} value={s.border_opacity} onChange={(v)=>setS({...s,border_opacity:v})}/><Range label={`전체 크기 ${s.compact_scale}%`} value={s.compact_scale} min={70} max={130} onChange={(v)=>setS({...s,compact_scale:v})}/></div>
   <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!Number(s.shadow_enabled)} onChange={e=>setS({...s,shadow_enabled:e.target.checked?1:0})}/> 그림자 사용</label>
   <button disabled={busy} onClick={()=>send({action:"save_design",...s})} className="mt-5 min-h-12 w-full rounded-xl bg-pink-600 px-5 font-black disabled:opacity-50">문구 · 디자인 저장</button>
  </section>
 </div></main>
}
function Player({title,amount,value,setValue,disabled,onAdd,onDirect}:any){return <section className="rounded-2xl border border-white/10 bg-[#151027] p-4"><div className="text-sm font-bold text-white/55">{title}</div><div className="mt-1 text-3xl font-black">{money(amount)}원</div><div className="mt-4 grid grid-cols-3 gap-2">{[10000,50000,100000].map(n=><button key={n} disabled={disabled} onClick={()=>onAdd(n)} className="min-h-12 rounded-xl bg-violet-600 font-black disabled:opacity-50">+{n/10000}만</button>)}</div><div className="mt-2 flex gap-2"><input inputMode="numeric" placeholder="현재 금액 직접입력" value={value ? Number(value.replace(/[^0-9]/g,"")).toLocaleString("ko-KR") : ""} onChange={e=>setValue(e.target.value.replace(/[^0-9]/g,""))} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#090613] px-3"/><button disabled={disabled} onClick={onDirect} className="min-h-12 rounded-xl bg-white/10 px-4 font-black">적용</button></div></section>}
function Range({label,value,onChange,min=0,max=100}:any){return <label className="text-sm font-bold text-white/70">{label}<input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))} className="mt-2 block w-full"/></label>}
