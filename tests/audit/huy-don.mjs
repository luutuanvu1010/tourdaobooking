// Trợ giúp cho bài thử đặt đơn sang "huỷ" bằng SQL THẲNG (ADR-0089 đ8, migration 0078): CSDL nay chỉ cho đơn chuyển sang huỷ khi đã có dòng lý do
// (trigger `orders_cancel_requires_reason`). Bài nào dựng dữ liệu đơn huỷ bằng SQL thì gieo dòng lý do TRƯỚC câu UPDATE, đúng thứ tự lô huỷ thật — không
// nới trigger. Bảng chưa có (bài chỉ nạp migration cũ) ⇒ không làm gì. Không import ứng dụng (dùng được trong bài migration thuần node:sqlite).

/** Gieo một dòng lý do huỷ (mặc định nhóm khách huỷ, mã KHACH_DOI_Y) cho `orderId` nếu đơn chưa có dòng gốc. */
export function gieoLyDoHuy(sqlite, orderId, { nhom = "KHACH_HUY", ma = "KHACH_DOI_Y", ngay = "2026-10-05", legacy = 0 } = {}) {
  const coBang = sqlite.prepare("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'ord_cancel_reason'").get();
  if (!coBang) return;
  const da = sqlite.prepare("SELECT 1 AS x FROM ord_cancel_reason WHERE order_id = ? AND reclassifies_id IS NULL").get(orderId);
  if (da) return;
  sqlite.prepare(
    `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, '2026-10-05T00:00:00.000Z', 'khung-thu', '2026-10-05T00:00:00.000Z', 'khung-thu')`,
  ).run(`lydo-${orderId}`, orderId, ma, nhom, ma === "OTHER" ? "Khác (khung thử)" : null, ngay, legacy);
}
