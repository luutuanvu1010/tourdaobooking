// Chuẩn hoá SĐT Việt Nam về dạng 0xxxxxxxxx. Trả null nếu không hợp lệ. Logic thuần: nằm ở shared/ vì cả `staff` (đăng nhập) và
// `parties` (liên hệ) dùng, mà `parties` ở đáy đồ thị nên không được import `staff` (ADR-0002).
export function normalizePhone(input: string): string | null {
  let p = input.replace(/[\s.\-()]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length === 11) p = "0" + p.slice(2);
  return /^0\d{9}$/.test(p) ? p : null;
}
