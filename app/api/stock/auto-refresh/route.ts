import { NextResponse } from "next/server";
import { POST as refreshStockMarket } from "@/app/api/stock/refresh/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const configuredSecret = String(
    process.env.STOCK_REFRESH_SECRET || ""
  ).trim();

  if (!configuredSecret) {
    return false;
  }

  const requestUrl = new URL(req.url);
  const querySecret = String(
    requestUrl.searchParams.get("secret") || ""
  ).trim();

  const headerSecret = String(
    req.headers.get("x-stock-refresh-secret") || ""
  ).trim();

  return (
    querySecret === configuredSecret ||
    headerSecret === configuredSecret
  );
}

async function runAutoRefresh(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        success: false,
        message: "허용되지 않은 요청입니다.",
      },
      { status: 401 }
    );
  }

  try {
    return await refreshStockMarket();
  } catch (error) {
    console.error(
      "Stock automatic refresh error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "주식시장 자동 갱신 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return runAutoRefresh(req);
}

export async function POST(req: Request) {
  return runAutoRefresh(req);
}