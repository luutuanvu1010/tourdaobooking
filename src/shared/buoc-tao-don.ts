// Bốn bước của màn Tạo đơn (bản "bốn bước", 14/10/2026; đặc tả docs/superpowers/specs/2026-10-14-tao-don-bon-buoc/README.md): luật THUẦN của thanh tiến độ dính — bước nào đã đủ thông tin (dấu ✓)
// và bước nào đang được xem theo vị trí cuộn. Không DOM, không I/O; `web/thanh-buoc.ts` chỉ vẽ và nối.

export type MaBuoc = "khach" | "dich-vu" | "thanh-toan" | "phu-trach";

/** Thứ tự và chữ ngắn của bốn bước (đúng như ảnh phác chủ duyệt). */
export const BUOC_TAO_DON: readonly { ma: MaBuoc; nhan: string }[] = [
  { ma: "khach", nhan: "Khách" },
  { ma: "dich-vu", nhan: "Dịch vụ" },
  { ma: "thanh-toan", nhan: "Thanh toán" },
  { ma: "phu-trach", nhan: "Phụ trách" },
];

/** Cái form biết lúc này (nơi gọi tính từ trạng thái thật, KHÔNG đọc DOM để suy luật). */
export interface DauVaoBuoc {
  /** Ngày khởi hành của cả đơn đã chọn. */
  coNgayDi: boolean;
  ten: string;
  sdt: string;
  soDichVu: number;
  /** Có dịch vụ nào còn lỗi chặn Lưu (số khách, nơi đón…) — cùng nguồn `draftIssues` mà nút Lưu dùng. */
  coLoiDichVu: boolean;
  /** Số tiền đang lệch luật (giảm giá quá tạm tính, trả trước quá tổng). */
  coLoiTien: boolean;
  /** Đã chọn người phụ trách. */
  daChonNguoi: boolean;
}

/**
 * Bước nào "đủ thông tin" (dấu ✓).
 * - Khách: có ngày khởi hành, tên và số điện thoại (hai ô bắt buộc của form; email, ghi chú không bắt buộc).
 * - Dịch vụ: có ít nhất một dịch vụ và không dịch vụ nào còn lỗi chặn Lưu.
 * - Thanh toán: bước này không có ô bắt buộc nên ✓ khi đã có dịch vụ và số tiền không lệch luật.
 * - Phụ trách: đã chọn người (không chọn vẫn lưu được — đơn "Chờ nhận").
 */
export function buocXong(v: DauVaoBuoc): Record<MaBuoc, boolean> {
  const dichVuOk = v.soDichVu > 0 && !v.coLoiDichVu;
  return {
    "khach": v.coNgayDi && v.ten.trim() !== "" && v.sdt.trim() !== "",
    "dich-vu": dichVuOk,
    "thanh-toan": v.soDichVu > 0 && !v.coLoiTien,
    "phu-trach": v.daChonNguoi,
  };
}

/**
 * Bước đang xem khi cuộn. `tops` = khoảng cách từ mép trên khung nhìn tới mép trên của từng bước HIỆN (theo thứ tự bước); `nguong` = mép dưới của thanh dính cộng một đoạn đệm.
 * Bước đang xem = bước CUỐI CÙNG đã chạm ngưỡng (mép trên ≤ ngưỡng); chưa bước nào chạm thì bước đầu. Cuộn tới đáy trang thì bước cuối (bước ngắn ở cuối trang không bao giờ chạm ngưỡng).
 */
export function buocDangXem(tops: readonly number[], nguong: number, cuoiTrang: boolean): number {
  if (tops.length === 0) return 0;
  if (cuoiTrang) return tops.length - 1;
  let dang = 0;
  tops.forEach((t, i) => {
    if (t <= nguong) dang = i;
  });
  return dang;
}
