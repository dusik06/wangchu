const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

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

export function datetimeLocalToMysql(value: string) {
  const normalized = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    return null;
  }

  return (normalized.length === 16 ? `${normalized}:00` : normalized).replace(
    "T",
    " "
  );
}

export function kstMysqlToTimestamp(value: string) {
  const normalized = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return NaN;
  }

  return new Date(`${normalized.replace(" ", "T")}+09:00`).getTime();
}

export function addMinutesToKstMysql(mysqlDateTime: string, minutes: number) {
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
