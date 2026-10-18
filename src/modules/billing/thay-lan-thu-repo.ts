// SQL "THAY KHOẢN THU" của module billing (ADR-0088 đ2, đ6; migration 0083). Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, ?N) — chỉ chạm bảng bil_ và view
// công bố `v_pty_owner_company`. CHỈ-THÊM. Khoản thu mới và dòng đảo của một lô mang dấu nối `replacement_id` = id phiếu đánh dấu (chèn sau cùng); điều kiện
// I1 và "đảo đơn lẻ sau Đã giao" nằm ở trigger 0083 (RAISE ⇒ cả lô huỷ). Import kèm đuôi .ts.
import { defineSql } from "../../shared/sql-registry.ts";

/** Phải thu lúc "Đã giao" (bản chụp `due_snapshot` của phiếu DELIVERED) — null nếu đơn chưa Đã giao. */
const DELIVERED_DUE = defineSql("billing", "thay_delivered_due", `SELECT due_snapshot FROM bil_posting WHERE order_id = ?1 AND kind_code = 'DELIVERED'`);
export async function phaiThuLucGiao(db: D1Database, orderId: string): Promise<number | null> {
  const r = await db.prepare(DELIVERED_DUE).bind(orderId).first<{ due_snapshot: number }>();
  return r ? r.due_snapshot : null;
}

const COLS = `id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
  reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id`;

/** Khoản thu MỚI của lô Thay (luôn "khoản thu của khách"), mang dấu nối ?13. Không lính gác mốc: trigger 0083 chặn nếu thiếu dấu sau Đã giao. */
const RECEIPT_THAY_MOI = defineSql(
  "billing",
  "thay_receipt_moi",
  `INSERT INTO bil_payment_receipt (${COLS})
   SELECT ?1, ?2, 'CUSTOMER_PAYMENT', ?3, ?4, ?5, ?6, (SELECT party_id FROM v_pty_owner_company LIMIT 1), ?7, ?8, NULL, ?9, ?10, ?11, ?10, ?11, ?12`,
);
export const receiptThayMoiStatement = (
  db: D1Database,
  r: { id: string; orderId: string; amount: number; collectorPartyId: string; collectorRole: "COMPANY" | "STAFF"; method: string; stage: "PREPAID" | "AT_DELIVERY"; occurredDate: string; note: string | null; at: string; by: string; replacementId: string },
) => db.prepare(RECEIPT_THAY_MOI).bind(r.id, r.orderId, r.amount, r.collectorPartyId, r.collectorRole, r.method, r.stage, r.occurredDate, r.note, r.at, r.by, r.replacementId);

/** Dòng ĐẢO của một khoản thu cũ trong lô Thay: chép gốc ?6, trỏ gốc, mang dấu nối ?7 — trigger `bil_payment_receipt_reversal_match` + UNIQUE canh như đảo thường. */
const RECEIPT_THAY_DAO = defineSql(
  "billing",
  "thay_receipt_dao",
  `INSERT INTO bil_payment_receipt (${COLS})
   SELECT ?1, g.order_id, g.kind_code, g.amount, g.collector_party_id, g.collector_role_code, g.method_code, g.collected_for_party_id, g.stage_code, ?2, g.id, ?3, ?4, ?5, ?4, ?5, ?7
   FROM bil_payment_receipt g WHERE g.id = ?6`,
);
export const receiptThayDaoStatement = (db: D1Database, i: { id: string; occurredDate: string; note: string | null; at: string; by: string; reversesId: string; replacementId: string }) =>
  db.prepare(RECEIPT_THAY_DAO).bind(i.id, i.occurredDate, i.note, i.at, i.by, i.reversesId, i.replacementId);
