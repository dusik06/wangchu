import { getKstMysqlNow, kstMysqlToTimestamp } from "@/lib/stock-time";

type SeasonTimeData = {
  status?: string | null;
  starts_at_text?: string | null;
  ends_at_text?: string | null;
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
  market_open_time?: string | null;
  market_close_time?: string | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeMysqlDateTime(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const kst = new Date(value.getTime() + 9 * 60 * 60 * 1000);

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

  const text = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 19).replace("T", " ");
  }

  return null;
}

function normalizeTime(value: unknown) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return {
    hour,
    minute,
    second,
    totalSeconds: hour * 3600 + minute * 60 + second,
  };
}

export function getKstClock() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours(),
    minute: now.getUTCMinutes(),
    second: now.getUTCSeconds(),
    dateText: [
      now.getUTCFullYear(),
      "-",
      pad(now.getUTCMonth() + 1),
      "-",
      pad(now.getUTCDate()),
    ].join(""),
    timeText: [
      pad(now.getUTCHours()),
      ":",
      pad(now.getUTCMinutes()),
      ":",
      pad(now.getUTCSeconds()),
    ].join(""),
    totalSeconds:
      now.getUTCHours() * 3600 +
      now.getUTCMinutes() * 60 +
      now.getUTCSeconds(),
  };
}

export function isSeasonRunning(season: SeasonTimeData) {
  const startsAt = normalizeMysqlDateTime(
    season.starts_at_text ?? season.starts_at
  );
  const endsAt = normalizeMysqlDateTime(season.ends_at_text ?? season.ends_at);

  if (!startsAt || !endsAt) {
    return {
      running: false,
      message: "시즌 기간 설정을 확인할 수 없습니다.",
    };
  }

  const startsTimestamp = kstMysqlToTimestamp(startsAt);
  const endsTimestamp = kstMysqlToTimestamp(endsAt);
  const nowTimestamp = Date.now();

  if (
    Number.isNaN(startsTimestamp) ||
    Number.isNaN(endsTimestamp)
  ) {
    return {
      running: false,
      message: "시즌 기간 설정이 올바르지 않습니다.",
    };
  }

  if (nowTimestamp < startsTimestamp) {
    return {
      running: false,
      message: "아직 시즌이 시작되지 않았습니다.",
    };
  }

  if (nowTimestamp >= endsTimestamp) {
    return {
      running: false,
      message: "시즌이 종료되었습니다.",
    };
  }

  return {
    running: true,
    message: "시즌 진행 중",
  };
}

export function isMarketOpen(openTimeValue: unknown, closeTimeValue: unknown) {
  const openTime = normalizeTime(openTimeValue);
  const closeTime = normalizeTime(closeTimeValue);
  const now = getKstClock();

  if (!openTime || !closeTime) {
    return {
      open: false,
      message: "시장 운영시간 설정이 올바르지 않습니다.",
      currentKstTime: now.timeText,
    };
  }

  let open = false;

  if (openTime.totalSeconds === closeTime.totalSeconds) {
    open = true;
  } else if (openTime.totalSeconds < closeTime.totalSeconds) {
    open =
      now.totalSeconds >= openTime.totalSeconds &&
      now.totalSeconds < closeTime.totalSeconds;
  } else {
    open =
      now.totalSeconds >= openTime.totalSeconds ||
      now.totalSeconds < closeTime.totalSeconds;
  }

  return {
    open,
    message: open
      ? "현재 주식시장이 열려 있습니다."
      : `현재 휴장 중입니다. 장 운영시간은 ${pad(openTime.hour)}:${pad(
          openTime.minute
        )} ~ ${pad(closeTime.hour)}:${pad(closeTime.minute)}입니다.`,
    currentKstTime: now.timeText,
  };
}

export function calculateFee(_grossAmount: number, _feeRate: number) {
  return 0;
}

export function getSeasonNowText() {
  return getKstMysqlNow();
}
