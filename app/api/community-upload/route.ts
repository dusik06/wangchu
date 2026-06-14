import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({
      success: false,
      message: "로그인이 필요합니다.",
    });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({
      success: false,
      message: "파일이 없습니다.",
    });
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({
      success: false,
      message: "png, jpg, jpeg, webp, gif 파일만 가능합니다.",
    });
  }

  const maxSize = 20 * 1024 * 1024;

  if (file.size > maxSize) {
    return NextResponse.json({
      success: false,
      message: "파일 용량은 최대 20MB까지 가능합니다.",
    });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowedExt = ["png", "jpg", "jpeg", "webp", "gif"];

  if (!ext || !allowedExt.includes(ext)) {
    return NextResponse.json({
      success: false,
      message: "허용되지 않은 확장자입니다.",
    });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const uploadPath = path.join(process.cwd(), "public", "uploads", fileName);

  await writeFile(uploadPath, buffer);

  return NextResponse.json({
    success: true,
    message: "업로드 완료",
    imageUrl: `/uploads/${fileName}`,
  });
}