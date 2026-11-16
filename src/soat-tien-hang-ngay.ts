// SOÁT TIỀN HẰNG NGÀY (Đợt 2 sau kiểm toán — đặc tả docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md, chủ duyệt 16/11 «Duyệt khuyến nghị»).
// Mỗi sáng 7 giờ (lượt Cron 15 phút rơi vào 00:00–00:14 UTC) tác nhân SOAT_TIEN_HANG_NGAY chạy nhóm luật soát tiền và vé (R-BIL-*, R-KY-*, R-VDT-*, R-CRD-*)
// bằng CHÍNH câu SQL và hàm đếm của scripts/audit-checks.mjs (một nguồn với `audit-invariants.mjs --strict` mà `npm run trien-khai` chạy sau mỗi lần triển khai).
// CHỈ ĐỌC: không ghi cơ sở dữ liệu, không ghi nhật ký. Có luật lệch ⇒ MỘT thư tới người nhận thư báo của Nền tảng (FEEDBACK_NOTIFY_EMAIL), chỉ mã luật, mô tả
// luật và số chỗ lệch — không tên khách, không số tiền từng đơn. Không lệch ⇒ không gửi gì. Mức «warn» (cảnh báo vĩnh viễn, tình trạng nghiệp vụ hợp lệ) không vào thư.
import { can, tacNhan, type PermissionHolder } from "./shared/permissions.ts";
import { cauHinhThu, guiThu } from "./shared/gui-thu.ts";
import { CHECKS, demViPham, type KiemBatBien } from "../scripts/audit-checks.mjs";

export const NHOM_SOAT_TIEN_VE = /^R-(BIL|KY|VDT|CRD)-/;
/** Kiểm thuộc nhóm tiền và vé, đúng mức làm đỏ `audit-invariants --strict` (fail + warn-unless-strict). */
export const KIEM_TIEN_VE: readonly KiemBatBien[] = CHECKS.filter((c) => NHOM_SOAT_TIEN_VE.test(c.code) && c.level !== "warn");

const SOAT_TIEN_HANG_NGAY = tacNhan("SOAT_TIEN_HANG_NGAY");

/** Lượt Cron 15 phút có phải lượt 7 giờ sáng giờ Việt Nam không (00:00–00:14 UTC; giờ VN không đổi theo mùa). */
export function laLuotBayGioSang(scheduledTime: number): boolean {
  const d = new Date(scheduledTime);
  return d.getUTCHours() === 0 && d.getUTCMinutes() < 15;
}

export interface LuatLech {
  readonly ma: string;
  readonly moTa: string;
  readonly so: number;
}

/** Chạy nhóm kiểm trong MỘT lô đọc. Bên không giữ ô `audit.money.daily` ⇒ `null`, không chạm cơ sở dữ liệu. */
export async function soatTienVe(db: D1Database, nguoiChay: PermissionHolder): Promise<LuatLech[] | null> {
  if (!can(nguoiChay, "audit.money.daily")) return null;
  const kq = await db.batch(KIEM_TIEN_VE.map((c) => db.prepare(c.sql.replace(/\s+/g, " ").trim())));
  return KIEM_TIEN_VE.map((c, i) => ({ ma: c.code, moTa: c.what, so: demViPham(c, (kq[i]?.results ?? []) as object[]) })).filter((x) => x.so > 0);
}

/** Thư báo lệch: tiêu đề có ngày (giờ VN) và số luật; thân chỉ mã luật, mô tả luật, số chỗ lệch, và việc cần làm. */
export function soanThuSoat(lech: readonly LuatLech[], ngay: string): { subject: string; text: string } {
  const dong = lech.map((l) => `- ${l.ma}: ${l.moTa} — ${l.so} chỗ lệch`);
  return {
    subject: `Tour Đảo: soát tiền sáng ${ngay} có ${lech.length} luật lệch`,
    text: [
      `Lượt soát tiền và vé tự động sáng ${ngay} thấy ${lech.length} luật lệch:`,
      "",
      ...dong,
      "",
      "Việc cần làm: mở phiên làm việc với AI trong dự án tourdao-sales, dán thư này và nhờ tra. Muốn tự xem lại, chạy ở thư mục dự án:",
      "node scripts/audit-invariants.mjs --db remote --strict",
      "",
      "Thư này không chứa tên khách hay số tiền. Không lệch thì không có thư.",
    ].join("\n"),
  };
}

/** Ngày dân sự giờ Việt Nam dạng DD/MM/YYYY của một mốc. */
function ngayVN(ms: number): string {
  const d = new Date(ms + 7 * 3_600_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

/** Cron ở gốc lắp ráp. KHÔNG BAO GIỜ NÉM. Log chỉ số đếm và mã luật (không địa chỉ thư, không dữ liệu khách). */
export async function soatTienHangNgay(
  env: { DB: D1Database; FEEDBACK_NOTIFY_EMAIL?: unknown; EMAIL?: unknown; FEEDBACK_MAIL_FROM?: unknown; MOI_TRUONG?: unknown; THU_CHO_PHEP?: unknown },
  scheduledTime: number,
  nguoiChay: PermissionHolder = SOAT_TIEN_HANG_NGAY,
): Promise<void> {
  if (!laLuotBayGioSang(scheduledTime)) return;
  try {
    const lech = await soatTienVe(env.DB, nguoiChay);
    if (lech === null) {
      console.warn(JSON.stringify({ level: "warn", event: "soat_tien_tu_choi" }));
      return;
    }
    console.log(JSON.stringify({ level: "info", event: "soat_tien", so_kiem: KIEM_TIEN_VE.length, so_lech: lech.length, ma: lech.map((l) => l.ma) }));
    if (lech.length === 0) return;
    const to = typeof env.FEEDBACK_NOTIFY_EMAIL === "string" ? env.FEEDBACK_NOTIFY_EMAIL.trim() : "";
    if (!to) {
      console.warn(JSON.stringify({ level: "warn", event: "soat_tien_thu_hong", ly_do: "no_to" }));
      return;
    }
    const kq = await guiThu(cauHinhThu(env), { to, ...soanThuSoat(lech, ngayVN(scheduledTime)) });
    if (!kq.ok) console.warn(JSON.stringify({ level: "warn", event: "soat_tien_thu_hong", ly_do: kq.lyDo }));
  } catch (e) {
    console.error(JSON.stringify({ level: "error", event: "soat_tien_loi", loi: e instanceof Error ? e.name : "unknown" }));
  }
}
