// Ngày giờ dân sự theo giờ Việt Nam (UTC+7, không có giờ mùa hè). Logic thuần, không I/O, một nguồn cho server và giao diện.
// Ngày = "YYYY-MM-DD", giờ = "HH:MM" (TEXT trong D1). KHÔNG dùng date('now') trong SQL cho "hôm nay": đó là UTC, sai ngày trong khoảng 00:00–07:00 giờ VN.

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày hiện tại theo giờ Việt Nam. */
export function vnToday(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
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
