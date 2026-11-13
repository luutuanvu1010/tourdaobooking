// Luật THUẦN của chi tiết dịch vụ (ADR-0199 Đ1): MỘT nguồn cho máy chủ (catalog) và màn «Dịch vụ và Giá». Không I/O.
// Sheet giữ mã, tên gốc, đơn vị, giá gốc; Nền tảng giữ tên hiển thị (thắng tên Sheet) và mô tả. Máy chủ luôn kiểm lại.

export const TEN_TOI_DA = 200;
export const MO_TA_TOI_DA = 2000;

export interface ChiTietDichVu { tenHienThi: string | null; moTa: string | null }

/** Tên dùng ở mọi chỗ đọc danh mục: tên hiển thị nếu có, không thì tên Sheet. Đơn đã lập giữ tên đã chụp — hàm này không đụng tới đơn. */
export const tenHieuLuc = (tenSheet: string, ct: { tenHienThi: string | null } | undefined): string => ct?.tenHienThi ?? tenSheet;

const chuan = (v: string): string | null => {
  const s = v.trim();
  return s === "" ? null : s;
};

export type KetQuaKiem = { ok: true; giaTri: ChiTietDichVu } | { ok: false; cau: string };

/** Thân lệnh lưu: `{ tenHienThi: string | null, moTa: string | null }`, bắt buộc đủ hai khoá (gửi null để xoá). Chuỗi rỗng sau khi cắt khoảng trắng = null. */
export function kiemChiTiet(raw: unknown): KetQuaKiem {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, cau: "Dữ liệu không hợp lệ." };
  const b = raw as Record<string, unknown>;
  if (!("tenHienThi" in b) || !("moTa" in b)) return { ok: false, cau: "Thiếu tên hiển thị hoặc mô tả." };
  const { tenHienThi: t, moTa: m } = b;
  if ((t !== null && typeof t !== "string") || (m !== null && typeof m !== "string")) return { ok: false, cau: "Tên hiển thị và mô tả phải là chữ." };
  const ten = t === null ? null : chuan(t);
  const moTa = m === null ? null : chuan(m);
  if (ten !== null && ten.length > TEN_TOI_DA) return { ok: false, cau: `Tên hiển thị không quá ${TEN_TOI_DA} ký tự.` };
  if (moTa !== null && moTa.length > MO_TA_TOI_DA) return { ok: false, cau: `Mô tả không quá ${MO_TA_TOI_DA.toLocaleString("vi-VN")} ký tự.` };
  return { ok: true, giaTri: { tenHienThi: ten, moTa } };
}

/** Giá trị gửi lên trùng giá trị đang có (chưa có dòng = cả hai null) ⇒ không ghi. */
export const giongNhau = (moi: ChiTietDichVu, cu: ChiTietDichVu | undefined): boolean =>
  moi.tenHienThi === (cu?.tenHienThi ?? null) && moi.moTa === (cu?.moTa ?? null);

/** ADR-0199 Đ1 mục 4: Sheet đổi tên của dịch vụ đang có tên hiển thị ⇒ câu báo trên màn (không tự bỏ tên hiển thị). */
export function cauTenSheetDoi(tenSheet: string, ct: { tenHienThi: string | null; tenSheetLucGhi: string } | undefined): string | null {
  if (!ct?.tenHienThi || ct.tenSheetLucGhi === tenSheet) return null;
  return `Tên trên Sheet đã đổi thành «${tenSheet}» từ lúc đặt tên hiển thị.`;
}
