import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = Number(searchParams.get("mapId") || 0);

  let rows: any;

  if (mapId > 0) {
    [rows] = await db.query(
      `
      SELECT id, map_name, map_data, created_at
      FROM pinball_maps
      WHERE id = ?
      LIMIT 1
      `,
      [mapId]
    );
  } else {
    [rows] = await db.query(
      `
      SELECT id, map_name, map_data, created_at
      FROM pinball_maps
      ORDER BY id DESC
      LIMIT 1
      `
    );
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({
      success: true,
      map: null,
    });
  }

  return NextResponse.json({
    success: true,
    map: {
      id: rows[0].id,
      mapName: rows[0].map_name,
      mapData: JSON.parse(rows[0].map_data),
      createdAt: rows[0].created_at,
    },
  });
}