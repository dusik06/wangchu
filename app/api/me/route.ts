import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ user: null });
    }

    const [rows]: any = await db.query(
      "SELECT id, email, nickname, image, role, dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (error: any) {
    return NextResponse.json(
      {
        user: null,
        error: error.message,
      },
      { status: 500 }
    );
  }
}