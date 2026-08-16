import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import db from "@/lib/db";

const adminEmails = ["wonnie8181@gmail.com", "cksqls06@gmail.com"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const nickname = String(body?.nickname || "").trim();

    if (!/^[가-힣a-zA-Z0-9]{2,8}$/.test(nickname)) {
      return NextResponse.json(
        { success: false, message: "닉네임은 한글/영문/숫자 2~8자로 입력해주세요." },
        { status: 400 }
      );
    }

    const email = session.user.email;

    const [duplicateRows]: any = await db.query(
      "SELECT id FROM users WHERE nickname = ? AND email != ? LIMIT 1",
      [nickname, email]
    );

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        { success: false, message: "이미 사용 중인 닉네임입니다." },
        { status: 409 }
      );
    }

    const image = session.user.image || null;
    const role = adminEmails.includes(email) ? "admin" : "user";

    await db.query(
      `
      INSERT INTO users (email, nickname, image, role, dotori)
      VALUES (?, ?, ?, ?, 0)
      ON DUPLICATE KEY UPDATE
        nickname = VALUES(nickname),
        image = VALUES(image),
        role = VALUES(role)
      `,
      [email, nickname, image, role]
    );

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("nickname setup failed", error);
    return NextResponse.json(
      { success: false, message: "닉네임 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
