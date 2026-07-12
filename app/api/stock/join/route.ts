import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getSeasonNowText,
  isSeasonRunning,
} from "@/lib/stock-market";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      {
        success: false,
        message: "로그인이 필요합니다.",
      },
      { status: 401 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [userRows]: any = await connection.query(
      `
      SELECT
        id,
        nickname,
        dotori,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
      FOR UPDATE
      `,
      [session.user.email]
    );

    const user = userRows[0];

    if (!user) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "유저 정보를 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    if (user.role === "admin") {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "관리자 계정은 주식 시즌에 참가할 수 없습니다.",
        },
        { status: 403 }
      );
    }

    const [seasonRows]: any = await connection.query(
      `
      SELECT
        *,
        DATE_FORMAT(
          starts_at,
          '%Y-%m-%d %H:%i:%s'
        ) AS starts_at_text,
        DATE_FORMAT(
          ends_at,
          '%Y-%m-%d %H:%i:%s'
        ) AS ends_at_text
      FROM stock_seasons
      WHERE status IN ('ready', 'active')
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
      `
    );

    const season = seasonRows[0];

    if (!season) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "현재 진행 중인 주식 시즌이 없습니다.",
        },
        { status: 404 }
      );
    }

    const seasonState = isSeasonRunning(season);

    if (!seasonState.running) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: seasonState.message,
        },
        { status: 400 }
      );
    }

    if (season.status === "ready") {
      await connection.query(
        `
        UPDATE stock_seasons
        SET status = 'active',
            updated_at = ?
        WHERE id = ?
          AND status = 'ready'
        `,
        [getSeasonNowText(), season.id]
      );
    }

    const [participantRows]: any = await connection.query(
      `
      SELECT id
      FROM stock_season_participants
      WHERE season_id = ?
        AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [season.id, user.id]
    );

    if (participantRows.length > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "이미 이번 시즌에 참가했습니다.",
        },
        { status: 409 }
      );
    }

    const entryFeeDotori = Math.max(
      0,
      Number(season.entry_fee_dotori || 0)
    );

    const startingMoney = Math.max(
      1,
      Number(season.starting_money || 0)
    );

    const [updateUserResult]: any = await connection.query(
      `
      UPDATE users
      SET dotori = dotori - ?
      WHERE id = ?
        AND dotori >= ?
      `,
      [entryFeeDotori, user.id, entryFeeDotori]
    );

    if (!updateUserResult.affectedRows) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: `시즌 참가에 필요한 도토리가 부족합니다. 참가비는 ${entryFeeDotori.toLocaleString()}도토리입니다.`,
        },
        { status: 400 }
      );
    }

    const now = getSeasonNowText();

    await connection.query(
      `
      INSERT INTO stock_season_participants
      (
        season_id,
        user_id,
        nickname_snapshot,
        entry_fee_dotori,
        starting_money,
        available_money,
        trade_count,
        buy_count,
        sell_count,
        total_buy_amount,
        total_sell_amount,
        total_fee_amount,
        current_holding_value,
        current_total_asset,
        current_profit_amount,
        current_profit_rate,
        is_reward_qualified,
        prize_amount,
        joined_at,
        updated_at
      )
      VALUES
      (
        ?, ?, ?, ?, ?, ?,
        0, 0, 0,
        0, 0, 0,
        0, ?, 0, 0,
        0, 0, ?, ?
      )
      `,
      [
        season.id,
        user.id,
        String(user.nickname || "닉네임없음"),
        entryFeeDotori,
        startingMoney,
        startingMoney,
        startingMoney,
        now,
        now,
      ]
    );

    if (entryFeeDotori > 0) {
      await connection.query(
        `
        INSERT INTO dotori_logs
        (
          user_id,
          amount,
          reason
        )
        VALUES (?, ?, ?)
        `,
        [
          user.id,
          -entryFeeDotori,
          `주식 ${season.title} 시즌 참가비`,
        ]
      );
    }

    if (
      Number(season.include_entry_fee_in_prize || 0) === 1 &&
      entryFeeDotori > 0
    ) {
      await connection.query(
        `
        UPDATE stock_seasons
        SET entry_fee_prize = entry_fee_prize + ?,
            updated_at = ?
        WHERE id = ?
        `,
        [entryFeeDotori, now, season.id]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${season.title} 참가가 완료되었습니다. ${startingMoney.toLocaleString()} ${season.currency_name}이 지급되었습니다.`,
      seasonId: Number(season.id),
      currencyName: season.currency_name,
      startingMoney,
      entryFeeDotori,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Stock season join error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "시즌 참가 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}