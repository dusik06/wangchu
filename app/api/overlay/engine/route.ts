import { NextResponse } from "next/server";
import { OverlayEngine } from "@/lib/overlay-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = (url.searchParams.get("clientId") || "").trim();

  const result = await OverlayEngine.tick(clientId);

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}