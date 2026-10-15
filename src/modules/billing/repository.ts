// SQL của module billing (bảng `bil_*`, migration 0045 — sổ tiền lượt 1). Module NGHIÊM từ ngày đầu (ADR-0024 điều 1; `STRICT` ở src/architecture.test.ts):
// mọi câu qua `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN — chỉ chạm bảng `bil_` và view công bố của module được phép phụ thuộc
// (`v_ord_order_state`, `v_ord_order_owner`, `v_ord_order_label` của orders; `v_pty_owner_company`, `v_pty_party_label` của parties; `v_stf_staff_label` của
// staff). Ghi bảng của module khác (orders, dispatch) thì nhận câu CHƯA CHẠY từ index.ts của module chủ rồi gộp vào CÙNG `db.batch()` (ADR-0002 quy tắc 3).
// Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
//
// CHỈ-THÊM: không câu UPDATE/DELETE nào trên bảng bil_ (trigger cấm). Mỗi câu ghi có LÍNH GÁC trong câu (EXISTS …) để câu sau chỉ áp khi câu trước đã áp —
// bên thua đua không để lại dòng nào (kế hoạch §3.3).
import { defineSql } from "../../shared/sql-registry.ts";

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const RECEIPT_COLS = `r.id, r.order_id, r.kind_code, r.amount, r.collector_party_id, r.collector_role_code, r.method_code, r.stage_code, r.occurred_date,
  r.reverses_id, r.note, r.created_at, r.created_by, r.approval_id, r.transfer_of_id, pl.display_name AS collector_label, sl.label AS created_by_label`;
const RECEIPT_JOIN = `FROM bil_payment_receipt r LEFT JOIN v_pty_party_label pl ON pl.id = r.collector_party_id LEFT JOIN v_stf_staff_label sl ON sl.id = r.created_by`;

const RECEIPTS_OF_ORDER = defineSql("billing", "receipts_of_order", `SELECT ${RECEIPT_COLS} ${RECEIPT_JOIN} WHERE r.order_id = ?1 ORDER BY r.rowid`);
const RECEIPTS_OF_ORDERS = defineSql(
  "billing",
  "receipts_of_orders",
  `SELECT r.id, r.order_id, r.kind_code, r.amount, r.collector_party_id, r.collector_role_code, r.reverses_id, r.approval_id FROM bil_payment_receipt r
   WHERE r.order_id IN (SELECT value FROM json_each(?1)) ORDER BY r.rowid`,
);
const RECEIPT_BY_ID = defineSql("billing", "receipt_by_id", `SELECT ${RECEIPT_COLS} ${RECEIPT_JOIN} WHERE r.id = ?1`);

export interface ReceiptDbRow {
  id: string;
  order_id: string;
  kind_code: "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND";
  amount: number;
  collector_party_id: string | null;
  collector_role_code: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER" | "UNKNOWN";
  method_code: string;
  stage_code: string;
  occurred_date: string;
  reverses_id: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
  /** Khoản duyệt hoàn cọc (0079) — lần chi hoàn / nửa chi của lệnh chuyển. */
  approval_id: string | null;
  /** Nửa thu ở đơn nhận trỏ nửa chi ở đơn huỷ (0079). */
  transfer_of_id: string | null;
  collector_label: string | null;
  created_by_label: string | null;
}
export const receiptsOfOrder = async (db: D1Database, orderId: string): Promise<ReceiptDbRow[]> =>
  (await db.prepare(RECEIPTS_OF_ORDER).bind(orderId).all<ReceiptDbRow>()).results;
export async function receiptsOfOrders(db: D1Database, orderIds: readonly string[]): Promise<Pick<ReceiptDbRow, "id" | "order_id" | "kind_code" | "amount" | "collector_party_id" | "collector_role_code" | "reverses_id" | "approval_id">[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(RECEIPTS_OF_ORDERS).bind(JSON.stringify(orderIds)).all<ReceiptDbRow>()).results;
}
export const receiptById = (db: D1Database, id: string): Promise<ReceiptDbRow | null> => db.prepare(RECEIPT_BY_ID).bind(id).first<ReceiptDbRow>();

const LINE_COLS = `l.id, l.posting_id, l.debtor_party_id, l.creditor_party_id, l.amount, l.kind_code, l.order_id, l.receipt_id, l.reverses_line_id, l.created_at,
  p.kind_code AS posting_kind, p.occurred_date, p.reason, ol.order_code`;
const LINE_JOIN = `FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id LEFT JOIN v_ord_order_label ol ON ol.id = l.order_id`;
const LINES_OF_ORDER = defineSql("billing", "lines_of_order", `SELECT ${LINE_COLS} ${LINE_JOIN} WHERE l.order_id = ?1 ORDER BY l.rowid`);
const LINES_OF_PARTY = defineSql("billing", "lines_of_party", `SELECT ${LINE_COLS} ${LINE_JOIN} WHERE l.debtor_party_id = ?1 OR l.creditor_party_id = ?1 ORDER BY l.rowid`);
const LINES_OF_RECEIPT = defineSql("billing", "lines_of_receipt", `SELECT ${LINE_COLS} ${LINE_JOIN} WHERE l.receipt_id = ?1 ORDER BY l.rowid`);
const LINE_BY_ID = defineSql("billing", "line_by_id", `SELECT ${LINE_COLS} ${LINE_JOIN} WHERE l.id = ?1`);
const LINE_REVERSED = defineSql("billing", "line_reversed", `SELECT id FROM bil_debt_line WHERE reverses_line_id = ?1`);

export interface LineDbRow {
  id: string;
  posting_id: string;
  debtor_party_id: string;
  creditor_party_id: string;
  amount: number;
  kind_code: "HELD" | "SETTLEMENT" | "REFUND";
  order_id: string | null;
  receipt_id: string | null;
  reverses_line_id: string | null;
  created_at: string;
  posting_kind: string;
  occurred_date: string;
  reason: string | null;
  order_code: string | null;
}
export const linesOfOrder = async (db: D1Database, orderId: string): Promise<LineDbRow[]> => (await db.prepare(LINES_OF_ORDER).bind(orderId).all<LineDbRow>()).results;
export const linesOfParty = async (db: D1Database, partyId: string): Promise<LineDbRow[]> => (await db.prepare(LINES_OF_PARTY).bind(partyId).all<LineDbRow>()).results;
export const linesOfReceipt = async (db: D1Database, receiptId: string): Promise<LineDbRow[]> => (await db.prepare(LINES_OF_RECEIPT).bind(receiptId).all<LineDbRow>()).results;
export const lineById = (db: D1Database, id: string): Promise<LineDbRow | null> => db.prepare(LINE_BY_ID).bind(id).first<LineDbRow>();
export const lineReversed = async (db: D1Database, id: string): Promise<boolean> => (await db.prepare(LINE_REVERSED).bind(id).first()) !== null;

// ADR-0068 G10 (gộp hồ sơ): số dòng nợ CÒN HIỆU LỰC (không phải dòng đảo, chưa bị đảo) có hồ sơ ?1 ở một chân. Chỉ đếm — không số tiền.
const SO_DONG_NO_CUA_NGUOI = defineSql(
  "billing",
  "so_dong_no_cua_nguoi",
  `SELECT count(*) AS n FROM bil_debt_line l
   WHERE (l.debtor_party_id = ?1 OR l.creditor_party_id = ?1) AND l.reverses_line_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM bil_debt_line x WHERE x.reverses_line_id = l.id)`,
);
export async function soDongNoCuaNguoiRow(db: D1Database, partyId: string): Promise<number> {
  return (await db.prepare(SO_DONG_NO_CUA_NGUOI).bind(partyId).first<{ n: number }>())?.n ?? 0;
}

/** Số dư mọi bên với công ty chủ (dương = bên đó đang giữ tiền của công ty) — màn sổ của Kế toán. */
const BALANCES_WITH_OWNER = defineSql(
  "billing",
  "balances_with_owner",
  `SELECT b.party_id, pl.display_name AS label, SUM(b.balance) AS balance FROM v_bil_party_balance b LEFT JOIN v_pty_party_label pl ON pl.id = b.party_id
   WHERE b.counterparty_id = (SELECT party_id FROM v_pty_owner_company LIMIT 1) GROUP BY b.party_id, pl.display_name HAVING SUM(b.balance) <> 0 ORDER BY pl.sort_key`,
);
export const balancesWithOwner = async (db: D1Database): Promise<{ party_id: string; label: string | null; balance: number }[]> =>
  (await db.prepare(BALANCES_WITH_OWNER).all<{ party_id: string; label: string | null; balance: number }>()).results;

/**
 * Số dư mọi bên với công ty chủ TÍNH ĐẾN ngày ?1 (khoá tháng — ADR-0080 D1: bảng kiểm trước khi khoá): cùng phép cộng hai chiều như view `v_bil_party_balance`
 * (dòng nợ + dòng đảo chiều) nhưng chỉ lấy dòng nợ có NGÀY PHÁT SINH của phiếu nguồn `<= ?1`. Cùng quy ước dấu và bộ lọc công ty chủ như `BALANCES_WITH_OWNER`.
 * Không có dòng nào sau ngày ?1 ⇒ trùng `balancesWithOwner` (bài "ca 6b" ở `khoa-thang.test.ts`: lần thu ba người giữ, quyết toán, đảo lần thu, hoàn khách — so từng người, không số cứng).
 */
const BALANCES_AT = defineSql(
  "billing",
  "balances_at",
  `SELECT b.party_id, pl.display_name AS label, SUM(b.so) AS balance FROM (
     SELECT l.debtor_party_id AS party_id, l.creditor_party_id AS counterparty_id, l.amount AS so FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE p.occurred_date <= ?1
     UNION ALL
     SELECT l.creditor_party_id, l.debtor_party_id, -l.amount FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE p.occurred_date <= ?1
   ) b LEFT JOIN v_pty_party_label pl ON pl.id = b.party_id
   WHERE b.counterparty_id = (SELECT party_id FROM v_pty_owner_company LIMIT 1) GROUP BY b.party_id, pl.display_name HAVING SUM(b.so) <> 0 ORDER BY pl.sort_key`,
);
export const balancesAt = async (db: D1Database, ngayCuoi: string): Promise<{ party_id: string; label: string | null; balance: number }[]> =>
  (await db.prepare(BALANCES_AT).bind(ngayCuoi).all<{ party_id: string; label: string | null; balance: number }>()).results;

/** Tháng ("YYYY-MM") của dòng sổ tiền sớm nhất (lần thu, phiếu, dòng hoàn ngoài) — lần khoá tháng ĐẦU TIÊN không được bắt đầu SAU tháng này (ADR-0080 D1). */
const THANG_SO_SOM_NHAT = defineSql(
  "billing",
  "earliest_ledger_month",
  `SELECT substr(min(d), 1, 7) AS thang FROM (SELECT min(occurred_date) AS d FROM bil_payment_receipt UNION ALL SELECT min(occurred_date) FROM bil_posting
   UNION ALL SELECT min(occurred_date) FROM bil_outside_refund)`,
);
export const earliestLedgerMonth = async (db: D1Database): Promise<string | null> => (await db.prepare(THANG_SO_SOM_NHAT).first<{ thang: string | null }>())?.thang ?? null;

/**
 * Khoản "Công ty thu" do người không phải Kế toán khai, CHƯA được Kế toán xác nhận. Hai đường (ADR-0120): khoản CŨ — dòng giữ hộ trên người khai chưa bị đảo (H3);
 * khoản MỚI — dấu DECLARED (`bil_receipt_recon`, 0099) chưa có CONFIRMED, lần thu còn hiệu lực. `ngay_khai` = ngày dân sự khai (gốc tính "quá 3 ngày").
 */
const PENDING_COMPANY = defineSql(
  "billing",
  "pending_company",
  `SELECT t.receipt_id, t.order_id, t.order_code, t.amount, t.occurred_date, t.nguoi_khai, t.ngay_khai FROM (
     SELECT r.rowid AS ord, r.id AS receipt_id, r.order_id, ol.order_code, r.amount, r.occurred_date, pl.display_name AS nguoi_khai, r.occurred_date AS ngay_khai
     FROM bil_payment_receipt r JOIN bil_debt_line l ON l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
     LEFT JOIN v_ord_order_label ol ON ol.id = r.order_id LEFT JOIN v_pty_party_label pl ON pl.id = l.debtor_party_id
     WHERE r.collector_role_code = 'COMPANY' AND r.reverses_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM bil_debt_line x WHERE x.reverses_line_id = l.id)
       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt y WHERE y.reverses_id = r.id)
     UNION ALL
     SELECT r.rowid, r.id, r.order_id, ol.order_code, r.amount, r.occurred_date, sl.label, d.occurred_date
     FROM bil_payment_receipt r JOIN bil_receipt_recon d ON d.receipt_id = r.id AND d.kind_code = 'DECLARED'
     LEFT JOIN v_ord_order_label ol ON ol.id = r.order_id LEFT JOIN v_stf_staff_label sl ON sl.id = r.created_by
     WHERE r.reverses_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt y WHERE y.reverses_id = r.id)
       AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon c WHERE c.receipt_id = r.id AND c.kind_code = 'CONFIRMED')
   ) t ORDER BY t.ord`,
);
export const pendingCompany = async (db: D1Database) =>
  (await db.prepare(PENDING_COMPANY).all<{ receipt_id: string; order_id: string; order_code: string | null; amount: number; occurred_date: string; nguoi_khai: string | null; ngay_khai: string }>()).results;

// ---- Dấu đối chiếu của khoản "Công ty thu" MỚI (ADR-0120 Điều 1; bảng `bil_receipt_recon`, 0099) — chỉ-thêm ----
const RECON_OF_ORDER = defineSql(
  "billing",
  "recon_of_order",
  `SELECT d.receipt_id, d.kind_code, d.occurred_date FROM bil_receipt_recon d JOIN bil_payment_receipt r ON r.id = d.receipt_id WHERE r.order_id = ?1 ORDER BY d.rowid`,
);
export interface ReconDbRow {
  receipt_id: string;
  kind_code: "DECLARED" | "CONFIRMED";
  occurred_date: string;
}
export const reconOfOrder = async (db: D1Database, orderId: string): Promise<ReconDbRow[]> => (await db.prepare(RECON_OF_ORDER).bind(orderId).all<ReconDbRow>()).results;
const RECON_OF_RECEIPT = defineSql("billing", "recon_of_receipt", `SELECT receipt_id, kind_code, occurred_date FROM bil_receipt_recon WHERE receipt_id = ?1 ORDER BY rowid`);
export const reconOfReceipt = async (db: D1Database, receiptId: string): Promise<ReconDbRow[]> => (await db.prepare(RECON_OF_RECEIPT).bind(receiptId).all<ReconDbRow>()).results;

/** Dấu DECLARED — chỉ áp khi lần thu ?2 đã được chèn trong lô (lính gác); trigger `bil_receipt_recon_declared` canh loại lần thu. */
const RECON_INSERT = defineSql(
  "billing",
  "recon_insert",
  `INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6 WHERE EXISTS (SELECT 1 FROM bil_payment_receipt WHERE id = ?2)`,
);
export const reconInsertStatement = (db: D1Database, v: { id: string; receiptId: string; kind: "DECLARED" | "CONFIRMED"; occurredDate: string; at: string; by: string }) =>
  db.prepare(RECON_INSERT).bind(v.id, v.receiptId, v.kind, v.occurredDate, v.at, v.by);

/** Lần thu người thu CHƯA RÕ còn hiệu lực (cọc cũ chuyển sang — việc của Kế toán, ADR-0026 đ9). */
const UNKNOWN_RECEIPTS = defineSql(
  "billing",
  "unknown_receipts",
  `SELECT r.id AS receipt_id, r.order_id, ol.order_code, r.amount, r.occurred_date FROM bil_payment_receipt r LEFT JOIN v_ord_order_label ol ON ol.id = r.order_id
   WHERE r.collector_role_code = 'UNKNOWN' AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt y WHERE y.reverses_id = r.id)
   ORDER BY r.rowid`,
);
export const unknownReceipts = async (db: D1Database) =>
  (await db.prepare(UNKNOWN_RECEIPTS).all<{ receipt_id: string; order_id: string; order_code: string | null; amount: number; occurred_date: string }>()).results;

const OWNER_COMPANY = defineSql("billing", "owner_company", `SELECT party_id FROM v_pty_owner_company LIMIT 1`);
export async function ownerCompanyId(db: D1Database): Promise<string | null> {
  return (await db.prepare(OWNER_COMPANY).first<{ party_id: string }>())?.party_id ?? null;
}

const PARTY_LABELS = defineSql("billing", "party_labels", `SELECT id, display_name, active FROM v_pty_party_label WHERE id IN (SELECT value FROM json_each(?1))`);
export async function partyLabels(db: D1Database, ids: readonly string[]): Promise<Map<string, { label: string; active: boolean }>> {
  if (ids.length === 0) return new Map();
  const rows = (await db.prepare(PARTY_LABELS).bind(JSON.stringify(ids)).all<{ id: string; display_name: string; active: number }>()).results;
  return new Map(rows.map((r) => [r.id, { label: r.display_name, active: r.active === 1 }]));
}

const ORDER_OWNERS = defineSql("billing", "order_owners", `SELECT id, staff_id FROM v_ord_order_owner WHERE id IN (SELECT value FROM json_each(?1))`);
export async function orderOwners(db: D1Database, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  return new Map((await db.prepare(ORDER_OWNERS).bind(JSON.stringify(ids)).all<{ id: string; staff_id: string }>()).results.map((r) => [r.id, r.staff_id]));
}

const ORDER_STATE = defineSql("billing", "order_state", `SELECT id, status, delivered_at, completed_at FROM v_ord_order_state WHERE id = ?1`);
export const orderState = (db: D1Database, id: string) =>
  db.prepare(ORDER_STATE).bind(id).first<{ id: string; status: "draft" | "confirmed" | "cancelled"; delivered_at: string | null; completed_at: string | null }>();

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Ghi (chỉ thêm). `collected_for_party_id` LUÔN = công ty chủ đọc TRONG câu (NT-S9: route không nhận giá trị khác từ trình duyệt).
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const RECEIPT_INSERT_COLS = `id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
  reverses_id, note, created_at, created_by, updated_at, updated_by`;
const RECEIPT_VALUES = `?1, ?2, ?3, ?4, ?5, ?6, ?7, (SELECT party_id FROM v_pty_owner_company LIMIT 1), ?8, ?9, NULL, ?10, ?11, ?12, ?11, ?12`;
/** Lần thu TRƯỚC "Đã giao" (ADR-0026 đ10 — không thêm điều kiện trạng thái huỷ: đơn huỷ còn tiền phải có chỗ ghi). */
const RECEIPT_BEFORE_DELIVERED = defineSql(
  "billing",
  "receipt_before_delivered",
  `INSERT INTO bil_payment_receipt (${RECEIPT_INSERT_COLS}) SELECT ${RECEIPT_VALUES}
   WHERE EXISTS (SELECT 1 FROM v_ord_order_state WHERE id = ?2 AND delivered_at IS NULL)`,
);
/** Lần thu nhập ở bước "Đã giao" — chỉ áp khi câu `orders` CỦA CHÍNH LÔ NÀY đã đặt mốc ?13. */
const RECEIPT_AT_DELIVERY = defineSql(
  "billing",
  "receipt_at_delivery",
  `INSERT INTO bil_payment_receipt (${RECEIPT_INSERT_COLS}) SELECT ${RECEIPT_VALUES}
   WHERE EXISTS (SELECT 1 FROM v_ord_order_state WHERE id = ?2 AND delivered_at = ?13)`,
);
/** Trả lại khách (Kế toán ghi hoàn — ADR-0026 đ5, M2): không điều kiện mốc. */
const RECEIPT_REFUND = defineSql("billing", "receipt_refund", `INSERT INTO bil_payment_receipt (${RECEIPT_INSERT_COLS}) SELECT ${RECEIPT_VALUES}`);
/** Dòng ĐẢO của một lần thu (Kế toán — ADR-0026 đ8): chép gốc, trỏ gốc; trigger `bil_payment_receipt_reversal_match` + UNIQUE canh. */
const RECEIPT_REVERSAL = defineSql(
  "billing",
  "receipt_reversal",
  `INSERT INTO bil_payment_receipt (${RECEIPT_INSERT_COLS})
   SELECT ?1, g.order_id, g.kind_code, g.amount, g.collector_party_id, g.collector_role_code, g.method_code, g.collected_for_party_id, g.stage_code, ?2, g.id, ?3, ?4, ?5, ?4, ?5
   FROM bil_payment_receipt g WHERE g.id = ?6`,
);

export interface NewReceipt {
  id: string;
  orderId: string;
  kind: "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND";
  amount: number;
  collectorPartyId: string | null;
  collectorRole: "COMPANY" | "STAFF";
  method: string;
  stage: "PREPAID" | "AT_DELIVERY";
  occurredDate: string;
  note: string | null;
  at: string;
  by: string;
}
const bindReceipt = (db: D1Database, sql: string, r: NewReceipt, ...extra: string[]) =>
  db.prepare(sql).bind(r.id, r.orderId, r.kind, r.amount, r.collectorPartyId, r.collectorRole, r.method, r.stage, r.occurredDate, r.note, r.at, r.by, ...extra);
export const receiptBeforeDeliveredStatement = (db: D1Database, r: NewReceipt) => bindReceipt(db, RECEIPT_BEFORE_DELIVERED, r);
export const receiptAtDeliveryStatement = (db: D1Database, r: NewReceipt, deliveredAt: string) => bindReceipt(db, RECEIPT_AT_DELIVERY, r, deliveredAt);
export const receiptRefundStatement = (db: D1Database, r: NewReceipt) => bindReceipt(db, RECEIPT_REFUND, r);
export const receiptReversalStatement = (db: D1Database, i: { id: string; occurredDate: string; note: string | null; at: string; by: string; reversesId: string }) =>
  db.prepare(RECEIPT_REVERSAL).bind(i.id, i.occurredDate, i.note, i.at, i.by, i.reversesId);

const POSTING_COLS = "id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by";
const POSTING_VALUES = "?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?8, ?9";
/** Phiếu kèm lần thu ?10 — chỉ áp khi lần thu đó đã được chèn (câu trước có lính gác). */
const POSTING_IF_RECEIPT = defineSql("billing", "posting_if_receipt", `INSERT INTO bil_posting (${POSTING_COLS}) SELECT ${POSTING_VALUES} WHERE EXISTS (SELECT 1 FROM bil_payment_receipt WHERE id = ?10)`);
/** Phiếu "Đã giao" — chỉ áp khi câu `orders` của chính lô đã đặt mốc ?10; trigger `bil_posting_delivered_paid` kiểm tiền (RAISE ⇒ cả lô huỷ). */
const POSTING_IF_DELIVERED_AT = defineSql(
  "billing",
  "posting_if_delivered_at",
  `INSERT INTO bil_posting (${POSTING_COLS}) SELECT ${POSTING_VALUES} WHERE EXISTS (SELECT 1 FROM v_ord_order_state WHERE id = ?3 AND delivered_at = ?10)`,
);
/** Phiếu "Hoàn thành" — chỉ áp khi câu `orders` của chính lô đã đặt mốc ?10; trigger `bil_posting_completed_settled` kiểm còn ai nợ công ty. */
const POSTING_IF_COMPLETED_AT = defineSql(
  "billing",
  "posting_if_completed_at",
  `INSERT INTO bil_posting (${POSTING_COLS}) SELECT ${POSTING_VALUES} WHERE EXISTS (SELECT 1 FROM v_ord_order_state WHERE id = ?3 AND completed_at = ?10)`,
);
/** Phiếu sổ của Kế toán (xác nhận công ty đã nhận, nộp/trả, hoàn, điều chỉnh, đảo) — không điều kiện mốc. */
const POSTING_PLAIN = defineSql("billing", "posting_plain", `INSERT INTO bil_posting (${POSTING_COLS}) VALUES (${POSTING_VALUES})`);

export interface NewPosting {
  id: string;
  kind: "RECEIPT" | "DELIVERED" | "COMPLETED" | "COMPANY_RECEIVED" | "SETTLEMENT" | "REFUND" | "ADJUSTMENT" | "REVERSAL" | "REPLACEMENT";
  orderId: string | null;
  reason: string | null;
  reversesPostingId: string | null;
  occurredDate: string;
  dueSnapshot: number | null;
  at: string;
  by: string;
}
const bindPosting = (db: D1Database, sql: string, p: NewPosting, ...extra: string[]) =>
  db.prepare(sql).bind(p.id, p.kind, p.orderId, p.reason, p.reversesPostingId, p.occurredDate, p.dueSnapshot, p.at, p.by, ...extra);
export const postingIfReceiptStatement = (db: D1Database, p: NewPosting, receiptId: string) => bindPosting(db, POSTING_IF_RECEIPT, p, receiptId);
export const postingIfDeliveredAtStatement = (db: D1Database, p: NewPosting, deliveredAt: string) => bindPosting(db, POSTING_IF_DELIVERED_AT, p, deliveredAt);
export const postingIfCompletedAtStatement = (db: D1Database, p: NewPosting, completedAt: string) => bindPosting(db, POSTING_IF_COMPLETED_AT, p, completedAt);
export const postingPlainStatement = (db: D1Database, p: NewPosting) => bindPosting(db, POSTING_PLAIN, p);

/** Dòng nợ — chỉ áp khi phiếu ?2 đã được chèn trong lô (lính gác), nên phiếu thua ⇒ không dòng nào. */
const LINE_IF_POSTING = defineSql(
  "billing",
  "line_if_posting",
  `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
     created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, NULL, ?8, ?9, ?10, ?11, ?10, ?11 WHERE EXISTS (SELECT 1 FROM bil_posting WHERE id = ?2)`,
);
export interface NewLine {
  id: string;
  postingId: string;
  debtorPartyId: string;
  creditorPartyId: string;
  amount: number;
  kind: "HELD" | "SETTLEMENT" | "REFUND";
  orderId: string;
  receiptId: string | null;
  reversesLineId: string | null;
  at: string;
  by: string;
}
export const lineIfPostingStatement = (db: D1Database, l: NewLine) =>
  db.prepare(LINE_IF_POSTING).bind(l.id, l.postingId, l.debtorPartyId, l.creditorPartyId, l.amount, l.kind, l.orderId, l.receiptId, l.reversesLineId, l.at, l.by);

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Dấu "đã nhập phần mềm kế toán" (ADR-0060, migration *_billing_nhap_ke_toan.sql) — CHỈ-THÊM; trạng thái hiện tại = dòng rowid LỚN NHẤT của đơn.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const ENTRY_COLS = `e.id, e.entered, e.invoice_number, e.reason, e.created_at, sl.label AS created_by_label`;
const ENTRIES_OF_ORDER = defineSql(
  "billing",
  "accounting_entries_of_order",
  `SELECT ${ENTRY_COLS} FROM bil_accounting_entry e LEFT JOIN v_stf_staff_label sl ON sl.id = e.created_by WHERE e.order_id = ?1 ORDER BY e.rowid DESC`,
);
export interface AccountingEntryDbRow {
  id: string;
  entered: 0 | 1;
  invoice_number: string | null;
  reason: string | null;
  created_at: string;
  created_by_label: string | null;
}
/** Mọi dòng của một đơn, MỚI NHẤT TRƯỚC (dòng đầu = trạng thái hiện tại). */
export const accountingEntriesOfOrder = async (db: D1Database, orderId: string): Promise<AccountingEntryDbRow[]> =>
  (await db.prepare(ENTRIES_OF_ORDER).bind(orderId).all<AccountingEntryDbRow>()).results;

/** Trong các đơn `?1` (mảng JSON — MỘT tham số, không đụng trần 100 tham số của D1), đơn nào có trạng thái hiện tại = đã nhập. */
const ENTERED_AMONG = defineSql(
  "billing",
  "accounting_entered_among",
  `SELECT j.value AS order_id FROM json_each(?1) j
   WHERE (SELECT e.entered FROM bil_accounting_entry e WHERE e.order_id = j.value ORDER BY e.rowid DESC LIMIT 1) = 1`,
);
export async function accountingEnteredAmong(db: D1Database, orderIds: readonly string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  const rows = (await db.prepare(ENTERED_AMONG).bind(JSON.stringify(orderIds)).all<{ order_id: string }>()).results;
  return new Set(rows.map((r) => r.order_id));
}

/**
 * Thêm một dòng — LÍNH GÁC trong câu: (a) khoá lạc quan: id dòng hiện tại của đơn IS ?8 (null = chưa có dòng); (b) đánh dấu (?3 = 1) chỉ khi đơn đang
 * `confirmed` (A-3, view công bố v_ord_order_state); bỏ dấu mọi trạng thái. Thua ⇒ không dòng nào, nhật ký cùng lô (`changes() > 0`) cũng không.
 */
const ENTRY_INSERT = defineSql(
  "billing",
  "accounting_entry_insert",
  `INSERT INTO bil_accounting_entry (id, order_id, entered, invoice_number, reason, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7
   WHERE (SELECT x.id FROM bil_accounting_entry x WHERE x.order_id = ?2 ORDER BY x.rowid DESC LIMIT 1) IS ?8
     AND (?3 = 0 OR EXISTS (SELECT 1 FROM v_ord_order_state s WHERE s.id = ?2 AND s.status = 'confirmed'))`,
);
export interface NewAccountingEntry {
  id: string;
  orderId: string;
  entered: boolean;
  invoiceNumber: string | null;
  reason: string | null;
  at: string;
  by: string;
  expectedCurrentId: string | null;
}
export const accountingEntryInsertStatement = (db: D1Database, e: NewAccountingEntry) =>
  db.prepare(ENTRY_INSERT).bind(e.id, e.orderId, e.entered ? 1 : 0, e.invoiceNumber, e.reason, e.at, e.by, e.expectedCurrentId);

// ---- Mã giao dịch ngân hàng (ADR-0092 Đ6; migration 0088). "Còn hiệu lực" = vị từ hieuLuc (không phải dòng đảo, chưa bị đảo). ----
export interface BankTxnRow {
  receipt_id: string;
  order_id: string;
  amount: number;
  transferred_amount: number;
}
const BANK_TXN_OF_CODE = defineSql(
  "billing",
  "bank_txn_of_code",
  `SELECT t.receipt_id, r.order_id, r.amount, t.transferred_amount FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
   WHERE t.txn_code = ?1 AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`,
);
export async function bankTxnOfCode(db: D1Database, ma: string): Promise<BankTxnRow[]> {
  return (await db.prepare(BANK_TXN_OF_CODE).bind(ma).all<BankTxnRow>()).results;
}
const BANK_TXN_OF_ORDER = defineSql(
  "billing",
  "bank_txn_of_order",
  "SELECT t.receipt_id, t.txn_code, t.transferred_amount FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id WHERE r.order_id = ?1",
);
export async function bankTxnOfOrder(db: D1Database, orderId: string): Promise<Map<string, { ma: string; soThucChuyen: number }>> {
  const rows = (await db.prepare(BANK_TXN_OF_ORDER).bind(orderId).all<{ receipt_id: string; txn_code: string; transferred_amount: number }>()).results;
  return new Map(rows.map((r) => [r.receipt_id, { ma: r.txn_code, soThucChuyen: r.transferred_amount }]));
}
/** Gắn mã — lính gác: lần thu đã chèn (lô ghi lần thu có lính gác mốc Đã giao; không chèn ⇒ changes = 0, không lỗi khoá ngoại). */
const BANK_TXN_INSERT = defineSql(
  "billing",
  "bank_txn_insert",
  `INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6 WHERE EXISTS (SELECT 1 FROM bil_payment_receipt WHERE id = ?2)`,
);
export const bankTxnInsertStatement = (db: D1Database, v: { id: string; receiptId: string; ma: string; soThucChuyen: number; at: string; by: string }) =>
  db.prepare(BANK_TXN_INSERT).bind(v.id, v.receiptId, v.ma, v.soThucChuyen, v.at, v.by);
const BANK_TXN_CUTOFF = defineSql("billing", "bank_txn_cutoff", "SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'");
/** Mốc cắt C1. null (migration chưa áp) ⇒ nơi gọi coi là BẮT BUỘC (đóng an toàn). */
export async function mocMaGiaoDich(db: D1Database): Promise<string | null> {
  return (await db.prepare(BANK_TXN_CUTOFF).first<{ cutoff_at: string }>())?.cutoff_at ?? null;
}
