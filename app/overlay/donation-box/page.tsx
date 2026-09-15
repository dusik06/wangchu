"use client";
import { subscribeOverlayEvents } from "@/lib/overlay-realtime-client";
import { useEffect, useMemo, useState } from "react";

type State={total:number;entries:{id:number;donorName:string;amount:number}[];settings:any};
const money=(n:number)=>Math.trunc(n).toLocaleString("ko-KR")+"원";
export default function DonationBoxOverlay(){
 const [data,setData]=useState<State|null>(null);
 useEffect(()=>{let active=true; const load=async()=>{try{const r=await fetch(`/api/donation-box?t=${Date.now()}`,{cache:"no-store"});const j=await r.json();if(active)setData(j)}catch{}}; void load(); const unsub=subscribeOverlayEvents((e)=>{if(e.kind==="donation-box")void load();}); return()=>{active=false;unsub()};},[]);
 const stage=useMemo(()=>{if(!data)return 0; const target=Math.max(1,Number(data.settings.targetAmount||1000000)); return Math.min(10,Math.floor((Math.max(0,data.total)/target)*10));},[data]);
 const bundles=useMemo(()=>Array.from({length:stage*5},(_,i)=>i),[stage]);
 if(!data)return <Transparent/>; const s=data.settings; const latest=data.entries[0];
 return <><Transparent/><main style={{width:s.boxWidth+40,padding:20,fontFamily:'Pretendard,"Noto Sans KR",sans-serif',color:"white",textAlign:"center"}}>
   <div style={{fontSize:s.titleFontSize,fontWeight:950,color:"#ff334f",textShadow:"0 2px 8px rgba(0,0,0,.65)",marginBottom:10}}>♥ {s.title} ♥</div>
   <div style={{position:"relative",width:s.boxWidth,height:s.boxHeight,border:"5px solid rgba(255,255,255,.82)",borderTop:"10px solid rgba(255,255,255,.9)",borderRadius:24,background:"linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,45,70,.06))",boxShadow:"inset 0 0 30px rgba(255,255,255,.12),0 12px 35px rgba(0,0,0,.25)",overflow:"hidden",backdropFilter:"blur(2px)"}}>
     <div style={{position:"absolute",left:"50%",top:10,transform:"translateX(-50%)",width:"42%",height:10,borderRadius:99,background:"rgba(15,15,18,.75)",boxShadow:"0 2px 5px rgba(0,0,0,.5)"}}/>
     {bundles.map((i)=>{const scale=s.noteScale/100; const w=105*scale,h=46*scale; const cols=Math.max(2,Math.floor((s.boxWidth-28)/(w*.72))); const row=Math.floor(i/cols), col=i%cols; const x=12+col*((s.boxWidth-30-w)/Math.max(1,cols-1)); const y=s.boxHeight-18-h-row*(h*.58); const rot=((i*17)%13)-6; return <div key={i} style={{position:"absolute",left:x,top:y,width:w,height:h,transform:`rotate(${rot}deg)`,borderRadius:5,background:"linear-gradient(135deg,#f7f0c8,#d8d0a3)",border:"2px solid #aa9f69",boxShadow:"0 3px 7px rgba(0,0,0,.35)",display:"grid",placeItems:"center",color:"#5c5739",fontWeight:950,fontSize:s.noteFontSize,zIndex:10+row}}><span>₩ DONATION</span><i style={{position:"absolute",left:"46%",top:-2,width:"12%",height:"calc(100% + 4px)",background:"rgba(218,45,61,.82)",border:"1px solid rgba(120,20,30,.35)"}}/></div>})}
     {stage===0&&<div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",color:"rgba(255,255,255,.42)",fontSize:s.labelFontSize,fontWeight:800}}>후원금이 들어오면 지폐가 쌓입니다</div>}
     <div style={{position:"absolute",right:12,top:30,zIndex:99,padding:"5px 9px",borderRadius:999,background:"rgba(215,25,48,.88)",fontSize:Math.max(10,s.noteFontSize),fontWeight:950,boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}>{stage*10}%</div>
   </div>
   <div style={{marginTop:12,fontSize:s.labelFontSize,fontWeight:900,textShadow:"0 2px 6px #000"}}>{s.bottomLabel}</div>
   <div style={{fontSize:s.amountFontSize,lineHeight:1.15,fontWeight:950,color:"#ff334f",textShadow:"0 2px 8px rgba(0,0,0,.75)"}}>{money(data.total)}</div>
   <div style={{fontSize:Math.max(10,s.labelFontSize-2),fontWeight:800,color:"rgba(255,255,255,.72)",textShadow:"0 2px 6px #000"}}>목표 {money(s.targetAmount)}</div>
   {latest&&<div style={{marginTop:7,fontSize:s.donorFontSize,fontWeight:850,textShadow:"0 2px 6px #000"}}>최근 후원 · {latest.donorName} {money(latest.amount)}</div>}
 </main></>;
}
function Transparent(){return <style jsx global>{`html,body{margin:0!important;padding:0!important;background:transparent!important;overflow:hidden!important}body,body>div,#__next,[data-nextjs-scroll-focus-boundary]{background:transparent!important}body>header,body>nav,body>footer,body>div>header,body>div>nav,body>div>footer{display:none!important}*{box-sizing:border-box}`}</style>}
