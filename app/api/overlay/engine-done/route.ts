import { NextResponse } from "next/server";
import { OverlayEngine } from "@/lib/overlay-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await OverlayEngine.done({
    id: Number(body?.id || 0),
    type: String(body?.type || "item") === "mission" ? "mission" : "item",
    clientId: String(body?.clientId || "").trim(),
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}