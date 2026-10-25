// Chữ của màn «Sổ công nợ» (Kế toán, Toàn quyền — bản vẽ docs/design/so-cong-no-2026-10-25/ bản 2a). Luật thuần dùng ở CẢ máy chủ (nhãn trạng thái đơn trong DTO
// chi tiết một bên) và giao diện (web/so-cong-no.ts). Không cộng trừ tiền ở đây — số do máy chủ tính; tệp chỉ đặt chữ. Bài kiểm: so-cong-no-hien-thi.test.ts.
import { trangThaiHienThi } from "./order-status-label.ts";
import type { OrderStatus } from "./contracts.ts";

/** Nhãn trạng thái của một đơn trong chi tiết một bên. Đơn đã huỷ mà bên này còn giữ tiền: nói rõ cọc còn giữ (ADR-0089 — huỷ mặc định giữ cọc). */
export function nhanDonTrongSo(o: { status: OrderStatus; deliveredAt: string | null; completedAt: string | null } | null, benDangGiu: boolean): string {
  if (!o) return "Không gắn đơn";
  if (o.status === "cancelled" && benDangGiu) return "Đã huỷ — cọc còn giữ";
  return trangThaiHienThi(o).nhan;
}

/** Câu số dư một bên bằng LỜI (không chỉ dấu ±): dương = bên đó đang giữ tiền của công ty; âm = công ty nợ bên đó. */
export function cauSoDu(soDu: number, dinhDang: (n: number) => string): string {
  if (soDu > 0) return `Đang giữ ${dinhDang(soDu)}`;
  if (soDu < 0) return `Công ty nợ ${dinhDang(-soDu)}`;
  return "Không còn số dư";
}

export type LocSoCongNo = "tat_ca" | "dang_giu" | "cong_ty_no";
export const NHAN_LOC: Record<LocSoCongNo, string> = { tat_ca: "Tất cả", dang_giu: "Đang giữ", cong_ty_no: "Công ty nợ" };
export const qua = (loc: LocSoCongNo, soDu: number): boolean => loc === "tat_ca" || (loc === "dang_giu" ? soDu > 0 : soDu < 0);

export type XepSoCongNo = "so_tien" | "ten";
export const NHAN_XEP: Record<XepSoCongNo, string> = { so_tien: "Số tiền lớn nhất", ten: "Tên A → Z" };
/** Thứ tự danh sách bên: theo độ lớn số dư (lớn trước) hoặc theo tên (tiếng Việt). */
export function xepBen<T extends { ten: string; dangGiu: number }>(ds: readonly T[], xep: XepSoCongNo): T[] {
  return [...ds].sort((a, b) => (xep === "ten" ? a.ten.localeCompare(b.ten, "vi") : Math.abs(b.dangGiu) - Math.abs(a.dangGiu) || a.ten.localeCompare(b.ten, "vi")));
}

/** Bỏ dấu + chữ thường để tìm tên bên («dai ly» khớp «Đại Lý»). */
export const boDau = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
export const khopTen = (ten: string, tim: string): boolean => boDau(ten).includes(boDau(tim.trim()));

/** Số bên hiện mỗi lần và số đơn hiện mỗi nhóm trước nút «Xem thêm» (bản vẽ 2a). */
export const BEN_MOI_LAN = 50;
export const DON_MOI_LAN = 30;

export const CAU_LECH = (lech: string): string => `Lệch ${lech} — báo Kế toán trưởng. Cộng các đơn không bằng số dư của bên này; đừng đối chiếu tiếp tới khi kiểm xong.`;
