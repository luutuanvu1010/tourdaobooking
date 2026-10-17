// LỚP CHỐNG GHI TRÙNG (ADR-0094 đ5; đặc tả §3.2 mục 6) — danh sách route dùng ở MÁY KHÁCH (`web/api.ts` qua src/shared/lan-gui-ve.ts). Một nguồn, dùng
// chung máy chủ (bài kiểm) và giao diện.
//  - `BI_MAT`: route có THÂN chứa bí mật ít khả năng (PIN, số giấy tờ của người) — vé chỉ giữ trong BỘ NHỚ của trang, không bao giờ ghi localStorage (mã băm
//    SHA-256 của thân dò ngược được khi giá trị gốc chỉ có ít khả năng). Bài src/shared/lan-gui-ve.test.ts (T16) QUÉT mã route: route ghi có đăng
//    nhập mà thân handler kiểm PIN (isValidPin / validateNewPin / validateFreshPin / verifyPinThrottled) hoặc đường dẫn có `/documents` mà thiếu ở đây ⇒
//    đỏ. Bí mật kiểu KHÁC (không qua các hàm đó) vẫn DỰA VÀO KỶ LUẬT.
//  - `KHONG_VE`: route ghi CÔNG KHAI (đăng nhập…) — máy chủ không áp lớp vé ở đó (không có tài khoản làm phạm vi) ⇒ máy khách không sinh vé, không lưu gì
//    (thân đăng nhập có PIN). Phải bằng đúng tập route ghi `public` (bài kiểm đối chiếu với src/lan-gui-phu-route.test.ts).

export interface MauRoute {
  readonly method: "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
}

// Mọi route bí mật hôm nay đều là POST — liệt kê ĐƯỜNG DẪN rồi dựng mẫu như KHONG_VE dưới đây (gói trang nào cũng nhúng danh sách này; lát H-2 kho tệp thêm route
// thứ 14 làm gói Đơn hàng vượt trần của src/goi-trang-nhe.test.ts — viết gọn thay vì nới trần). Route bí mật bằng phương thức khác thì đổi lại dạng đầy đủ.
export const BI_MAT: readonly MauRoute[] = [
  "/api/account/change-pin",
  "/api/account/passkeys/options", // thân có PIN hiện tại (bật Face ID, điều 2a) — sót ở L8, vòng 2 kiểm độc lập bắt
  "/api/account/pin-by-passkey",
  // ADR-0074 (Task 5): thân có mã 6 số của ứng dụng xác thực / mã dự phòng (ít khả năng) — vé chỉ giữ trong bộ nhớ trang.
  "/api/account/mfa/totp/confirm",
  "/api/account/mfa/recovery/regenerate",
  "/api/account/mfa/remove",
  // ADR-0074 Phần C Task 3: thân có địa chỉ email đầy đủ + mã hiện có / mã trong thư — vé chỉ giữ trong bộ nhớ trang.
  "/api/account/mfa/email/start",
  "/api/account/mfa/email/confirm",
  "/api/staff/:id/reset-pin",
  "/api/parties/:id/documents",
  "/api/parties/:id/documents/:did/renew",
  "/api/parties/:id/documents/:did/correct",
  "/api/parties/:id/documents/:did/reveal",
  // ADR-0123 (lát H-2 kho tệp): thân là ảnh giấy tờ (base64) — đường giấy tờ của người, bài T16 bắt; vé chỉ giữ trong bộ nhớ trang.
  "/api/parties/:id/documents/:did/tep",
  "/api/parties/cua-toi/phieu", // ADR-0124 (lát H-3): phiếu tự khai có số giấy tờ / ngày sinh / địa chỉ — T16 bắt qua kiemPhieuTuKhai
  "/api/parties/xac-minh/:pid/xem-so", // ADR-0125 (lát H-4): THÂN RỖNG, số đủ nằm ở PHẢN HỒI (không phải thân gửi đi) — giữ dòng vì kế hoạch đòi; không bài nào canh dòng này (dựa vào kỷ luật, vòng sửa 1 m-1)
].map((path): MauRoute => ({ method: "POST", path }));

// Mọi route ghi công khai hôm nay đều là POST — liệt kê ĐƯỜNG DẪN rồi dựng mẫu (gói trang nào cũng nhúng danh sách này: viết gọn để gói Đơn hàng không vượt
// trần dung lượng của src/goi-trang-nhe.test.ts — Phần C thêm route thứ 9). Route công khai bằng phương thức khác thì đổi lại dạng đầy đủ.
export const KHONG_VE: readonly MauRoute[] = [
  "/api/auth/login",
  "/api/auth/passkey/options",
  "/api/auth/passkey/login",
  "/api/auth/logout",
  "/api/auth/session-ended",
  "/api/auth/mfa/verify", // bước hai đăng nhập (ADR-0074): thân có mã TOTP / mã email / mã dự phòng — không vé, không lưu gì
  "/api/auth/mfa/enroll/start", // bật lại lớp hai ở bước đăng nhập (ADR-0074 đ5, Task 6): công khai, cookie chờ "enroll"
  "/api/auth/mfa/enroll/confirm", // như trên; thân có mã TOTP — không vé, không lưu gì
  "/api/auth/mfa/email", // gửi mã email ở bước hai (ADR-0074 đ4, Phần C): công khai, cookie chờ "verify" — không vé, không lưu gì
].map((path): MauRoute => ({ method: "POST", path }));

/** Đường dẫn thật (có thể kèm `?query`) có khớp MẪU route không — `:x` khớp đúng một đoạn không rỗng. */
export function khopMau(mau: string, duongDan: string): boolean {
  const p = mau.split("/");
  const s = duongDan.split("?")[0]!.split("/");
  return p.length === s.length && p.every((d, i) => (d.startsWith(":") ? s[i]!.length > 0 : d === s[i]));
}
const thuoc = (ds: readonly MauRoute[], method: string, duongDan: string): boolean => ds.some((m) => m.method === method && khopMau(m.path, duongDan));
export const laRouteBiMat = (method: string, duongDan: string): boolean => thuoc(BI_MAT, method, duongDan);
export const laRouteKhongVe = (method: string, duongDan: string): boolean => thuoc(KHONG_VE, method, duongDan);
