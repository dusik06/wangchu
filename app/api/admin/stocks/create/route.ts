import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSeasonNowText } from "@/lib/stock-market";

function toInteger(value: unknown) {
  const parsed = Math.floor(Number(value));

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      {
        success: false,
        message: "로그인이 필요합니다.",
      },
      { status: 401 }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "요청값을 읽을 수 없습니다.",
      },
      { status: 400 }
    );
  }

  const stockName = String(body.stockName || "").trim();
  const currentPrice = toInteger(body.currentPrice);
  const normalRate = toNumber(body.normalRate);
  const specialChance = toNumber(body.specialChance);
  const specialRate = toNumber(body.specialRate);

  if (!stockName || stockName.length > 100) {
    return NextResponse.json(
      {
        success: false,
        message:
          "주식 이름을 1자 이상 100자 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  if (currentPrice <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "초기 가격은 1 이상이어야 합니다.",
      },
      { status: 400 }
    );
  }

  if (normalRate < 0 || normalRate > 100) {
    return NextResponse.json(
      {
        success: false,
        message:
          "일반 변동폭은 0% 이상 100% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (
    specialChance < 0 ||
    specialChance > 100
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "특수 발생 확률은 0% 이상 100% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  if (specialRate < 0 || specialRate > 500) {
    return NextResponse.json(
      {
        success: false,
        message:
          "특수 변동폭은 0% 이상 500% 이하로 설정해주세요.",
      },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [adminRows]: any = await connection.query(
      `
      SELECT
        id,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
      FOR UPDATE
      `,
      [session.user.email]
    );

    const admin = adminRows[0];

    if (!admin || admin.role !== "admin") {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "관리자만 가능합니다.",
        },
        { status: 403 }
      );
    }

    const [duplicateRows]: any = await connection.query(
      `
      SELECT id
      FROM stock_items
      WHERE stock_name = ?
      LIMIT 1
      FOR UPDATE
      `,
      [stockName]
    );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "같은 이름의 주식이 이미 존재합니다.",
        },
        { status: 409 }
      );
    }

    const now = getSeasonNowText();

    const [insertResult]: any = await connection.query(
      `
      INSERT INTO stock_items
      (
        stock_name,
        current_price,
        normal_rate,
        special_chance,
        special_rate,
        is_listed,
        last_updated_at,
        created_at
      )
      VALUES
      (?, ?, ?, ?, ?, 1, ?, ?)
      `,
      [
        stockName,
        currentPrice,
        normalRate,
        specialChance,
        specialRate,
        now,
        now,
      ]
    );

    const stockId = Number(insertResult.insertId);

    await connection.query(
      `
      INSERT INTO stock_price_logs
      (
        stock_id,
        price,
        change_amount,
        change_rate,
        event_title,
        created_at
      )
      VALUES
      (?, ?, 0, 0, ?, ?)
      `,
      [
        stockId,
        currentPrice,
        "신규 상장",
        now,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${stockName} 신규 상장이 완료되었습니다.`,
      stock: {
        id: stockId,
        stockName,
        currentPrice,
        normalRate,
        specialChance,
        specialRate,
      },
    });
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {
      // rollback 실패 무시
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "같은 이름의 주식이 이미 존재합니다.",
        },
        { status: 409 }
      );
    }

    console.error("Admin stock create error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "주식 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}