// SQL của module pricing (ADR-0077, ADR-0078 B1; ADR-0117 lần 2): các bảng prc_* + đọc view công bố của parties (v_pty_open_role, v_pty_party_label) và catalog
// (v_ctl_service_group). Không JOIN bảng của module khác (Hiến chương 5.3). Câu TĨNH.
import { defineSql } from "../../shared/sql-registry.ts";

export interface RuleRow {
  id: string; target_party_id: string | null; target_role_code: string | null; scope: "SERVICE" | "GROUP" | "ALL"; catalog_code: string | null; group_code: string | null;
  kind: "RATE" | "PER_PAX"; rate_bp: number | null; per_pax_amount: number | null; valid_from_date: string; valid_to_date: string | null; note: string | null; target_name: string | null;
  /** Đích thứ ba (ADR-0117 lần 2, migration 0097): mã mức TA; `tier_name` = tên mức (cùng module, JOIN được) — null ở câu `rules_on` (chọn mức không cần tên). */
  target_tier_code: string | null; tier_name: string | null;
  /** ADR-0133: số tiền trẻ em / người cao tuổi của dòng phụ `prc_commission_rule_pax` (người lớn = per_pax_amount). Cả hai null = dòng không khai theo loại. */
  pax_child: number | null; pax_senior: number | null;
  /** ADR-0148 (migration 0126): dấu huỷ (dòng chưa đơn nào chụp, đã thay hẳn), dòng mà dòng này thay, lý do sửa. Câu «tra» loại dòng huỷ; câu «lịch sử» trả cả dòng huỷ. */
  voided_at: string | null; replaces_id: string | null; change_reason: string | null;
}
export interface TierRow { code: string; name: string; active: number }
export interface RoleTierRow { id: string; role_type_code: string; tier_code: string; valid_from_date: string; valid_to_date: string | null; voided_at: string | null; replaces_id: string | null; change_reason: string | null }
/** ADR-0138 (migration 0118): mức TA gắn riêng cho một hồ sơ. */
export interface PartyTierRow { id: string; party_id: string; tier_code: string; valid_from_date: string; valid_to_date: string | null; voided_at: string | null; replaces_id: string | null; change_reason: string | null }
export interface TermRow {
  id: string; scope: "SERVICE" | "GROUP" | "ALL"; catalog_code: string | null; group_code: string | null; seller_party_id: string; supplier_party_id: string | null;
  cost_rate_bp: number | null; valid_from_date: string; valid_to_date: string | null; note: string | null; seller_name: string | null;
}
const COT_MUC = `r.id, r.target_party_id, r.target_role_code, r.scope, r.catalog_code, r.group_code, r.kind, r.rate_bp, r.per_pax_amount, r.valid_from_date, r.valid_to_date, r.note, r.target_tier_code, p.child_amount AS pax_child, p.senior_amount AS pax_senior,
  r.voided_at, r.replaces_id, r.change_reason`;
const COT_DK = `t.id, t.scope, t.catalog_code, t.group_code, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.valid_from_date, t.valid_to_date, t.note`;
const MUC_TAT_CA = defineSql("pricing", "rules_all",
  `SELECT ${COT_MUC}, l.display_name AS target_name, mt.name AS tier_name FROM prc_commission_rule r LEFT JOIN prc_commission_rule_pax p ON p.rule_id = r.id LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id
     LEFT JOIN prc_rate_tier mt ON mt.code = r.target_tier_code
   ORDER BY (r.voided_at IS NOT NULL), (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`);
const MUC_NGAY = defineSql("pricing", "rules_on",
  `SELECT ${COT_MUC}, NULL AS target_name, NULL AS tier_name FROM prc_commission_rule r LEFT JOIN prc_commission_rule_pax p ON p.rule_id = r.id
   WHERE r.voided_at IS NULL AND r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)`);
const MUC_ID = defineSql("pricing", "rule_by_id", `SELECT ${COT_MUC}, l.display_name AS target_name, mt.name AS tier_name FROM prc_commission_rule r LEFT JOIN prc_commission_rule_pax p ON p.rule_id = r.id LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id
   LEFT JOIN prc_rate_tier mt ON mt.code = r.target_tier_code WHERE r.id = ?1`);
const MUC_THEM = defineSql("pricing", "rule_insert",
  `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by, target_tier_code) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?13, ?14, ?15)`);
const MUC_PAX_THEM = defineSql("pricing", "rule_pax_insert",
  `INSERT INTO prc_commission_rule_pax (rule_id, adult_amount, child_amount, senior_amount, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6)`);
// Đóng / rút ngắn (ADR-0148): khoá lạc quan = ngày kết thúc ĐÃ ĐỌC (?5; NULL = chưa có) và chưa huỷ — người khác vừa đóng / rút ngắn / huỷ ⇒ 0 dòng ⇒ 409, không ghi đè.
const MUC_DONG = defineSql("pricing", "rule_close",
  `UPDATE prc_commission_rule SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND voided_at IS NULL AND valid_to_date IS ?5`);
// Huỷ (ADR-0148 Đ1.2 — chỉ dòng chưa đơn nào chụp; máy chủ hỏi trước qua `ctx`): cùng khoá lạc quan. Không đổi ngày (trigger close_only chặn đổi cột khác cùng lúc).
const MUC_HUY = defineSql("pricing", "rule_void",
  `UPDATE prc_commission_rule SET voided_at = ?2, voided_by = ?3, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND voided_at IS NULL AND valid_to_date IS ?4`);
// Dòng thay thế của «Sửa»: ngày bắt đầu NOT NULL chỉ có khi câu huỷ / đóng đứng ngay trước đã đổi được dòng cũ (khuôn MUC_DOI_THEM — VALUES + CASE).
const MUC_SUA_THEM = defineSql("pricing", "rule_edit_insert",
  `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by, target_tier_code, replaces_id, change_reason)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CASE WHEN changes() > 0 THEN ?10 END, ?11, ?12, ?13, ?14, ?13, ?14, ?15, ?16, ?17)`);
// «Đổi mức» (một bước): dòng mới mang ĐÍCH (ba loại) + phạm vi của dòng cũ (nơi gọi truyền từ dòng đã đọc). Điều kiện `changes() > 0` = câu đóng ngay trước đã đóng được dòng cũ: nếu không,
// `valid_from_date` thành NULL ⇒ vi phạm NOT NULL ⇒ cả lô bị huỷ (không dòng mới, không nhật ký) và route trả 409 `stale`. Dùng VALUES + CASE thay vì `INSERT … SELECT … WHERE changes() > 0`
// vì dạng INSERT…SELECT vào bảng có con của module khác (ord_service_terms) bị `architecture.test.ts` tính là đọc xuyên module.
const MUC_DOI_THEM = defineSql("pricing", "rule_change_insert",
  `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by, target_tier_code)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CASE WHEN changes() > 0 THEN ?10 END, ?11, ?12, ?13, ?14, ?13, ?14, ?15)`);
// Dòng phụ theo loại khách của dòng mới: chỉ chèn khi dòng mới đã có (câu chèn dòng đứng ngay trước đã chạy).
const MUC_DOI_PAX_THEM = defineSql("pricing", "rule_change_pax_insert",
  `INSERT INTO prc_commission_rule_pax (rule_id, adult_amount, child_amount, senior_amount, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6 WHERE changes() > 0`);
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
// ADR-0117: kèm cờ loại đối tác (view công bố v_pty_role_type) — Q1 (A): hồ sơ mang loại đối tác đã tắt ⇒ KHONG_HUONG chứ không NONE.
const VAI_MO = defineSql("pricing", "open_roles_of",
  `SELECT r.role_type_code, r.role_group, t.is_partner_label FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code WHERE r.party_id = ?1`);
// ADR-0117 điều 1: danh sách vai được hưởng ĐỦ hai trạng thái (màn "Loại đối tác" cần thấy cả loại đang tắt); `VAI_HUONG` ở trên chỉ lấy dòng đang bật.
const VAI_HUONG_TAT_CA = defineSql("pricing", "beneficiary_roles_all", "SELECT role_type_code, active FROM prc_beneficiary_role ORDER BY role_type_code");
const VAI_HUONG_THEM = defineSql("pricing", "beneficiary_role_insert",
  `INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, created_by, updated_at, updated_by) VALUES (?1, 1, ?2, ?3, ?2, ?3)`);
// Không có `AND active <> ?2`: dòng lệch cờ (đặt tay) vẫn được kéo về đúng trạng thái. `changes() > 0` = câu đứng ngay trước (cập nhật loại ở parties) đã đổi dòng —
// bên thua một lượt tranh chấp không ghi gì (khuôn của nhật ký "changes() > 0").
const VAI_HUONG_DAT = defineSql("pricing", "beneficiary_role_set_active",
  `UPDATE prc_beneficiary_role SET active = ?2, updated_at = ?3, updated_by = ?4 WHERE role_type_code = ?1 AND changes() > 0`);
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
// ===== Mức TA dùng chung (ADR-0117 lần 2, migration 0096): prc_rate_tier (mức), prc_role_tier (gắn loại↔mức theo ngày). Khoá tên `name_key` do máy chủ ghi, không đọc ra. =====
const MUC_TA_TAT_CA = defineSql("pricing", "rate_tiers_all", "SELECT code, name, active FROM prc_rate_tier ORDER BY name_key, code");
const MUC_TA_MA = defineSql("pricing", "rate_tier_by_code", "SELECT code, name, active FROM prc_rate_tier WHERE code = ?1");
const MUC_TA_THEM = defineSql("pricing", "rate_tier_insert",
  `INSERT INTO prc_rate_tier (code, name, name_key, active, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?4, ?5)`);
// Chỉ đổi dòng khi mức CHƯA ở trạng thái đích ⇒ bên thua một lượt tranh chấp không ghi gì (nhật ký đi theo `changes() > 0`).
const MUC_TA_DAT = defineSql("pricing", "rate_tier_set_active", "UPDATE prc_rate_tier SET active = ?2, updated_at = ?3, updated_by = ?4 WHERE code = ?1 AND active <> ?2");
const COT_GAN = "g.id, g.role_type_code, g.tier_code, g.valid_from_date, g.valid_to_date, g.voided_at, g.replaces_id, g.change_reason";
const GAN_TAT_CA = defineSql("pricing", "role_tiers_all", `SELECT ${COT_GAN} FROM prc_role_tier g ORDER BY (g.voided_at IS NOT NULL), (g.valid_to_date IS NOT NULL), g.valid_from_date DESC, g.id`);
// Gắn hiệu lực ở ?1 (cho `chonMuc`): KHÔNG lọc theo `prc_rate_tier.active` — mức đã tắt vẫn áp cho gắn đang có (N-23).
const GAN_NGAY = defineSql("pricing", "role_tiers_on",
  `SELECT ${COT_GAN} FROM prc_role_tier g WHERE g.voided_at IS NULL AND g.valid_from_date <= ?1 AND (g.valid_to_date IS NULL OR g.valid_to_date >= ?1)`);
const GAN_ID = defineSql("pricing", "role_tier_by_id", `SELECT ${COT_GAN} FROM prc_role_tier g WHERE g.id = ?1`);
const GAN_THEM = defineSql("pricing", "role_tier_insert",
  `INSERT INTO prc_role_tier (id, role_type_code, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7)`);
// Đổi chính sách của loại: chèn gắn mới ngay sau câu đóng gắn cũ trong cùng lô. Ngày bắt đầu NOT NULL chỉ có khi câu đóng đổi được dòng (changes() > 0) ⇒ gắn cũ đã đóng bằng
// đường khác thì cả lô lỗi NOT NULL, không sinh gắn mới. Dùng VALUES + CASE (INSERT…SELECT bị bài kiến trúc tính là đọc xuyên module).
const GAN_DOI_THEM = defineSql("pricing", "role_tier_change_insert",
  `INSERT INTO prc_role_tier (id, role_type_code, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, CASE WHEN changes() > 0 THEN ?4 END, NULL, ?5, ?6, ?5, ?6)`);
const GAN_DONG = defineSql("pricing", "role_tier_close",
  `UPDATE prc_role_tier SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND voided_at IS NULL AND valid_to_date IS ?5`);
const GAN_HUY = defineSql("pricing", "role_tier_void",
  `UPDATE prc_role_tier SET voided_at = ?2, voided_by = ?3, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND voided_at IS NULL AND valid_to_date IS ?4`);
const GAN_SUA_THEM = defineSql("pricing", "role_tier_edit_insert",
  `INSERT INTO prc_role_tier (id, role_type_code, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by, replaces_id, change_reason)
   VALUES (?1, ?2, ?3, CASE WHEN changes() > 0 THEN ?4 END, ?5, ?6, ?7, ?6, ?7, ?8, ?9)`);
// Cảnh báo N-17 (Ruling điều phối): dòng riêng theo LOẠI (bậc 4–6, thắng TA) còn hiệu lực trong khoảng [?2, ?3 | mãi], của loại ?1 VÀ của mọi loại mà một hồ sơ đang mang loại ?1
// cũng đang mang (đọc qua view công bố v_pty_open_role) — với hồ sơ ấy, dòng riêng của loại kia vẫn thắng dòng TA.
const DONG_RIENG_CHO_GAN = defineSql("pricing", "role_rules_for_tier_link",
  `SELECT ${COT_MUC}, NULL AS target_name, NULL AS tier_name FROM prc_commission_rule r LEFT JOIN prc_commission_rule_pax p ON p.rule_id = r.id
   WHERE r.target_role_code IS NOT NULL AND r.voided_at IS NULL
     AND (r.target_role_code = ?1 OR r.target_role_code IN (SELECT o2.role_type_code FROM v_pty_open_role o1 JOIN v_pty_open_role o2 ON o2.party_id = o1.party_id WHERE o1.role_type_code = ?1))
     AND r.valid_from_date <= COALESCE(?3, '9999-12-31') AND COALESCE(r.valid_to_date, '9999-12-31') >= ?2
   ORDER BY r.target_role_code, r.valid_from_date, r.id`);
// ADR-0138 (migration 0118): gắn mức RIÊNG của MỘT hồ sơ — mọi dòng CHƯA HUỶ (đang mở trước, rồi mới nhất). Ít dòng mỗi hồ sơ; lọc ngày ở `chonMuc` / `hieuLuc`.
// Câu TRA (docBangChoChup, khối «Hoa hồng hiện hành»): dòng huỷ (ADR-0148) không bao giờ vào `chonMuc` — CSDL không có lớp chặn cho gắn (bản chụp chỉ ghi mã dòng mức).
// KHÔNG lọc theo `prc_rate_tier.active` — như gắn theo loại (N-23).
const COT_GAN_RIENG = "g.id, g.party_id, g.tier_code, g.valid_from_date, g.valid_to_date, g.voided_at, g.replaces_id, g.change_reason";
const GAN_RIENG_HO_SO = defineSql("pricing", "party_tiers_of",
  `SELECT ${COT_GAN_RIENG} FROM prc_party_tier g WHERE g.party_id = ?1 AND g.voided_at IS NULL ORDER BY (g.valid_to_date IS NOT NULL), g.valid_from_date DESC, g.id`);
const GAN_RIENG_ID = defineSql("pricing", "party_tier_by_id", `SELECT ${COT_GAN_RIENG} FROM prc_party_tier g WHERE g.id = ?1`);
const GAN_RIENG_THEM = defineSql("pricing", "party_tier_insert",
  `INSERT INTO prc_party_tier (id, party_id, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7)`);
const GAN_RIENG_DONG = defineSql("pricing", "party_tier_close",
  `UPDATE prc_party_tier SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND voided_at IS NULL AND valid_to_date IS ?5`);
const GAN_RIENG_HUY = defineSql("pricing", "party_tier_void",
  `UPDATE prc_party_tier SET voided_at = ?2, voided_by = ?3, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND voided_at IS NULL AND valid_to_date IS ?4`);
const GAN_RIENG_SUA_THEM = defineSql("pricing", "party_tier_edit_insert",
  `INSERT INTO prc_party_tier (id, party_id, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by, replaces_id, change_reason)
   VALUES (?1, ?2, ?3, CASE WHEN changes() > 0 THEN ?4 END, ?5, ?6, ?7, ?6, ?7, ?8, ?9)`);
// Màn «Mức TA»: gắn mức riêng đang và sắp hiệu lực (chưa ngừng, hoặc ngừng từ hôm nay trở đi), chưa huỷ. Tên hồ sơ qua view công bố v_pty_party_label; không SĐT/email.
const GAN_RIENG_DANG_SAP = defineSql("pricing", "party_tiers_current",
  `SELECT g.id, g.party_id, l.display_name AS party_name, g.tier_code, t.name AS tier_name, g.valid_from_date, g.valid_to_date
   FROM prc_party_tier g JOIN v_pty_party_label l ON l.id = g.party_id JOIN prc_rate_tier t ON t.code = g.tier_code
   WHERE g.voided_at IS NULL AND (g.valid_to_date IS NULL OR g.valid_to_date >= ?1)
   ORDER BY g.valid_from_date, l.display_name, g.id`);
const NHA_CUNG_CAP = defineSql("pricing", "suppliers",
  `SELECT l.id, l.display_name FROM v_pty_party_label l WHERE l.active = 1 AND EXISTS (SELECT 1 FROM v_pty_open_role r WHERE r.party_id = l.id AND r.role_type_code = 'SUPPLIER')
   ORDER BY l.display_name`);

export const allRules = async (db: D1Database) => (await db.prepare(MUC_TAT_CA).all<RuleRow>()).results;
export const rulesOn = async (db: D1Database, ngay: string) => (await db.prepare(MUC_NGAY).bind(ngay).all<RuleRow>()).results;
export const ruleById = (db: D1Database, id: string) => db.prepare(MUC_ID).bind(id).first<RuleRow>();
export const insertRuleStatement = (db: D1Database, id: string, v: { targetPartyId: string | null; targetRoleCode: string | null; targetTierCode?: string | null; scope: string; catalogCode: string | null;
  groupCode: string | null; kind: string; rateBp: number | null; perPaxAmount: number | null; validFrom: string; validTo: string | null; note: string | null }, at: string, by: string) =>
  db.prepare(MUC_THEM).bind(id, v.targetPartyId, v.targetRoleCode, v.scope, v.catalogCode, v.groupCode, v.kind, v.rateBp, v.perPaxAmount, v.validFrom, v.validTo, v.note, at, by, v.targetTierCode ?? null);
/** Số tiền theo loại của dòng mức (ADR-0133), chèn SAU `insertRuleStatement` trong cùng lô: trigger bắt buộc người lớn = per_pax_amount của dòng. */
export const insertRulePaxStatement = (db: D1Database, ruleId: string, t: { adult: number; child: number; senior: number }, at: string, by: string) =>
  db.prepare(MUC_PAX_THEM).bind(ruleId, t.adult, t.child, t.senior, at, by);
/**
 * Lô «Đổi mức»: [đóng dòng cũ hết `denNgayCu`, chèn dòng mới từ `v.validFrom` chép đích + phạm vi của dòng cũ, (dòng phụ theo loại)]. Nơi gọi nối nhật ký `changes() > 0` ngay sau.
 * Dòng cũ đã đóng bằng đường khác ⇒ câu đóng `changes() = 0` ⇒ câu chèn làm cả lô lỗi (NOT NULL), không sinh dòng nào.
 */
export const cauDoiMuc = (db: D1Database, cuId: string, moiId: string, denNgayCu: string,
  cu: { targetPartyId: string | null; targetRoleCode: string | null; targetTierCode: string | null; scope: string; catalogCode: string | null; groupCode: string | null },
  v: { kind: string; rateBp: number | null; perPaxAmount: number | null; theoLoai?: { adult: number; child: number; senior: number } | null; validFrom: string; validTo: string | null; note: string | null },
  at: string, by: string): D1PreparedStatement[] => [
  db.prepare(MUC_DONG).bind(cuId, denNgayCu, at, by, null),
  db.prepare(MUC_DOI_THEM).bind(moiId, cu.targetPartyId, cu.targetRoleCode, cu.scope, cu.catalogCode, cu.groupCode, v.kind, v.rateBp, v.perPaxAmount, v.validFrom, v.validTo, v.note, at, by, cu.targetTierCode),
  ...(v.theoLoai ? [db.prepare(MUC_DOI_PAX_THEM).bind(moiId, v.theoLoai.adult, v.theoLoai.child, v.theoLoai.senior, at, by)] : []),
];
/** Đóng / rút ngắn dòng mức về `den`; `denDaDoc` = ngày kết thúc lúc route đọc dòng (khoá lạc quan). */
export const closeRuleStatement = (db: D1Database, id: string, den: string, denDaDoc: string | null, at: string, by: string) => db.prepare(MUC_DONG).bind(id, den, at, by, denDaDoc);
/** Cách «Sửa» xử lý dòng cũ (ADR-0148 Đ1, luật `kiemSua`): HUY = huỷ (chưa đơn nào chụp); DONG = đóng / rút ngắn về `den` (đã có đơn chụp). */
export type XuLyDongCu = { cach: "HUY" } | { cach: "DONG"; den: string };
const cauDongCu = (db: D1Database, sqlHuy: string, sqlDong: string, cuId: string, denDaDoc: string | null, xl: XuLyDongCu, at: string, by: string): D1PreparedStatement =>
  xl.cach === "HUY" ? db.prepare(sqlHuy).bind(cuId, at, by, denDaDoc) : db.prepare(sqlDong).bind(cuId, xl.den, at, by, denDaDoc);
/**
 * Lô «Sửa» dòng mức: [huỷ / đóng dòng cũ, chèn dòng mới mang `replaces_id` + lý do (đích + phạm vi chép từ dòng cũ), (dòng phụ theo loại)]. Nơi gọi nối nhật ký `changes() > 0` ngay sau.
 * Dòng cũ đã bị người khác đổi (khoá lạc quan) ⇒ câu đầu 0 dòng ⇒ câu chèn lỗi NOT NULL / trigger, cả lô huỷ.
 */
export const cauSuaMuc = (db: D1Database, cuId: string, denDaDoc: string | null, xl: XuLyDongCu, moiId: string,
  cu: { targetPartyId: string | null; targetRoleCode: string | null; targetTierCode: string | null; scope: string; catalogCode: string | null; groupCode: string | null },
  v: { kind: string; rateBp: number | null; perPaxAmount: number | null; theoLoai?: { adult: number; child: number; senior: number } | null; validFrom: string; validTo: string | null; note: string | null },
  lyDo: string, at: string, by: string): D1PreparedStatement[] => [
  cauDongCu(db, MUC_HUY, MUC_DONG, cuId, denDaDoc, xl, at, by),
  db.prepare(MUC_SUA_THEM).bind(moiId, cu.targetPartyId, cu.targetRoleCode, cu.scope, cu.catalogCode, cu.groupCode, v.kind, v.rateBp, v.perPaxAmount, v.validFrom, v.validTo, v.note, at, by,
    cu.targetTierCode, cuId, lyDo),
  ...(v.theoLoai ? [db.prepare(MUC_DOI_PAX_THEM).bind(moiId, v.theoLoai.adult, v.theoLoai.child, v.theoLoai.senior, at, by)] : []),
];
export const allTerms = async (db: D1Database) => (await db.prepare(DK_TAT_CA).all<TermRow>()).results;
export const termsOn = async (db: D1Database, ngay: string) => (await db.prepare(DK_NGAY).bind(ngay).all<TermRow>()).results;
export const termById = (db: D1Database, id: string) => db.prepare(DK_ID).bind(id).first<TermRow>();
export const insertTermStatement = (db: D1Database, id: string, v: { scope: string; catalogCode: string | null; groupCode: string | null; sellerPartyId: string; supplierPartyId: string | null;
  costRateBp: number | null; validFrom: string; validTo: string | null; note: string | null }, at: string, by: string) =>
  db.prepare(DK_THEM).bind(id, v.scope, v.catalogCode, v.groupCode, v.sellerPartyId, v.supplierPartyId, v.costRateBp, v.validFrom, v.validTo, v.note, at, by);
export const closeTermStatement = (db: D1Database, id: string, den: string, at: string, by: string) => db.prepare(DK_DONG).bind(id, den, at, by);
export const beneficiaryRoles = async (db: D1Database): Promise<string[]> => (await db.prepare(VAI_HUONG).all<{ role_type_code: string }>()).results.map((r) => r.role_type_code);
export const openRolesOf = async (db: D1Database, partyId: string) => (await db.prepare(VAI_MO).bind(partyId).all<{ role_type_code: string; role_group: string; is_partner_label: number }>()).results;
export const beneficiaryRolesAll = async (db: D1Database): Promise<{ role_type_code: string; active: number }[]> => (await db.prepare(VAI_HUONG_TAT_CA).all<{ role_type_code: string; active: number }>()).results;
export const insertBeneficiaryStatement = (db: D1Database, code: string, at: string, by: string) => db.prepare(VAI_HUONG_THEM).bind(code, at, by);
export const setBeneficiaryActiveStatement = (db: D1Database, code: string, active: boolean, at: string, by: string) => db.prepare(VAI_HUONG_DAT).bind(code, active ? 1 : 0, at, by);
export const isBeneficiary = async (db: D1Database, partyId: string): Promise<boolean> => (await db.prepare(LA_HUONG).bind(partyId).first()) !== null;
export const huongCuaHoSo = async (db: D1Database, partyId: string): Promise<{ partyId: string; ten: string } | null> => {
  const r = await db.prepare(HUONG_CUA_HO_SO).bind(partyId).first<{ id: string; display_name: string }>();
  return r ? { partyId: r.id, ten: r.display_name } : null;
};
export const groupsOf = async (db: D1Database, codes: readonly string[]): Promise<Map<string, string | null>> =>
  new Map((await db.prepare(NHOM_CUA).bind(JSON.stringify(codes)).all<{ catalog_code: string; group_code: string | null }>()).results.map((r) => [r.catalog_code, r.group_code]));
export const findBeneficiaries = async (db: D1Database, q: string) => (await db.prepare(TIM_HUONG).bind(q).all<{ id: string; display_name: string; party_kind: "PERSON" | "ORGANIZATION" }>()).results;
export const suppliers = async (db: D1Database) => (await db.prepare(NHA_CUNG_CAP).all<{ id: string; display_name: string }>()).results;
export const rateTiers = async (db: D1Database) => (await db.prepare(MUC_TA_TAT_CA).all<TierRow>()).results;
export const rateTierByCode = (db: D1Database, code: string) => db.prepare(MUC_TA_MA).bind(code).first<TierRow>();
export const insertRateTierStatement = (db: D1Database, v: { code: string; ten: string; khoa: string }, at: string, by: string) => db.prepare(MUC_TA_THEM).bind(v.code, v.ten, v.khoa, at, by);
export const setRateTierActiveStatement = (db: D1Database, code: string, active: boolean, at: string, by: string) => db.prepare(MUC_TA_DAT).bind(code, active ? 1 : 0, at, by);
export const roleTiersAll = async (db: D1Database) => (await db.prepare(GAN_TAT_CA).all<RoleTierRow>()).results;
export const roleTiersOn = async (db: D1Database, ngay: string) => (await db.prepare(GAN_NGAY).bind(ngay).all<RoleTierRow>()).results;
export const roleTierById = (db: D1Database, id: string) => db.prepare(GAN_ID).bind(id).first<RoleTierRow>();
export const insertRoleTierStatement = (db: D1Database, id: string, v: { roleTypeCode: string; tierCode: string; validFrom: string; validTo: string | null }, at: string, by: string) =>
  db.prepare(GAN_THEM).bind(id, v.roleTypeCode, v.tierCode, v.validFrom, v.validTo, at, by);
/** Lô «Đổi chính sách»: [đóng gắn cũ hết `denNgayCu`, chèn gắn mới từ `tuNgay` cùng loại]. Nơi gọi nối nhật ký `changes() > 0` ngay sau. */
export const cauDoiChinhSach = (db: D1Database, cuId: string, moiId: string, denNgayCu: string, roleTypeCode: string, tierCode: string, tuNgay: string, at: string, by: string): D1PreparedStatement[] => [
  db.prepare(GAN_DONG).bind(cuId, denNgayCu, at, by, null),
  db.prepare(GAN_DOI_THEM).bind(moiId, roleTypeCode, tierCode, tuNgay, at, by),
];
export const closeRoleTierStatement = (db: D1Database, id: string, den: string, denDaDoc: string | null, at: string, by: string) => db.prepare(GAN_DONG).bind(id, den, at, by, denDaDoc);
/** Lô «Sửa» gắn loại ↔ chính sách: [huỷ / đóng gắn cũ, chèn gắn mới cùng loại mang `replaces_id` + lý do]. Nơi gọi nối nhật ký `changes() > 0`. */
export const cauSuaGanLoai = (db: D1Database, cuId: string, denDaDoc: string | null, xl: XuLyDongCu, moiId: string, roleTypeCode: string,
  v: { tierCode: string; validFrom: string; validTo: string | null }, lyDo: string, at: string, by: string): D1PreparedStatement[] => [
  cauDongCu(db, GAN_HUY, GAN_DONG, cuId, denDaDoc, xl, at, by),
  db.prepare(GAN_SUA_THEM).bind(moiId, roleTypeCode, v.tierCode, v.validFrom, v.validTo, at, by, cuId, lyDo),
];
export const partyTiersOf = async (db: D1Database, partyId: string) => (await db.prepare(GAN_RIENG_HO_SO).bind(partyId).all<PartyTierRow>()).results;
export interface GanRiengRow { id: string; party_id: string; party_name: string; tier_code: string; tier_name: string; valid_from_date: string; valid_to_date: string | null }
export const partyTiersCurrent = async (db: D1Database, homNay: string) => (await db.prepare(GAN_RIENG_DANG_SAP).bind(homNay).all<GanRiengRow>()).results;
export const partyTierById = (db: D1Database, id: string) => db.prepare(GAN_RIENG_ID).bind(id).first<PartyTierRow>();
export const insertPartyTierStatement = (db: D1Database, id: string, v: { partyId: string; tierCode: string; validFrom: string; validTo: string | null }, at: string, by: string) =>
  db.prepare(GAN_RIENG_THEM).bind(id, v.partyId, v.tierCode, v.validFrom, v.validTo, at, by);
export const closePartyTierStatement = (db: D1Database, id: string, den: string, denDaDoc: string | null, at: string, by: string) => db.prepare(GAN_RIENG_DONG).bind(id, den, at, by, denDaDoc);
/** Lô «Sửa» gắn đối tác ↔ chính sách: [huỷ / đóng gắn cũ, chèn gắn mới cùng hồ sơ mang `replaces_id` + lý do]. Nơi gọi nối nhật ký `changes() > 0`. */
export const cauSuaGanRieng = (db: D1Database, cuId: string, denDaDoc: string | null, xl: XuLyDongCu, moiId: string, partyId: string,
  v: { tierCode: string; validFrom: string; validTo: string | null }, lyDo: string, at: string, by: string): D1PreparedStatement[] => [
  cauDongCu(db, GAN_RIENG_HUY, GAN_RIENG_DONG, cuId, denDaDoc, xl, at, by),
  db.prepare(GAN_RIENG_SUA_THEM).bind(moiId, partyId, v.tierCode, v.validFrom, v.validTo, at, by, cuId, lyDo),
];
export const roleRulesForTierLink = async (db: D1Database, roleTypeCode: string, tu: string, den: string | null) =>
  (await db.prepare(DONG_RIENG_CHO_GAN).bind(roleTypeCode, tu, den).all<RuleRow>()).results;
