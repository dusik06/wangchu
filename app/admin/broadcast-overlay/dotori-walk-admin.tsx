"use client";
import { useEffect,useRef,useState } from "react";

export default function DotoriWalkAdmin(){
  const [live,setLive]=useState<any>(null);
  const [form,setForm]=useState<any>(null);
  const [msg,setMsg]=useState("");
  const [overlayUrl,setOverlayUrl]=useState("");
  const dirtyRef=useRef(false);

  const load=async(forceForm=false)=>{
    const r=await fetch("/api/dotori-walk",{cache:"no-store"});
    const d=await r.json();
    if(d.success){
      setLive(d.state);
      if(forceForm||!dirtyRef.current)setForm(d.state);
    }
  };

  useEffect(()=>{
    load(true);
    setOverlayUrl(`${window.location.origin}/overlay/dotori-walk`);
    const t=setInterval(()=>load(false),3000);
    return()=>clearInterval(t);
  },[]);

  if(!live||!form)return <div className="p-6">불러오는 중...</div>;

  const change=(key:string,value:any)=>{dirtyRef.current=true;setForm((prev:any)=>({...prev,[key]:value}))};
  const copyOverlay=async()=>{try{await navigator.clipboard.writeText(overlayUrl);setMsg("오버레이 URL 복사 완료")}catch{setMsg("복사 실패 - URL을 길게 눌러 복사해주세요")}};
  const save=async()=>{
    const r=await fetch("/api/admin/dotori-walk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"saveSettings",...form})});
    if(r.ok){dirtyRef.current=false;setMsg("설정 저장 완료");await load(true)}else setMsg("저장 실패");
  };
  const reset=async()=>{
    if(!confirm("누적 거리와 총 사용 도토리를 0으로 초기화할까요?"))return;
    await fetch("/api/admin/dotori-walk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset"})});
    await load(false);
  };

  const plus=Number(live.plus_dotori||0),minus=Number(live.minus_dotori||0),m=(plus-minus)/10;
  const field=(label:string,key:string,min:number,max:number)=><label className="block"><span className="text-sm text-white/60">{label}</span><input type="number" min={min} max={max} value={form[key]} onChange={e=>change(key,Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3"/></label>;

  return <div className="mx-auto max-w-5xl p-3 md:p-6">
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-xl font-black">현재 상태</h2>
        <div className="mt-4 text-4xl font-black">{m>=1000?(m/1000).toFixed(2)+" km":m.toLocaleString()+" m"}</div>
        <div className="mt-2">총 사용 도토리 {Number(live.total_used).toLocaleString()}개</div>
        <div className="mt-3 text-sm text-white/60">+거리 {(plus/10000).toFixed(2)} km · -거리 {(minus/10000).toFixed(2)} km</div>
        <div className="mt-5"><div className="text-sm font-black text-white/70">OBS / PRISM 오버레이 URL</div><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input readOnly value={overlayUrl} onFocus={e=>e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/><button onClick={copyOverlay} className="min-h-[44px] rounded-xl bg-violet-600 px-4 py-3 font-black">URL 복사</button></div></div>
        <div className="mt-3 flex flex-wrap gap-2"><a href="/overlay/dotori-walk" target="_blank" className="inline-block rounded-xl bg-violet-600 px-4 py-3 font-black">오버레이 열기</a><a href="/dotori-walk" target="_blank" className="inline-block rounded-xl border border-white/10 px-4 py-3 font-black">사용 페이지 열기</a></div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-xl font-black">소리 설정</h2><p className="mt-1 text-sm text-white/50">1~999개는 기존 미션 띠링 소리, 1,000개 이상은 아래 링크를 재생합니다.</p>
        <label className="mt-4 block text-sm">플러스 1,000개 이상 노래 URL<input value={form.plus_song_url||""} onChange={e=>change("plus_song_url",e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3"/></label>
        <label className="mt-3 block text-sm">마이너스 1,000개 이상 노래 URL<input value={form.minus_song_url||""} onChange={e=>change("minus_song_url",e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3"/></label>
      </section>
    </div>
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-xl font-black">오버레이 디자인</h2>
      <p className="mt-1 text-sm text-white/50">수정 중에는 자동 갱신되어도 입력값이 초기화되지 않습니다.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{field("거리 글씨 크기","distance_size",30,140)}{field("총 도토리 크기","total_size",16,70)}{field("+/- 거리 크기","sub_size",14,60)}{field("외곽선 두께","outline_width",0,12)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{[["기본 글씨","font_color"],["+거리","plus_color"],["-거리","minus_color"],["외곽선","outline_color"]].map(([l,k])=><label key={k} className="text-sm text-white/60">{l}<input type="color" value={form[k]||"#ffffff"} onChange={e=>change(k,e.target.value)} className="mt-1 h-12 w-full rounded-lg bg-transparent"/></label>)}</div>
      <div className="mt-5 flex flex-wrap gap-2"><button onClick={save} className="rounded-xl bg-emerald-600 px-5 py-3 font-black">설정 저장</button><button onClick={reset} className="rounded-xl bg-red-600 px-5 py-3 font-black">누적값 초기화</button>{msg&&<span className="self-center text-sm">{msg}</span>}</div>
    </section>
  </div>
}
