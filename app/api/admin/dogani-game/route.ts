import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const [rows]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!rows.length || rows[0].role !== "admin") return null;
  return rows[0];
}

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

function intValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  await ensureTable();

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "add") {
    const name = String(body.name || "").trim().slice(0, 100);
    const amount = Math.max(0, intValue(body.amount));

    if (!name) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ error: "금액을 입력해주세요." }, { status: 400 });
    }

    const [orderRows]: any = await db.query(
      "SELECT IFNULL(MAX(display_order), 0) + 1 AS next_order FROM dogani_game_players WHERE is_active = 1"
    );

    const [result]: any = await db.query(
      `INSERT INTO dogani_game_players
       (name, amount, display_order, is_active, created_at)
       VALUES (?, ?, ?, 1, NOW())`,
      [name, amount, Number(orderRows[0]?.next_order || 1)]
    );

    return NextResponse.json({ ok: true, id: Number(result.insertId) });
  }

  if (action === "success") {
    const id = intValue(body.id);
    if (!id) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 400 });
    }

    await db.query(
      `UPDATE dogani_game_players
       SET is_active = 0, completed_at = NOW()
       WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const id = intValue(body.id);
    if (!id) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 400 });
    }

    await db.query("DELETE FROM dogani_game_players WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
}
