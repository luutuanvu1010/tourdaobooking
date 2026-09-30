// Bộ lọc danh sách đơn nhiều điều kiện chọn đồng thời (góp ý T4 / YC-0008, YC-0012 — kế hoạch docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md §7.2).
// Đọc tham số của `GET /api/orders` thành một bộ lọc đã kiểm; máy chủ AND bộ lọc này với PHẠM VI XEM của vai (route quyết phạm vi, không phải ở đây).
//  - `tu` / `den`: khoảng NGÀY ĐI (YYYY-MM-DD, ngày dân sự giờ Việt Nam — so thẳng với `order_service.depart_date`), mỗi đầu tuỳ chọn.
//  - `dichVu` (lặp): mã danh mục; `status` (lặp, giữ tên cũ): trạng thái đơn; `nguoiLap`: mã tài khoản người lập.
//  - Ô trống (`?tu=`) = không lọc ô đó; mục trùng bị bỏ. "Người phụ trách" CHƯA có (nằm ở dispatch — lượt sau).
// Thuần, không I/O — dùng lại được cho màn lọc ở web/ sau khi chủ duyệt ảnh phác.
import { CATALOG_CODE_RE } from "./order-lines.ts";
import { isISODate } from "./vn-date.ts";
import type { OrderStatus } from "./contracts.ts";

export const LOC_DON_TOI_DA_DICH_VU = 20;
const TRANG_THAI: readonly OrderStatus[] = ["draft", "confirmed", "cancelled"];
/** Mã tài khoản: UUID ở dữ liệu hiện có; nới cho mọi mã chữ-số-gạch (chỉ để chặn rác — giá trị luôn đi vào SQL dạng tham số). */
const MA_NGUOI_RE = /^[A-Za-z0-9-]{1,64}$/;

export interface LocDon {
  tu: string | null;
  den: string | null;
  dichVu: string[];
  trangThai: OrderStatus[];
  nguoiLap: string | null;
}

const khacRong = (p: URLSearchParams, k: string): string[] => [...new Set(p.getAll(k).map((v) => v.trim()).filter((v) => v !== ""))];

export function docLocDon(p: URLSearchParams): { ok: true; loc: LocDon } | { ok: false; message: string } {
  const [tu = null] = khacRong(p, "tu");
  const [den = null] = khacRong(p, "den");
  if ((tu !== null && !isISODate(tu)) || (den !== null && !isISODate(den))) return { ok: false, message: "Ngày đi lọc không hợp lệ (dạng năm-tháng-ngày)." };
  if (tu !== null && den !== null && tu > den) return { ok: false, message: "Từ ngày không được sau Đến ngày." };

  const trangThai = khacRong(p, "status");
  if (!trangThai.every((s) => (TRANG_THAI as readonly string[]).includes(s))) return { ok: false, message: "Trạng thái lọc không hợp lệ." };

  const dichVu = khacRong(p, "dichVu");
  if (dichVu.length > LOC_DON_TOI_DA_DICH_VU) return { ok: false, message: `Chỉ lọc được tối đa ${LOC_DON_TOI_DA_DICH_VU} dịch vụ một lúc.` };
  if (!dichVu.every((c) => CATALOG_CODE_RE.test(c))) return { ok: false, message: "Mã dịch vụ lọc không hợp lệ." };

  const nguoi = khacRong(p, "nguoiLap");
  if (nguoi.length > 1) return { ok: false, message: "Chỉ lọc được một người lập một lúc." };
  if (nguoi.length === 1 && !MA_NGUOI_RE.test(nguoi[0]!)) return { ok: false, message: "Người lập lọc không hợp lệ." };

  return { ok: true, loc: { tu, den, dichVu, trangThai: trangThai as OrderStatus[], nguoiLap: nguoi[0] ?? null } };
}
