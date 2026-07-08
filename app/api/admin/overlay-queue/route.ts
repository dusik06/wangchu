import { NextResponse } from "next/server";
import { OverlayEngine } from "@/lib/overlay-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await OverlayEngine.getAdminStatus();

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}