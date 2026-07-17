import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSeasonNowText } from "@/lib/stock-market";

const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const int = (v: unknown) => Math.floor(num(v));

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, message: "요청값을 읽을 수 없습니다." }, { status: 400 });

  const stockId = int(body.stockId), currentPrice = int(body.currentPrice);
  const stockName = String(body.stockName || "").trim();
  const downMin = num(body.normalDownMin), downMax = num(body.normalDownMax);
  const upMin = num(body.normalUpMin), upMax = num(body.normalUpMax);
  const chance = num(body.specialChance), specialMin = num(body.specialUpMin), specialMax = num(body.specialUpMax);

  if (stockId <= 0 || !stockName || currentPrice <= 0) return NextResponse.json({ success: false, message: "기본 정보를 확인해주세요." }, { status: 400 });
  if ([downMin,downMax,upMin,upMax].some((v) => v < 0 || v > 100) || downMin > downMax || upMin > upMax)
    return NextResponse.json({ success: false, message: "일반 상승·하락 범위를 확인해주세요." }, { status: 400 });
  if (chance < 0 || chance > 100 || specialMin < 0 || specialMax > 500 || specialMin > specialMax)
    return NextResponse.json({ success: false, message: "자동 호재 설정을 확인해주세요." }, { status: 400 });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [admins]: any = await connection.query("SELECT role FROM users WHERE email = ? LIMIT 1 FOR UPDATE", [session.user.email]);
    if (admins[0]?.role !== "admin") { await connection.rollback(); return NextResponse.json({ success: false, message: "관리자만 가능합니다." }, { status: 403 }); }
    const [stocks]: any = await connection.query("SELECT current_price FROM stock_items WHERE id = ? LIMIT 1 FOR UPDATE", [stockId]);
    if (!stocks.length) { await connection.rollback(); return NextResponse.json({ success: false, message: "종목을 찾을 수 없습니다." }, { status: 404 }); }

    const oldPrice = int(stocks[0].current_price), now = getSeasonNowText();
    await connection.query(`UPDATE stock_items SET stock_name=?,current_price=?,normal_rate=?,normal_down_min=?,normal_down_max=?,normal_up_min=?,normal_up_max=?,special_chance=?,special_rate=?,special_up_min=?,special_up_max=?,last_updated_at=? WHERE id=?`,
      [stockName,currentPrice,Math.max(downMax,upMax),downMin,downMax,upMin,upMax,chance,specialMax,specialMin,specialMax,now,stockId]);

    if (oldPrice !== currentPrice) {
      const amount = currentPrice - oldPrice, rate = oldPrice > 0 ? amount / oldPrice * 100 : 0;
      await connection.query(`INSERT INTO stock_price_logs (stock_id,price,change_amount,change_rate,event_title,created_at) VALUES (?,?,?,?, '관리자 가격 수정',?)`, [stockId,currentPrice,amount,rate,now]);
    }
    await connection.commit();
    return NextResponse.json({ success: true, message: `${stockName} 설정이 저장되었습니다.` });
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("stock update", error);
    return NextResponse.json({ success: false, message: "수정 중 오류가 발생했습니다. 1차 SQL 적용 여부를 확인해주세요." }, { status: 500 });
  } finally { connection.release(); }
}
