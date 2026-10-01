/**
 * Lịch sử nhóm của một dịch vụ ở hộp "Sửa giá" màn Danh mục (ADR-0058 Đ4, Task A7). Luật thuần, dùng ở `web/catalog.ts`.
 * Máy chủ (`GET /api/catalog/:code/group-history`) trả các TRẠNG THÁI, mới nhất trước: `{ luc, createdBy: id | null, nhom: tên | null }`.
 * Mỗi dòng hiện "30/09 14:05 — Lan: Tour đảo → Thể thao biển": "từ" là nhóm của dòng cũ hơn kế tiếp (dòng cũ nhất: "Chưa phân loại").
 * Tên người ghép từ danh sách tài khoản (`GET /api/staff`); `null` → "Hệ thống"; id không có trong danh sách → "Người dùng cũ".
 */
export interface DongLichSuNhom {
  luc: string;
  createdBy: string | null;
  nhom: string | null;
}

export const CHUA_PHAN_LOAI_TEN = "Chưa phân loại";

/** ISO UTC → "dd/mm hh:mm" theo giờ Việt Nam (24 giờ). */
export function gioNgayThang(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const p = (t: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")} ${p("hour")}:${p("minute")}`;
}

/** Tên người ghi một bản lịch sử: `null` → "Hệ thống"; id không có trong danh sách tài khoản → "Người dùng cũ". Dùng chung lịch sử nhóm và mẫu đưa đón. */
export const tenNguoiGhi = (createdBy: string | null, tenNguoi: ReadonlyMap<string, string>): string =>
  createdBy === null ? "Hệ thống" : (tenNguoi.get(createdBy) ?? "Người dùng cũ");

export function dongLichSuNhom(items: readonly DongLichSuNhom[], tenNguoi: ReadonlyMap<string, string>): string[] {
  return items.map((it, i) => {
    const nguoi = tenNguoiGhi(it.createdBy, tenNguoi);
    const tu = items[i + 1]?.nhom ?? CHUA_PHAN_LOAI_TEN;
    return `${gioNgayThang(it.luc)} — ${nguoi}: ${tu} → ${it.nhom ?? CHUA_PHAN_LOAI_TEN}`;
  });
}
