import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

function normalizeNumbers(numbers: any[]) {
  const clean = numbers
    .map((num) => Number(num))
    .filter((num) => Number.isInteger(num) && num >= 1 && num <= 30);

  return Array.from(new Set(clean)).sort((a, b) => a - b);
}

function countMatches(userNumbers: number[], winningNumbers: number[]) {
  return userNumbers.filter((num) => winningNumbers.includes(num)).length;
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const formData = await req.formData();

  const roundId = Number(formData.get("roundId"));
  const winningNumbers = normalizeNumbers([
    formData.get("number1"),
    formData.get("number2"),
    formData.get("number3"),
    formData.get("number4"),
    formData.get("number5"),
  ]);

  if (!roundId) {
    return NextResponse.json({
      success: false,
      message: "회차 정보가 없습니다.",
    });
  }

  if (winningNumbers.length !== 5) {
    return NextResponse.json({
      success: false,
      message: "1부터 30까지 중복 없는 숫자 5개를 입력해주세요.",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [admins]: any = await connection.query(
      "SELECT id, role FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!admins.length || admins[0].role !== "admin") {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "권한이 없습니다.",
      });
    }

    const [rounds]: any = await connection.query(
      `
      SELECT *
      FROM lottery_rounds
      WHERE id = ?
        AND status = 'OPEN'
      LIMIT 1
      `,
      [roundId]
    );

    if (!rounds.length) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "정산 가능한 회차가 없습니다.",
      });
    }

    const round = rounds[0];

    const [entries]: any = await connection.query(
      `
      SELECT *
      FROM lottery_entries
      WHERE round_id = ?
      `,
      [roundId]
    );

    const totalReward = Number(round.total_reward || 0);

    const rankPools: Record<number, number> = {
      1: Math.floor(totalReward * 0.7),
      2: Math.floor(totalReward * 0.2),
      3: totalReward - Math.floor(totalReward * 0.7) - Math.floor(totalReward * 0.2),
    };

    const rankEntries: Record<number, any[]> = {
      1: [],
      2: [],
      3: [],
    };

    for (const entry of entries) {
      const userNumbers = normalizeNumbers(String(entry.numbers).split(","));
      const matchedCount = countMatches(userNumbers, winningNumbers);

      let rankPosition = 0;

      if (matchedCount === 5) {
        rankPosition = 1;
      } else if (matchedCount === 4) {
        rankPosition = 2;
      } else if (matchedCount === 3) {
        rankPosition = 3;
      }

      await connection.query(
        `
        UPDATE lottery_entries
        SET
          matched_count = ?,
          rank_position = ?,
          is_winner = ?
        WHERE id = ?
        `,
        [matchedCount, rankPosition, rankPosition > 0 ? 1 : 0, entry.id]
      );

      if (rankPosition > 0) {
        rankEntries[rankPosition].push(entry);
      }
    }

    let carryOverReward = 0;

    for (const rank of [1, 2, 3]) {
      const winners = rankEntries[rank];
      const pool = rankPools[rank];

      if (winners.length === 0) {
        carryOverReward += pool;
        continue;
      }

      const rewardPerWinner = Math.floor(pool / winners.length);

      for (const winner of winners) {
        await connection.query(
          "UPDATE users SET dotori = dotori + ? WHERE id = ?",
          [rewardPerWinner, winner.user_id]
        );

        await connection.query(
          `
          UPDATE lottery_entries
          SET reward_amount = ?
          WHERE id = ?
          `,
          [rewardPerWinner, winner.id]
        );

        await connection.query(
          `
          INSERT INTO lottery_winners
          (
            round_id,
            user_id,
            nickname,
            rank_position,
            reward_amount,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, NOW())
          `,
          [
            roundId,
            winner.user_id,
            winner.nickname || "익명",
            rank,
            rewardPerWinner,
          ]
        );

        await connection.query(
          `
          INSERT INTO dotori_logs
          (user_id, amount, reason)
          VALUES (?, ?, ?)
          `,
          [
            winner.user_id,
            rewardPerWinner,
            `도토리 로또 ${round.round_number}회차 ${rank}등 당첨`,
          ]
        );
      }
    }

    await connection.query(
      `
      UPDATE lottery_rounds
      SET
        winning_numbers = ?,
        carry_over_reward = ?,
        status = 'CLOSED'
      WHERE id = ?
      `,
      [winningNumbers.join(","), carryOverReward, roundId]
    );

    await connection.query(
      `
      INSERT INTO lottery_rounds
      (
        round_number,
        base_reward,
        carry_over_reward,
        participant_reward_total,
        total_reward,
        draw_date,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())
      `,
      [
        Number(round.round_number) + 1,
        100,
        carryOverReward,
        0,
        100 + carryOverReward,
      ]
    );

    await connection.commit();

    return NextResponse.redirect(new URL("/admin/lottery", req.url));
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "로또 정산 중 오류가 발생했습니다.",
    });
  } finally {
    connection.release();
  }
}