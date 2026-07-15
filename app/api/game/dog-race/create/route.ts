import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createRaceEntries } from "@/lib/dog-race/engine";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [users]: any = await conn.query(
      "SELECT id, role FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );

    if (!users.length) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "유저 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (String(users[0].role || "") === "admin") {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "관리자 계정은 게임에 참여할 수 없습니다." }, { status: 403 });
    }

    const [settingsRows]: any = await conn.query(
      "SELECT payout_rate, is_active FROM dog_race_settings WHERE id = 1 LIMIT 1"
    );
    const settings = settingsRows[0] || { payout_rate: 0.92, is_active: 1 };

    if (Number(settings.is_active) !== 1) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "현재 왈왈이경주는 점검 중입니다." }, { status: 503 });
    }

    const entries = createRaceEntries(Number(settings.payout_rate || 0.92));
    const raceCode = `DR${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

    const [raceResult]: any = await conn.query(
      `INSERT INTO dog_races
      (race_code, created_by_user_id, status, created_at)
      VALUES (?, ?, 'ready', NOW())`,
      [raceCode, users[0].id]
    );

    for (const dog of entries) {
      await conn.query(
        `INSERT INTO dog_race_entries
        (race_id, lane_no, dog_key, dog_name, dog_breed, speed, stamina, sprint, composure,
         mistake_rate, power_score, win_probability, odds, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          raceResult.insertId,
          dog.lane,
          dog.dogKey,
          dog.name,
          dog.breed,
          dog.speed,
          dog.stamina,
          dog.sprint,
          dog.composure,
          dog.mistakeRate,
          dog.powerScore,
          dog.winProbability,
          dog.odds,
        ]
      );
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      raceId: Number(raceResult.insertId),
      raceCode,
      status: "ready",
      entries,
    });
  } catch (error) {
    await conn.rollback();
    console.error("dog-race create error", error);
    return NextResponse.json(
      { success: false, message: "새 경기를 만드는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
