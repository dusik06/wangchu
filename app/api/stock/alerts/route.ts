import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT
        e.id,
        e.stock_id,
        s.stock_name,
        e.event_title,
        e.event_rate,
        DATE_FORMAT(e.created_at, '%Y.%m.%d %H:%i') AS created_at_kst
      FROM stock_events e
      INNER JOIN stock_items s ON s.id = e.stock_id
      WHERE e.event_type = 'UP'
        AND e.event_title LIKE '🚨%자동 호재 발생'
        AND e.created_at >= DATE_SUB(NOW(), INTERVAL 60 MINUTE)
      ORDER BY e.id DESC
      LIMIT 5
    `);

    return NextResponse.json({ success: true, alerts: rows });
  } catch (error) {
    console.error("stock alerts", error);
    return NextResponse.json({ success: false, alerts: [] });
  }
}
