import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "파일이 없습니다." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "이미지/GIF 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "20MB 이하만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `community/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabaseAdmin.storage
      .from("wangchu")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error(error);

      return NextResponse.json(
        { success: false, message: "업로드 실패" },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage
      .from("wangchu")
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      message: "업로드 완료",
      imageUrl: data.publicUrl,
      url: data.publicUrl,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "서버 오류" },
      { status: 500 }
    );
  }
}