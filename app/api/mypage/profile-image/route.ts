import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("profileImage") as File | null;

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "이미지 파일만 업로드 가능합니다." }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    return NextResponse.json({ error: "최대 5MB까지만 업로드 가능합니다." }, { status: 400 });
  }

  const [users]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  const user = users[0];

  if (!user) {
    return NextResponse.json({ error: "유저 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const fileName = `profile_${user.id}_${Date.now()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  const imageUrl = `/uploads/profiles/${fileName}`;

  await db.query(
    "UPDATE users SET profile_image = ? WHERE id = ?",
    [imageUrl, user.id]
  );

  return NextResponse.redirect(new URL("/mypage", req.url));
}