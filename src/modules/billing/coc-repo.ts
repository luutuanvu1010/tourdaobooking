// SQL CỌC ĐƠN HUỶ của module billing (ADR-0089; migration 0079). Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, ?N), chịu bài EXPLAIN — chỉ chạm bảng bil_
// và view công bố của module được phép phụ thuộc (`v_ord_order_state`, `v_ord_cancel_state`, `v_ord_order_label` của orders; `v_stf_staff_label` của staff).
// CHỈ-THÊM. Mỗi câu ghi có LÍNH GÁC trong câu để câu sau trong lô chỉ áp khi câu trước đã áp; điều kiện TIỀN nằm ở trigger 0079 (RAISE ⇒ cả lô huỷ).
// Import kèm đuôi .ts.
import { defineSql } from "../../shared/sql-registry.ts";

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const CANCEL_STATE = defineSql(
  "billing",
  "coc_cancel_state",
  `SELECT order_id, group_code, reason_code, cancelled_date, legacy, depart_last_date, refund_deadline FROM v_ord_cancel_state WHERE order_id = ?1`,
);
export interface CancelStateRow {
  order_id: string;
  group_code: string;
  reason_code: string;
  cancelled_date: string;
  legacy: number;
  depart_last_date: string | null;
  refund_deadline: string;
}
export const cancelStateOf = (db: D1Database, orderId: string): Promise<CancelStateRow | null> => db.prepare(CANCEL_STATE).bind(orderId).first<CancelStateRow>();

const APPROVALS_OF_ORDER = defineSql(
  "billing",
  "coc_approvals_of_order",
  `SELECT a.id, a.order_id, a.kind_code, a.amount, a.target_order_id, a.reason, a.approved_date, a.voids_id, a.created_at, a.created_by,
     sl.label AS created_by_label, ol.order_code AS target_order_code
   FROM bil_deposit_approval a LEFT JOIN v_stf_staff_label sl ON sl.id = a.created_by LEFT JOIN v_ord_order_label ol ON ol.id = a.target_order_id
   WHERE a.order_id = ?1 ORDER BY a.rowid`,
);
export interface ApprovalDbRow {
  id: string;
  order_id: string;
  kind_code: "REFUND" | "TRANSFER";
  amount: number;
  target_order_id: string | null;
  reason: string;
  approved_date: string;
  voids_id: string | null;
  created_at: string;
  created_by: string | null;
  created_by_label: string | null;
  target_order_code: string | null;
}
export const approvalsOfOrder = async (db: D1Database, orderId: string): Promise<ApprovalDbRow[]> => (await db.prepare(APPROVALS_OF_ORDER).bind(orderId).all<ApprovalDbRow>()).results;

const OUTSIDE_OF_ORDER = defineSql(
  "billing",
  "coc_outside_of_order",
  `SELECT g.id, g.order_id, g.kind_code, g.amount, g.reason, g.target_id, g.occurred_date, g.created_at, g.created_by, sl.label AS created_by_label
   FROM bil_outside_refund g LEFT JOIN v_stf_staff_label sl ON sl.id = g.created_by WHERE g.order_id = ?1 ORDER BY g.rowid`,
);
export interface OutsideDbRow {
  id: string;
  order_id: string;
  kind_code: "RECORD" | "CONFIRM" | "REJECT";
  amount: number | null;
  reason: string | null;
  target_id: string | null;
  occurred_date: string;
  created_at: string;
  created_by: string | null;
  created_by_label: string | null;
}
export const outsideOfOrder = async (db: D1Database, orderId: string): Promise<OutsideDbRow[]> => (await db.prepare(OUTSIDE_OF_ORDER).bind(orderId).all<OutsideDbRow>()).results;

/** Đơn theo MÃ (lệnh chuyển gửi mã đơn nhận) — id + trạng thái qua view công bố. */
const ORDER_BY_CODE = defineSql(
  "billing",
  "coc_order_by_code",
  `SELECT l.id, l.order_code, s.status, s.delivered_at FROM v_ord_order_label l JOIN v_ord_order_state s ON s.id = l.id WHERE l.order_code = ?1`,
);
export const orderByCode = (db: D1Database, code: string) =>
  db.prepare(ORDER_BY_CODE).bind(code).first<{ id: string; order_code: string; status: "draft" | "confirmed" | "cancelled"; delivered_at: string | null }>();

/**
 * Danh sách cho Kế toán (đ9c, đ11 — màn sổ chờ bản vẽ; route + ô đếm có trước): mọi ĐƠN HUỶ có dòng sổ, kèm tiền cọc (view công bố của chính billing) và
 * nhóm lý do + hạn (view công bố của orders). Chỉ khoá + số + nhãn — không tên / SĐT khách.
 */
const COC_CANCELLED = defineSql(
  "billing",
  "coc_cancelled_orders",
  `SELECT v.order_id, ol.order_code, c.group_code, c.legacy, c.cancelled_date, c.refund_deadline, v.da_tra, v.dang_doi_chieu, v.da_duyet, v.da_chi, v.da_chuyen,
     v.hoan_ngoai, v.con_giu, v.cho_chi
   FROM v_bil_coc_don v JOIN v_ord_cancel_state c ON c.order_id = v.order_id LEFT JOIN v_ord_order_label ol ON ol.id = v.order_id
   ORDER BY c.cancelled_date DESC, v.order_id`,
);
export interface CocDonRow {
  order_id: string;
  order_code: string | null;
  group_code: string;
  legacy: number;
  cancelled_date: string;
  refund_deadline: string;
  da_tra: number;
  dang_doi_chieu: number;
  da_duyet: number;
  da_chi: number;
  da_chuyen: number;
  hoan_ngoai: number;
  con_giu: number;
  cho_chi: number;
}
export const cocCancelledOrders = async (db: D1Database): Promise<CocDonRow[]> => (await db.prepare(COC_CANCELLED).all<CocDonRow>()).results;

/** Khoản duyệt gốc còn phần chưa chi (mọi đơn) — danh sách "Cần chi hoàn" và nhắc quá 7 ngày. */
const APPROVALS_OPEN = defineSql(
  "billing",
  "coc_approvals_open",
  `SELECT a.id, a.order_id, ol.order_code, a.kind_code, a.amount, a.approved_date, ol2.order_code AS target_order_code,
     a.amount - COALESCE((SELECT SUM(v.amount) FROM bil_deposit_approval v WHERE v.voids_id = a.id), 0)
       - COALESCE((SELECT SUM(r.amount) FROM bil_payment_receipt r WHERE r.approval_id = a.id AND r.kind_code = 'CUSTOMER_REFUND' AND r.reverses_id IS NULL
                   AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0) AS con_lai
   FROM bil_deposit_approval a LEFT JOIN v_ord_order_label ol ON ol.id = a.order_id LEFT JOIN v_ord_order_label ol2 ON ol2.id = a.target_order_id
   WHERE a.voids_id IS NULL ORDER BY a.approved_date, a.rowid`,
);
export interface ApprovalOpenRow {
  id: string;
  order_id: string;
  order_code: string | null;
  kind_code: "REFUND" | "TRANSFER";
  amount: number;
  approved_date: string;
  target_order_code: string | null;
  con_lai: number;
}
export const approvalsOpen = async (db: D1Database): Promise<ApprovalOpenRow[]> => (await db.prepare(APPROVALS_OPEN).all<ApprovalOpenRow>()).results.filter((r) => r.con_lai > 0);

/** Số dư người giữ tiền trên các ĐƠN HUỶ (đ11): cặp (bên, đơn) còn nợ công ty > 0. */
const CANCELLED_HOLDERS = defineSql(
  "billing",
  "coc_cancelled_holders",
  `SELECT b.order_id, b.party_id, b.balance FROM v_bil_party_balance b JOIN v_ord_cancel_state c ON c.order_id = b.order_id
   WHERE b.counterparty_id IN (SELECT party_id FROM v_pty_owner_company) AND b.balance > 0`,
);
export const cancelledHolders = async (db: D1Database): Promise<{ order_id: string; party_id: string; balance: number }[]> =>
  (await db.prepare(CANCELLED_HOLDERS).all<{ order_id: string; party_id: string; balance: number }>()).results;

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Ghi (chỉ thêm)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const APPROVAL_COLS = "id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by";
/** Khoản duyệt gốc — trigger 0079 kiểm đơn huỷ, nhóm, hạn, trần, đơn nhận. */
const APPROVAL_INSERT = defineSql(
  "billing",
  "coc_approval_insert",
  `INSERT INTO bil_deposit_approval (${APPROVAL_COLS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, ?9, ?8, ?9)`,
);
export const approvalInsertStatement = (
  db: D1Database,
  a: { id: string; orderId: string; kind: "REFUND" | "TRANSFER"; amount: number; targetOrderId: string | null; reason: string; approvedDate: string; at: string; by: string },
) => db.prepare(APPROVAL_INSERT).bind(a.id, a.orderId, a.kind, a.amount, a.targetOrderId, a.reason, a.approvedDate, a.at, a.by);

/** Huỷ duyệt — chép đơn + loại của khoản gốc (lính gác: khoản gốc thuộc đơn ?3); trigger kiểm phần chưa chi. */
const APPROVAL_VOID = defineSql(
  "billing",
  "coc_approval_void",
  `INSERT INTO bil_deposit_approval (${APPROVAL_COLS})
   SELECT ?1, g.order_id, g.kind_code, ?4, NULL, ?5, ?6, g.id, ?7, ?8, ?7, ?8 FROM bil_deposit_approval g WHERE g.id = ?2 AND g.order_id = ?3 AND g.voids_id IS NULL`,
);
export const approvalVoidStatement = (db: D1Database, v: { id: string; voidsId: string; orderId: string; amount: number; reason: string; date: string; at: string; by: string }) =>
  db.prepare(APPROVAL_VOID).bind(v.id, v.voidsId, v.orderId, v.amount, v.reason, v.date, v.at, v.by);

const RECEIPT_COC_COLS = `id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
  reverses_id, note, created_at, created_by, updated_at, updated_by, approval_id, transfer_of_id`;
/** Lần CHI theo khoản duyệt (trả lại khách gắn approval_id) — chi hoàn và nửa "chi" của lệnh chuyển. Trigger kiểm khoản, phần còn lại, tách người. */
const RECEIPT_COC_PAYOUT = defineSql(
  "billing",
  "coc_receipt_payout",
  `INSERT INTO bil_payment_receipt (${RECEIPT_COC_COLS})
   VALUES (?1, ?2, 'CUSTOMER_REFUND', ?3, ?4, ?5, ?6, (SELECT party_id FROM v_pty_owner_company LIMIT 1), 'PREPAID', ?7, NULL, ?8, ?9, ?10, ?9, ?10, ?11, NULL)`,
);
export const receiptPayoutStatement = (
  db: D1Database,
  r: { id: string; orderId: string; amount: number; collectorPartyId: string; collectorRole: "COMPANY" | "STAFF"; method: string; occurredDate: string; note: string | null; at: string; by: string; approvalId: string },
) => db.prepare(RECEIPT_COC_PAYOUT).bind(r.id, r.orderId, r.amount, r.collectorPartyId, r.collectorRole, r.method, r.occurredDate, r.note, r.at, r.by, r.approvalId);

/**
 * Nửa "THU" của lệnh chuyển ở đơn nhận — lính gác: nửa chi ?11 đã chèn trong lô. Đơn nhận còn hiệu lực, chưa Đã giao do trigger
 * `coc_transfer_target_invalid` ép bằng RAISE (huỷ cả lô hai đơn — kiểm độc lập vòng 2 CAO-1: điều kiện im lặng cũ để nửa chi ghi một mình). Trigger
 * `coc_transfer_mismatch` kiểm khớp đơn nhận, số, người giữ.
 */
const RECEIPT_COC_TRANSFER_IN = defineSql(
  "billing",
  "coc_receipt_transfer_in",
  `INSERT INTO bil_payment_receipt (${RECEIPT_COC_COLS})
   SELECT ?1, ?2, 'CUSTOMER_PAYMENT', ?3, ?4, ?5, ?6, (SELECT party_id FROM v_pty_owner_company LIMIT 1), 'PREPAID', ?7, NULL, ?8, ?9, ?10, ?9, ?10, NULL, ?11
   WHERE EXISTS (SELECT 1 FROM bil_payment_receipt o WHERE o.id = ?11)`,
);
export const receiptTransferInStatement = (
  db: D1Database,
  r: { id: string; orderId: string; amount: number; collectorPartyId: string; collectorRole: "COMPANY" | "STAFF"; method: string; occurredDate: string; note: string | null; at: string; by: string; transferOfId: string },
) => db.prepare(RECEIPT_COC_TRANSFER_IN).bind(r.id, r.orderId, r.amount, r.collectorPartyId, r.collectorRole, r.method, r.occurredDate, r.note, r.at, r.by, r.transferOfId);

const OUTSIDE_COLS = "id, order_id, kind_code, amount, reason, target_id, occurred_date, created_at, created_by, updated_at, updated_by";
/** Ghi "đã hoàn ngoài hệ thống" — trigger kiểm đơn cũ, một dòng hiệu lực, ≤ còn giữ. */
const OUTSIDE_RECORD = defineSql("billing", "coc_outside_record", `INSERT INTO bil_outside_refund (${OUTSIDE_COLS}) VALUES (?1, ?2, 'RECORD', ?3, ?4, NULL, ?5, ?6, ?7, ?6, ?7)`);
export const outsideRecordStatement = (db: D1Database, o: { id: string; orderId: string; amount: number; reason: string; occurredDate: string; at: string; by: string }) =>
  db.prepare(OUTSIDE_RECORD).bind(o.id, o.orderId, o.amount, o.reason, o.occurredDate, o.at, o.by);
/** Xác nhận / từ chối — lính gác: dòng ghi ?3 thuộc đơn ?2; trigger kiểm tách người + số. */
const OUTSIDE_DECIDE = defineSql(
  "billing",
  "coc_outside_decide",
  `INSERT INTO bil_outside_refund (${OUTSIDE_COLS})
   SELECT ?1, g.order_id, ?4, NULL, ?5, g.id, ?6, ?7, ?8, ?7, ?8 FROM bil_outside_refund g WHERE g.id = ?3 AND g.order_id = ?2 AND g.kind_code = 'RECORD'`,
);
export const outsideDecideStatement = (db: D1Database, o: { id: string; orderId: string; recordId: string; kind: "CONFIRM" | "REJECT"; reason: string | null; occurredDate: string; at: string; by: string }) =>
  db.prepare(OUTSIDE_DECIDE).bind(o.id, o.orderId, o.recordId, o.kind, o.reason, o.occurredDate, o.at, o.by);

/** Nửa thu của lệnh chuyển trỏ tới khoản thu `?1` (nửa chi) — rỗng nếu `?1` không phải nửa chi đã ghép đôi (kiểm độc lập vòng 2 CAO-2). */
const TRANSFER_IN_OF = defineSql("billing", "coc_transfer_in_of", `SELECT id FROM bil_payment_receipt WHERE transfer_of_id = ?1`);
export async function transferInOf(db: D1Database, receiptId: string): Promise<string[]> {
  return (await db.prepare(TRANSFER_IN_OF).bind(receiptId).all<{ id: string }>()).results.map((r) => r.id);
}
