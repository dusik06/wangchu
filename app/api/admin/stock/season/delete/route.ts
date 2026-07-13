import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function integer(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const seasonId = integer(body.seasonId);

  if (!seasonId) {
    return NextResponse.json(
      { success: false, message: "시즌 정보가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [admins]: any = await connection.query(
      "SELECT role FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );
    if (!admins.length || admins[0].role !== "admin") {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const [seasons]: any = await connection.query(
      "SELECT * FROM stock_seasons WHERE id = ? LIMIT 1 FOR UPDATE",
      [seasonId]
    );
    const season = seasons[0];
    if (!season) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "시즌을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (String(season.status) !== "ready") {
      await connection.rollback();
      return NextResponse.json(
        {
          success: false,
          message: "대기 상태인 시즌만 삭제할 수 있습니다.",
        },
        { status: 409 }
      );
    }

    const [counts]: any = await connection.query(
      `
      SELECT COUNT(*) AS participant_count
      FROM stock_season_participants
      WHERE season_id = ?
      `,
      [seasonId]
    );
    if (integer(counts[0]?.participant_count) > 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "참가자가 있는 시즌은 삭제할 수 없습니다." },
        { status: 409 }
      );
    }

    await connection.query(
      "DELETE FROM stock_virtual_trades WHERE season_id = ?",
      [seasonId]
    );
    await connection.query(
      "DELETE FROM stock_virtual_holdings WHERE season_id = ?",
      [seasonId]
    );
    await connection.query(
      "DELETE FROM stock_virtual_traders WHERE season_id = ?",
      [seasonId]
    );
    await connection.query(
      "DELETE FROM stock_market_rounds WHERE season_id = ?",
      [seasonId]
    );
    await connection.query(
      "DELETE FROM stock_seasons WHERE id = ? AND status = 'ready'",
      [seasonId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${season.title} 시즌이 삭제되었습니다.`,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    console.error("Stock season delete error:", error);
    return NextResponse.json(
      { success: false, message: "시즌 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
