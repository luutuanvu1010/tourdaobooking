// KHOÁ SO SÁNH NƠI — MỘT nguồn (ADR-0050 VK1-B; kế hoạch I39) — dùng để so "nơi hẹn của chặng" với "nơi của điểm dừng", KHÔNG BAO GIỜ hiển thị, không vào
// DTO, nhật ký, bản chụp. Chỉ `orders` gọi (trên chữ GỐC, chưa che — trong hàm hẹp `lichChungChang`); `van-chuyen` chỉ so chuỗi và lưu `vc_trip_stop.place_key`.
// - Điểm danh mục → "L:<id điểm>"; chữ tự do → "T:" + 64 hex thường của SHA-256 (UTF-8) trên `chuanHoaNoi(chữ)`; không có nơi → null.
// - Vì sao không so chữ đã che: hai nơi chỉ khác ở một dãy từ 8 chữ số sẽ che ra CÙNG một chữ (`maskLongDigits`).
// - Băm KHÔNG khoá bí mật: chữ gốc đã nằm trong cùng CSDL; đổi bí mật sẽ làm mọi khoá cũ lệch.
// - CỬA MỘT CHIỀU: đổi `chuanHoaNoi` sau khi có dữ liệu thật = mọi place_key cũ lệch (giữ nhầm cả loạt) → phải tính lại khoá. Khuôn đã thử THẬT trên Node 22
//   và Worker (A0 bước 15–16, nhật ký ADR-0049 mục 10.2): cùng kết quả.
// Logic thuần (Web Crypto `crypto.subtle` toàn cục có sẵn ở Worker và Node 22 — không thư viện), không import module.

/** NFC → cắt khoảng trắng hai đầu → gộp mọi chuỗi khoảng trắng (kể cả tab, NBSP) thành một dấu cách → chữ thường (`toLowerCase`, không theo vùng). */
export function chuanHoaNoi(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); // Web Crypto toàn cục (Worker + Node 22) — như src/modules/auth/webauthn.ts
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Khoá so sánh một nơi: điểm danh mục thắng chữ tự do; chữ rỗng sau chuẩn hoá = không có nơi. */
export async function khoaNoi(v: { locationId: string | null; placeText: string | null }): Promise<string | null> {
  if (v.locationId) return `L:${v.locationId}`;
  const c = v.placeText === null ? "" : chuanHoaNoi(v.placeText);
  return c === "" ? null : `T:${await sha256Hex(c)}`;
}
