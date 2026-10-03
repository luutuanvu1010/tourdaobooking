// Ngày giờ dân sự theo giờ Việt Nam (UTC+7, không có giờ mùa hè). Logic thuần, không I/O, một nguồn cho server và giao diện.
// Ngày = "YYYY-MM-DD", giờ = "HH:MM" (TEXT trong D1). KHÔNG dùng date('now') trong SQL cho "hôm nay": đó là UTC, sai ngày trong khoảng 00:00–07:00 giờ VN.

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày hiện tại theo giờ Việt Nam. */
export function vnToday(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Giờ trong ngày (0–23) theo giờ Việt Nam — dùng cho giờ yên lặng của Web Push (ADR-0036, `src/shared/web-push.ts`). */
export function vnHour(now: Date): number {
  return new Date(now.getTime() + VN_OFFSET_MS).getUTCHours();
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

/**
 * Ngày "YYYY-MM-DD" + giờ "HH:MM" dân sự theo GIỜ VIỆT NAM → mốc máy (mili-giây kể từ epoch) — ADR-0047 A1 ("đổi sang mốc máy bằng MỘT hàm có test",
 * mở rộng `vnLocalToIso`): chặng đón 22:30 hôm trước, chuyến bay 00:40 hôm sau so được với nhau. Sai khuôn dạng/lịch/giờ → null.
 */
export function vnLocalToMs(date: string, time: string): number | null {
  const iso = vnLocalToIso(`${date}T${time}`);
  return iso === null ? null : Date.parse(iso);
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

/**
 * Đầu tuần (thứ Hai) và cuối tuần (Chủ nhật) theo giờ Việt Nam của tuần CHỨA `today` — cả hai đều là ngày dân sự "YYYY-MM-DD", HAI ĐẦU ĐỀU BAO GỒM
 * (giống quy ước `confirmWindow`). Dùng cho Trang chủ mới (doanh thu tuần). `today` phải là chuỗi ngày hợp lệ (vd. từ `vnToday`).
 */
export function vnWeekRange(today: string): { from: string; to: string } {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Chủ nhật … 6 = Thứ Bảy (chỉ tính lịch, không liên quan múi giờ thiết bị — cùng cách addDays dùng)
  const from = addDays(today, dow === 0 ? -6 : 1 - dow);
  return { from, to: addDays(from, 6) };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** HH:MM từ 00:00 đến 23:59 (24:00 không hợp lệ). */
export const isHHMM = (s: string): boolean => TIME_RE.test(s);

/**
 * Hàm NGƯỢC của `vnLocalToMs` (ADR-0049, kế hoạch mục 1.1 — đúng một hàm đổi giờ thứ hai, không hơn): mốc máy (mili-giây) → ngày "YYYY-MM-DD" + giờ
 * "HH:MM" dân sự theo GIỜ VIỆT NAM. Giây lẻ bị bỏ (làm tròn xuống phút). Dùng cho mốc tối thiểu (`src/shared/moc-toi-thieu.ts`) và ngày chạy của chuyến.
 */
export function msToVnLocal(ms: number): { date: string; time: string } {
  const iso = new Date(ms + VN_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

const THU_VN = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"] as const;
/** "Thứ Hai 05/10/2026" — thứ + ngày ĐẦY ĐỦ (có năm) của ngày dân sự "YYYY-MM-DD"; dùng ở hộp xác nhận (HT-03), nơi nhầm ngày gây hại. */
export function ngayCoThu(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${THU_VN[new Date(`${iso}T00:00:00Z`).getUTCDay()]} ${d}/${m}/${y}`;
}
