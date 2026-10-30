// Luật thuần «Đặc điểm dịch vụ» (ADR-0152 Đ1, Đ5): kiểm tên, sinh mã, danh sách «chưa khai» và «mới, đang theo nhóm». Không I/O; không import gì ngoài `shared`
// (bài kiểm nạp thẳng bằng Node). Mã không biết đặc điểm hay giá trị cụ thể nào (giới hạn 4 của chỗ lệch Hiến chương 5.2): mọi phép ở đây so KHOÁ với KHOÁ.
// «Riêng thắng chung» KHÔNG viết lại ở đây — giá trị hiệu lực đọc từ view `v_ctl_service_attribute` (một nguồn sự thật, bài học «bẫy hai luật» của ADR-0149).
import { addDays, vnToday } from "../../shared/vn-date.ts";
import type { Kiem } from "./nhom-rules.ts";

export const TEN_DAC_DIEM_TOI_DA = 40;
/** Hằng hiển thị (ADR-0152 Đ5 mục 2 — bề mặt, đảo ngược được): «mới» = thấy lần đầu trong N ngày gần nhất, tính cả hôm nay, theo giờ Việt Nam. */
export const MOI_THEO_NHOM_SO_NGAY = 14;
/** Mã đặc điểm: `a` + 12 hex; mã giá trị: `v` + 12 hex — tiền tố khác `g` của mã nhóm (`maNhomMoi`) để hàng rào (l1) không bắt nhầm. */
export const MA_DAC_DIEM_RE = /^a[0-9a-f]{12}$/;
export const MA_GIA_TRI_RE = /^v[0-9a-f]{12}$/;

const hex12 = (): string => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
/** Mã đặc điểm mới do máy chủ sinh (không bao giờ đổi, không hiện cho người dùng). */
export const maDacDiemMoi = (): string => `a${hex12()}`;
/** Mã giá trị mới do máy chủ sinh (duy nhất toàn bảng, không hiện cho người dùng). */
export const maGiaTriMoi = (): string => `v${hex12()}`;

function kiemTen(raw: unknown, chu: string): Kiem<string> {
  if (typeof raw !== "string") return { ok: false, message: `Tên ${chu} phải là chữ.` };
  const ten = raw.trim();
  if (ten.length === 0) return { ok: false, message: `Tên ${chu} không được để trống.` };
  if (ten.length > TEN_DAC_DIEM_TOI_DA) return { ok: false, message: `Tên ${chu} dài tối đa ${TEN_DAC_DIEM_TOI_DA} ký tự.` };
  return { ok: true, value: ten };
}
/** Tên đặc điểm: cắt khoảng trắng hai đầu, 1–40 ký tự. (Trùng tên giữa đặc điểm đang dùng do CSDL + máy chủ kiểm.) */
export const kiemTenDacDiem = (raw: unknown): Kiem<string> => kiemTen(raw, "đặc điểm");
/** Tên giá trị: như tên đặc điểm. (Trùng tên giữa giá trị đang dùng của cùng đặc điểm do CSDL + máy chủ kiểm.) */
export const kiemTenGiaTri = (raw: unknown): Kiem<string> => kiemTen(raw, "giá trị");

/** Dịch vụ của danh mục, đủ để xét «đang bán» và «mới». `hidden` = Quản trị ẩn (catalog_override). `firstSeenAt` = ISO UTC lần đầu thấy trên Sheet. */
export interface DichVuDacDiem { code: string; inSheet: boolean; hidden: boolean; firstSeenAt: string }
/** Một dòng của view `v_ctl_service_attribute`. */
export interface GiaTriHieuLuc { catalogCode: string; attributeCode: string; source: "SERVICE" | "GROUP" }

const dangBan = (d: DichVuDacDiem): boolean => d.inSheet && !d.hidden;

/**
 * ADR-0152 Đ5 mục 1 — danh sách «chưa khai» của MỘT đặc điểm: dịch vụ đang bán (còn trên Sheet, không bị ẩn) không có dòng giá trị hiệu lực cho đặc điểm đó.
 * Tính lúc đọc (không ảnh chụp lúc đồng bộ), giữ thứ tự `dichVu`.
 */
export function chuaKhai(dichVu: readonly DichVuDacDiem[], hieuLuc: readonly Pick<GiaTriHieuLuc, "catalogCode" | "attributeCode">[], attributeCode: string): string[] {
  const coGiaTri = new Set(hieuLuc.filter((h) => h.attributeCode === attributeCode).map((h) => h.catalogCode));
  return dichVu.filter((d) => dangBan(d) && !coGiaTri.has(d.code)).map((d) => d.code);
}

/**
 * ADR-0152 Đ5 mục 2 — «mới, đang theo nhóm»: dịch vụ đang bán thấy lần đầu trong `MOI_THEO_NHOM_SO_NGAY` ngày gần nhất (ngày Việt Nam của `firstSeenAt`
 * ≥ hôm nay − 13) mà giá trị của một đặc điểm đang THỪA HƯỞNG từ nhóm (`source = 'GROUP'`). Mỗi (dịch vụ, đặc điểm) một mục; xếp theo mã dịch vụ rồi mã đặc điểm.
 */
export function moiTheoNhom(dichVu: readonly DichVuDacDiem[], hieuLuc: readonly GiaTriHieuLuc[], homNay: string): { catalogCode: string; attributeCode: string }[] {
  const tuNgay = addDays(homNay, -(MOI_THEO_NHOM_SO_NGAY - 1));
  const moi = new Set(dichVu.filter((d) => dangBan(d) && vnToday(new Date(d.firstSeenAt)) >= tuNgay).map((d) => d.code));
  return hieuLuc
    .filter((h) => h.source === "GROUP" && moi.has(h.catalogCode))
    .map((h) => ({ catalogCode: h.catalogCode, attributeCode: h.attributeCode }))
    .sort((x, y) => (x.catalogCode === y.catalogCode ? (x.attributeCode < y.attributeCode ? -1 : 1) : x.catalogCode < y.catalogCode ? -1 : 1));
}
