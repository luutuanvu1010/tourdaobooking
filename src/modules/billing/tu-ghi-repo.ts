// SQL của sổ soát «tự ghi đơn mình lập» (ADR-0187 Đ3 mức (a); migration 0150): bảng `bil_soat_tu_ghi` (billing ghi) và đọc dòng nhật ký có dấu CHỈ qua view công bố
// `v_aud_tu_ghi` của audit; mã đơn qua `v_ord_order_label` (orders), tên người qua `v_stf_staff_label` (staff). Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH), chịu bài EXPLAIN.
// Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
import { defineSql } from "../../shared/sql-registry.ts";

export interface TuGhiRow {
  id: string;
  order_id: string | null;
  ma_don: string | null;
  staff_id: string | null;
  nguoi_ghi: string | null;
  action: string;
  created_at: string;
  soat_boi: string | null;
  nguoi_soat: string | null;
  soat_luc: string | null;
}

/** Dòng chưa soát (hết) + dòng đã soát từ mốc ?1 (ISO) trở lại; chưa soát xếp trước, mới nhất trước. Tối đa 500 dòng (màn Sổ công nợ, không phân trang). */
const DANH_SACH = defineSql(
  "billing",
  "self_write_list",
  `SELECT a.id, a.order_id, ol.order_code AS ma_don, a.staff_id, sl.label AS nguoi_ghi, a.action, a.created_at, s.soat_boi, sl2.label AS nguoi_soat, s.soat_luc
   FROM v_aud_tu_ghi a
   LEFT JOIN bil_soat_tu_ghi s ON s.audit_id = a.id
   LEFT JOIN v_ord_order_label ol ON ol.id = a.order_id
   LEFT JOIN v_stf_staff_label sl ON sl.id = a.staff_id
   LEFT JOIN v_stf_staff_label sl2 ON sl2.id = s.soat_boi
   WHERE s.audit_id IS NULL OR s.soat_luc >= ?1
   ORDER BY (s.audit_id IS NOT NULL), a.created_at DESC
   LIMIT 500`,
);
export const danhSachTuGhiRows = async (db: D1Database, daSoatTu: string): Promise<TuGhiRow[]> => (await db.prepare(DANH_SACH).bind(daSoatTu).all<TuGhiRow>()).results;

const DEM_CHUA_SOAT = defineSql("billing", "self_write_unreviewed_count", `SELECT count(*) AS n FROM v_aud_tu_ghi a WHERE NOT EXISTS (SELECT 1 FROM bil_soat_tu_ghi s WHERE s.audit_id = a.id)`);
export const demChuaSoat = async (db: D1Database): Promise<number> => Number((await db.prepare(DEM_CHUA_SOAT).first<{ n: number }>())?.n ?? 0);

export interface TuGhiMotRow { id: string; order_id: string | null; staff_id: string | null; action: string; soat_boi: string | null }
const MOT_DONG = defineSql(
  "billing",
  "self_write_one",
  `SELECT a.id, a.order_id, a.staff_id, a.action, s.soat_boi FROM v_aud_tu_ghi a LEFT JOIN bil_soat_tu_ghi s ON s.audit_id = a.id WHERE a.id = ?1`,
);
export const dongTuGhi = (db: D1Database, auditId: string): Promise<TuGhiMotRow | null> => db.prepare(MOT_DONG).bind(auditId).first<TuGhiMotRow>();

/** Dòng soát — trigger `bil_soat_tu_ghi_khac_nguoi` kiểm lại: dòng phải có dấu và người soát khác người ghi; khoá chính chặn soát hai lần. */
const CHEN_SOAT = defineSql(
  "billing",
  "self_write_review_insert",
  `INSERT INTO bil_soat_tu_ghi (audit_id, order_id, soat_boi, soat_luc, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?3, ?4, ?3)`,
);
export const chenSoatStatement = (db: D1Database, i: { auditId: string; orderId: string | null; by: string; at: string }) => db.prepare(CHEN_SOAT).bind(i.auditId, i.orderId, i.by, i.at);
