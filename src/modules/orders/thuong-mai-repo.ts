// SQL bản chụp thương mại (ord_service_terms — đặc tả §5). Tệp NỬA NGHIÊM của orders (src/architecture.test.ts NUA_NGHIEM): defineSql + EXPLAIN.
// Câu chụp trong lô gác bằng CHUỖI changes() > 0 (CHANGE-GUIDE f) — không đọc audit_log, không so updated_at.
import { defineSql } from "../../shared/sql-registry.ts";
import type { DongGhiChup, TermRowDb } from "./thuong-mai.ts";

const COT = `id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax, commission_rule_id,
  supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by`;
const CHUP_CHUOI = defineSql("orders", "terms_insert_chain",
  `INSERT INTO ord_service_terms (${COT}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?20, ?21 WHERE changes() > 0`);
const GHI_TAY = defineSql("orders", "terms_insert_manual",
  `INSERT INTO ord_service_terms (${COT}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?20, ?21
   WHERE EXISTS (SELECT 1 FROM orders o WHERE o.id = ?2 AND o.status = 'confirmed' AND o.delivered_at IS NULL)`);
const HIEN_HANH = defineSql("orders", "terms_current",
  `SELECT t.id, t.order_service_id, t.beneficiary_party_id, t.commission_status, t.missing_reason, t.commission_kind, t.commission_rate_bp, t.commission_per_pax, t.commission_rule_id,
     t.supply_status, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.supply_term_id, t.source, t.captured_date
   FROM ord_service_terms t WHERE t.order_id = ?1 AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`);
const DEM = defineSql("orders", "terms_count", "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?1");

const bindDong = (st: D1PreparedStatement, d: DongGhiChup) => st.bind(d.id, d.orderId, d.serviceId, d.beneficiaryPartyId, d.commissionStatus, d.missingReason, d.commissionKind, d.rateBp, d.perPax,
  d.ruleId, d.supplyStatus, d.sellerPartyId, d.supplierPartyId, d.costRateBp, d.termId, d.source, d.reason, d.supersedesId, d.capturedDate, d.at, d.by);
/** Mỗi dòng một câu `INSERT … SELECT … WHERE changes() > 0`: đặt SAU câu nhật ký `confirmed` (chính nó `changes() > 0`) thì chuỗi nối từ câu `UPDATE orders` — lệnh thua không ghi gì. */
export const cauChupChuoi = (db: D1Database, rows: readonly DongGhiChup[]): D1PreparedStatement[] => rows.map((d) => bindDong(db.prepare(CHUP_CHUOI), d));
/** Ghi tay (đơn đã xác nhận, chưa giao): lính gác ngay trong câu, không phụ thuộc câu trước. */
export const cauGhiTay = (db: D1Database, d: DongGhiChup): D1PreparedStatement => bindDong(db.prepare(GHI_TAY), d);
/** Bản chụp HIỆN HÀNH của đơn: dòng chưa bị bản nào thay thế (`supersedes_id` trỏ tới nó). */
export const banChupHienHanh = async (db: D1Database, orderId: string): Promise<TermRowDb[]> => (await db.prepare(HIEN_HANH).bind(orderId).all<TermRowDb>()).results;
export const demBanChup = async (db: D1Database, orderId: string): Promise<number> => Number((await db.prepare(DEM).bind(orderId).first<{ n: number }>())?.n ?? 0);
