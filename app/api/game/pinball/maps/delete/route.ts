import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

const ADMIN_EMAILS = ["cksqls06@gmail.com"];

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({
      success: false,
      message: "관리자만 삭제할 수 있습니다.",
    });
  }

  const body = await req.json();
  const mapId = Number(body.mapId);

  if (!mapId) {
    return NextResponse.json({
      success: false,
      message: "삭제할 맵 ID가 없습니다.",
    });
  }

  await db.query(
    `
    DELETE FROM pinball_maps
    WHERE id = ?
    `,
    [mapId]
  );

  return NextResponse.json({
    success: true,
  });
}