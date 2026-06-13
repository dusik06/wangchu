import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ success: false });
  }

  await db.query(
    "UPDATE users SET last_seen = NOW() WHERE email = ?",
    [session.user.email]
  );

  return NextResponse.json({ success: true });
}