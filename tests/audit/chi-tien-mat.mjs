// ADR-0225 Đ2 (migration 0184): đơn đối tác xác nhận từ ngày áp mang dấu «chỉ thu hộ tiền mặt». Bài cũ kiểm tính năng KHÁC (khoản nộp, mở vé, trần…) bằng khoản
// «Công ty thu, chuyển khoản» ở đơn đối tác — tình huống nay chỉ còn ở đơn xác nhận TRƯỚC ngày áp. Hàm này đưa đơn về đúng tình huống đó: gỡ dấu (NULL) bằng SQL tay,
// tạm gỡ trigger canh dấu của CHÍNH khung thử (cơ sở dữ liệu trong bộ nhớ, không chạm D1 thật).
export function donTruocNgayAp(w, orderId) {
  w.sqlite.exec("DROP TRIGGER IF EXISTS orders_partner_cash_only_guard");
  w.sqlite.prepare("UPDATE orders SET partner_cash_only = NULL WHERE id = ?").run(orderId);
}
