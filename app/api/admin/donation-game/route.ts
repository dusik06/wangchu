import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import db from "@/lib/db";
import { broadcastOverlayChange } from "@/lib/overlay-realtime-server";
import { ensureDonationGameTable } from "@/app/api/donation-game/route";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;
  const [rows]: any = await db.query("SELECT role FROM users WHERE email = ? LIMIT 1", [session.user.email]);
  return !!rows.length && rows[0].role === "admin";
}

function text(v: unknown, max = 100) { return String(v ?? "").trim().slice(0, max); }
function num(v: unknown, min: number, max: number) {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}
function color(v: unknown, fallback: string) {
  const s = String(v || "");
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : fallback;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  await ensureDonationGameTable();
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "amount") {
    const side = body.side === "right" ? "right" : "left";
    const delta = Math.trunc(Number(body.delta || 0));
    if (!Number.isFinite(delta)) return NextResponse.json({ error: "금액이 올바르지 않습니다." }, { status: 400 });
    const column = side === "right" ? "right_amount" : "left_amount";
    await db.query(`UPDATE donation_game_overlay SET ${column} = GREATEST(0, ${column} + ?), updated_at = NOW() WHERE id = 1`, [delta]);
  } else if (action === "set_amount") {
    const side = body.side === "right" ? "right" : "left";
    const amount = Math.max(0, Math.trunc(Number(body.amount || 0)));
    const column = side === "right" ? "right_amount" : "left_amount";
    await db.query(`UPDATE donation_game_overlay SET ${column} = ?, updated_at = NOW() WHERE id = 1`, [amount]);
  } else if (action === "reset_amounts") {
    await db.query("UPDATE donation_game_overlay SET left_amount = 0, right_amount = 0, updated_at = NOW() WHERE id = 1");
  } else if (action === "save_design") {
    const values = [
      text(body.title) || "기부가 좋다", text(body.left_name) || "왕츄 이사님", text(body.right_name) || "마예준 대표님",
      text(body.bottom_label) || "현재 총 기부금", color(body.title_color, "#FFFFFF"), color(body.name_color, "#FFFFFF"),
      color(body.left_amount_color, "#FF73AE"), color(body.right_amount_color, "#7DD3FC"), color(body.total_label_color, "#FFFFFF"),
      color(body.total_amount_color, "#FFFFFF"), color(body.accent_color, "#FF4F9A"), color(body.panel_color, "#120C1E"),
      num(body.panel_opacity, 0, 100), color(body.border_color, "#FFFFFF"), num(body.border_opacity, 0, 100), body.shadow_enabled ? 1 : 0,
      num(body.compact_scale, 70, 130)
    ];
    await db.query(`UPDATE donation_game_overlay SET title=?, left_name=?, right_name=?, bottom_label=?, title_color=?, name_color=?, left_amount_color=?, right_amount_color=?, total_label_color=?, total_amount_color=?, accent_color=?, panel_color=?, panel_opacity=?, border_color=?, border_opacity=?, shadow_enabled=?, compact_scale=?, updated_at=NOW() WHERE id=1`, values);
  } else {
    return NextResponse.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
  }

  const [rows]: any = await db.query("SELECT * FROM donation_game_overlay WHERE id = 1 LIMIT 1");
  await broadcastOverlayChange("donation-game");
  return NextResponse.json({ ok: true, state: rows[0] || null });
}
