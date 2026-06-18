import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

const ADMIN_EMAILS = ["cksqls06@gmail.com"];

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({
      success: false,
      message: "관리자만 저장할 수 있습니다.",
    });
  }

  const body = await req.json();
  const mapName = body.mapName;
  const mapData = body.mapData;

  if (!mapName || !Array.isArray(mapData)) {
    return NextResponse.json({
      success: false,
      message: "맵 데이터가 올바르지 않습니다.",
    });
  }

  await db.query(
    `
    INSERT INTO pinball_maps (map_name, map_data, created_by, created_at)
    VALUES (?, ?, ?, NOW())
    `,
    [mapName, JSON.stringify(mapData), session.user.email]
  );

  return NextResponse.json({
    success: true,
  });
}