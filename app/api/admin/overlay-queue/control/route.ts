import { broadcastOverlayChange } from "@/lib/overlay-realtime-server";
import { NextResponse } from "next/server";
import { OverlayEngine } from "@/lib/overlay-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await OverlayEngine.control({
    command: String(body?.command || "none"),
    targetType: body?.targetType ? String(body.targetType) : null,
    targetId: body?.targetId ? Number(body.targetId) : null,
  });

  if (result.success) await broadcastOverlayChange("control");

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}