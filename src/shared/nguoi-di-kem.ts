// ADR-0114 D3 (chủ duyệt 2026-10-13) — "mỗi đơn có ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình". Luật thuần dùng chung máy chủ ↔ giao diện,
// không I/O, không import src/modules/. Máy chủ chặn ở bốn cửa: lập đơn + lưu nháp (`validateOrder`), chuyển sang xác nhận, sửa số khách (`planMoneyEdit` —
// MỘT luật cho cả đường văn phòng lẫn hướng dẫn viên). Bài canh: nguoi-di-kem.test.ts.
import type { PaxCode } from "./order-lines.ts";

type Pax = Partial<Record<PaxCode, number>>;

/**
 * Người đi kèm trẻ em = người lớn + người cao tuổi (điều khoản 1 của D3: đơn toàn người cao tuổi lập được; muốn đúng chữ "người lớn" thì đổi MỘT chỗ này).
 * Dịch vụ tính theo nhóm hoặc nhập tay chỉ có MỘT ô "số khách" lưu ở `adult` (điều khoản 2): tự được tính là người lớn, hệ thống không phân biệt được trẻ em ở đó.
 */
export const soNguoiDiKem = (pax: Pax): number => (pax.adult ?? 0) + (pax.senior ?? 0);

/** Đơn thiếu người lớn: TỔNG người đi kèm của MỌI dịch vụ (kể cả nhập tay) nhỏ hơn 1. Tính trên cả đơn, không từng dịch vụ. */
export const donThieuNguoiLon = (dichVu: readonly Pax[]): boolean => dichVu.reduce((n, p) => n + soNguoiDiKem(p), 0) < 1;

/** Câu từ chối duy nhất của D3 (không có chữ số) — máy chủ và giao diện cùng dùng; mã lỗi ở sửa số khách / xác nhận là `thieu_nguoi_lon` (409). */
export const CAU_THIEU_NGUOI_LON = "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.";
