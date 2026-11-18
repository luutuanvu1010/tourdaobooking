// Số sê-ri của vé (ADR-0217 Đ1): `VE_` + 8 chữ hoa, máy chủ cấp, KHÔNG bí mật. Thuần; dùng chung máy chủ và giao diện (ô «Tra số sê-ri»).
export const DANG_SO_SERI = /^VE_[A-Z]{8}$/;
/** Chuẩn hoá chữ người gõ: bỏ mọi khoảng trắng, đổi chữ hoa. Đúng dạng thì trả số sê-ri, sai dạng thì `null` (không đoán). */
export function chuanHoaSoSeri(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, "").toUpperCase();
  return DANG_SO_SERI.test(s) ? s : null;
}
