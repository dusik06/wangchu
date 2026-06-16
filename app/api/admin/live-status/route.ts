import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [users]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!users.length || users[0].role !== "admin") {
    return NextResponse.json({ error: "관리자만 가능합니다." }, { status: 403 });
  }

  const body = await req.json();

  const liveForce = String(body.liveForce || "auto");
  const liveStatus = String(body.liveStatus || "off");

  if (!["auto", "on", "off"].includes(liveForce)) {
    return NextResponse.json({ error: "설정값이 올바르지 않습니다." }, { status: 400 });
  }

  if (!["on", "off"].includes(liveStatus)) {
    return NextResponse.json({ error: "상태값이 올바르지 않습니다." }, { status: 400 });
  }

  await db.query(
    "UPDATE site_settings SET live_force = ?, live_status = ? LIMIT 1",
    [liveForce, liveStatus]
  );

  return NextResponse.json({ ok: true });
}