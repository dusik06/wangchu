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

function addMinutesToMysqlDateTime(
  mysqlDateTime: string,
  minutes: number
) {
  const date = new Date(
    `${mysqlDateTime.replace(" ", "T")}+09:00`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const target = new Date(
    date.getTime() + minutes * 60 * 1000
  );

  const kst = new Date(
    target.getTime() + 9 * 60 * 60 * 1000
  );

  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return [
    kst.getUTCFullYear(),
    "-",
    pad(kst.getUTCMonth() + 1),
    "-",
    pad(kst.getUTCDate()),
    " ",
    pad(kst.getUTCHours()),
    ":",
    pad(kst.getUTCMinutes()),
    ":",
    pad(kst.getUTCSeconds()),
  ].join("");
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

  const stockId = toInteger(body.stockId);
  const eventTitle = String(
    body.eventTitle || ""
  ).trim();

  const eventType = "up";

  const eventRate = toNumber(body.eventRate);
  const durationMinutes = toInteger(
    body.durationMinutes
  );

  if (stockId <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: "이벤트를 적용할 종목을 선택해주세요.",
      },
      { status: 400 }
    );
  }

  if (
    !eventTitle ||
    eventTitle.length > 150
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "이벤트 제목을 1자 이상 150자 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  if (
    eventRate <= 0 ||
    eventRate > 300
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "이벤트 변동률은 0% 초과 300% 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  if (
    durationMinutes < 1 ||
    durationMinutes > 10080
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "이벤트 지속시간은 1분 이상 10,080분 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [adminRows]: any =
      await connection.query(
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

    const [stockRows]: any =
      await connection.query(
        `
        SELECT
          id,
          stock_name,
          is_listed
        FROM stock_items
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [stockId]
      );

    const stock = stockRows[0];

    if (!stock) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "종목을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    if (Number(stock.is_listed) !== 1) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "상장폐지된 종목에는 이벤트를 등록할 수 없습니다.",
        },
        { status: 400 }
      );
    }

    const now = getSeasonNowText();

    const endsAt = addMinutesToMysqlDateTime(
      now,
      durationMinutes
    );

    if (!endsAt) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "이벤트 종료시간을 계산하지 못했습니다.",
        },
        { status: 500 }
      );
    }

    await connection.query(
      `
      UPDATE stock_events
      SET is_active = 0
      WHERE is_active = 1
        AND ends_at < ?
      `,
      [now]
    );

    const [duplicateRows]: any =
      await connection.query(
        `
        SELECT id
        FROM stock_events
        WHERE stock_id = ?
          AND is_active = 1
          AND starts_at <= ?
          AND ends_at >= ?
        LIMIT 1
        FOR UPDATE
        `,
        [stockId, now, now]
      );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message:
            "이 종목에는 이미 진행 중인 이벤트가 있습니다. 기존 이벤트를 삭제하거나 종료 후 등록해주세요.",
        },
        { status: 409 }
      );
    }

    const [insertResult]: any =
      await connection.query(
        `
        INSERT INTO stock_events
        (
          stock_id,
          event_title,
          event_type,
          event_rate,
          starts_at,
          ends_at,
          is_active,
          created_at
        )
        VALUES
        (?, ?, ?, ?, ?, ?, 1, ?)
        `,
        [
          stockId,
          eventTitle,
          eventType,
          eventRate,
          now,
          endsAt,
          now,
        ]
      );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${stock.stock_name}에 호재 이벤트가 등록되었습니다.`,
      event: {
        id: Number(insertResult.insertId),
        stockId,
        stockName: stock.stock_name,
        eventTitle,
        eventType,
        eventRate,
        durationMinutes,
        startsAt: now,
        endsAt,
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback 실패 무시
    }

    console.error(
      "Admin stock event create error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "주식 이벤트 등록 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}