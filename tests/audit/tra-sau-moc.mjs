// Khung thử Trả sau theo giờ (ADR-0172 Đ3): đặt THẲNG hai mốc hạn trả / hết ân hạn của một đơn để giả lập «thời gian đã trôi» (đơn quá hạn, trong ân hạn…).
// Trigger `orders_credit_due_forward_only` (migration 0143) chỉ cho mốc đi về sau — đúng cho mã thật, nhưng bài kiểm cần kéo mốc về quá khứ. Hàm gỡ trigger, ghi, rồi DỰNG LẠI
// đúng câu SQL đã đọc từ sqlite_master, nên các bài khác trong cùng khung thử vẫn chịu khoá. Chỉ dùng trong bài kiểm.
const GIO = 3_600_000;
const ngayVn = (iso) => new Date(Date.parse(iso) + 7 * GIO).toISOString().slice(0, 10);

/** Mốc ISO cách bây giờ `gio` giờ (âm = quá khứ). */
export const cachBayGio = (gio) => new Date(Date.now() + gio * GIO).toISOString();

/** Đặt hai mốc của đơn `orderId`: hạn trả `hanTra`, hết ân hạn `hetAnHan` (mặc định = hạn trả, tức ân hạn 0). Cột ngày cũ ghi theo ngày VN của hạn trả. */
export function datMocTraSau(sqlite, orderId, hanTra, hetAnHan = hanTra) {
  const t = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'orders_credit_due_forward_only'").get();
  if (t) sqlite.exec("DROP TRIGGER orders_credit_due_forward_only");
  try {
    sqlite.prepare("UPDATE orders SET credit_due_at = ?, credit_grace_until = ?, credit_due_date = ? WHERE id = ?").run(hanTra, hetAnHan, ngayVn(hanTra), orderId);
  } finally {
    if (t) sqlite.exec(t.sql);
  }
}
/** Đơn đã HẾT ÂN HẠN (quá hạn theo nghĩa chặn) từ hai ngày trước. */
export const datQuaHan = (sqlite, orderId) => datMocTraSau(sqlite, orderId, cachBayGio(-72), cachBayGio(-48));
