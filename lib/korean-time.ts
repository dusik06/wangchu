const KOREA_TIME_ZONE = "Asia/Seoul";

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  if (!text) return null;

  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
      ? `${text.replace(" ", "T")}+09:00`
      : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)
      ? `${text}+09:00`
      : text;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getParts(value: unknown) {
  const date = normalizeDate(value);
  if (!date) return null;

  const mapped = Object.fromEntries(
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: KOREA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: mapped.year,
    month: mapped.month,
    day: mapped.day,
    hour: mapped.hour === "24" ? "00" : mapped.hour,
    minute: mapped.minute,
    second: mapped.second,
  };
}

export function formatKoreanDateTime(value: unknown) {
  const p = getParts(value);
  return p ? `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}` : "-";
}

export function formatKoreanTime(value: unknown) {
  const p = getParts(value);
  return p ? `${p.hour}:${p.minute}` : "-";
}

export function parseKoreanDate(value: unknown) {
  return normalizeDate(value);
}
