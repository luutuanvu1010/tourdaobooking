/**
 * "Bản nhớ khung" (ADR-0035 điều 3, chủ chọn Q1 = A, 2026-09-27): vẽ thanh trên, menu, thanh tab NGAY khi mở trang, không chờ
 * `/api/auth/me`. Chỉ lưu đúng phần đã duyệt: chữ cái đầu tên + 4 cờ quyết định mục menu. KHÔNG tên đầy đủ, SĐT, email, dữ liệu khách/đơn/tiền.
 * `/api/auth/me` luôn là nguồn sự thật: về thì khung được vẽ lại và bản nhớ ghi đè. Đăng xuất / hết phiên → xoá. Máy chủ vẫn quyết mọi quyền.
 * localStorage bị chặn/ném lỗi (chế độ riêng tư) ⇒ coi như không có bản nhớ: trang chạy như trước.
 */
export interface KhungNho {
  /** Chữ cái đầu tên (avatar), tối đa 2 ký tự. */
  tat: string;
  admin: boolean;
  seesAll: boolean;
  office: boolean;
  canCreate: boolean;
}

export const KHOA_KHUNG = "td-khung-v1";

/** Đọc bản nhớ đã lưu; sai dạng (bản cũ, bị sửa tay) → `null`, không bao giờ ném lỗi. */
export function docKhungNho(raw: string | null): KhungNho | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const co = (k: string) => typeof v[k] === "boolean";
    if (typeof v.tat !== "string" || v.tat.length > 2 || !co("admin") || !co("seesAll") || !co("office") || !co("canCreate")) return null;
    return { tat: v.tat, admin: v.admin as boolean, seesAll: v.seesAll as boolean, office: v.office as boolean, canCreate: v.canCreate as boolean };
  } catch {
    return null;
  }
}

/** Chuỗi để lưu — CHỈ các trường đã duyệt (thêm trường khác phải qua ADR mới; test khoá danh sách trường). */
export function ghiKhungNho(k: KhungNho): string {
  return JSON.stringify({ tat: k.tat.slice(0, 2), admin: k.admin, seesAll: k.seesAll, office: k.office, canCreate: k.canCreate });
}

export function layKhungNho(): KhungNho | null {
  try {
    return docKhungNho(localStorage.getItem(KHOA_KHUNG));
  } catch {
    return null;
  }
}

export function luuKhungNho(k: KhungNho): void {
  try {
    localStorage.setItem(KHOA_KHUNG, ghiKhungNho(k));
  } catch {
    // bỏ qua: lần sau vẽ khung như trước
  }
}

export function xoaKhungNho(): void {
  try {
    localStorage.removeItem(KHOA_KHUNG);
  } catch {
    // bỏ qua
  }
}
