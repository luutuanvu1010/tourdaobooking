// Luật ghi chú của danh mục (loại đối tác, cấp đại lý) + bộ dò số điện thoại / số tài khoản / email dùng chung. Thuần, không I/O.
/** Có dãy ≥ 8 chữ số (SĐT / số tài khoản) hoặc `@` (email) không — nhật ký không được ghi những thứ này. */
export const coSoHoacEmail = (s: string): boolean => /\d{8,}/.test(s.replace(/[\s.]/g, "")) || /\d{9,}/.test(s.replace(/[\s.-]/g, "")) || s.includes("@");
/** Ghi chú: tuỳ chọn, `trim()` hai đầu (giữ xuống dòng), rỗng ⇒ null, tối đa 500 ký tự, không SĐT / số tài khoản / email. */
export function kiemGhiChu(raw: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, message: "Ghi chú phải là chữ." };
  const s = raw.trim();
  if (s === "") return { ok: true, value: null };
  if (s.length > 500) return { ok: false, message: "Ghi chú dài tối đa 500 ký tự." };
  if (coSoHoacEmail(s)) return { ok: false, message: "Ghi chú không được chứa số điện thoại, số tài khoản hay địa chỉ email." };
  return { ok: true, value: s };
}
