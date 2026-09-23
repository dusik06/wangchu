export const VERSION = 1;
export const HZ = 120;
export const APPLE_SECONDS = 120;
export const WALK_SECONDS = 600;
export const COLS = 17;
export const ROWS = 10;
export type Game = "ten" | "walk";
export type Replay = { version: number; end: number; moves: number[][]; reason: "complete" | "quit" | "hidden" | "lag" };
export const isGame = (x: unknown): x is Game => x === "ten" || x === "walk";
export function random(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function makeBoard(seed: number) { const r = random(seed), b = Array.from({ length: COLS * ROWS }, () => 1 + Math.floor(r() * 9)); b[1] = 10 - b[0]; return b; }
export function gridSelection(x1:number,y1:number,x2:number,y2:number,left=34,top=44,cell=44){
  const col=(x:number)=>Math.max(0,Math.min(COLS-1,Math.floor((x-left)/cell)));
  const row=(y:number)=>Math.max(0,Math.min(ROWS-1,Math.floor((y-top)/cell)));
  const c1=col(x1),c2=col(x2),r1=row(y1),r2=row(y2);
  return [Math.min(c1,c2),Math.min(r1,r2),Math.max(c1,c2),Math.max(r1,r2)] as [number,number,number,number];
}
export function selection(b: number[], l: number, t: number, r: number, bb: number) { let sum = 0, count = 0; for (let y=t;y<=bb;y++) for(let x=l;x<=r;x++){const n=b[y*COLS+x];sum+=n;if(n)count++;} return {sum,count}; }
export function removeSelection(b: number[], l: number,t: number,r: number,bb: number) { const s=selection(b,l,t,r,bb); if(s.sum!==10)return 0; for(let y=t;y<=bb;y++)for(let x=l;x<=r;x++)b[y*COLS+x]=0;return s.count; }
export type Walker = { tick:number; angle:number; velocity:number; fallen:boolean };
export const makeWalker = (seed:number):Walker=>({tick:0,angle:(seed%2?1:-1)*.055,velocity:0,fallen:false});
export function stepWalker(s:Walker,input:number,seed:number){if(s.fallen||s.tick>=WALK_SECONDS*HZ)return;const t=s.tick/HZ,d=Math.min(t/100,3),p=(seed%6283)/1000,wind=Math.sin(t*1.13+p)*(.45+d*.32)+Math.sin(t*2.71+p*2)*.3;s.velocity+=(s.angle*(7.4+d)+input*5.4+wind-s.velocity*.85)/HZ;s.angle+=s.velocity/HZ;s.tick++;s.fallen=Math.abs(s.angle)>=.88;}
export const formatMetric=(g:Game,n:number)=>g==="walk"?`${(n/100).toFixed(2)}초`:`${n.toLocaleString("ko-KR")}점`;
export const kst=(ms:number|null|undefined)=>ms?new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(ms)):"—";
export function verifyReplay(game:Game,seed:number,raw:unknown){if(!raw||typeof raw!=="object")throw Error("잘못된 기록 형식");const r=raw as Replay;if(r.version!==VERSION||r.reason!=="complete"||!Number.isInteger(r.end)||!Array.isArray(r.moves))throw Error("기록 버전 또는 종료 상태 오류");if(game==="ten"){if(r.end!==APPLE_SECONDS*1000||r.moves.length>85)throw Error("게임 시간 또는 입력 수 오류");const b=makeBoard(seed);let last=-1,metric=0;for(const m of r.moves){if(!Array.isArray(m)||m.length!==5||!m.every(Number.isInteger))throw Error("선택 형식 오류");const[at,l,t,rr,bb]=m;if(at<0||at<last||at>=r.end||l<0||rr>=COLS||t<0||bb>=ROWS||l>rr||t>bb)throw Error("선택 범위 오류");const n=removeSelection(b,l,t,rr,bb);if(!n)throw Error("합계가 10이 아닌 선택");metric+=n;last=at;}return{metric,elapsedMs:r.end,actionCount:r.moves.length};}if(r.end<1||r.end>HZ*WALK_SECONDS||r.moves.length>12000)throw Error("걷기 시간 또는 입력 수 오류");let last=-1;for(const m of r.moves){if(!Array.isArray(m)||m.length!==2||!m.every(Number.isInteger)||m[0]<=last||m[0]<0||m[0]>=r.end||![-1,0,1].includes(m[1]))throw Error("조작 순서 오류");last=m[0];}const s=makeWalker(seed);let i=0,input=0;while(s.tick<r.end){if(i<r.moves.length&&r.moves[i][0]===s.tick)input=r.moves[i++][1];if(s.fallen)throw Error("넘어진 뒤 추가된 시간");stepWalker(s,input,seed);}if(!s.fallen&&s.tick!==HZ*WALK_SECONDS)throw Error("종료되지 않은 게임");return{metric:Math.floor(s.tick*100/HZ),elapsedMs:Math.round(s.tick*1000/HZ),actionCount:r.moves.length};}
