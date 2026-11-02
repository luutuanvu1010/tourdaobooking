// SQL "PHÂN ĐỊNH TRÁCH NHIỆM" của module billing (ADR-0116; migration 0135). Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, ?N) — bảng bil_ và view công bố (`v_ord_order_label`,
// `v_pty_party_label`, `v_pty_khach_thuan`, `v_pty_co_vai_khac_khach`, `v_stf_staff_label`). CHỈ-THÊM. Điều kiện thật nằm ở trigger 0135 (RAISE ⇒ cả lô huỷ). Import kèm đuôi .ts.
import { defineSql } from "../../shared/sql-registry.ts";

export type BuocPhanDinh = "REQUEST" | "RULING" | "POSTED" | "REASSIGNED" | "REVERSAL" | "RESPONSE";
export interface DongPhanDinh {
  id: string; order_id: string; step_code: BuocPhanDinh; target_id: string | null; root_id: string | null; case_code: string | null; liable_party_id: string | null; amount: number | null;
  money_out: number | null; reason: string | null; posting_id: string | null; created_at: string; created_by: string | null;
  order_code: string | null; liable_label: string | null; created_by_label: string | null; ngay_giao: string | null;
}

const CHON = `SELECT a.id, a.order_id, a.step_code, a.target_id, a.root_id, a.case_code, a.liable_party_id, a.amount, a.money_out, a.reason, a.posting_id, a.created_at, a.created_by,
    ol.order_code, pl.display_name AS liable_label, sl.label AS created_by_label, g.occurred_date AS ngay_giao
  FROM bil_attribution a LEFT JOIN v_ord_order_label ol ON ol.id = a.order_id LEFT JOIN v_pty_party_label pl ON pl.id = a.liable_party_id LEFT JOIN v_stf_staff_label sl ON sl.id = a.created_by
    LEFT JOIN bil_posting g ON g.order_id = a.order_id AND g.kind_code = 'DELIVERED'`;
/** Mọi dòng của các đơn có phiếu mới nhất (đủ cả chuỗi của mỗi đơn, cắt theo số đơn để giữ nguyên chuỗi). */
const DS = defineSql("billing", "pd_danh_sach", `${CHON}
  WHERE a.order_id IN (SELECT order_id FROM bil_attribution GROUP BY order_id ORDER BY MAX(rowid) DESC LIMIT 200) ORDER BY a.rowid`);
const THEO_ID = defineSql("billing", "pd_theo_id", `${CHON} WHERE a.id = ?1`);
const THEO_DON = defineSql("billing", "pd_theo_don", `${CHON} WHERE a.order_id = ?1 ORDER BY a.rowid`);
const CUA_BEN_CHIU = defineSql("billing", "pd_cua_ben_chiu", `${CHON}
  WHERE a.order_id IN (SELECT order_id FROM bil_attribution WHERE liable_party_id = ?1 AND step_code IN ('POSTED', 'REASSIGNED')) ORDER BY a.rowid`);
export const dsPhanDinh = async (db: D1Database): Promise<DongPhanDinh[]> => (await db.prepare(DS).all<DongPhanDinh>()).results;
export const phanDinhTheoId = (db: D1Database, id: string): Promise<DongPhanDinh | null> => db.prepare(THEO_ID).bind(id).first<DongPhanDinh>();
export const phanDinhTheoDon = async (db: D1Database, orderId: string): Promise<DongPhanDinh[]> => (await db.prepare(THEO_DON).bind(orderId).all<DongPhanDinh>()).results;
export const phanDinhCuaBenChiu = async (db: D1Database, partyId: string): Promise<DongPhanDinh[]> => (await db.prepare(CUA_BEN_CHIU).bind(partyId).all<DongPhanDinh>()).results;

/** Hồ sơ có thể chịu trách nhiệm không (khách thuần ⇒ không; có vai khác khách). Đọc qua view của `parties`. */
const BEN_CHIU = defineSql(
  "billing",
  "pd_ben_chiu",
  `SELECT l.id, l.active, EXISTS (SELECT 1 FROM v_pty_khach_thuan k WHERE k.party_id = l.id) AS la_khach, EXISTS (SELECT 1 FROM v_pty_co_vai_khac_khach v WHERE v.party_id = l.id) AS co_vai
   FROM v_pty_party_label l WHERE l.id = ?1`,
);
export const thongTinBenChiu = (db: D1Database, partyId: string) => db.prepare(BEN_CHIU).bind(partyId).first<{ id: string; active: number; la_khach: number; co_vai: number }>();

/** Số phiếu đang chờ phân định (đếm thật cho "Việc của bạn" — chỉ đọc bảng bil_). */
const DEM_CHO = defineSql(
  "billing",
  "pd_dem_cho",
  `SELECT count(*) AS n FROM bil_attribution q WHERE q.step_code = 'REQUEST' AND NOT EXISTS (SELECT 1 FROM bil_attribution r WHERE r.target_id = q.id AND r.step_code = 'RULING')`,
);
export const demChoPhanDinh = async (db: D1Database): Promise<number> => (await db.prepare(DEM_CHO).first<{ n: number }>())?.n ?? 0;

const COLS = "id, order_id, step_code, target_id, root_id, case_code, liable_party_id, amount, money_out, reason, posting_id, created_at, created_by, updated_at, updated_by";
const CHEN = defineSql("billing", "pd_chen", `INSERT INTO bil_attribution (${COLS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?12, ?13)`);
export const chenPhanDinhStatement = (db: D1Database, d: {
  id: string; orderId: string; buoc: BuocPhanDinh; targetId: string | null; rootId: string | null; caseCode: string | null; liable: string | null; amount: number | null; moneyOut: number | null;
  reason: string | null; postingId: string | null; at: string; by: string;
}) => db.prepare(CHEN).bind(d.id, d.orderId, d.buoc, d.targetId, d.rootId, d.caseCode, d.liable, d.amount, d.moneyOut, d.reason, d.postingId, d.at, d.by);

/** Lần trả khách thuộc một lần ghi phân định (mang `attribution_id`; trigger `bil_receipt_attribution_match` canh). «Thu cho» = công ty chủ, như hoàn thường. */
const HOAN = defineSql(
  "billing",
  "pd_hoan",
  `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, attribution_id)
   SELECT ?1, ?2, 'CUSTOMER_REFUND', ?3, ?4, ?5, ?6, (SELECT party_id FROM v_pty_owner_company LIMIT 1), 'AT_DELIVERY', ?7, NULL, ?8, ?9, ?10, ?9, ?10, ?11`,
);
export const hoanPhanDinhStatement = (db: D1Database, r: { id: string; orderId: string; amount: number; nguoiTra: string; vai: "COMPANY" | "STAFF"; method: string; ngay: string; note: string | null; at: string; by: string; attributionId: string }) =>
  db.prepare(HOAN).bind(r.id, r.orderId, r.amount, r.nguoiTra, r.vai, r.method, r.ngay, r.note, r.at, r.by, r.attributionId);
