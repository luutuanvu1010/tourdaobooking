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

export const BI_MAT: readonly MauRoute[] = [
  { method: "POST", path: "/api/account/change-pin" },
  { method: "POST", path: "/api/account/passkeys/options" }, // thân có PIN hiện tại (bật Face ID, điều 2a) — sót ở L8, vòng 2 kiểm độc lập bắt

  { method: "POST", path: "/api/account/pin-by-passkey" },
  { method: "POST", path: "/api/staff/:id/reset-pin" },
  { method: "POST", path: "/api/parties/:id/documents" },
  { method: "POST", path: "/api/parties/:id/documents/:did/renew" },
  { method: "POST", path: "/api/parties/:id/documents/:did/correct" },
  { method: "POST", path: "/api/parties/:id/documents/:did/reveal" },
];

export const KHONG_VE: readonly MauRoute[] = [
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/passkey/options" },
  { method: "POST", path: "/api/auth/passkey/login" },
  { method: "POST", path: "/api/auth/logout" },
  { method: "POST", path: "/api/auth/session-ended" },
];

/** Đường dẫn thật (có thể kèm `?query`) có khớp MẪU route không — `:x` khớp đúng một đoạn không rỗng. */
export function khopMau(mau: string, duongDan: string): boolean {
  const p = mau.split("/");
  const s = duongDan.split("?")[0]!.split("/");
  return p.length === s.length && p.every((d, i) => (d.startsWith(":") ? s[i]!.length > 0 : d === s[i]));
}
const thuoc = (ds: readonly MauRoute[], method: string, duongDan: string): boolean => ds.some((m) => m.method === method && khopMau(m.path, duongDan));
export const laRouteBiMat = (method: string, duongDan: string): boolean => thuoc(BI_MAT, method, duongDan);
export const laRouteKhongVe = (method: string, duongDan: string): boolean => thuoc(KHONG_VE, method, duongDan);
