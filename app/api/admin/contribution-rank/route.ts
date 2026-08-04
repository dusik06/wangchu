import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import db from "@/lib/db";

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

function intValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "setTitle") {
    const title = String(body.title || "").trim().slice(0, 100) || "기여도 순위";
    await db.query(
      `INSERT INTO contribution_rank_settings (id, title)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [title]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "setShowTitle") {
    const showTitle = body.showTitle ? 1 : 0;
    await db.query(
      `UPDATE contribution_rank_settings
       SET show_title = ?
       WHERE id = 1`,
      [showTitle]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "addParticipant") {
    const rankName = String(body.rankName || "직급").trim().slice(0, 50);
    const streamerName = String(body.streamerName || "새 스트리머").trim().slice(0, 100);
    const [orderRows]: any = await db.query(
      "SELECT IFNULL(MAX(display_order), 0) + 1 AS next_order FROM contribution_rank_participants"
    );
    const [result]: any = await db.query(
      `INSERT INTO contribution_rank_participants
       (rank_name, streamer_name, manual_contribution, display_order, is_active)
       VALUES (?, ?, 0, ?, 1)`,
      [rankName, streamerName, Number(orderRows[0]?.next_order || 1)]
    );
    return NextResponse.json({ ok: true, id: Number(result.insertId) });
  }

  if (action === "updateParticipant") {
    const id = intValue(body.id);
    const rankName = String(body.rankName || "").trim().slice(0, 50);
    const streamerName = String(body.streamerName || "").trim().slice(0, 100);
    if (!id || !streamerName) {
      return NextResponse.json({ error: "스트리머 이름을 입력해주세요." }, { status: 400 });
    }
    await db.query(
      `UPDATE contribution_rank_participants
       SET rank_name = ?, streamer_name = ?
       WHERE id = ?`,
      [rankName, streamerName, id]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteParticipant") {
    const id = intValue(body.id);
    await db.query("DELETE FROM contribution_rank_amounts WHERE participant_id = ?", [id]);
    await db.query("DELETE FROM contribution_rank_participants WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  }

  if (action === "adjustAmount") {
    const participantId = intValue(body.participantId);
    const categoryId = intValue(body.categoryId);
    const delta = intValue(body.delta);
    if (!participantId || !categoryId || delta === 0) {
      return NextResponse.json({ error: "금액을 입력해주세요." }, { status: 400 });
    }

    await db.query(
      `INSERT INTO contribution_rank_amounts
       (participant_id, category_id, amount)
       VALUES (?, ?, GREATEST(0, ?))
       ON DUPLICATE KEY UPDATE amount = GREATEST(0, amount + ?)`,
      [participantId, categoryId, delta, delta]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "setAmount") {
    const participantId = intValue(body.participantId);
    const categoryId = intValue(body.categoryId);
    const amount = Math.max(0, intValue(body.amount));
    await db.query(
      `INSERT INTO contribution_rank_amounts
       (participant_id, category_id, amount)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [participantId, categoryId, amount]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "adjustManualContribution") {
    const participantId = intValue(body.participantId);
    const delta = intValue(body.delta);
    await db.query(
      `UPDATE contribution_rank_participants
       SET manual_contribution = manual_contribution + ?
       WHERE id = ?`,
      [delta, participantId]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "setManualContribution") {
    const participantId = intValue(body.participantId);
    const value = intValue(body.value);
    await db.query(
      `UPDATE contribution_rank_participants
       SET manual_contribution = ?
       WHERE id = ?`,
      [value, participantId]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "addCategory") {
    const name = String(body.name || "새 후원").trim().slice(0, 50);
    const [orderRows]: any = await db.query(
      "SELECT IFNULL(MAX(display_order), 0) + 1 AS next_order FROM contribution_rank_categories"
    );
    const [result]: any = await db.query(
      `INSERT INTO contribution_rank_categories (name, is_calculated, display_order)
       VALUES (?, 1, ?)`,
      [name, Number(orderRows[0]?.next_order || 1)]
    );
    return NextResponse.json({ ok: true, id: Number(result.insertId) });
  }

  if (action === "updateCategory") {
    const id = intValue(body.id);
    const name = String(body.name || "").trim().slice(0, 50);
    const isCalculated = body.isCalculated ? 1 : 0;
    if (!id || !name) {
      return NextResponse.json({ error: "카테고리 이름을 입력해주세요." }, { status: 400 });
    }
    await db.query(
      `UPDATE contribution_rank_categories
       SET name = ?, is_calculated = ?
       WHERE id = ?`,
      [name, isCalculated, id]
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteCategory") {
    const id = intValue(body.id);
    await db.query("DELETE FROM contribution_rank_amounts WHERE category_id = ?", [id]);
    await db.query("DELETE FROM contribution_rank_categories WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  }

  if (action === "resetAll") {
    await db.query("UPDATE contribution_rank_participants SET manual_contribution = 0");
    await db.query("UPDATE contribution_rank_amounts SET amount = 0");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
}
