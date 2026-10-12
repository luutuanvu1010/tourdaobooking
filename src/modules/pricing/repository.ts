// SQL của module pricing (ADR-0077, ADR-0078 B1): ba bảng prc_* + đọc view công bố của parties (v_pty_open_role, v_pty_party_label) và catalog
// (v_ctl_service_group). Không JOIN bảng của module khác (Hiến chương 5.3). Câu TĨNH.
import { defineSql } from "../../shared/sql-registry.ts";

export interface RuleRow {
  id: string; target_party_id: string | null; target_role_code: string | null; scope: "SERVICE" | "GROUP" | "ALL"; catalog_code: string | null; group_code: string | null;
  kind: "RATE" | "PER_PAX"; rate_bp: number | null; per_pax_amount: number | null; valid_from_date: string; valid_to_date: string | null; note: string | null; target_name: string | null;
}
export interface TermRow {
  id: string; scope: "SERVICE" | "GROUP" | "ALL"; catalog_code: string | null; group_code: string | null; seller_party_id: string; supplier_party_id: string | null;
  cost_rate_bp: number | null; valid_from_date: string; valid_to_date: string | null; note: string | null; seller_name: string | null;
}
const COT_MUC = `r.id, r.target_party_id, r.target_role_code, r.scope, r.catalog_code, r.group_code, r.kind, r.rate_bp, r.per_pax_amount, r.valid_from_date, r.valid_to_date, r.note`;
const COT_DK = `t.id, t.scope, t.catalog_code, t.group_code, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.valid_from_date, t.valid_to_date, t.note`;
const MUC_TAT_CA = defineSql("pricing", "rules_all",
  `SELECT ${COT_MUC}, l.display_name AS target_name FROM prc_commission_rule r LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id
   ORDER BY (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`);
const MUC_NGAY = defineSql("pricing", "rules_on",
  `SELECT ${COT_MUC}, NULL AS target_name FROM prc_commission_rule r WHERE r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)`);
const MUC_ID = defineSql("pricing", "rule_by_id", `SELECT ${COT_MUC}, l.display_name AS target_name FROM prc_commission_rule r LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id WHERE r.id = ?1`);
const MUC_THEM = defineSql("pricing", "rule_insert",
  `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?13, ?14)`);
const MUC_DONG = defineSql("pricing", "rule_close",
  `UPDATE prc_commission_rule SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL`);
const DK_TAT_CA = defineSql("pricing", "terms_all",
  `SELECT ${COT_DK}, l.display_name AS seller_name FROM prc_supply_term t LEFT JOIN v_pty_party_label l ON l.id = t.seller_party_id
   ORDER BY (t.valid_to_date IS NOT NULL), t.valid_from_date DESC, t.id`);
const DK_NGAY = defineSql("pricing", "terms_on",
  `SELECT ${COT_DK}, NULL AS seller_name FROM prc_supply_term t WHERE t.valid_from_date <= ?1 AND (t.valid_to_date IS NULL OR t.valid_to_date >= ?1)`);
const DK_ID = defineSql("pricing", "term_by_id", `SELECT ${COT_DK}, l.display_name AS seller_name FROM prc_supply_term t LEFT JOIN v_pty_party_label l ON l.id = t.seller_party_id WHERE t.id = ?1`);
const DK_THEM = defineSql("pricing", "term_insert",
  `INSERT INTO prc_supply_term (id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?11, ?12)`);
const DK_DONG = defineSql("pricing", "term_close",
  `UPDATE prc_supply_term SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL`);
const VAI_HUONG = defineSql("pricing", "beneficiary_roles", "SELECT role_type_code FROM prc_beneficiary_role WHERE active = 1 ORDER BY role_type_code");
const VAI_MO = defineSql("pricing", "open_roles_of", "SELECT role_type_code, role_group FROM v_pty_open_role WHERE party_id = ?1");
const LA_HUONG = defineSql("pricing", "is_beneficiary",
  `SELECT 1 AS ok FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1 WHERE r.party_id = ?1 LIMIT 1`);
// Task 11 (Ruling 21): CÙNG điều kiện `is_beneficiary` (không xét `active` của hồ sơ — đúng điều máy chủ dùng để ÉP bên đặt cho tài khoản Đối tác) + tên hồ sơ qua view công bố. Chỉ id + tên.
const HUONG_CUA_HO_SO = defineSql("pricing", "beneficiary_of_party",
  `SELECT l.id, l.display_name FROM v_pty_party_label l
   WHERE l.id = ?1 AND EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1 WHERE r.party_id = l.id)`);
const NHOM_CUA = defineSql("pricing", "groups_of", "SELECT catalog_code, group_code FROM v_ctl_service_group WHERE catalog_code IN (SELECT value FROM json_each(?1))");
// ?1 đã thoát ký tự đặc biệt của LIKE và cắt ≤ 48 byte (phần giữa của mauLikeChua ở nơi gọi); rỗng = không lọc theo tên.
const TIM_HUONG = defineSql("pricing", "find_beneficiaries",
  `SELECT l.id, l.display_name, l.party_kind FROM v_pty_party_label l
   WHERE l.active = 1 AND EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1 WHERE r.party_id = l.id)
     AND (?1 = '' OR l.display_name LIKE '%' || ?1 || '%' ESCAPE '\\') ORDER BY l.display_name LIMIT 20`);
const NHA_CUNG_CAP = defineSql("pricing", "suppliers",
  `SELECT l.id, l.display_name FROM v_pty_party_label l WHERE l.active = 1 AND EXISTS (SELECT 1 FROM v_pty_open_role r WHERE r.party_id = l.id AND r.role_type_code = 'SUPPLIER')
   ORDER BY l.display_name`);

export const allRules = async (db: D1Database) => (await db.prepare(MUC_TAT_CA).all<RuleRow>()).results;
export const rulesOn = async (db: D1Database, ngay: string) => (await db.prepare(MUC_NGAY).bind(ngay).all<RuleRow>()).results;
export const ruleById = (db: D1Database, id: string) => db.prepare(MUC_ID).bind(id).first<RuleRow>();
export const insertRuleStatement = (db: D1Database, id: string, v: { targetPartyId: string | null; targetRoleCode: string | null; scope: string; catalogCode: string | null; groupCode: string | null;
  kind: string; rateBp: number | null; perPaxAmount: number | null; validFrom: string; validTo: string | null; note: string | null }, at: string, by: string) =>
  db.prepare(MUC_THEM).bind(id, v.targetPartyId, v.targetRoleCode, v.scope, v.catalogCode, v.groupCode, v.kind, v.rateBp, v.perPaxAmount, v.validFrom, v.validTo, v.note, at, by);
export const closeRuleStatement = (db: D1Database, id: string, den: string, at: string, by: string) => db.prepare(MUC_DONG).bind(id, den, at, by);
export const allTerms = async (db: D1Database) => (await db.prepare(DK_TAT_CA).all<TermRow>()).results;
export const termsOn = async (db: D1Database, ngay: string) => (await db.prepare(DK_NGAY).bind(ngay).all<TermRow>()).results;
export const termById = (db: D1Database, id: string) => db.prepare(DK_ID).bind(id).first<TermRow>();
export const insertTermStatement = (db: D1Database, id: string, v: { scope: string; catalogCode: string | null; groupCode: string | null; sellerPartyId: string; supplierPartyId: string | null;
  costRateBp: number | null; validFrom: string; validTo: string | null; note: string | null }, at: string, by: string) =>
  db.prepare(DK_THEM).bind(id, v.scope, v.catalogCode, v.groupCode, v.sellerPartyId, v.supplierPartyId, v.costRateBp, v.validFrom, v.validTo, v.note, at, by);
export const closeTermStatement = (db: D1Database, id: string, den: string, at: string, by: string) => db.prepare(DK_DONG).bind(id, den, at, by);
export const beneficiaryRoles = async (db: D1Database): Promise<string[]> => (await db.prepare(VAI_HUONG).all<{ role_type_code: string }>()).results.map((r) => r.role_type_code);
export const openRolesOf = async (db: D1Database, partyId: string) => (await db.prepare(VAI_MO).bind(partyId).all<{ role_type_code: string; role_group: string }>()).results;
export const isBeneficiary = async (db: D1Database, partyId: string): Promise<boolean> => (await db.prepare(LA_HUONG).bind(partyId).first()) !== null;
export const huongCuaHoSo = async (db: D1Database, partyId: string): Promise<{ partyId: string; ten: string } | null> => {
  const r = await db.prepare(HUONG_CUA_HO_SO).bind(partyId).first<{ id: string; display_name: string }>();
  return r ? { partyId: r.id, ten: r.display_name } : null;
};
export const groupsOf = async (db: D1Database, codes: readonly string[]): Promise<Map<string, string | null>> =>
  new Map((await db.prepare(NHOM_CUA).bind(JSON.stringify(codes)).all<{ catalog_code: string; group_code: string | null }>()).results.map((r) => [r.catalog_code, r.group_code]));
export const findBeneficiaries = async (db: D1Database, q: string) => (await db.prepare(TIM_HUONG).bind(q).all<{ id: string; display_name: string; party_kind: "PERSON" | "ORGANIZATION" }>()).results;
export const suppliers = async (db: D1Database) => (await db.prepare(NHA_CUNG_CAP).all<{ id: string; display_name: string }>()).results;
