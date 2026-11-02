// SQL "THAY KHOẢN THU" của module billing (ADR-0088 đ2, đ6; migration 0083). Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, ?N) — chỉ chạm bảng bil_ và view
// công bố `v_pty_owner_company`. CHỈ-THÊM. Khoản thu mới và dòng đảo của một lô mang dấu nối `replacement_id` = id phiếu đánh dấu (chèn sau cùng); điều kiện
// I1 và "đảo đơn lẻ sau Đã giao" nằm ở trigger 0083 (RAISE ⇒ cả lô huỷ). Import kèm đuôi .ts.
import { defineSql } from "../../shared/sql-registry.ts";

/**
 * MỘT nguồn "phải thu hiện hành" của đơn ĐÃ Đã giao (ADR-0088 đ1, ADR-0116 đ5, Hiến chương 5.4): `due_snapshot` − giảm trừ đã phân định, đọc view `v_bil_phai_thu_hien_hanh` — trigger và R-BIL-1 đọc CÙNG view.
 * null nếu đơn chưa Đã giao.
 */
const PHAI_THU_HIEN_HANH = defineSql("billing", "phai_thu_hien_hanh", `SELECT phai_thu FROM v_bil_phai_thu_hien_hanh WHERE order_id = ?1`);
export async function phaiThuHienHanh(db: D1Database, orderId: string): Promise<number | null> {
  const r = await db.prepare(PHAI_THU_HIEN_HANH).bind(orderId).first<{ phai_thu: number }>();
  return r ? r.phai_thu : null;
}
const GIAM_TRU_NHIEU_DON = defineSql("billing", "giam_tru_nhieu_don", `SELECT order_id, giam_tru FROM v_bil_phai_thu_hien_hanh WHERE giam_tru <> 0 AND order_id IN (SELECT value FROM json_each(?1))`);
/** Giảm trừ đã phân định của nhiều đơn (chỉ đơn có giảm trừ) — để danh sách không báo "còn lại" sai. */
export async function giamTruNhieuDon(db: D1Database, orderIds: readonly string[]): Promise<Map<string, number>> {
  if (orderIds.length === 0) return new Map();
  const rows = (await db.prepare(GIAM_TRU_NHIEU_DON).bind(JSON.stringify(orderIds)).all<{ order_id: string; giam_tru: number }>()).results;
  return new Map(rows.map((r) => [r.order_id, r.giam_tru]));
}

const COLS = `id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
  reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id`;

/**
 * Khoản thu MỚI của lô Thay (luôn "khoản thu của khách"), mang dấu nối ?12. «Thu cho» = ?13 (nhà cung cấp đã kiểm ở máy chủ — sổ đại lý đợt 2 Task 5), vắng ⇒ công ty
 * chủ đọc trong câu. Không lính gác mốc: trigger 0083 chặn nếu thiếu dấu sau Đã giao.
 */
const RECEIPT_THAY_MOI = defineSql(
  "billing",
  "thay_receipt_moi",
  `INSERT INTO bil_payment_receipt (${COLS})
   SELECT ?1, ?2, 'CUSTOMER_PAYMENT', ?3, ?4, ?5, ?6, COALESCE(?13, (SELECT party_id FROM v_pty_owner_company LIMIT 1)), ?7, ?8, NULL, ?9, ?10, ?11, ?10, ?11, ?12`,
);
export const receiptThayMoiStatement = (
  db: D1Database,
  r: {
    id: string; orderId: string; amount: number; collectorPartyId: string; collectorRole: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER"; method: string; stage: "PREPAID" | "AT_DELIVERY";
    occurredDate: string; note: string | null; at: string; by: string; replacementId: string; collectedForPartyId: string | null;
  },
) => db.prepare(RECEIPT_THAY_MOI).bind(r.id, r.orderId, r.amount, r.collectorPartyId, r.collectorRole, r.method, r.stage, r.occurredDate, r.note, r.at, r.by, r.replacementId, r.collectedForPartyId);

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
