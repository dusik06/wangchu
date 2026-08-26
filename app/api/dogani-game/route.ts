import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS dogani_game_players (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      amount BIGINT NOT NULL DEFAULT 0,
      display_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      completed_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY idx_dogani_active_order (is_active, display_order, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  `);
}

export async function GET() {
  await ensureTable();

  const [rows]: any = await db.query(
    `SELECT id, name, amount, display_order
     FROM dogani_game_players
     WHERE is_active = 1
     ORDER BY display_order ASC, id ASC`
  );

  return NextResponse.json(
    {
      players: rows.map((row: any) => ({
        id: Number(row.id),
        name: String(row.name || ""),
        amount: Number(row.amount || 0),
        displayOrder: Number(row.display_order || 0),
      })),
      updatedAt: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
