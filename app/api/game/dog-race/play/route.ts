import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { simulateRace, type StoredDogRaceEntry } from "@/lib/dog-race/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raceCode = String(body?.raceCode || "").trim();
  const selectedLane = Number(body?.selectedLane || 0);
  const betAmount = Math.floor(Number(body?.betAmount || 0));

  if (!raceCode || selectedLane < 1 || selectedLane > 6) {
    return NextResponse.json({ success: false, message: "경기와 왈왈이를 다시 선택해주세요." }, { status: 400 });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [settingsRows]: any = await conn.query(
      "SELECT min_bet, max_bet, is_active FROM dog_race_settings WHERE id = 1 LIMIT 1 FOR UPDATE"
    );
    const settings = settingsRows[0] || { min_bet: 10, max_bet: 10000, is_active: 1 };
    const minBet = Math.max(1, Number(settings.min_bet || 10));
    const maxBet = Math.max(minBet, Number(settings.max_bet || 10000));

    if (Number(settings.is_active) !== 1) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "현재 왈왈이경주는 점검 중입니다." }, { status: 503 });
    }

    if (!Number.isFinite(betAmount) || betAmount < minBet || betAmount > maxBet) {
      await conn.rollback();
      return NextResponse.json({
        success: false,
        message: `베팅은 ${minBet.toLocaleString()}~${maxBet.toLocaleString()}도토리까지 가능합니다.`,
      }, { status: 400 });
    }

    const [users]: any = await conn.query(
      "SELECT id, dotori, role FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [session.user.email]
    );

    if (!users.length) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "유저 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const user = users[0];

    if (Number(user.dotori || 0) < betAmount) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "보유 도토리가 부족합니다." }, { status: 400 });
    }

    const [races]: any = await conn.query(
      `SELECT id, race_code, created_by_user_id, status
       FROM dog_races
       WHERE race_code = ?
       LIMIT 1
       FOR UPDATE`,
      [raceCode]
    );

    if (!races.length || Number(races[0].created_by_user_id) !== Number(user.id)) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "유효하지 않은 경기입니다." }, { status: 404 });
    }

    const race = races[0];
    if (String(race.status) !== "ready") {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "이미 시작되었거나 종료된 경기입니다." }, { status: 409 });
    }

    const [entryRows]: any = await conn.query(
      `SELECT id, lane_no, dog_key, dog_name, dog_breed, speed, stamina, sprint,
              composure, mistake_rate, power_score, win_probability, odds
       FROM dog_race_entries
       WHERE race_id = ?
       ORDER BY lane_no ASC
       FOR UPDATE`,
      [race.id]
    );

    if (entryRows.length !== 6) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "경기 출전 정보가 올바르지 않습니다." }, { status: 500 });
    }

    const entries: StoredDogRaceEntry[] = entryRows.map((row: any) => ({
      id: Number(row.id),
      lane: Number(row.lane_no),
      dogKey: String(row.dog_key),
      name: String(row.dog_name),
      breed: String(row.dog_breed),
      emoji: "🐕",
      speed: Number(row.speed),
      stamina: Number(row.stamina),
      sprint: Number(row.sprint),
      composure: Number(row.composure),
      mistakeRate: Number(row.mistake_rate),
      powerScore: Number(row.power_score),
      winProbability: Number(row.win_probability),
      odds: Number(row.odds),
    }));

    const selectedDog = entries.find((entry) => entry.lane === selectedLane);
    if (!selectedDog) {
      await conn.rollback();
      return NextResponse.json({ success: false, message: "선택한 왈왈이를 찾을 수 없습니다." }, { status: 400 });
    }

    const result = simulateRace(entries);
    const won = result.winnerLane === selectedLane;
    const payoutAmount = won ? Math.floor(betAmount * selectedDog.odds) : 0;
    const netChange = payoutAmount - betAmount;

    await conn.query(
      `UPDATE dog_races
       SET status = 'finished', winner_lane = ?, started_at = NOW(), finished_at = NOW(),
           replay_json = ?, total_bet_amount = ?, total_payout_amount = ?
       WHERE id = ?`,
      [result.winnerLane, JSON.stringify(result), betAmount, payoutAmount, race.id]
    );

    for (let index = 0; index < result.ranking.length; index += 1) {
      await conn.query(
        "UPDATE dog_race_entries SET finish_rank = ? WHERE race_id = ? AND lane_no = ?",
        [index + 1, race.id, result.ranking[index]]
      );
    }

    await conn.query(
      `INSERT INTO dog_race_bets
       (race_id, user_id, selected_lane, bet_amount, odds, payout_amount, status, created_at, settled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [race.id, user.id, selectedLane, betAmount, selectedDog.odds, payoutAmount, won ? "win" : "lose"]
    );

    await conn.query("UPDATE users SET dotori = dotori + ? WHERE id = ?", [netChange, user.id]);

    await conn.query(
      "INSERT INTO dotori_logs (user_id, amount, reason, created_at) VALUES (?, ?, ?, NOW())",
      [user.id, -betAmount, `왈왈이경주 베팅 (${raceCode}, ${selectedLane}번)`]
    );

    if (payoutAmount > 0) {
      await conn.query(
        "INSERT INTO dotori_logs (user_id, amount, reason, created_at) VALUES (?, ?, ?, NOW())",
        [user.id, payoutAmount, `왈왈이경주 당첨 (${raceCode}, ${result.winnerLane}번 우승)`]
      );
    }

    for (const event of result.events) {
      await conn.query(
        `INSERT INTO dog_race_logs
         (race_id, log_type, lane_no, message, event_time_ms, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [race.id, event.type, event.lane, event.message, Math.floor(event.at)]
      );
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      raceCode,
      selectedLane,
      betAmount,
      odds: selectedDog.odds,
      payoutAmount,
      won,
      newBalance: Number(user.dotori || 0) + netChange,
      result,
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("dog-race play error", error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ success: false, message: "이미 처리된 경기입니다. 새 경기를 만들어주세요." }, { status: 409 });
    }

    return NextResponse.json({ success: false, message: "레이스를 처리하는 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    conn.release();
  }
}
