import { NextResponse } from "next/server";
import db from "@/lib/db";
export const dynamic = "force-dynamic";

async function ensure() {
  await db.query(`CREATE TABLE IF NOT EXISTS dotori_walk_state (id INT NOT NULL PRIMARY KEY, plus_dotori BIGINT NOT NULL DEFAULT 0, minus_dotori BIGINT NOT NULL DEFAULT 0, total_used BIGINT NOT NULL DEFAULT 0, font_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF', plus_color VARCHAR(20) NOT NULL DEFAULT '#67E8F9', minus_color VARCHAR(20) NOT NULL DEFAULT '#FB7185', outline_color VARCHAR(20) NOT NULL DEFAULT '#000000', outline_width INT NOT NULL DEFAULT 4, distance_size INT NOT NULL DEFAULT 72, total_size INT NOT NULL DEFAULT 30, sub_size INT NOT NULL DEFAULT 26, plus_song_url TEXT, minus_song_url TEXT, updated_at DATETIME NULL)`);
  await db.query(`INSERT IGNORE INTO dotori_walk_state (id, updated_at) VALUES (1, NOW())`);
  await db.query(`CREATE TABLE IF NOT EXISTS dotori_walk_logs (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, user_email VARCHAR(255) NOT NULL, nickname VARCHAR(100) NOT NULL, direction VARCHAR(10) NOT NULL, dotori_amount INT NOT NULL, created_at DATETIME NOT NULL, INDEX idx_created (created_at))`);
  await db.query(`CREATE TABLE IF NOT EXISTS dotori_walk_alerts (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, direction VARCHAR(10) NOT NULL, dotori_amount INT NOT NULL, nickname VARCHAR(100) NOT NULL, created_at DATETIME NOT NULL, INDEX idx_created (created_at))`);
}

export async function GET(req: Request) {
  await ensure();
  const [rows]: any = await db.query(`SELECT * FROM dotori_walk_state WHERE id=1 LIMIT 1`);
  const s = rows[0] || {};
  const url = new URL(req.url);
  const after = Math.max(0, Number(url.searchParams.get("after") || 0));
  const [alerts]: any = await db.query(`SELECT id,direction,dotori_amount,nickname FROM dotori_walk_alerts WHERE id>? ORDER BY id ASC LIMIT 20`, [after]);
  const [latestRows]: any = await db.query(`SELECT IFNULL(MAX(id),0) AS latest_id FROM dotori_walk_alerts`);
  return NextResponse.json({ success:true, state:s, alerts, latest_id:Number(latestRows[0]?.latest_id||0) });
}
