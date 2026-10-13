// ADR-0114 D3 (chủ duyệt 2026-10-13) — "mỗi đơn có ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình". Luật thuần dùng chung máy chủ ↔ giao diện,
// không I/O, không import src/modules/. Máy chủ chặn ở bốn cửa: lập đơn + lưu nháp (`validateOrder`), chuyển sang xác nhận, sửa số khách (`planMoneyEdit` —
// MỘT luật cho cả đường văn phòng lẫn hướng dẫn viên). Bài canh: nguoi-di-kem.test.ts.
import type { PaxCode } from "./order-lines.ts";
import { moneyEditServices, type MoneyEditSource } from "./viec-cua-toi.ts";

type Pax = Partial<Record<PaxCode, number>>;

/**
 * Người đi kèm trẻ em = người lớn + người cao tuổi (điều khoản 1 của D3: đơn toàn người cao tuổi lập được; muốn đúng chữ "người lớn" thì đổi MỘT chỗ này).
 * Dịch vụ tính theo nhóm hoặc nhập tay chỉ có MỘT ô "số khách" lưu ở `adult` (điều khoản 2): tự được tính là người lớn, hệ thống không phân biệt được trẻ em ở đó.
 */
export const soNguoiDiKem = (pax: Pax): number => (pax.adult ?? 0) + (pax.senior ?? 0);

/** Đơn thiếu người lớn: TỔNG người đi kèm của MỌI dịch vụ (kể cả nhập tay) nhỏ hơn 1. Tính trên cả đơn, không từng dịch vụ. */
export const donThieuNguoiLon = (dichVu: readonly Pax[]): boolean => dichVu.reduce((n, p) => n + soNguoiDiKem(p), 0) < 1;

/**
 * BÁO SỚM ở giao diện (không thay máy chủ): một lần sửa số khách đưa tổng người đi kèm của cả đơn từ ≥ 1 xuống 0. Cùng điều kiện với `planMoneyEdit` của máy chủ
 * (điều khoản 3: đơn cũ đã 0 người lớn KHÔNG bị chặn thêm — chỉ chặn khi lần sửa là cái làm số này về 0). `truoc` = số khách hiện hành của mọi dịch vụ, `sau` = sau lần sửa.
 */
export const suaDuaVeKhongNguoiLon = (truoc: readonly Pax[], sau: readonly Pax[]): boolean => !donThieuNguoiLon(truoc) && donThieuNguoiLon(sau);

/**
 * Bảng "Sửa số khách" (web/sheet-so-khach.ts): các ô đang gõ (`nhap`) có đưa đơn từ ≥ 1 người đi kèm xuống 0 không. "Sau" dựng đúng như thân gửi lên (`moneyEditServices`:
 * dịch vụ danh mục mang số mới ở loại sửa được, loại khác giữ nguyên); dịch vụ nhập tay không nằm trong thân nên giữ số đã lưu ở cả hai vế (tính là người lớn — điều khoản 2).
 */
export function bangSuaSoKhachVeKhong(nguon: readonly MoneyEditSource[], nhap: ReadonlyMap<string, Pax>): boolean {
  const moi = new Map(moneyEditServices(nguon, nhap).map((s) => [s.id, s.pax] as const));
  return suaDuaVeKhongNguoiLon(nguon.map((s) => s.pax), nguon.map((s) => moi.get(s.id) ?? s.pax));
}

/** Câu từ chối duy nhất của D3 (không có chữ số) — máy chủ và giao diện cùng dùng; mã lỗi ở sửa số khách / xác nhận là `thieu_nguoi_lon` (409). */
export const CAU_THIEU_NGUOI_LON = "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.";
