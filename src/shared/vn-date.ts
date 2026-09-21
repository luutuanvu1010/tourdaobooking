// Ngày giờ dân sự theo giờ Việt Nam (UTC+7, không có giờ mùa hè). Logic thuần, không I/O, một nguồn cho server và giao diện.
// Ngày = "YYYY-MM-DD", giờ = "HH:MM" (TEXT trong D1). KHÔNG dùng date('now') trong SQL cho "hôm nay": đó là UTC, sai ngày trong khoảng 00:00–07:00 giờ VN.

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày hiện tại theo giờ Việt Nam. */
export function vnToday(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Mốc ISO UTC → "HH:MM DD/MM/YYYY" theo giờ Việt Nam (cho câu chữ ghi vào nhật ký, không phụ thuộc Intl/ngôn ngữ máy). Mốc không hợp lệ → chuỗi gốc. */
export function vnDateTimeText(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const [date, time] = new Date(ms + VN_OFFSET_MS).toISOString().split("T") as [string, string];
  return `${time.slice(0, 5)} ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Giá trị ô `<input type="datetime-local">` ("YYYY-MM-DDTHH:MM", có thể kèm ":SS") hiểu là GIỜ VIỆT NAM bất kể múi giờ của thiết bị → mốc ISO UTC.
 * Sai khuôn dạng hoặc không đúng lịch/giờ (30/02, 24:00, phút 60) → null.
 */
export function vnLocalToIso(value: string): string | null {
  const m = LOCAL_DATETIME_RE.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? "0"].map(Number) as [number, number, number, number, number, number];
  const utc = Date.UTC(y, mo - 1, d, h, mi, s) - VN_OFFSET_MS;
  const back = new Date(utc + VN_OFFSET_MS); // đúng lịch ⇔ đọc ngược ra đúng các thành phần đã cho (30/02, 24:00… tự trôi sang ngày khác nên lệch)
  const exact = back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d && back.getUTCHours() === h && back.getUTCMinutes() === mi && back.getUTCSeconds() === s;
  return exact ? new Date(utc).toISOString() : null;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Đúng khuôn dạng YYYY-MM-DD và đúng lịch (30/02 → sai). */
export function isISODate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Cộng/trừ ngày trên chuỗi ngày hợp lệ. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** HH:MM từ 00:00 đến 23:59 (24:00 không hợp lệ). */
export const isHHMM = (s: string): boolean => TIME_RE.test(s);
