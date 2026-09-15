"use client";
import { subscribeOverlayEvents } from "@/lib/overlay-realtime-client";
import { useEffect, useMemo, useState } from "react";

type State={total:number;entries:{id:number;donorName:string;amount:number}[];settings:any};
const money=(n:number)=>Math.trunc(n).toLocaleString("ko-KR")+"원";

export default function DonationBoxOverlay(){
 const [data,setData]=useState<State|null>(null);
 useEffect(()=>{let active=true; const load=async()=>{try{const r=await fetch(`/api/donation-box?t=${Date.now()}`,{cache:"no-store"});const j=await r.json();if(active)setData(j)}catch{}}; void load(); const unsub=subscribeOverlayEvents((e)=>{if(e.kind==="donation-box")void load();}); return()=>{active=false;unsub()};},[]);
 const stage=useMemo(()=>{if(!data)return 0;const target=Math.max(1,Number(data.settings.targetAmount||1000000));return Math.min(10,Math.floor((Math.max(0,data.total)/target)*10));},[data]);
 if(!data)return <Transparent/>;
 const s=data.settings;
 const pileCount=stage===0?0:stage*9;
 const pileHeight=Math.max(0,(s.boxHeight-42)*(stage/10));
 const notes=Array.from({length:pileCount},(_,i)=>i);
 return <><Transparent/><main style={{width:s.boxWidth+80,padding:"22px 40px 28px",fontFamily:'Pretendard,"Noto Sans KR",sans-serif',color:"white",textAlign:"center"}}>
   <div style={{fontSize:s.titleFontSize,fontWeight:950,color:"#ff334f",textShadow:"0 2px 8px rgba(0,0,0,.65)",marginBottom:10}}>♥ {s.title} ♥</div>
   <div style={{position:"relative",width:s.boxWidth,height:s.boxHeight,border:"5px solid rgba(255,255,255,.82)",borderTop:"10px solid rgba(255,255,255,.9)",borderRadius:24,background:"linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,45,70,.045))",boxShadow:"inset 0 0 30px rgba(255,255,255,.12),0 12px 35px rgba(0,0,0,.25)",overflow:"hidden",backdropFilter:"blur(2px)",margin:"0 auto"}}>
     <div style={{position:"absolute",left:"50%",top:10,transform:"translateX(-50%)",width:"42%",height:10,borderRadius:99,background:"rgba(15,15,18,.75)",boxShadow:"0 2px 5px rgba(0,0,0,.5)",zIndex:100}}/>
     <div style={{position:"absolute",left:0,right:0,bottom:0,height:Math.max(6,pileHeight),overflow:"visible"}}>
       {notes.map((i)=>{
         const scale=Math.max(.55,Number(s.noteScale||100)/100);
         const w=94*scale,h=40*scale;
         const cols=Math.max(4,Math.floor((s.boxWidth-12)/(w*.58)));
         const row=Math.floor(i/cols),col=i%cols;
         const rowStep=Math.max(18,h*.43);
         const baseX=col*((s.boxWidth-w)/Math.max(1,cols-1));
         const jitterX=((i*37)%25)-12;
         const jitterY=((i*19)%13)-6;
         const x=Math.max(-8,Math.min(s.boxWidth-w+8,baseX+jitterX));
         const y=Math.max(-8,pileHeight-h-row*rowStep+jitterY);
         const rot=((i*29)%31)-15;
         return <Bill key={i} x={x} y={y} w={w} h={h} rot={rot} fontSize={Number(s.noteFontSize||10)}/>;
       })}
     </div>
     {stage>=2&&<Bill x={s.boxWidth*.18} y={Math.max(25,s.boxHeight-pileHeight-80)} w={82*(s.noteScale/100)} h={35*(s.noteScale/100)} rot={-18} fontSize={s.noteFontSize}/>} 
     {stage>=5&&<Bill x={s.boxWidth*.62} y={Math.max(35,s.boxHeight-pileHeight-120)} w={88*(s.noteScale/100)} h={37*(s.noteScale/100)} rot={13} fontSize={s.noteFontSize}/>} 
     {stage>=8&&<Bill x={s.boxWidth*.42} y={Math.max(28,s.boxHeight-pileHeight-165)} w={78*(s.noteScale/100)} h={33*(s.noteScale/100)} rot={-7} fontSize={s.noteFontSize}/>} 
   </div>
   <div style={{marginTop:12,fontSize:s.labelFontSize,fontWeight:900,textShadow:"0 2px 6px #000"}}>{s.bottomLabel}</div>
   <div style={{fontSize:s.amountFontSize,lineHeight:1.15,fontWeight:950,color:"#ff334f",textShadow:"0 2px 8px rgba(0,0,0,.75)"}}>{money(data.total)}</div>
 </main></>;
}

function Bill({x,y,w,h,rot,fontSize}:{x:number;y:number;w:number;h:number;rot:number;fontSize:number}){
 return <div style={{position:"absolute",left:x,top:y,width:w,height:h,transform:`rotate(${rot}deg)`,borderRadius:2,background:"linear-gradient(135deg,#dce6c7 0%,#eef2dc 48%,#cbd8b5 100%)",border:"1px solid rgba(65,83,54,.85)",boxShadow:"0 3px 5px rgba(0,0,0,.35)",color:"#52624b",fontWeight:950,fontSize:Math.max(6,fontSize*.72),display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
   <span style={{position:"absolute",inset:3,border:"1px solid rgba(74,94,62,.55)",borderRadius:1}}/>
   <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",fontSize:Math.max(8,fontSize*.95),fontWeight:950}}>₩</span>
   <span style={{width:h*.58,height:h*.58,borderRadius:"50%",border:"1px solid rgba(74,94,62,.55)",background:"rgba(113,137,94,.12)"}}/>
   <span style={{position:"absolute",right:5,bottom:2,fontSize:Math.max(5,fontSize*.55)}}>DONATION</span>
 </div>;
}
function Transparent(){return <style jsx global>{`html,body{margin:0!important;padding:0!important;background:transparent!important;overflow:hidden!important}body,body>div,#__next,[data-nextjs-scroll-focus-boundary]{background:transparent!important}body>header,body>nav,body>footer,body>div>header,body>div>nav,body>div>footer{display:none!important}*{box-sizing:border-box}`}</style>}
