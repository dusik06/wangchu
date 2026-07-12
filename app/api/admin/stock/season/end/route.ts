import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSeasonNowText } from "@/lib/stock-market";

function int(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function num(value: unknown) {
  const parsed = Number(value);
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

  const requestedSeasonId = int(body.seasonId);
  const connection = await db.getConnection();
  let locked = false;

  try {
    const [lockRows]: any = await connection.query(
      "SELECT GET_LOCK('wangchu_stock_season_end', 10) AS locked"
    );
    locked = Number(lockRows?.[0]?.locked || 0) === 1;

    if (!locked) {
      return NextResponse.json(
        { success: false, message: "다른 시즌 정산이 진행 중입니다." },
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

    const [rewardCountRows]: any = await connection.query(
      `
      SELECT COUNT(*) AS reward_count
      FROM stock_season_rewards
      WHERE season_id = ?
      `,
      [season.id]
    );

    if (int(rewardCountRows[0]?.reward_count) > 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "이미 정산된 시즌입니다." },
        { status: 409 }
      );
    }

    const now = getSeasonNowText();

    const [participantRows]: any = await connection.query(
      `
      SELECT p.*, u.nickname, u.role
      FROM stock_season_participants p
      INNER JOIN users u ON u.id = p.user_id
      WHERE p.season_id = ?
      ORDER BY p.id ASC
      FOR UPDATE
      `,
      [season.id]
    );

    const calculated: any[] = [];

    for (const participant of participantRows) {
      const [holdingRows]: any = await connection.query(
        `
        SELECT
          h.id,
          h.quantity,
          h.total_buy_amount,
          s.current_price
        FROM stock_season_holdings h
        INNER JOIN stock_items s ON s.id = h.stock_id
        WHERE h.season_id = ?
          AND h.participant_id = ?
          AND h.quantity > 0
        FOR UPDATE
        `,
        [season.id, participant.id]
      );

      let holdingValue = 0;

      for (const holding of holdingRows) {
        const currentValue =
          int(holding.quantity) * int(holding.current_price);
        const holdingProfit =
          currentValue - int(holding.total_buy_amount);
        const holdingRate =
          int(holding.total_buy_amount) > 0
            ? (holdingProfit / int(holding.total_buy_amount)) * 100
            : 0;

        holdingValue += currentValue;

        await connection.query(
          `
          UPDATE stock_season_holdings
          SET current_value = ?,
              profit_amount = ?,
              profit_rate = ?,
              updated_at = ?
          WHERE id = ?
          `,
          [currentValue, holdingProfit, holdingRate, now, holding.id]
        );
      }

      const startingMoney = Math.max(1, int(participant.starting_money));
      const availableMoney = Math.max(0, int(participant.available_money));
      const totalAsset = availableMoney + holdingValue;
      const profitAmount = totalAsset - startingMoney;
      const profitRate = (profitAmount / startingMoney) * 100;
      const tradeCount = int(participant.trade_count);
      const qualified =
        participant.role !== "admin" &&
        tradeCount >= int(season.min_trade_count);

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
            updated_at = ?
        WHERE id = ? AND season_id = ?
        `,
        [
          holdingValue,
          totalAsset,
          profitAmount,
          profitRate,
          qualified ? 1 : 0,
          holdingValue,
          totalAsset,
          profitAmount,
          profitRate,
          now,
          participant.id,
          season.id,
        ]
      );

      calculated.push({
        participantId: Number(participant.id),
        userId: Number(participant.user_id),
        nickname: String(
          participant.nickname_snapshot ||
            participant.nickname ||
            "닉네임없음"
        ),
        tradeCount,
        totalAsset,
        profitRate: Number(profitRate.toFixed(4)),
        qualified,
      });
    }

    const ranking = calculated
      .filter((row) => row.qualified)
      .sort((a, b) => {
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
      int(season.base_prize) +
      int(season.entry_fee_prize) +
      int(season.fee_prize);
    const rates = [
      num(season.first_prize_rate),
      num(season.second_prize_rate),
      num(season.third_prize_rate),
    ];

    const winners = ranking.slice(0, 3).map((row, index) => ({
      ...row,
      rank: index + 1,
      prizeRate: rates[index] || 0,
      prizeAmount: Math.floor(
        (totalPrize * (rates[index] || 0)) / 100
      ),
    }));

    const paidBase = winners.reduce(
      (sum, winner) => sum + winner.prizeAmount,
      0
    );

    if (winners.length > 0 && totalPrize > paidBase) {
      winners[0].prizeAmount += totalPrize - paidBase;
    }

    for (let index = 0; index < ranking.length; index++) {
      const row = ranking[index];
      const winner = winners.find(
        (winnerRow) => winnerRow.participantId === row.participantId
      );

      await connection.query(
        `
        UPDATE stock_season_participants
        SET final_rank = ?,
            prize_amount = ?,
            updated_at = ?
        WHERE id = ? AND season_id = ?
        `,
        [
          index + 1,
          winner ? winner.prizeAmount : 0,
          now,
          row.participantId,
          season.id,
        ]
      );
    }

    for (const row of calculated.filter((item) => !item.qualified)) {
      await connection.query(
        `
        UPDATE stock_season_participants
        SET final_rank = NULL,
            prize_amount = 0,
            updated_at = ?
        WHERE id = ? AND season_id = ?
        `,
        [now, row.participantId, season.id]
      );
    }

    for (const winner of winners) {
      if (winner.prizeAmount > 0) {
        await connection.query(
          `UPDATE users SET dotori = dotori + ? WHERE id = ?`,
          [winner.prizeAmount, winner.userId]
        );

        await connection.query(
          `
          INSERT INTO dotori_logs (user_id, amount, reason)
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
          season.id,
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

    const first = winners[0] || null;

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
      `,
      [
        now,
        first ? first.userId : null,
        first ? first.nickname : null,
        first ? first.profitRate : null,
        first ? first.prizeAmount : 0,
        now,
        season.id,
      ]
    );

    await connection.query(
      `
      UPDATE stock_virtual_traders
      SET is_active = 0,
          updated_at = ?
      WHERE season_id = ?
      `,
      [now, season.id]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${season.title} 종료 및 보상 지급이 완료되었습니다.`,
      seasonId: Number(season.id),
      totalPrize,
      participantCount: calculated.length,
      qualifiedParticipantCount: ranking.length,
      winners: winners.map((winner) => ({
        rank: winner.rank,
        nickname: winner.nickname,
        profitRate: winner.profitRate,
        prizeAmount: winner.prizeAmount,
      })),
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
    if (locked) {
      try {
        await connection.query(
          "SELECT RELEASE_LOCK('wangchu_stock_season_end')"
        );
      } catch {}
    }

    connection.release();
  }
}
