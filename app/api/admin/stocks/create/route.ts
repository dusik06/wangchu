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

  const stockName = String(body.stockName || "").trim();
  const currentPrice = int(body.currentPrice);
  const downMin = num(body.normalDownMin), downMax = num(body.normalDownMax);
  const upMin = num(body.normalUpMin), upMax = num(body.normalUpMax);
  const chance = num(body.specialChance), specialMin = num(body.specialUpMin), specialMax = num(body.specialUpMax);

  if (!stockName || stockName.length > 100) return NextResponse.json({ success: false, message: "주식 이름을 확인해주세요." }, { status: 400 });
  if (currentPrice <= 0) return NextResponse.json({ success: false, message: "초기 가격은 1 이상이어야 합니다." }, { status: 400 });
  if ([downMin, downMax, upMin, upMax].some((v) => v < 0 || v > 100) || downMin > downMax || upMin > upMax)
    return NextResponse.json({ success: false, message: "일반 상승·하락 범위를 확인해주세요." }, { status: 400 });
  if (chance < 0 || chance > 100 || specialMin < 0 || specialMax > 500 || specialMin > specialMax)
    return NextResponse.json({ success: false, message: "자동 호재 설정을 확인해주세요." }, { status: 400 });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [admins]: any = await connection.query("SELECT role FROM users WHERE email = ? LIMIT 1 FOR UPDATE", [session.user.email]);
    if (admins[0]?.role !== "admin") { await connection.rollback(); return NextResponse.json({ success: false, message: "관리자만 가능합니다." }, { status: 403 }); }
    const [dupes]: any = await connection.query("SELECT id FROM stock_items WHERE stock_name = ? LIMIT 1", [stockName]);
    if (dupes.length) { await connection.rollback(); return NextResponse.json({ success: false, message: "같은 이름의 주식이 이미 존재합니다." }, { status: 409 }); }

    const now = getSeasonNowText();
    const normalRate = Math.max(downMax, upMax);
    const specialRate = specialMax;
    const [result]: any = await connection.query(`
      INSERT INTO stock_items
      (stock_name,current_price,normal_rate,normal_down_min,normal_down_max,normal_up_min,normal_up_max,
       special_chance,special_rate,special_up_min,special_up_max,market_trend,trend_rounds_left,is_listed,last_updated_at,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'NORMAL',0,1,?,?)`,
      [stockName,currentPrice,normalRate,downMin,downMax,upMin,upMax,chance,specialRate,specialMin,specialMax,now,now]
    );
    await connection.query(`INSERT INTO stock_price_logs (stock_id,price,change_amount,change_rate,event_title,created_at) VALUES (?, ?, 0, 0, '신규 상장', ?)`, [result.insertId,currentPrice,now]);
    await connection.commit();
    return NextResponse.json({ success: true, message: `${stockName} 신규 상장이 완료되었습니다.` });
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("stock create", error);
    return NextResponse.json({ success: false, message: "주식 등록 중 오류가 발생했습니다. 1차 SQL을 먼저 적용했는지 확인해주세요." }, { status: 500 });
  } finally { connection.release(); }
}
