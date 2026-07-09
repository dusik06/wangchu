import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [ranking]: any = await db.query(`
      SELECT
        u.id AS user_id,
        u.nickname,
        (
          IFNULL(d.total_dice, 0) +
          IFNULL(l.total_ladder, 0) +
          IFNULL(p.total_pinball, 0) +
          IFNULL(pr.total_prediction, 0) +
          IFNULL(ud.total_updown, 0)
        ) AS total_bet
      FROM users u

      LEFT JOIN (
        SELECT user_id, SUM(bet_amount) AS total_dice
        FROM dice_game_logs
        GROUP BY user_id
      ) d ON d.user_id = u.id

      LEFT JOIN (
        SELECT user_id, SUM(bet_amount) AS total_ladder
        FROM ladder_game_logs
        GROUP BY user_id
      ) l ON l.user_id = u.id

      LEFT JOIN (
        SELECT user_id, SUM(bet_amount) AS total_pinball
        FROM pinball_game_logs
        GROUP BY user_id
      ) p ON p.user_id = u.id

      LEFT JOIN (
        SELECT user_id, SUM(bet_amount) AS total_prediction
        FROM prediction_bets
        GROUP BY user_id
      ) pr ON pr.user_id = u.id

      LEFT JOIN (
        SELECT user_id, SUM(bet_amount) AS total_updown
        FROM updown_game_rounds
        GROUP BY user_id
      ) ud ON ud.user_id = u.id

      WHERE u.role != 'admin'
      ORDER BY total_bet DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      ranking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "랭킹을 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}