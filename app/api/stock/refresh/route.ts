import { NextResponse } from "next/server";
import db from "@/lib/db";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [stocks]: any = await connection.query(`
      SELECT *
      FROM stock_items
      WHERE is_listed = 1
        AND last_updated_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
      FOR UPDATE
    `);

    for (const stock of stocks) {
      const [events]: any = await connection.query(
        `
        SELECT *
        FROM stock_events
        WHERE stock_id = ?
          AND is_active = 1
          AND starts_at <= NOW()
          AND ends_at >= NOW()
        ORDER BY id DESC
        LIMIT 1
        `,
        [stock.id]
      );

      const event = events[0] || null;

      let rate = randomInt(-Number(stock.normal_rate), Number(stock.normal_rate));
      let eventTitle = null;

      const specialRoll = randomInt(1, 100);

      if (specialRoll <= Number(stock.special_chance)) {
        rate = randomInt(-Number(stock.special_rate), Number(stock.special_rate));
      }

      if (event) {
        eventTitle = event.event_title;

        if (event.event_type === "up") {
          rate += Math.abs(Number(event.event_rate));
        }

        if (event.event_type === "down") {
          rate -= Math.abs(Number(event.event_rate));
        }
      }

      const oldPrice = Number(stock.current_price);
      const changeAmount = Math.floor((oldPrice * rate) / 100);
      const newPrice = oldPrice + changeAmount;

      if (newPrice <= 0) {
        await connection.query(
          `
          UPDATE stock_items
          SET current_price = 0,
              is_listed = 0,
              last_updated_at = NOW()
          WHERE id = ?
          `,
          [stock.id]
        );

        await connection.query(
          `
          INSERT INTO stock_price_logs
          (stock_id, price, change_amount, change_rate, event_title, created_at)
          VALUES (?, 0, ?, ?, ?, NOW())
          `,
          [stock.id, -oldPrice, -100, eventTitle || "상장폐지"]
        );
      } else {
        await connection.query(
          `
          UPDATE stock_items
          SET current_price = ?,
              last_updated_at = NOW()
          WHERE id = ?
          `,
          [newPrice, stock.id]
        );

        await connection.query(
          `
          INSERT INTO stock_price_logs
          (stock_id, price, change_amount, change_rate, event_title, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
          `,
          [stock.id, newPrice, changeAmount, rate, eventTitle]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      updatedCount: stocks.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { success: false, message: "주식 가격 갱신 실패" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}