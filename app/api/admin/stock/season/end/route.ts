import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getKstMysqlNow } from "@/lib/stock-time";

function numberValue(value: any) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function roundRate(value: number) {
  return Number(value.toFixed(4));
}

async function releaseLock(connection: any) {
  try {
    await connection.query(
      "SELECT RELEASE_LOCK('wangchu_stock_season_end')"
    );
  } catch {
    // 잠금 해제 실패 무시
  }
}

export async function POST(req: Request) {
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

  let body: any = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const requestedSeasonId = Number(body.seasonId || 0);

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
          message:
            "다른 시즌 정산이 진행 중입니다. 잠시 후 다시 시도해주세요.",
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
        {
          success: false,
          message: "관리자만 시즌을 종료할 수 있습니다.",
        },
        { status: 403 }
      );
    }

    const seasonSql = requestedSeasonId
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
      `;

    const seasonParams = requestedSeasonId
      ? [requestedSeasonId]
      : [];

    const [seasonRows]: any = await connection.query(
      seasonSql,
      seasonParams
    );

    const season = seasonRows[0];

    if (!season) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "종료할 수 있는 시즌이 없습니다.",
        },
        { status: 404 }
      );
    }

    const seasonId = Number(season.id);
    const now = getKstMysqlNow();

    const [participantRows]: any = await connection.query(
      `
      SELECT
        p.*,
        u.role,
        IFNULL(
          (
            SELECT SUM(h.quantity * s.current_price)
            FROM stock_season_holdings h
            INNER JOIN stock_items s
              ON s.id = h.stock_id
            WHERE h.season_id = p.season_id
              AND h.user_id = p.user_id
              AND h.quantity > 0
          ),
          0
        ) AS final_holding_value
      FROM stock_season_participants p
      INNER JOIN users u
        ON u.id = p.user_id
      WHERE p.season_id = ?
      FOR UPDATE
      `,
      [seasonId]
    );

    const allParticipants = participantRows.map((row: any) => {
      const startingMoney = Math.max(
        1,
        numberValue(row.starting_money)
      );

      const availableMoney = numberValue(row.available_money);
      const holdingValue = numberValue(row.final_holding_value);
      const totalAsset = availableMoney + holdingValue;
      const profitAmount = totalAsset - startingMoney;
      const profitRate = roundRate(
        (profitAmount / startingMoney) * 100
      );

      const qualified =
        row.role !== "admin" &&
        numberValue(row.trade_count) >=
          numberValue(season.min_trade_count);

      return {
        participantId: Number(row.id),
        userId: Number(row.user_id),
        nickname: String(
          row.nickname_snapshot || "닉네임없음"
        ),
        tradeCount: numberValue(row.trade_count),
        availableMoney,
        holdingValue,
        totalAsset,
        profitAmount,
        profitRate,
        qualified,
      };
    });

    const qualifiedRanking = allParticipants
      .filter((participant: any) => participant.qualified)
      .sort((a: any, b: any) => {
        if (b.profitRate !== a.profitRate) {
          return b.profitRate - a.profitRate;
        }

        if (b.totalAsset !== a.totalAsset) {
          return b.totalAsset - a.totalAsset;
        }

        if (a.tradeCount !== b.tradeCount) {
          return a.tradeCount - b.tradeCount;
        }

        return a.participantId - b.participantId;
      });

    const totalPrize =
      numberValue(season.base_prize) +
      numberValue(season.entry_fee_prize) +
      numberValue(season.fee_prize);

    const prizeRates = [
      numberValue(season.first_prize_rate),
      numberValue(season.second_prize_rate),
      numberValue(season.third_prize_rate),
    ];

    const winners = qualifiedRanking
      .slice(0, 3)
      .map((participant: any, index: number) => ({
        ...participant,
        rank: index + 1,
        prizeRate: prizeRates[index],
        prizeAmount: Math.floor(
          (totalPrize * prizeRates[index]) / 100
        ),
      }));

    const paidPrizeTotal = winners.reduce(
      (sum: number, winner: any) =>
        sum + winner.prizeAmount,
      0
    );

    for (const participant of allParticipants) {
      const qualifiedIndex = qualifiedRanking.findIndex(
        (ranked: any) =>
          ranked.participantId === participant.participantId
      );

      const finalRank =
        qualifiedIndex >= 0 ? qualifiedIndex + 1 : null;

      const winner = winners.find(
        (row: any) =>
          row.participantId === participant.participantId
      );

      await connection.query(
        `
        UPDATE stock_season_participants
        SET current_holding_value = ?,
            current_total_asset = ?,
            current_profit_amount = ?,
            current_profit_rate = ?,
            is_reward_qualified = ?,
            final_holding_value = ?,
            final_total_asset = ?,
            final_profit_amount = ?,
            final_profit_rate = ?,
            final_rank = ?,
            prize_amount = ?,
            updated_at = ?
        WHERE id = ?
          AND season_id = ?
        `,
        [
          participant.holdingValue,
          participant.totalAsset,
          participant.profitAmount,
          participant.profitRate,
          participant.qualified ? 1 : 0,
          participant.holdingValue,
          participant.totalAsset,
          participant.profitAmount,
          participant.profitRate,
          finalRank,
          winner ? winner.prizeAmount : 0,
          now,
          participant.participantId,
          seasonId,
        ]
      );
    }

    for (const winner of winners) {
      if (winner.prizeAmount > 0) {
        await connection.query(
          `
          UPDATE users
          SET dotori = dotori + ?
          WHERE id = ?
          `,
          [winner.prizeAmount, winner.userId]
        );

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
            winner.userId,
            winner.prizeAmount,
            `주식 ${season.title} ${winner.rank}등 보상`,
          ]
        );
      }

      await connection.query(
        `
        INSERT INTO stock_season_rewards
        (
          season_id,
          user_id,
          nickname_snapshot,
          rank_no,
          profit_rate,
          prize_rate,
          prize_amount,
          paid_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          seasonId,
          winner.userId,
          winner.nickname,
          winner.rank,
          winner.profitRate,
          winner.prizeRate,
          winner.prizeAmount,
          now,
        ]
      );
    }

    const firstWinner = winners[0] || null;

    await connection.query(
      `
      UPDATE stock_seasons
      SET status = 'ended',
          settled_at = ?,
          winner_user_id = ?,
          winner_nickname = ?,
          winner_profit_rate = ?,
          winner_prize_amount = ?,
          updated_at = ?
      WHERE id = ?
        AND status IN ('ready', 'active')
      `,
      [
        now,
        firstWinner ? firstWinner.userId : null,
        firstWinner ? firstWinner.nickname : null,
        firstWinner ? firstWinner.profitRate : null,
        firstWinner ? firstWinner.prizeAmount : 0,
        now,
        seasonId,
      ]
    );

    await connection.query(
      `
      UPDATE stock_virtual_traders
      SET is_active = 0,
          updated_at = ?
      WHERE season_id = ?
      `,
      [now, seasonId]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${season.title} 종료 및 보상 정산이 완료되었습니다.`,
      seasonId,
      totalPrize,
      paidPrizeTotal,
      unpaidPrizeAmount: Math.max(
        0,
        totalPrize - paidPrizeTotal
      ),
      qualifiedParticipantCount: qualifiedRanking.length,
      winners: winners.map((winner: any) => ({
        rank: winner.rank,
        nickname: winner.nickname,
        profitRate: winner.profitRate,
        prizeAmount: winner.prizeAmount,
      })),
    });
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {
      // rollback 오류 무시
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message:
            "이미 보상이 지급된 시즌입니다. 중복 지급하지 않았습니다.",
        },
        { status: 409 }
      );
    }

    console.error("Stock season end error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "시즌 종료 및 정산 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    if (lockAcquired) {
      await releaseLock(connection);
    }

    connection.release();
  }
}