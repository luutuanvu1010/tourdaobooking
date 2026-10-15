// Phạm vi của con số hiển thị (Kiểu D — kiểm theo vai 2/10, lộ trình 3/10 V1.5c): số "toàn công ty" và số "của tôi" đứng cạnh nhau thì MỖI ô mang nhãn phạm vi.
// THUẦN; import kèm đuôi .ts. Test: pham-vi-so.test.ts (quét cả web/home.ts — mọi ô số truyền phạm vi từ bảng này).
export const NHAN_PHAM_VI = { TOAN_CONG_TY: "Toàn công ty", CUA_TOI: "Của tôi" } as const;
export type PhamVi = keyof typeof NHAN_PHAM_VI;

/**
 * Bốn ô số của Trang chủ (thẻ điện thoại + thẻ máy tính): khớp máy chủ — "Còn thiếu tiền" (`GET /api/ledger/unpaid-summary`, mọi đơn đang thu), "Chờ xác
 * nhận" / "Chưa phụ trách" (`draftCount` / `unassignedCount` của `GET /api/orders/dashboard`, cả bảng); "Doanh thu" (`revenueWeek`, theo người lập = người xem).
 * Máy chủ đổi phạm vi một số thì đổi dòng ở đây.
 */
export const PHAM_VI_O_TRANG_CHU = {
  conThieu: "TOAN_CONG_TY",
  choXacNhan: "TOAN_CONG_TY",
  chuaPhuTrach: "TOAN_CONG_TY",
  doanhThu: "CUA_TOI",
  // Thẻ "Việc của bạn" (máy tính, 15/10): `dieuChinh` đếm phần chờ CHÍNH người xem duyệt (`choDuyetChoToi`); `xemLai` (cảnh báo giá + giấy tờ), `chuyenHomNay`, `gopY` (hàng đợi) là cả công ty.
  dieuChinh: "CUA_TOI",
  xemLai: "TOAN_CONG_TY",
  chuyenHomNay: "TOAN_CONG_TY",
  gopY: "TOAN_CONG_TY",
} as const satisfies Record<string, PhamVi>;
