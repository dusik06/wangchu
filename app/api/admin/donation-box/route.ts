import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { broadcastOverlayChange } from "@/lib/overlay-realtime-server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";
async function adminOk(){ const s=await getServerSession(authOptions); if(!s?.user?.email)return false; const [r]:any=await db.query("SELECT role FROM users WHERE email=? LIMIT 1",[s.user.email]); return !!r.length&&r[0].role==="admin"; }
async function ensure(){
 await db.query(`CREATE TABLE IF NOT EXISTS donation_box_entries (id INT NOT NULL AUTO_INCREMENT, donor_name VARCHAR(100) NOT NULL, amount BIGINT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL, PRIMARY KEY(id), KEY idx_donation_box_created(created_at,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
 await db.query(`CREATE TABLE IF NOT EXISTS donation_box_settings (id INT NOT NULL, title VARCHAR(100) NOT NULL DEFAULT '시청자 기부금', bottom_label VARCHAR(100) NOT NULL DEFAULT '현재 모인 후원금', unit_amount BIGINT NOT NULL DEFAULT 100000, target_amount BIGINT NOT NULL DEFAULT 1000000, title_font_size INT NOT NULL DEFAULT 30, amount_font_size INT NOT NULL DEFAULT 34, label_font_size INT NOT NULL DEFAULT 16, donor_font_size INT NOT NULL DEFAULT 15, note_font_size INT NOT NULL DEFAULT 11, box_width INT NOT NULL DEFAULT 390, box_height INT NOT NULL DEFAULT 390, note_scale INT NOT NULL DEFAULT 100, PRIMARY KEY(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
 const [cols]:any=await db.query("SHOW COLUMNS FROM donation_box_settings LIKE 'target_amount'");
 if(!cols.length) await db.query("ALTER TABLE donation_box_settings ADD COLUMN target_amount BIGINT NOT NULL DEFAULT 1000000 AFTER unit_amount");
 await db.query(`INSERT IGNORE INTO donation_box_settings (id) VALUES (1)`);
}
const num=(v:any,d=0)=>Number.isFinite(Number(v))?Math.trunc(Number(v)):d;
export async function POST(req:Request){
 if(!(await adminOk())) return NextResponse.json({error:"관리자만 사용할 수 있습니다."},{status:403});
 await ensure(); const b=await req.json(); const action=String(b.action||"");
 if(action==="add") { const name=String(b.donorName||"").trim().slice(0,100); const amount=Math.max(0,num(b.amount)); if(!name||amount<=0)return NextResponse.json({error:"후원자와 금액을 입력해주세요."},{status:400}); await db.query("INSERT INTO donation_box_entries (donor_name,amount,created_at) VALUES (?,?,NOW())",[name,amount]); }
 else if(action==="edit") { const id=num(b.id); const name=String(b.donorName||"").trim().slice(0,100); const amount=Math.max(0,num(b.amount)); if(!id||!name||amount<=0)return NextResponse.json({error:"입력값을 확인해주세요."},{status:400}); await db.query("UPDATE donation_box_entries SET donor_name=?, amount=? WHERE id=?",[name,amount,id]); }
 else if(action==="delete") await db.query("DELETE FROM donation_box_entries WHERE id=?",[num(b.id)]);
 else if(action==="reset") await db.query("DELETE FROM donation_box_entries");
 else if(action==="settings") {
   const title=String(b.title||"시청자 기부금").trim().slice(0,100), bottom=String(b.bottomLabel||"현재 모인 후원금").trim().slice(0,100);
   await db.query(`UPDATE donation_box_settings SET title=?,bottom_label=?,target_amount=?,title_font_size=?,amount_font_size=?,label_font_size=?,donor_font_size=?,note_font_size=?,box_width=?,box_height=?,note_scale=? WHERE id=1`,[
    title,bottom,Math.max(1,num(b.targetAmount,1000000)),Math.max(10,num(b.titleFontSize,30)),Math.max(10,num(b.amountFontSize,34)),Math.max(8,num(b.labelFontSize,16)),Math.max(8,num(b.donorFontSize,15)),Math.max(7,num(b.noteFontSize,11)),Math.max(260,num(b.boxWidth,390)),Math.max(240,num(b.boxHeight,390)),Math.max(60,num(b.noteScale,100))]);
 } else return NextResponse.json({error:"지원하지 않는 작업입니다."},{status:400});
 await broadcastOverlayChange("donation-box"); return NextResponse.json({ok:true});
}
