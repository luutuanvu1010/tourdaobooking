// Hai câu báo của nút «Gửi đơn» (ADR-0136 Đ13.3) — một nguồn cho máy chủ và giao diện. Chữ do chủ duyệt NGUYÊN VĂN (kể cả dấu «&»); bài ghim từng ký tự.
// A = đơn vào bước xác nhận; B = đơn không cần xác nhận, chuyển thẳng cho chuyên viên phụ trách. Không I/O, không import module.
export const CAU_BAO_GUI_DON: { readonly A: string; readonly B: string } = {
  A: "Đơn của bạn đã được gửi và chờ xác nhận",
  B: "Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên",
};
