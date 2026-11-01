// Màn Quản lý tài khoản — bộ lọc danh sách theo vai trò (đặt vé của đối tác, lượt 1, Task 4; đặc tả docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md §4.4).
// Luật THUẦN: web/staff.ts chỉ dựng nút và bảng theo các hàm ở đây. Lọc trên danh sách ĐÃ NẠP (không gọi máy chủ), theo `roles` của tài khoản. Loại tự thêm nằm trên hồ sơ,
// không có trong `roles` nên chưa lọc được (đặc tả §4.4 ghi nợ này). Có bài cạnh tệp (loc-tai-khoan.test.ts). Import kèm đuôi .ts.
import { ROLE_CODES, ROLES, type RoleCode } from "./roles.ts";

/** Khoá nút «Tất cả». */
export const LOC_TAT_CA = "tat-ca";
/** Khoá nút «Chưa gán vai trò» (tài khoản `roles` rỗng — còn dùng quyền cũ). */
export const LOC_CHUA_GAN = "chua-gan";

export interface NutLoc {
  /** `LOC_TAT_CA`, `LOC_CHUA_GAN` hoặc mã vai (`RoleCode`). */
  khoa: string;
  nhan: string;
  soLuong: number;
}

/**
 * Các nút lọc: «Tất cả» (tổng số tài khoản) đứng đầu; sau đó MỖI vai có ít nhất một tài khoản, theo thứ tự `ROLE_CODES`, tên theo `tenVai` (tên hiện hành từ máy chủ) rồi mới đến tên gốc
 * `ROLES[c].name`; «Chưa gán vai trò» đứng cuối và chỉ có khi có tài khoản `roles` rỗng. Tài khoản mang hai vai được đếm ở cả hai nút (nên các số không cộng bằng tổng).
 */
export function nutLocVai(ds: readonly { roles: readonly RoleCode[] }[], tenVai: Readonly<Record<string, string>>): NutLoc[] {
  const nut: NutLoc[] = [{ khoa: LOC_TAT_CA, nhan: "Tất cả", soLuong: ds.length }];
  for (const c of ROLE_CODES) {
    const soLuong = ds.filter((a) => a.roles.includes(c)).length;
    if (soLuong > 0) nut.push({ khoa: c, nhan: tenVai[c] ?? ROLES[c].name, soLuong });
  }
  const chuaGan = ds.filter((a) => a.roles.length === 0).length;
  if (chuaGan > 0) nut.push({ khoa: LOC_CHUA_GAN, nhan: "Chưa gán vai trò", soLuong: chuaGan });
  return nut;
}

/** Danh sách sau khi lọc theo nút `khoa`: `LOC_TAT_CA` → đủ; `LOC_CHUA_GAN` → tài khoản `roles` rỗng; còn lại → tài khoản mang vai có mã đó. Giữ thứ tự và chính các đối tượng của `ds`. */
export function locTheoVai<T extends { roles: readonly RoleCode[] }>(ds: readonly T[], khoa: string): T[] {
  if (khoa === LOC_TAT_CA) return [...ds];
  if (khoa === LOC_CHUA_GAN) return ds.filter((a) => a.roles.length === 0);
  return ds.filter((a) => (a.roles as readonly string[]).includes(khoa));
}

/**
 * Lựa chọn dùng được sau khi nạp lại danh sách: khoá đã nhớ mà VẪN còn nút thì giữ; `null`, chữ rác, hoặc vai vừa hết người giữ (nút biến mất) thì về `LOC_TAT_CA` —
 * không để bảng trống không lý do khi người cuối cùng của vai đó vừa được đổi vai.
 */
export function chonLocHopLe(khoa: string | null, nut: readonly NutLoc[]): string {
  return khoa !== null && nut.some((n) => n.khoa === khoa) ? khoa : LOC_TAT_CA;
}
