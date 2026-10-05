// Trợ giúp cho bài thử XÁC NHẬN đơn bằng SQL THẲNG (F-03, migration 0081): CSDL nay chỉ cho đơn sang "đã xác nhận" khi tạm tính = Σ thành tiền các dòng
// (trigger `orders_confirm_subtotal_matches`) — đúng điều máy chủ luôn làm (orders/rules.ts cộng mọi dòng). Bài nào dựng đơn bằng SQL chỉ ghi số tạm tính mà
// không có dòng tiền thì gieo MỘT dòng bù phần thiếu TRƯỚC câu xác nhận — không nới trigger. Bảng/trigger chưa có (bài chỉ nạp migration cũ) vẫn chạy được.
// Không import ứng dụng (dùng được trong bài migration thuần node:sqlite).

/** Gieo một dòng tiền bù để Σ thành tiền dòng = tạm tính của đơn `orderId` (đơn còn nháp). Đã khớp ⇒ không làm gì. */
export function gieoDongTienKhop(sqlite, orderId) {
  const o = sqlite.prepare("SELECT subtotal FROM orders WHERE id = ?").get(orderId);
  if (!o) return;
  const s = sqlite.prepare("SELECT COALESCE(SUM(line_total), 0) AS n FROM order_item WHERE order_id = ?").get(orderId);
  const thieu = Number(o.subtotal) - Number(s.n);
  if (thieu === 0) return;
  if (thieu < 0) throw new Error(`gieoDongTienKhop: đơn ${orderId} có Σ dòng lớn hơn tạm tính — sửa dữ liệu mẫu, không bù âm`);
  sqlite.prepare("INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total) VALUES (?, ?, 'Dòng tiền (khung thử)', 1, ?, ?)")
    .run(`dong-${orderId}-${Number(s.n)}`, orderId, thieu, thieu);
}
