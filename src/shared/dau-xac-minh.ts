// Dấu «đã xác minh» của hồ sơ (ADR-0210). Tệp này hiện chỉ giữ TẬP ĐÓNG của mục bắt buộc (Task 5, migration 0168); hàm tính trạng thái thêm ở Task 10.
// Tập này phải khớp trigger `pty_verification_requirement_item_closed` (bài src/modules/parties/tep-cho.test.ts đối chiếu): muốn thêm mục thì thêm ô vào phiếu đăng ký
// trước (một lần sửa mã), rồi sửa tập này và tạo lại trigger bằng migration mới.

export const MUC_XAC_MINH_MO = {
  ATTRIBUTE: ["HO_TEN", "NGAY_SINH"],
  DOCUMENT: ["CCCD"],
} as const;

export type LoaiMucXacMinh = keyof typeof MUC_XAC_MINH_MO;
