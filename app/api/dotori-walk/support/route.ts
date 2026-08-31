import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({success:false,message:"로그인이 필요합니다."},{status:401});
  const body = await req.json();
  const amount = Math.floor(Number(body.amount || 0));
  const direction = body.direction === "minus" ? "minus" : body.direction === "plus" ? "plus" : "";
  if (!direction || amount <= 0) return NextResponse.json({success:false,message:"사용할 도토리를 입력해주세요."},{status:400});
  const conn = await (db as any).getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`CREATE TABLE IF NOT EXISTS dotori_walk_state (id INT NOT NULL PRIMARY KEY, plus_dotori BIGINT NOT NULL DEFAULT 0, minus_dotori BIGINT NOT NULL DEFAULT 0, total_used BIGINT NOT NULL DEFAULT 0, font_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF', plus_color VARCHAR(20) NOT NULL DEFAULT '#67E8F9', minus_color VARCHAR(20) NOT NULL DEFAULT '#FB7185', outline_color VARCHAR(20) NOT NULL DEFAULT '#000000', outline_width INT NOT NULL DEFAULT 4, distance_size INT NOT NULL DEFAULT 72, total_size INT NOT NULL DEFAULT 30, sub_size INT NOT NULL DEFAULT 26, plus_song_url TEXT, minus_song_url TEXT, updated_at DATETIME NULL)`);
    await conn.query(`INSERT IGNORE INTO dotori_walk_state (id, updated_at) VALUES (1,NOW())`);
    await conn.query(`CREATE TABLE IF NOT EXISTS dotori_walk_logs (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255) NOT NULL, nickname VARCHAR(100) NOT NULL, direction VARCHAR(10) NOT NULL, dotori_amount INT NOT NULL, created_at DATETIME NOT NULL, INDEX idx_created (created_at))`);
    await conn.query(`CREATE TABLE IF NOT EXISTS dotori_walk_alerts (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, direction VARCHAR(10) NOT NULL, dotori_amount INT NOT NULL, nickname VARCHAR(100) NOT NULL, created_at DATETIME NOT NULL, INDEX idx_created (created_at))`);
    const [users]: any = await conn.query(`SELECT id,nickname,dotori FROM users WHERE email=? LIMIT 1 FOR UPDATE`,[session.user.email]);
    const user=users[0];
    if(!user) throw new Error("USER_NOT_FOUND");
    if(Number(user.dotori||0)<amount){ await conn.rollback(); return NextResponse.json({success:false,message:"도토리가 부족합니다."},{status:400}); }
    const [result]: any = await conn.query(`UPDATE users SET dotori=dotori-? WHERE email=? AND dotori>=?`,[amount,session.user.email,amount]);
    if(!result.affectedRows){ await conn.rollback(); return NextResponse.json({success:false,message:"도토리가 부족합니다."},{status:400}); }
    await conn.query(`INSERT INTO dotori_walk_logs(user_email,nickname,direction,dotori_amount,created_at) VALUES(?,?,?,?,NOW())`,[session.user.email,user.nickname||"익명",direction,amount]);
    await conn.query(`INSERT INTO dotori_walk_alerts(direction,dotori_amount,nickname,created_at) VALUES(?,?,?,NOW())`,[direction,amount,user.nickname||"익명"]);
    if(direction==="plus") await conn.query(`UPDATE dotori_walk_state SET plus_dotori=plus_dotori+?,total_used=total_used+?,updated_at=NOW() WHERE id=1`,[amount,amount]);
    else await conn.query(`UPDATE dotori_walk_state SET minus_dotori=minus_dotori+?,total_used=total_used+?,updated_at=NOW() WHERE id=1`,[amount,amount]);
    await conn.query(`INSERT INTO dotori_logs(user_id,amount,reason,created_at) VALUES(?, ?, ?, NOW())`,[user.id,-amount,direction==="plus"?"도토리 국토대장정 +거리":"도토리 국토대장정 -거리"]);
    await conn.commit();
    return NextResponse.json({success:true,message:`${amount.toLocaleString()}개를 ${direction==="plus"?"플러스":"마이너스"}에 사용했습니다.`});
  } catch(e){ try{await conn.rollback();}catch{} console.error(e); return NextResponse.json({success:false,message:"처리에 실패했습니다."},{status:500}); }
  finally{conn.release();}
}
