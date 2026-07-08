import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const conn = await (db as any).getConnection();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const missionId = Number(body.missionId || 0);
    const amount = Number(body.amount || 0);

    if (!missionId || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "지원 도토리를 입력해주세요." },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    const [userRows]: any = await conn.query(
      `
      SELECT id, email, nickname, dotori
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [session.user.email]
    );

    const user = userRows[0];

    if (!user) {
      await conn.rollback();
      return NextResponse.json(
        { success: false, message: "유저 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (Number(user.dotori || 0) < amount) {
      await conn.rollback();
      return NextResponse.json(
        { success: false, message: "도토리가 부족합니다." },
        { status: 400 }
      );
    }

    const [missionRows]: any = await conn.query(
      `
      SELECT id, title, goal_dotori, current_dotori, status
      FROM broadcast_missions
      WHERE id = ?
      LIMIT 1
      `,
      [missionId]
    );

    const mission = missionRows[0];

    if (!mission || mission.status !== "active") {
      await conn.rollback();
      return NextResponse.json(
        { success: false, message: "진행 중인 미션이 아닙니다." },
        { status: 400 }
      );
    }

    await conn.query(
      `
      UPDATE users
      SET dotori = dotori - ?
      WHERE email = ?
        AND dotori >= ?
      `,
      [amount, session.user.email, amount]
    );

    await conn.query(
      `
      INSERT INTO broadcast_mission_supports
        (mission_id, user_email, nickname, dotori_amount, created_at)
      VALUES
        (?, ?, ?, ?, NOW())
      `,
      [missionId, session.user.email, user.nickname || "익명", amount]
    );

    await conn.query(
      `
      INSERT INTO dotori_logs
        (user_id, amount, reason, created_at)
      VALUES
        (?, ?, ?, NOW())
      `,
      [user.id, -amount, `방송 미션 지원: ${mission.title}`]
    );

    await conn.query(
      `
      INSERT INTO mission_overlay_alerts
        (mission_id, alert_type, nickname, dotori_amount, mission_title, status, created_at)
      VALUES
        (?, 'support', ?, ?, ?, 'pending', NOW())
      `,
      [missionId, user.nickname || "익명", amount, mission.title]
    );

    const nextCurrent = Number(mission.current_dotori || 0) + amount;
    const goal = Number(mission.goal_dotori || 0);

    if (goal > 0 && nextCurrent >= goal) {
      await conn.query(
        `
        UPDATE broadcast_missions
        SET current_dotori = ?,
            status = 'completed',
            is_selected = 0,
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
        `,
        [nextCurrent, missionId]
      );

      await conn.query(
        `
        INSERT INTO mission_overlay_alerts
          (mission_id, alert_type, nickname, dotori_amount, mission_title, status, created_at)
        VALUES
          (?, 'complete', ?, ?, ?, 'pending', NOW())
        `,
        [missionId, user.nickname || "익명", amount, mission.title]
      );
    } else {
      await conn.query(
        `
        UPDATE broadcast_missions
        SET current_dotori = ?,
            updated_at = NOW()
        WHERE id = ?
        `,
        [nextCurrent, missionId]
      );
    }


    await conn.query(`
      INSERT IGNORE INTO overlay_engine_state
      (
        id,
        owner_client_id,
        owner_seen_at,
        current_type,
        current_id,
        current_started_at,
        current_key,
        updated_at
      )
      VALUES
      (1, NULL, NULL, NULL, NULL, NULL, NULL, NOW())
    `);
    
    await conn.query(`
      UPDATE overlay_engine_state
      SET updated_at = NOW()
      WHERE id = 1
    `);
    
    await conn.commit();

    return NextResponse.json({
      success: true,
      message: "미션을 지원했습니다.",
    });
  } catch (error) {
    await conn.rollback();
    console.error(error);

    return NextResponse.json(
      { success: false, message: "미션 지원에 실패했습니다." },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}