// SOÁT TIỀN HẰNG NGÀY (Đợt 2 sau kiểm toán — đặc tả docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md, chủ duyệt 16/11 «Duyệt khuyến nghị»).
// Mỗi sáng 7 giờ (lượt Cron 15 phút rơi vào 00:00–00:14 UTC) tác nhân SOAT_TIEN_HANG_NGAY chạy nhóm luật soát tiền và vé (R-BIL-*, R-KY-*, R-VDT-*, R-CRD-*)
// bằng CHÍNH câu SQL và hàm đếm của scripts/audit-checks.mjs (một nguồn với `audit-invariants.mjs --strict` mà `npm run trien-khai` chạy sau mỗi lần triển khai).
// CHỈ ĐỌC: không ghi cơ sở dữ liệu, không ghi nhật ký. Có luật lệch ⇒ MỘT thư tới người nhận thư báo của Nền tảng (FEEDBACK_NOTIFY_EMAIL), chỉ mã luật, mô tả
// luật và số chỗ lệch — không tên khách, không số tiền từng đơn. Không lệch ⇒ không gửi gì. Mức «warn» (cảnh báo vĩnh viễn, tình trạng nghiệp vụ hợp lệ) không vào thư.
import { can, tacNhan, type PermissionHolder } from "../../shared/permissions.ts";
import { cauHinhThu, guiThu } from "../../shared/gui-thu.ts";
import { laLuotBayGioSang } from "../../shared/luot-bay-gio-sang.ts";

/** Một kiểm của scripts/audit-checks.mjs (đúng hình `CHECKS[i]`). Module không nhập `scripts/` (luật kiến trúc ADR-0002 8(a)): gốc lắp ráp đưa danh sách vào. */
export interface KiemSoat {
  readonly code: string;
  readonly what: string;
  readonly sql: string;
  readonly level: "fail" | "warn-unless-strict" | "warn";
  readonly mode?: "rows";
  readonly dem?: (rows: object[]) => number;
}
/** Nguồn kiểm do gốc lắp ráp tiêm: `CHECKS` và `demViPham` của scripts/audit-checks.mjs (một nguồn với `audit-invariants.mjs`). */
export interface NguonSoat {
  readonly kiem: readonly KiemSoat[];
  readonly demViPham: (k: KiemSoat, rows: object[]) => number;
}

export const NHOM_SOAT_TIEN_VE = /^R-(BIL|KY|VDT|CRD)-/;
/** Kiểm thuộc nhóm tiền và vé, đúng mức làm đỏ `audit-invariants --strict` (fail + warn-unless-strict). */
export const locKiemTienVe = (kiem: readonly KiemSoat[]): KiemSoat[] => kiem.filter((c) => NHOM_SOAT_TIEN_VE.test(c.code) && c.level !== "warn");

const SOAT_TIEN_HANG_NGAY = tacNhan("SOAT_TIEN_HANG_NGAY");

export { laLuotBayGioSang };

export interface LuatLech {
  readonly ma: string;
  readonly moTa: string;
  readonly so: number;
}

/** Chạy nhóm kiểm trong MỘT lô đọc. Bên không giữ ô `audit.money.daily` ⇒ `null`, không chạm cơ sở dữ liệu. */
export async function soatTienVe(db: D1Database, nguoiChay: PermissionHolder, nguon: NguonSoat): Promise<LuatLech[] | null> {
  if (!can(nguoiChay, "audit.money.daily")) return null;
  const kiem = locKiemTienVe(nguon.kiem);
  if (kiem.length === 0) throw new Error("nhom_soat_rong"); // nguồn tiêm hỏng — không được im lặng «không lệch»
  const kq = await db.batch(kiem.map((c) => db.prepare(c.sql.replace(/\s+/g, " ").trim())));
  return kiem.map((c, i) => ({ ma: c.code, moTa: c.what, so: nguon.demViPham(c, (kq[i]?.results ?? []) as object[]) })).filter((x) => x.so > 0);
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
      "Việc cần làm: dán nguyên thư này cho AI trong dự án tourdao-sales và nhờ tra. Muốn tự xem lại, chạy ở thư mục dự án:",
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

/** Cron ở gốc lắp ráp. KHÔNG BAO GIỜ NÉM. Log chỉ số đếm và mã luật (không địa chỉ thư, không dữ liệu khách).
 *  Trả mã lỗi ngắn khi chính lượt soát hỏng (lô đọc ném, bị từ chối quyền) để thư báo việc tự động lỗi liệt kê — `null` khi soát xong hoặc không phải lượt 7 giờ. */
export async function soatTienHangNgay(
  env: { DB: D1Database; FEEDBACK_NOTIFY_EMAIL?: unknown; EMAIL?: unknown; FEEDBACK_MAIL_FROM?: unknown; MOI_TRUONG?: unknown; THU_CHO_PHEP?: unknown },
  scheduledTime: number,
  nguon: NguonSoat,
  nguoiChay: PermissionHolder = SOAT_TIEN_HANG_NGAY,
): Promise<string | null> {
  if (!laLuotBayGioSang(scheduledTime)) return null;
  try {
    const lech = await soatTienVe(env.DB, nguoiChay, nguon);
    if (lech === null) {
      console.warn(JSON.stringify({ level: "warn", event: "soat_tien_tu_choi" }));
      return "tu_choi_quyen";
    }
    console.log(JSON.stringify({ level: "info", event: "soat_tien", so_kiem: locKiemTienVe(nguon.kiem).length, so_lech: lech.length, ma: lech.map((l) => l.ma) }));
    if (lech.length === 0) return null;
    const to = typeof env.FEEDBACK_NOTIFY_EMAIL === "string" ? env.FEEDBACK_NOTIFY_EMAIL.trim() : "";
    if (!to) {
      console.warn(JSON.stringify({ level: "warn", event: "soat_tien_thu_hong", ly_do: "no_to" }));
      return null;
    }
    const kq = await guiThu(cauHinhThu(env), { to, ...soanThuSoat(lech, ngayVN(scheduledTime)) });
    if (!kq.ok) console.warn(JSON.stringify({ level: "warn", event: "soat_tien_thu_hong", ly_do: kq.lyDo }));
    return null;
  } catch (e) {
    const loi = e instanceof Error ? e.name : "unknown";
    console.error(JSON.stringify({ level: "error", event: "soat_tien_loi", loi }));
    return loi;
  }
}
