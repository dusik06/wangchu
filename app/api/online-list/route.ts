import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const [users]: any = await db.query(`
    SELECT nickname
    FROM users
    WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    AND nickname IS NOT NULL
    ORDER BY last_seen DESC
    LIMIT 10
  `);

  return NextResponse.json({ users });
}