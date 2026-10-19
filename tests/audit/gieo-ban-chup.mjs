// HÀM GIEO DÙNG CHUNG cho mọi chỗ dựng THẲNG bằng SQL một đơn ĐÃ XÁC NHẬN rồi đi tới «Đã giao» (bài migration, khung thử route) — sổ đại lý đợt 2, migration
// 0112: trigger lớp 2 `bil_posting_delivered_terms` chặn phiếu «Đã giao» khi đơn còn dòng dịch vụ CHƯA có bản chụp thương mại (view `v_ord_terms_uncaptured`)
// hoặc bản chụp hiện hành thiếu mức / thiếu người bán (`v_ord_terms_missing`). Mã chạy thật chụp lúc Xác nhận (`chupDon` của orders, cùng lô với câu xác nhận);
// khung thử đổi đơn sang 'confirmed' bằng SQL thì gọi `gieoBanChup` SAU câu đổi trạng thái và TRƯỚC «Đã giao» — MỘT chỗ, không chép tay câu INSERT bản chụp ở
// từng tệp (khuôn `gieoMocXep` của gieo-vc.mjs).
// Bản gieo giống bản chụp của đơn KHÁCH LẺ thường (ADR-0079 điều 7b1): hoa hồng `NONE`, người bán = công ty chủ theo điều khoản `ALL` gieo sẵn
// (`prc-st-goc-all`, hiệu lực từ 2025-01-01), `source = 'AUTO'`. Dòng NHẬP TAY (`catalog_code IS NULL`) không có điều khoản (A-14) ⇒ bản AUTO thiếu người bán,
// rồi — mặc định — một bản MANUAL thay nó như Kế toán ghi tay «dòng này Tour Đảo bán» (ADR-0078 điều 5). `nhapTay: "thieu"` để nguyên bản thiếu người bán
// (bài muốn thấy đơn bị giữ). Dòng đã có bản chụp thì bỏ qua.
// `db`: node:sqlite DatabaseSync (hoặc thứ có `prepare(sql).run(...)` / `.get(...)` / `.all(...)`). Trả số dòng dịch vụ vừa gieo.

/** Gieo bản chụp cho mọi dòng dịch vụ CHƯA có bản chụp của đơn `orderId` (đơn phải đã xác nhận, chưa «Đã giao» — trigger của 0090 canh). */
export function gieoBanChup(db, orderId, { ngay = "2026-09-01", luc = "2026-09-01T00:00:00.000Z", nhapTay = "ghi-tay", boi = "he-thong:khung-thu" } = {}) {
  const ct = db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get()?.party_id;
  if (!ct) throw new Error("gieoBanChup: chưa có hồ sơ công ty chủ (v_pty_owner_company rỗng)");
  const dongs = db.prepare(
    "SELECT s.id, s.catalog_code FROM order_service s WHERE s.order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_service_id = s.id) ORDER BY s.sort_order, s.id",
  ).all(orderId);
  const chen = db.prepare(`INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind,
      commission_rate_bp, commission_per_pax, commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason,
      supersedes_id, captured_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, NULL, 'NONE', NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const d of dongs) {
    const goc = `chup-${d.id}`;
    if (d.catalog_code !== null) {
      chen.run(goc, orderId, d.id, "SET", ct, "prc-st-goc-all", "AUTO", null, null, ngay, luc, boi, luc, boi);
      continue;
    }
    chen.run(goc, orderId, d.id, "MISSING", null, null, "AUTO", null, null, ngay, luc, boi, luc, boi);
    if (nhapTay === "ghi-tay") chen.run(`${goc}-tay`, orderId, d.id, "SET", ct, null, "MANUAL", "Khung thử: dòng nhập tay do Tour Đảo bán", goc, ngay, luc, boi, luc, boi);
  }
  return dongs.length;
}
