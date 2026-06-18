import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const [rows]: any = await db.query(
    `
    SELECT id, map_name, map_data, created_by, created_at
    FROM pinball_maps
    ORDER BY id DESC
    LIMIT 100
    `
  );

  return NextResponse.json({
    success: true,
    maps: rows || [],
  });
}