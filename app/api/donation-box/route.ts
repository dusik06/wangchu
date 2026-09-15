import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS donation_box_entries (
    id INT NOT NULL AUTO_INCREMENT,
    donor_name VARCHAR(100) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id), KEY idx_donation_box_created (created_at, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
  await db.query(`CREATE TABLE IF NOT EXISTS donation_box_settings (
    id INT NOT NULL,
    title VARCHAR(100) NOT NULL DEFAULT '시청자 기부금',
    bottom_label VARCHAR(100) NOT NULL DEFAULT '현재 모인 후원금',
    unit_amount BIGINT NOT NULL DEFAULT 100000,
    target_amount BIGINT NOT NULL DEFAULT 1000000,
    title_font_size INT NOT NULL DEFAULT 30,
    amount_font_size INT NOT NULL DEFAULT 34,
    label_font_size INT NOT NULL DEFAULT 16,
    donor_font_size INT NOT NULL DEFAULT 15,
    note_font_size INT NOT NULL DEFAULT 11,
    box_width INT NOT NULL DEFAULT 390,
    box_height INT NOT NULL DEFAULT 390,
    note_scale INT NOT NULL DEFAULT 100,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
  const [cols]: any = await db.query("SHOW COLUMNS FROM donation_box_settings LIKE 'target_amount'");
  if (!cols.length) await db.query("ALTER TABLE donation_box_settings ADD COLUMN target_amount BIGINT NOT NULL DEFAULT 1000000 AFTER unit_amount");
  await db.query(`INSERT IGNORE INTO donation_box_settings (id) VALUES (1)`);
}

export async function GET() {
  await ensureTables();
  const [settingsRows]: any = await db.query("SELECT * FROM donation_box_settings WHERE id=1 LIMIT 1");
  const [entries]: any = await db.query("SELECT id, donor_name, amount, created_at FROM donation_box_entries ORDER BY id DESC LIMIT 100");
  const [sumRows]: any = await db.query("SELECT IFNULL(SUM(amount),0) total FROM donation_box_entries");
  const s = settingsRows[0] || {};
  return NextResponse.json({
    total: Number(sumRows[0]?.total || 0),
    entries: entries.map((r:any)=>({id:Number(r.id), donorName:String(r.donor_name||""), amount:Number(r.amount||0), createdAt:r.created_at})),
    settings: {
      title:String(s.title||"시청자 기부금"), bottomLabel:String(s.bottom_label||"현재 모인 후원금"), targetAmount:Number(s.target_amount||1000000),
      titleFontSize:Number(s.title_font_size||30), amountFontSize:Number(s.amount_font_size||34), labelFontSize:Number(s.label_font_size||16),
      donorFontSize:Number(s.donor_font_size||15), noteFontSize:Number(s.note_font_size||11), boxWidth:Number(s.box_width||390), boxHeight:Number(s.box_height||390), noteScale:Number(s.note_scale||100)
    }
  }, {headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}});
}
