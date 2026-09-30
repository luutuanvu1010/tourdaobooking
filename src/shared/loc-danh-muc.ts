// Lọc sản phẩm trong ô "Chọn từ danh mục" khi lập đơn (góp ý YC-0003 — chủ duyệt 30/9, câu 4(i) README ảnh phác góp ý): lọc bằng thứ ĐÃ CÓ — "Hay dùng"
// (dịch vụ từng máy tự ghim) và đơn vị tính (theo người / theo nhóm). KHÔNG lọc theo đầu mã (109 dịch vụ, mã không theo tiền tố nhóm). Nhóm / loại dịch vụ
// quản lý trong app thuộc ADR-0058 (phiên khác) — màn chừa chỗ cho hàng chip nhóm, luật nhóm sẽ thêm ở đây khi ADR đó được duyệt. Thuần, không I/O.
import { parseUnit } from "./order-lines.ts";

export type LocDanhMucKhoa = "hay-dung" | "theo-nguoi" | "theo-nhom";
export const LOC_DANH_MUC: readonly { khoa: LocDanhMucKhoa; nhan: string }[] = [
  { khoa: "hay-dung", nhan: "★ Hay dùng" },
  { khoa: "theo-nguoi", nhan: "Theo người" },
  { khoa: "theo-nhom", nhan: "Theo nhóm" },
];
const TOI_DA_GHIM = 200;

/** Nhớ trên máy: bộ lọc đang chọn + các mã đã ghim "Hay dùng". */
export interface NhoDanhMuc {
  loc: LocDanhMucKhoa | null;
  ghim: string[];
}
export const NHO_DANH_MUC_TRONG: NhoDanhMuc = { loc: null, ghim: [] };

/** Danh mục sau ô tìm (tên hoặc mã) VÀ bộ lọc đang chọn; giữ thứ tự danh mục. */
export function locDanhMuc<T extends { code: string; name: string; unit: string }>(ds: readonly T[], o: { kim: string; loc: LocDanhMucKhoa | null; ghim: readonly string[] }): T[] {
  const kim = o.kim.trim().toLowerCase();
  return ds.filter((c) => {
    if (kim && !c.name.toLowerCase().includes(kim) && !c.code.toLowerCase().includes(kim)) return false;
    if (o.loc === "hay-dung") return o.ghim.includes(c.code);
    if (o.loc === "theo-nguoi") return parseUnit(c.unit).kind === "perPax";
    if (o.loc === "theo-nhom") return parseUnit(c.unit).kind === "group";
    return true;
  });
}

export const doiGhim = (ghim: readonly string[], code: string): string[] => (ghim.includes(code) ? ghim.filter((c) => c !== code) : [...ghim, code]);

/** Đọc bản nhớ trên máy (chuỗi JSON từ bộ nhớ trình duyệt); hỏng / sai dạng → trống. */
export function docNhoDanhMuc(raw: string | null): NhoDanhMuc {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== "object" || Array.isArray(v)) return NHO_DANH_MUC_TRONG;
    const o = v as Record<string, unknown>;
    const loc = o.loc === null || o.loc === undefined ? null : LOC_DANH_MUC.some((x) => x.khoa === o.loc) ? (o.loc as LocDanhMucKhoa) : undefined;
    if (loc === undefined || !Array.isArray(o.ghim) || !o.ghim.every((x) => typeof x === "string")) return NHO_DANH_MUC_TRONG;
    return { loc, ghim: [...new Set(o.ghim as string[])].slice(0, TOI_DA_GHIM) };
  } catch {
    return NHO_DANH_MUC_TRONG;
  }
}
