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

  if (!roundId || winningNumbers.length !== 5) {
    return NextResponse.json({
      success: false,
      message: "잘못된 요청입니다.",
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
        message: "권한 없음",
      });
    }

    const [roundRows]: any = await connection.query(
      `
      SELECT *
      FROM lottery_rounds
      WHERE id = ?
      AND status = 'OPEN'
      LIMIT 1
      `,
      [roundId]
    );

    if (!roundRows.length) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "회차 없음",
      });
    }

    const round = roundRows[0];

    const [entries]: any = await connection.query(
      `
      SELECT *
      FROM lottery_entries
      WHERE round_id = ?
      `,
      [roundId]
    );

    const totalReward = Number(round.total_reward);

    const firstPool = Math.floor(totalReward * 0.7);
    const secondPool = Math.floor(totalReward * 0.2);
    const thirdPool = totalReward - firstPool - secondPool;

    const firstWinners: any[] = [];
    const secondWinners: any[] = [];
    const thirdWinners: any[] = [];

    for (const entry of entries) {
      const userNumbers = normalizeNumbers(
        String(entry.numbers).split(",")
      );

      const matchedCount = countMatches(userNumbers, winningNumbers);

      let rankPosition = 0;

      if (matchedCount === 5) rankPosition = 1;
      if (matchedCount === 4) rankPosition = 2;
      if (matchedCount === 3) rankPosition = 3;

      await connection.query(
        `
        UPDATE lottery_entries
        SET
          matched_count = ?,
          rank_position = ?,
          is_winner = ?
        WHERE id = ?
        `,
        [
          matchedCount,
          rankPosition,
          rankPosition > 0 ? 1 : 0,
          entry.id,
        ]
      );

      if (rankPosition === 1) firstWinners.push(entry);
      if (rankPosition === 2) secondWinners.push(entry);
      if (rankPosition === 3) thirdWinners.push(entry);
    }

    let carryOverReward = 0;

    async function payWinners(
      winners: any[],
      rank: number,
      pool: number
    ) {
      if (winners.length === 0) {
        carryOverReward += pool;
        return;
      }

      const rewardPerWinner = Math.floor(pool / winners.length);

      for (const winner of winners) {
        await connection.query(
          `
          UPDATE users
          SET dotori = dotori + ?
          WHERE id = ?
          `,
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
            winner.nickname,
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
            `로또 ${round.round_number}회차 ${rank}등 당첨`,
          ]
        );
      }
    }

    await payWinners(firstWinners, 1, firstPool);
    await payWinners(secondWinners, 2, secondPool);
    await payWinners(thirdWinners, 3, thirdPool);

    await connection.query(
      `
      UPDATE lottery_rounds
      SET
        winning_numbers = ?,
        carry_over_reward = ?,
        status = 'CLOSED'
      WHERE id = ?
      `,
      [
        winningNumbers.join(","),
        carryOverReward,
        roundId,
      ]
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

    return NextResponse.redirect(
      new URL("/admin/lottery", req.url)
    );
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "정산 실패",
    });
  } finally {
    connection.release();
  }
}