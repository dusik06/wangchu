import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [controlRows]: any = await db.query(`
      SELECT command, target_alert_id
      FROM donation_alert_control
      WHERE id = 1
      LIMIT 1
    `);

    const control = controlRows[0] || {
      command: "none",
      target_alert_id: null,
    };

    if (control.command === "skip") {
      await db.query(`
        UPDATE donation_alerts
        SET status = 'skipped', finished_at = NOW()
        WHERE status = 'playing'
      `);

      await db.query(`
        UPDATE donation_alert_control
        SET command = 'none', target_alert_id = NULL, updated_at = NOW()
        WHERE id = 1
      `);

      return NextResponse.json({
        success: true,
        command: "skip",
        alert: null,
      });
    }

    if (control.command === "replay" && control.target_alert_id) {
      const [rows]: any = await db.query(
        `
        SELECT id, donor_name, amount, message, played_count
        FROM donation_alerts
        WHERE id = ?
        LIMIT 1
        `,
        [control.target_alert_id]
      );

      await db.query(`
        UPDATE donation_alert_control
        SET command = 'none', target_alert_id = NULL, updated_at = NOW()
        WHERE id = 1
      `);

      if (rows[0]) {
        return NextResponse.json({
          success: true,
          command: "replay",
          alert: rows[0],
        });
      }
    }

    const [playingRows]: any = await db.query(`
      SELECT id, donor_name, amount, message, played_count
      FROM donation_alerts
      WHERE status = 'playing'
      ORDER BY id ASC
      LIMIT 1
    `);

    if (playingRows[0]) {
      return NextResponse.json({
        success: true,
        command: "playing",
        alert: playingRows[0],
      });
    }

    const [waitingRows]: any = await db.query(`
      SELECT id, donor_name, amount, message, played_count
      FROM donation_alerts
      WHERE status = 'waiting'
      ORDER BY id ASC
      LIMIT 1
    `);

    if (!waitingRows[0]) {
      return NextResponse.json({
        success: true,
        command: "none",
        alert: null,
      });
    }

    await db.query(
      `
      UPDATE donation_alerts
      SET status = 'playing', started_at = NOW(), played_count = played_count + 1
      WHERE id = ?
      `,
      [waitingRows[0].id]
    );

    return NextResponse.json({
      success: true,
      command: "play",
      alert: waitingRows[0],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: "다음 후원알림을 불러오지 못했습니다.",
    }, { status: 500 });
  }
}