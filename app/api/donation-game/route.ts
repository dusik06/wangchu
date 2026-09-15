import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function ensureDonationGameTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS donation_game_overlay (
      id INT NOT NULL,
      title VARCHAR(100) NOT NULL DEFAULT '기부가 좋다',
      left_name VARCHAR(100) NOT NULL DEFAULT '왕츄 이사님',
      right_name VARCHAR(100) NOT NULL DEFAULT '마예준 대표님',
      bottom_label VARCHAR(100) NOT NULL DEFAULT '현재 총 기부금',
      left_amount BIGINT NOT NULL DEFAULT 0,
      right_amount BIGINT NOT NULL DEFAULT 0,
      title_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
      name_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
      left_amount_color VARCHAR(20) NOT NULL DEFAULT '#FF73AE',
      right_amount_color VARCHAR(20) NOT NULL DEFAULT '#7DD3FC',
      total_label_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
      total_amount_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
      accent_color VARCHAR(20) NOT NULL DEFAULT '#FF4F9A',
      panel_color VARCHAR(20) NOT NULL DEFAULT '#120C1E',
      panel_opacity INT NOT NULL DEFAULT 78,
      border_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
      border_opacity INT NOT NULL DEFAULT 18,
      shadow_enabled TINYINT(1) NOT NULL DEFAULT 1,
      compact_scale INT NOT NULL DEFAULT 100,
      title_font_size INT NOT NULL DEFAULT 19,
      name_font_size INT NOT NULL DEFAULT 12,
      amount_font_size INT NOT NULL DEFAULT 22,
      vs_font_size INT NOT NULL DEFAULT 12,
      bottom_label_font_size INT NOT NULL DEFAULT 11,
      total_amount_font_size INT NOT NULL DEFAULT 18,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  `);

  // 기존에 만들어진 테이블에도 새 글씨 크기 설정 컬럼을 안전하게 추가합니다.
  const [columns]: any = await db.query("SHOW COLUMNS FROM donation_game_overlay");
  const existing = new Set((columns || []).map((c: any) => String(c.Field)));
  const fontColumns: Array<[string, number]> = [
    ["title_font_size", 19], ["name_font_size", 12], ["amount_font_size", 22],
    ["vs_font_size", 12], ["bottom_label_font_size", 11], ["total_amount_font_size", 18]
  ];
  for (const [name, defaultValue] of fontColumns) {
    if (!existing.has(name)) {
      await db.query(`ALTER TABLE donation_game_overlay ADD COLUMN ${name} INT NOT NULL DEFAULT ${defaultValue}`);
    }
  }

  await db.query(`
    INSERT IGNORE INTO donation_game_overlay (id, updated_at)
    VALUES (1, NOW())
  `);
}

export async function GET() {
  await ensureDonationGameTable();
  const [rows]: any = await db.query(
    "SELECT * FROM donation_game_overlay WHERE id = 1 LIMIT 1"
  );
  return NextResponse.json({ ok: true, state: rows[0] || null });
}
