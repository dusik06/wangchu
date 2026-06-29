import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

const ENTRY_COST = 50;

function normalizeNumbers(numbers: any) {
  if (!Array.isArray(numbers)) return [];

  const clean = numbers
    .map((num) => Number(num))
    .filter((num) => Number.isInteger(num) && num >= 1 && num <= 30);

  return Array.from(new Set(clean)).sort((a, b) => a - b);
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const body = await req.json();
  const roundId = Number(body.roundId);
  const numbers = normalizeNumbers(body.numbers);

  if (!roundId) {
    return NextResponse.json({
      success: false,
      message: "회차 정보가 없습니다.",
    });
  }

  if (numbers.length !== 5) {
    return NextResponse.json({
      success: false,
      message: "1부터 30까지 숫자 중 5개를 선택해주세요.",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users]: any = await connection.query(
      "SELECT id, nickname, dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!users.length) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "회원 정보를 찾을 수 없습니다.",
      });
    }

    const user = users[0];

    if (Number(user.dotori) < ENTRY_COST) {
      await connection.rollback();

      return NextResponse.json({
        success: false,
        message: "도토리가 부족합니다.",
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
        message: "참여 가능한 회차가 없습니다.",
      });
    }

    await connection.query(
      "UPDATE users SET dotori = dotori - ? WHERE id = ?",
      [ENTRY_COST, user.id]
    );

    await connection.query(
      `
      INSERT INTO lottery_entries
      (
        round_id,
        user_id,
        nickname,
        numbers,
        created_at
      )
      VALUES (?, ?, ?, ?, NOW())
      `,
      [roundId, user.id, user.nickname || "익명", numbers.join(",")]
    );

    await connection.query(
      `
      UPDATE lottery_rounds
      SET
        participant_reward_total = participant_reward_total + ?,
        total_reward = total_reward + ?
      WHERE id = ?
      `,
      [ENTRY_COST, ENTRY_COST, roundId]
    );

    await connection.query(
      `
      INSERT INTO dotori_logs
      (user_id, amount, reason)
      VALUES (?, ?, ?)
      `,
      [user.id, -ENTRY_COST, "도토리 로또 참여"]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "로또 참여 완료!",
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "로또 참여 중 오류가 발생했습니다.",
    });
  } finally {
    connection.release();
  }
}