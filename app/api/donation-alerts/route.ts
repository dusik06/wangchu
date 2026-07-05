import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [alerts]: any = await db.query(`
      SELECT
        id,
        donor_name,
        amount,
        message,
        status,
        played_count,
        created_at,
        started_at,
        finished_at
      FROM donation_alerts
      ORDER BY id DESC
      LIMIT 50
    `);

    const [controlRows]: any = await db.query(`
      SELECT command, target_alert_id, updated_at
      FROM donation_alert_control
      WHERE id = 1
      LIMIT 1
    `);

    return NextResponse.json({
      success: true,
      alerts,
      control: controlRows[0] || {
        command: "none",
        target_alert_id: null,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: "후원알림 목록을 불러오지 못했습니다.",
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const donorName = String(body.donorName || "").trim();
    const amount = Number(body.amount || 0);
    const message = String(body.message || "").trim();

    if (!donorName) {
      return NextResponse.json({
        success: false,
        message: "후원자 이름이 필요합니다.",
      }, { status: 400 });
    }

    await db.query(
      `
      INSERT INTO donation_alerts
        (donor_name, amount, message, status, played_count, created_at)
      VALUES
        (?, ?, ?, 'waiting', 0, NOW())
      `,
      [donorName, amount, message]
    );

    return NextResponse.json({
      success: true,
      message: "후원알림이 추가되었습니다.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: "후원알림 추가에 실패했습니다.",
    }, { status: 500 });
  }
}