import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const [admins]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    return NextResponse.json(
      { success: false, message: "관리자만 가능합니다." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const stockId = Number(body.stockId);

  const [stocks]: any = await db.query(
    `
    SELECT *
    FROM stock_items
    WHERE id = ?
    LIMIT 1
    `,
    [stockId]
  );

  if (!stocks.length) {
    return NextResponse.json(
      { success: false, message: "주식을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const stock = stocks[0];

  const [holdingRows]: any = await db.query(
    `
    SELECT IFNULL(SUM(quantity), 0) AS total_quantity
    FROM stock_holdings
    WHERE stock_id = ?
    `,
    [stockId]
  );

  const deletedQuantity = Number(
    holdingRows[0]?.total_quantity || 0
  );

  await db.query(
    `
    UPDATE stock_items
    SET is_listed = 0,
        current_price = 0,
        last_updated_at = NOW()
    WHERE id = ?
    `,
    [stockId]
  );

  await db.query(
    `
    INSERT INTO stock_price_logs
    (stock_id, price, change_amount, change_rate, event_title, created_at)
    VALUES (?, 0, ?, ?, '관리자 상장폐지', NOW())
    `,
    [stockId, -Number(stock.current_price), -100]
  );

  await db.query(
    `
    INSERT INTO stock_delist_logs
    (
      stock_id,
      stock_name,
      delist_type,
      old_price,
      new_price,
      change_amount,
      change_rate,
      deleted_quantity,
      reason,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      stock.id,
      stock.stock_name,
      "ADMIN",
      Number(stock.current_price),
      0,
      -Number(stock.current_price),
      -100,
      deletedQuantity,
      "관리자 수동 상장폐지",
    ]
  );

  await db.query(
    `
    DELETE FROM stock_holdings
    WHERE stock_id = ?
    `,
    [stockId]
  );

  return NextResponse.json({ success: true });
}