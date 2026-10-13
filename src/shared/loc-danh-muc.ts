// Lọc sản phẩm trong ô "Chọn từ danh mục" khi lập đơn (góp ý YC-0003 — chủ duyệt 30/9, câu 4(i) README ảnh phác góp ý): lọc bằng thứ ĐÃ CÓ — "Hay dùng"
// (dịch vụ từng máy tự ghim) và đơn vị tính (theo người / giá theo nhóm khách). KHÔNG lọc theo đầu mã (109 dịch vụ, mã không theo tiền tố nhóm).
// ADR-0058 Đ8 (Task A6; chủ chọn cách 1 ngày 30/9): thêm lọc theo NHÓM DỊCH VỤ (quản lý trong app) — hàng chip riêng, kết hợp VÀ với hàng lọc trên và ô tìm;
// chip 1.42 "Theo nhóm" (nghĩa: giá tính theo nhóm khách) đổi CHỮ thành "Giá theo nhóm" cho khỏi nhầm (khoá "theo-nhom" giữ nguyên). Thuần, không I/O.
import { parseUnit } from "./order-lines.ts";

export type LocDanhMucKhoa = "hay-dung" | "theo-nguoi" | "theo-nhom";
export const LOC_DANH_MUC: readonly { khoa: LocDanhMucKhoa; nhan: string }[] = [
  { khoa: "hay-dung", nhan: "★ Hay dùng" },
  { khoa: "theo-nguoi", nhan: "Theo người" },
  { khoa: "theo-nhom", nhan: "Giá theo nhóm" },
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

/**
 * Đợt 1 (bảng việc 13/10, #3): hàng "Lọc sẵn có" bỏ khỏi form lập đơn; chỉ "★ Hay dùng" còn lối vào (một chip trong hàng "Nhóm dịch vụ"). Bộ lọc "Theo người" /
 * "Giá theo nhóm" từng được nhớ trên máy (`td.dmLoc.v1`) sẽ không còn nút nào để tắt → khi đọc bản nhớ phải bỏ đi, kẻo danh sách bị lọc ngầm mà người dùng không biết.
 * Các khoá `theo-nguoi` / `theo-nhom` của `locDanhMuc` giữ nguyên (đã có bài kiểm; chưa có nơi nào dùng).
 */
export const LOC_CON_LOI_VAO: readonly LocDanhMucKhoa[] = ["hay-dung"];
export function boLocAn(nho: NhoDanhMuc): NhoDanhMuc {
  return nho.loc !== null && !LOC_CON_LOI_VAO.includes(nho.loc) ? { ...nho, loc: null } : nho;
}

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

// ---- Nhóm dịch vụ (ADR-0058 Đ8) ----
/** Giá trị chip "Chưa phân loại" (dịch vụ `groupCode === null`). Mã nhóm thật là chữ in hoa (ctl_group.code) nên không trùng. */
export const CHUA_PHAN_LOAI = "chua-phan-loai";
/** Chip nhóm đang chọn: null = "Tất cả"; mã nhóm; hoặc CHUA_PHAN_LOAI. */
export type ChonNhom = string | null;

/** Chỉ giữ dịch vụ của nhóm đang chọn; null = không lọc. Áp SAU `locDanhMuc` (VÀ với ô tìm + hàng lọc 1.42); giữ thứ tự danh mục. */
export function locTheoNhom<T extends { groupCode: string | null }>(ds: readonly T[], nhom: ChonNhom): T[] {
  if (nhom === null) return [...ds];
  if (nhom === CHUA_PHAN_LOAI) return ds.filter((c) => c.groupCode === null);
  return ds.filter((c) => c.groupCode === nhom);
}

/** Số dịch vụ theo từng nhóm; dịch vụ không nhóm đếm vào CHUA_PHAN_LOAI (dùng để biết có hiện chip "Chưa phân loại" không). */
export function demTheoNhom(ds: readonly { groupCode: string | null }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of ds) {
    const k = c.groupCode ?? CHUA_PHAN_LOAI;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Khoá bộ nhớ trình duyệt của chip nhóm — THEO TÀI KHOẢN (hai người dùng chung máy không nhớ lẫn). */
export const khoaNhoNhom = (staffId: string): string => `loc-nhom-dv:${staffId}`;

/** Đọc bản nhớ (chuỗi JSON). Nhóm không còn trong `groups` (bị tắt / đổi) hoặc rác → null ("Tất cả"). CHUA_PHAN_LOAI đọc được — bên dựng chip tự bỏ nếu không còn dịch vụ chưa phân loại. */
export function docNhoNhom(raw: string | null, groups: readonly { code: string }[]): ChonNhom {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (typeof v !== "string" || !v) return null;
    if (v === CHUA_PHAN_LOAI) return v;
    return groups.some((x) => x.code === v) ? v : null;
  } catch {
    return null;
  }
}
