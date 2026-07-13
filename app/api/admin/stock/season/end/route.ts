import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSeasonNowText } from "@/lib/stock-market";
import { settleStockSeason } from "@/lib/stock-season-settlement";

function toInteger(value: unknown) {
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

  let body: any = {};

  try {
    body = await req.json();
  } catch {}

  const requestedSeasonId = toInteger(body.seasonId);
  const connection = await db.getConnection();
  let lockAcquired = false;

  try {
    const [lockRows]: any = await connection.query(
      "SELECT GET_LOCK('wangchu_stock_season_end', 10) AS locked"
    );

    lockAcquired = Number(lockRows?.[0]?.locked || 0) === 1;

    if (!lockAcquired) {
      return NextResponse.json(
        {
          success: false,
          message: "다른 시즌 종료 작업이 진행 중입니다.",
        },
        { status: 409 }
      );
    }

    await connection.beginTransaction();

    const [adminRows]: any = await connection.query(
      `
      SELECT id, role
      FROM users
      WHERE email = ?
      LIMIT 1
      FOR UPDATE
      `,
      [session.user.email]
    );

    const admin = adminRows[0];

    if (!admin || admin.role !== "admin") {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "관리자만 가능합니다." },
        { status: 403 }
      );
    }

    const [seasonRows]: any = await connection.query(
      requestedSeasonId > 0
        ? `
          SELECT *
          FROM stock_seasons
          WHERE id = ?
            AND status IN ('ready', 'active')
          LIMIT 1
          FOR UPDATE
          `
        : `
          SELECT *
          FROM stock_seasons
          WHERE status IN ('ready', 'active')
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE
          `,
      requestedSeasonId > 0 ? [requestedSeasonId] : []
    );

    const season = seasonRows[0];

    if (!season) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "종료할 시즌이 없습니다." },
        { status: 404 }
      );
    }

    const settlement = await settleStockSeason(
      connection,
      season,
      getSeasonNowText()
    );

    if (!settlement.settled) {
      await connection.rollback();

      return NextResponse.json(
        { success: false, message: "이미 정산된 시즌입니다." },
        { status: 409 }
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${season.title} 종료 및 보상 지급이 완료되었습니다.`,
      ...settlement,
    });
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {}

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "이미 보상이 지급된 시즌입니다." },
        { status: 409 }
      );
    }

    console.error("Stock season end error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "시즌 종료 및 보상 지급 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    if (lockAcquired) {
      try {
        await connection.query(
          "SELECT RELEASE_LOCK('wangchu_stock_season_end')"
        );
      } catch {}
    }

    connection.release();
  }
}
