// SQL ĐIỀU CHỈNH CÔNG NỢ CẦN DUYỆT của module billing (ADR-0115 đợt 1; migration 0094). Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, ?N), chịu bài EXPLAIN — chỉ chạm
// bảng bil_ và view công bố của module được phép phụ thuộc (`v_ord_order_label` của orders; `v_pty_party_label` của parties; `v_stf_staff_label` của staff).
// CHỈ-THÊM. Mỗi câu ghi có LÍNH GÁC trong câu để câu sau trong lô chỉ áp khi câu trước đã áp; điều kiện nhiệm vụ nằm ở trigger 0094 (RAISE ⇒ cả lô huỷ).
// Import kèm đuôi .ts.
import { defineSql } from "../../shared/sql-registry.ts";

export type KetQuaQuyet = "APPROVE" | "REJECT" | "WITHDRAW";
export type HuongDb = "INCREASE" | "DECREASE";
export interface YeuCauDbRow {
  id: string;
  order_id: string;
  order_code: string | null;
  debtor_party_id: string;
  creditor_party_id: string;
  debtor_label: string | null;
  creditor_label: string | null;
  amount: number;
  line_kind_code: "HELD" | "SETTLEMENT" | "REFUND";
  occurred_date: string;
  direction: HuongDb;
  reason: string;
  created_at: string;
  created_by: string;
  created_by_label: string | null;
  decision_id: string | null;
  decision_kind: KetQuaQuyet | null;
  decision_at: string | null;
  decision_by: string | null;
  decision_by_label: string | null;
  decision_reason: string | null;
}

const COT_YEU_CAU = `q.id, q.order_id, ol.order_code, q.debtor_party_id, q.creditor_party_id, dl.display_name AS debtor_label, cl.display_name AS creditor_label,
  q.amount, q.line_kind_code, q.occurred_date, q.direction, q.reason, q.created_at, q.created_by, sc.label AS created_by_label,
  d.id AS decision_id, d.kind_code AS decision_kind, d.created_at AS decision_at, d.created_by AS decision_by, sd.label AS decision_by_label, d.reason AS decision_reason`;
const TU_YEU_CAU = `FROM bil_adjustment_request q
  LEFT JOIN bil_adjustment_request d ON d.target_id = q.id
  LEFT JOIN v_ord_order_label ol ON ol.id = q.order_id
  LEFT JOIN v_pty_party_label dl ON dl.id = q.debtor_party_id
  LEFT JOIN v_pty_party_label cl ON cl.id = q.creditor_party_id
  LEFT JOIN v_stf_staff_label sc ON sc.id = q.created_by
  LEFT JOIN v_stf_staff_label sd ON sd.id = d.created_by`;

const YEU_CAU_THEO_ID = defineSql("billing", "adjreq_by_id", `SELECT ${COT_YEU_CAU} ${TU_YEU_CAU} WHERE q.kind_code = 'REQUEST' AND q.id = ?1`);
export const yeuCauTheoId = (db: D1Database, id: string) => db.prepare(YEU_CAU_THEO_ID).bind(id).first<YeuCauDbRow>();

/** Mọi yêu cầu, mới nhất trước (trần ?1 dòng). Hết hạn / trạng thái tính ở service lúc đọc — không lọc ở đây. */
const YEU_CAU_GAN_DAY = defineSql("billing", "adjreq_recent", `SELECT ${COT_YEU_CAU} ${TU_YEU_CAU} WHERE q.kind_code = 'REQUEST' ORDER BY q.rowid DESC LIMIT ?1`);
export const yeuCauGanDay = async (db: D1Database, gioiHan: number): Promise<YeuCauDbRow[]> => (await db.prepare(YEU_CAU_GAN_DAY).bind(gioiHan).all<YeuCauDbRow>()).results;

/** Yêu cầu CHỜ DUYỆT còn hạn (chưa có quyết định, tạo từ mốc ?1 trở đi), mới nhất trước, trần ?2 — lọc ở SQL để yêu cầu chờ cũ không rơi khỏi danh sách khi sau nó có nhiều yêu cầu đã quyết. */
const YEU_CAU_CHO_DUYET = defineSql(
  "billing",
  "adjreq_pending",
  `SELECT ${COT_YEU_CAU} ${TU_YEU_CAU} WHERE q.kind_code = 'REQUEST' AND q.created_at >= ?1
     AND NOT EXISTS (SELECT 1 FROM bil_adjustment_request d WHERE d.target_id = q.id) ORDER BY q.rowid DESC LIMIT ?2`,
);
export const yeuCauChoDuyet = async (db: D1Database, taoTu: string, gioiHan: number): Promise<YeuCauDbRow[]> => (await db.prepare(YEU_CAU_CHO_DUYET).bind(taoTu, gioiHan).all<YeuCauDbRow>()).results;

/**
 * Σ điều chỉnh TĂNG nợ còn hiệu lực của MỘT đơn (ADR-0115 điều 4): yêu cầu đã duyệt theo hướng INCREASE lúc duyệt, đã sinh phiếu + dòng nợ, và dòng nợ ấy chưa bị đảo.
 * Số tiền lấy từ dòng nợ thật (không từ yêu cầu) — nguồn là sổ.
 */
const TANG_DA_CO = defineSql(
  "billing",
  "adjreq_increase_live",
  `SELECT COALESCE(SUM(l.amount), 0) AS tong
   FROM bil_adjustment_request a
   JOIN bil_posting p ON p.request_id = a.target_id
   JOIN bil_debt_line l ON l.posting_id = p.id
   WHERE a.kind_code = 'APPROVE' AND a.direction = 'INCREASE' AND p.order_id = ?1 AND l.reverses_line_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM bil_debt_line r WHERE r.reverses_line_id = l.id)`,
);
export const tangDaCo = async (db: D1Database, orderId: string): Promise<number> => (await db.prepare(TANG_DA_CO).bind(orderId).first<{ tong: number }>())?.tong ?? 0;

/** Σ yêu cầu TĂNG nợ đang chờ của một đơn: chưa có quyết định, chưa hết hạn (`tao_tu` = mốc sớm nhất còn hạn, ISO), trừ yêu cầu `bo` (đang xét). */
const TANG_DANG_CHO = defineSql(
  "billing",
  "adjreq_increase_pending",
  `SELECT COALESCE(SUM(q.amount), 0) AS tong FROM bil_adjustment_request q
   WHERE q.kind_code = 'REQUEST' AND q.order_id = ?1 AND q.direction = 'INCREASE' AND q.id <> ?2 AND q.created_at >= ?3
     AND NOT EXISTS (SELECT 1 FROM bil_adjustment_request d WHERE d.target_id = q.id)`,
);
export const tangDangCho = async (db: D1Database, orderId: string, boId: string, taoTu: string): Promise<number> =>
  (await db.prepare(TANG_DANG_CHO).bind(orderId, boId, taoTu).first<{ tong: number }>())?.tong ?? 0;

/** Tài khoản của các hồ sơ (bên bị đổi số dư nếu là nhân viên có tài khoản) — qua view công bố của staff. */
const TAI_KHOAN_CUA_HO_SO = defineSql("billing", "adjreq_staff_of_party", `SELECT id, party_id FROM v_stf_staff_label WHERE party_id IN (SELECT value FROM json_each(?1))`);
export const taiKhoanCuaHoSo = async (db: D1Database, partyIds: readonly string[]): Promise<Map<string, string>> => {
  if (partyIds.length === 0) return new Map();
  const rows = (await db.prepare(TAI_KHOAN_CUA_HO_SO).bind(JSON.stringify(partyIds)).all<{ id: string; party_id: string }>()).results;
  return new Map(rows.map((r) => [r.party_id, r.id]));
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Ghi
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const YEU_CAU_CHEN = defineSql(
  "billing",
  "adjreq_insert_request",
  `INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason, target_id, cap_snapshot,
     created_at, created_by, updated_at, updated_by)
   VALUES (?1, 'REQUEST', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, NULL, ?10, ?11, ?10, ?11)`,
);
export interface YeuCauMoi {
  id: string;
  orderId: string;
  debtorPartyId: string;
  creditorPartyId: string;
  amount: number;
  lineKind: "HELD" | "SETTLEMENT" | "REFUND";
  occurredDate: string;
  direction: HuongDb;
  reason: string;
  at: string;
  by: string;
}
export const yeuCauChenStatement = (db: D1Database, y: YeuCauMoi) =>
  db.prepare(YEU_CAU_CHEN).bind(y.id, y.orderId, y.debtorPartyId, y.creditorPartyId, y.amount, y.lineKind, y.occurredDate, y.direction, y.reason, y.at, y.by);

/** Quyết định TỪ CHỐI / RÚT: một dòng trỏ yêu cầu; trigger kiểm cùng đơn, người từ chối ≠ người tạo, chỉ người tạo rút, lý do từ chối bắt buộc, mỗi yêu cầu một quyết định. */
const QUYET_DINH_CHEN = defineSql(
  "billing",
  "adjreq_insert_decision",
  `INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, NULL, ?4, ?5, NULL, ?6, ?7, ?6, ?7)`,
);
export const quyetDinhChenStatement = (db: D1Database, q: { id: string; kind: "REJECT" | "WITHDRAW"; orderId: string; targetId: string; reason: string | null; at: string; by: string }) =>
  db.prepare(QUYET_DINH_CHEN).bind(q.id, q.kind, q.orderId, q.reason, q.targetId, q.at, q.by);

/**
 * Quyết định DUYỆT — kèm LÍNH GÁC CSDL của lô (ADR-0115 điều 4, "kiểm lại lúc duyệt"): chỉ chèn khi, ở đúng lúc ghi,
 *  - INCREASE: Σ điều chỉnh tăng nợ còn hiệu lực của đơn ≤ ?8 (= `tangDaCoToiDa` do `kiemDieuChinh` tính — MỘT công thức, ở rules.ts);
 *  - DECREASE: số bên được nợ còn nợ bên nợ trên đơn (cặp ?10, ?11, mọi dòng kể cả dòng đảo) ≥ ?9 (= số tiền) — không đổi dấu (Đ5a).
 * Hai lệnh duyệt chạy gần nhau: lô D1 tuần tự, nên lệnh sau thấy dòng của lệnh trước và bị gác ⇒ 0 dòng ⇒ service trả 409 (chỉ-thêm, không mất gì).
 */
const DUYET_CHEN = defineSql(
  "billing",
  "adjreq_insert_approve",
  `INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
   SELECT ?1, 'APPROVE', ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?6, ?7
   WHERE (?3 = 'INCREASE' AND COALESCE((
       SELECT SUM(l.amount) FROM bil_adjustment_request a JOIN bil_posting p ON p.request_id = a.target_id JOIN bil_debt_line l ON l.posting_id = p.id
       WHERE a.kind_code = 'APPROVE' AND a.direction = 'INCREASE' AND p.order_id = ?2 AND l.reverses_line_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM bil_debt_line r WHERE r.reverses_line_id = l.id)), 0) <= ?8)
     OR (?3 = 'DECREASE' AND COALESCE((
       SELECT SUM(CASE WHEN l.debtor_party_id = ?10 THEN l.amount ELSE -l.amount END) FROM bil_debt_line l
       WHERE l.order_id = ?2 AND ((l.debtor_party_id = ?10 AND l.creditor_party_id = ?11) OR (l.debtor_party_id = ?11 AND l.creditor_party_id = ?10))), 0) >= ?9)`,
);
export const duyetChenStatement = (
  db: D1Database,
  d: { id: string; orderId: string; direction: HuongDb; requestId: string; capSnapshot: number | null; at: string; by: string; tangDaCoToiDa: number; soTien: number; benDuocNo: string; benNo: string },
) => db.prepare(DUYET_CHEN).bind(d.id, d.orderId, d.direction, d.requestId, d.capSnapshot, d.at, d.by, d.tangDaCoToiDa, d.soTien, d.benDuocNo, d.benNo);

/** Phiếu ADJUSTMENT của yêu cầu đã duyệt — chỉ áp khi dòng APPROVE ?7 của chính lô đã chèn; trigger 0094 kiểm người ghi = người duyệt ≠ người tạo, đúng đơn, đúng ngày. */
const PHIEU_CHEN = defineSql(
  "billing",
  "adjreq_insert_posting",
  `INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, request_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, 'ADJUSTMENT', ?2, ?3, NULL, ?4, NULL, ?5, ?6, ?7, ?6, ?7 WHERE EXISTS (SELECT 1 FROM bil_adjustment_request WHERE id = ?8 AND kind_code = 'APPROVE' AND target_id = ?5)`,
);
export const phieuChenStatement = (db: D1Database, p: { id: string; orderId: string; reason: string; occurredDate: string; requestId: string; at: string; by: string; decisionId: string }) =>
  db.prepare(PHIEU_CHEN).bind(p.id, p.orderId, p.reason, p.occurredDate, p.requestId, p.at, p.by, p.decisionId);
