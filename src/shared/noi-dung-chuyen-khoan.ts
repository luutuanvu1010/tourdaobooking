// Nội dung chuyển khoản của QR thanh toán (ADR-0108 đ3; đặc tả QR §4.2, §4.3): mã đơn bỏ mọi ký tự ngoài chữ in hoa và số. Ô tìm đơn nhận lại chuỗi đó
// (có hay không gạch, hoa hay thường, nằm giữa nội dung ngân hàng in thêm) và đổi về mã đơn chuẩn `TD-YYYYMMDD-NNNN`. Hàm thuần, dùng chung máy chủ.

export const noiDungChuyenKhoan = (maDon: string): string => maDon.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Mã đơn sinh ở orders/rules.ts `orderCodePrefix` + 4 chữ số. Không cho chữ số đứng ngay sau (tránh ăn nhầm một dãy số dài hơn).
const MA_DON_TRONG_CHU = /TD-?(\d{8})-?(\d{4})(?!\d)/i;

/** Có mã đơn nằm trong chữ tìm ⇒ trả mã chuẩn có gạch; không có ⇒ null (ô tìm giữ nguyên chữ người dùng gõ). */
export function maDonTuNoiDung(q: string): string | null {
  const m = MA_DON_TRONG_CHU.exec(q);
  return m ? `TD-${m[1]}-${m[2]}` : null;
}
