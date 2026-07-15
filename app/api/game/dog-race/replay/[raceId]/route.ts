import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ raceId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { raceId } = await context.params;
  const id = Number(raceId || 0);

  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ success: false, message: "경기 정보가 없습니다." }, { status: 400 });
  }

  const [users]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length) {
    return NextResponse.json({ success: false, message: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const [races]: any = await db.query(
    `
    SELECT r.*
    FROM dog_races r
    LEFT JOIN dog_race_bets b
      ON b.race_id = r.id
     AND b.user_id = ?
    WHERE r.id = ?
      AND (b.id IS NOT NULL OR ? = 'admin')
    LIMIT 1
    `,
    [users[0].id, id, users[0].role]
  );

  if (!races.length) {
    return NextResponse.json({ success: false, message: "리플레이를 볼 수 없습니다." }, { status: 404 });
  }

  const [entries]: any = await db.query(
    `
    SELECT lane_no, dog_key, dog_name, dog_breed, speed, stamina, sprint,
           composure, mistake_rate, win_probability, odds, finish_rank
    FROM dog_race_entries
    WHERE race_id = ?
    ORDER BY lane_no ASC
    `,
    [id]
  );

  const [logs]: any = await db.query(
    `
    SELECT log_type, lane_no, message, event_time_ms
    FROM dog_race_logs
    WHERE race_id = ?
    ORDER BY event_time_ms ASC, id ASC
    `,
    [id]
  );

  let replay = null;
  try {
    replay = races[0].replay_json ? JSON.parse(races[0].replay_json) : null;
  } catch {
    replay = null;
  }

  return NextResponse.json({
    success: true,
    race: {
      id: races[0].id,
      winnerLane: races[0].winner_lane,
      createdAt: races[0].created_at,
      finishedAt: races[0].finished_at,
    },
    entries,
    logs,
    replay,
  });
}
