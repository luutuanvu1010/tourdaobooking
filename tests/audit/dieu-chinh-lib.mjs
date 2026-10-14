// Phụ trợ cho các bài SQL thô chèn phiếu ADJUSTMENT (ADR-0115 đợt 1, migration 0094): từ 0094 CSDL chỉ nhận phiếu ADJUSTMENT khi có yêu cầu ĐÃ DUYỆT bởi người KHÁC
// người tạo (cột `request_id`). Hàm này dựng đúng bộ ba hợp lệ — dòng REQUEST (người tạo "nguoi-tao"), dòng APPROVE (người duyệt "nguoi-duyet") và phiếu ADJUSTMENT do
// người duyệt ghi — để bài vẫn chạm đúng luật khác (lý do, đảo dòng…) mà không lách trigger. KHÔNG chèn dòng nợ: dòng nợ của phiếu ADJUSTMENT phải khớp yêu cầu
// (trigger bil_debt_line_adjustment_match), nên bài cần dòng thì truyền đúng hai bên / số tiền / loại dòng đã khai ở đây rồi tự chèn dòng. Phiếu chỉ làm "chỗ chứa"
// nhiều dòng nợ tuỳ ý thì KHÔNG dùng hàm này (đổi loại phiếu chỗ chứa sang SETTLEMENT — loại phiếu không là điều kiện của luật nào ở các bài đó).
export const NGUOI_TAO = "nguoi-tao";
export const NGUOI_DUYET = "nguoi-duyet";

/**
 * @param db  node:sqlite DatabaseSync đã áp mọi migration
 * @param o   { id, orderId, reason, occurredDate, at, debtor?, creditor?, amount?, kind? }
 * @returns   { postingId, requestId }
 */
export function chenPhieuDieuChinh(db, o) {
  const requestId = `yc-${o.id}`;
  const at = o.at;
  const debtor = o.debtor ?? "hdv";
  const creditor = o.creditor ?? "ct";
  db.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason,
      target_id, cap_snapshot, created_at, created_by, updated_at, updated_by) VALUES (?, 'REQUEST', ?, ?, ?, ?, ?, ?, 'INCREASE', ?, NULL, NULL, ?, ?, ?, ?)`)
    .run(requestId, o.orderId, debtor, creditor, o.amount ?? 1, o.kind ?? "HELD", o.occurredDate, o.reason, at, NGUOI_TAO, at, NGUOI_TAO);
  db.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'APPROVE', ?, 'INCREASE', NULL, ?, 1000000000, ?, ?, ?, ?)`)
    .run(`dq-${o.id}`, o.orderId, requestId, at, NGUOI_DUYET, at, NGUOI_DUYET);
  db.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, request_id, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(o.id, o.orderId, o.reason, o.occurredDate, requestId, at, NGUOI_DUYET, at, NGUOI_DUYET);
  return { postingId: o.id, requestId };
}
