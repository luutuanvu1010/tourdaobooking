// Dải chuyển nhanh giữa các trang anh em của mục gộp ("Xe & giấy tờ", "Giá & chi phí"). Thuần (không DOM). Tệp riêng, KHÔNG để trong muc-giao-dien.ts: tệp đó nằm trong
// gói mọi trang (trần 96000 byte của bài src/goi-trang-nhe.test.ts); chỉ 5 trang xe / giá import tệp này (web/dai-trang-anh-em.ts).
// Nguồn: trường `gom` của THANH_BEN + `coHien` — dải chỉ liệt kê trang người đó thấy, cùng bảng với thanh bên.
import { THANH_BEN, TRANG, coHien, sangTai, type KhoaTrang } from "./muc-giao-dien.ts";
import type { PermissionHolder } from "./permissions.ts";

const NHAN: Partial<Record<KhoaTrang, string>> = {
  xe: "Xe",
  lichXeBan: "Lịch xe bận",
  sapHetHan: "Giấy tờ sắp hết hạn",
  bangGiaXe: "Bảng giá thuê xe",
  bangKeXe: "Bảng kê chi phí xe",
};

export interface TrangAnhEm {
  readonly nhan: string;
  readonly href: string;
  readonly hienTai: boolean;
}

/** Các trang cùng mục gộp với trang đang đứng (`duong`) mà `who` thấy, theo thứ tự `gom`. `[]` nếu đường không thuộc mục gộp nào. */
export function traAnhEm(duong: string, who: PermissionHolder): TrangAnhEm[] {
  const gom = THANH_BEN.flatMap((c) => ("gom" in c ? [c.gom as readonly KhoaTrang[]] : [])).find((g) => g.some((k) => sangTai(k, duong)));
  if (!gom) return [];
  return gom
    .filter((k) => coHien({ trang: k, nhan: "" }, { staff: who }))
    .map((k) => ({ nhan: NHAN[k] ?? k, href: TRANG[k].duong, hienTai: sangTai(k, duong) }));
}
