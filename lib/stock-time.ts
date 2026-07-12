const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * 현재 시각을 한국시간 기준 MySQL DATETIME 문자열로 반환합니다.
 * 예: 2026-07-12 18:30:00
 */
export function getKstMysqlNow() {
  const date = new Date(Date.now() + KST_OFFSET_MS);

  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    " ",
    pad(date.getUTCHours()),
    ":",
    pad(date.getUTCMinutes()),
    ":",
    pad(date.getUTCSeconds()),
  ].join("");
}

/**
 * datetime-local 입력값을 MySQL DATETIME 형식으로 변경합니다.
 * 브라우저에서 받은 값을 한국시간 벽시계 값으로 그대로 저장합니다.
 */
export function datetimeLocalToMysql(value: string) {
  const normalized = String(value || "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalized)
  ) {
    return null;
  }

  const withSeconds =
    normalized.length === 16 ? `${normalized}:00` : normalized;

  return withSeconds.replace("T", " ");
}

/**
 * 한국시간 MySQL DATETIME을 비교용 숫자로 변환합니다.
 */
export function kstMysqlToTimestamp(value: string) {
  const normalized = String(value || "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)
  ) {
    return NaN;
  }

  return new Date(`${normalized.replace(" ", "T")}+09:00`).getTime();
}

/**
 * 한국시간 기준 현재 Unix timestamp
 */
export function getKstNowTimestamp() {
  return Date.now();
}

/**
 * MySQL DATETIME 문자열에 분을 더합니다.
 */
export function addMinutesToKstMysql(
  mysqlDateTime: string,
  minutes: number
) {
  const timestamp = kstMysqlToTimestamp(mysqlDateTime);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const target = new Date(timestamp + minutes * 60 * 1000);
  const kst = new Date(target.getTime() + KST_OFFSET_MS);

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