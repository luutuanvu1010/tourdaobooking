// SQL của các bảng module parties sở hữu (pty_*). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và import bằng đuôi .ts để bài kiểm
// kiến trúc nạp được tệp này. Câu SQL TĨNH: tham số tuỳ chọn viết `?N IS NULL OR …`; tham số đánh số ?N để dùng lại một giá trị.
// Đọc địa điểm CHỈ qua view công bố v_loc_location_label (ADR-0008); không đụng bảng loc_* trực tiếp.
import { defineSql } from "../../shared/sql-registry.ts";
import type { ContactInput, OrgFields, PersonName, RelationshipInput, RoleInput } from "./rules.ts";
import type { GioiTinh } from "../../shared/xung-ho.ts";
import { composePersonName } from "./rules.ts";
import type { LoaiTep } from "./tep.ts";
import type { ChamTaiKhoan, LoaiCham } from "./xac-minh.ts";
import { DAU_DIA_CHI_PHIEU, DAU_LIEN_HE, DAU_NGAY_SINH_PHIEU, DAU_TEN, LY_DO_XOA_TEP_HET_GIU, LY_DO_XOA_TEP_PHIEU } from "./xoa-an-danh.ts";

export type PartyKind = "PERSON" | "ORGANIZATION";

export interface PartyListRow {
  id: string;
  party_kind: PartyKind;
  display_name: string;
  active: number;
  primary_phone: string | null;
  role_codes: string | null;
}
export interface PartyRow {
  id: string;
  party_kind: PartyKind;
  display_name: string;
  active: number;
  created_at: string;
  updated_at: string;
  family_name: string | null;
  middle_name: string | null;
  given_name: string | null;
  /** ADR-0084 Đ1: 'NAM' | 'NU' | NULL (= chưa ghi). Đọc thô — giá trị lạ (không qua mã) coi như chưa ghi ở DTO. */
  gender: string | null;
  /** ADR-0122 đ1: 'YYYY-MM-DD' | NULL. Chỉ ra DTO cho người được xem (src/modules/parties/rieng-tu.ts) — đừng đưa vào nhật ký, câu báo lỗi. */
  birth_date: string | null;
  legal_name: string | null;
  tax_code: string | null;
  address: string | null;
  invoice_email: string | null;
  /** ADR-0068: hồ sơ chính mà hồ sơ này đã gộp vào (NULL = chưa gộp), mốc gộp, tên hồ sơ chính. */
  merged_into_id: string | null;
  merged_at: string | null;
  merged_into_name: string | null;
}
export interface ContactRow { id: string; contact_kind_code: string; value: string; value_normalized: string; label: string | null; is_primary: number; valid_from_date: string; valid_to_date: string | null }
export interface RoleRow { id: string; role_type_code: string; role_name: string; location_id: string | null; location_name: string | null; valid_from_date: string; valid_to_date: string | null }
export interface RelationshipRow {
  id: string;
  relationship_type_code: string;
  type_name: string;
  from_party_id: string;
  from_name: string;
  to_party_id: string;
  to_name: string;
  valid_from_date: string;
  valid_to_date: string | null;
}
export interface TypeRow { code: string; name: string }

// ---- Đọc ---------------------------------------------------------------------------------------------------------
// ?1 = hôm nay (giờ VN) để tính "vai trò đang hiệu lực".
const LIST_SELECT = `SELECT p.id, p.party_kind, p.display_name, p.active,
  (SELECT c.value FROM pty_contact_point c WHERE c.party_id = p.id AND c.contact_kind_code = 'PHONE' AND c.is_primary = 1 AND c.valid_to_date IS NULL) AS primary_phone,
  (SELECT group_concat(r.role_type_code) FROM pty_party_role r
    WHERE r.party_id = p.id AND r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)) AS role_codes
  FROM v_pty_party_label p`;

// ?2 loại, ?3 LIKE tên, ?4 LIKE số (chuẩn hoá — CHỈ liên hệ SĐT / email: chữ số của liên hệ ĐỊA CHỈ không được dò ra người, ADR-0122 đ5), ?5 mã vai trò, ?6 địa điểm, ?7 gồm cả đã ngưng, ?8 giới hạn, ?9 vị trí bắt đầu
const LIST = defineSql(
  "parties",
  "list",
  `${LIST_SELECT}
   WHERE (?2 IS NULL OR p.party_kind = ?2)
     AND (?3 IS NULL OR p.display_name LIKE ?3 ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = p.id AND c.valid_to_date IS NULL AND c.contact_kind_code IN ('PHONE', 'EMAIL')
                     AND c.value_normalized LIKE ?4 ESCAPE '\\'))
     AND ((?5 IS NULL AND ?6 IS NULL)
          OR EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = p.id AND (?5 IS NULL OR r.role_type_code = ?5) AND (?6 IS NULL OR r.location_id = ?6)
                       AND r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)))
     AND NOT EXISTS (SELECT 1 FROM pty_party m WHERE m.id = p.id AND m.merged_into_id IS NOT NULL)
     AND (?7 = 1 OR p.active = 1)
   ORDER BY p.sort_key COLLATE NOCASE, p.id LIMIT ?8 OFFSET ?9`,
);

// ?2 = số điện thoại đã chuẩn hoá. Chỉ liên hệ đang mở. Không chặn tạo trùng — chỉ để giao diện hỏi "dùng có sẵn hay tạo mới" (ADR-0001 mục 8).
const LOOKUP = defineSql(
  "parties",
  "lookup_phone",
  `${LIST_SELECT}
   WHERE p.id IN (SELECT c.party_id FROM pty_contact_point c WHERE c.contact_kind_code = 'PHONE' AND c.value_normalized = ?2 AND c.valid_to_date IS NULL)
     AND NOT EXISTS (SELECT 1 FROM pty_party m WHERE m.id = p.id AND m.merged_into_id IS NOT NULL)
   ORDER BY p.sort_key COLLATE NOCASE, p.id LIMIT 20`,
);

const FIND = defineSql(
  "parties",
  "find",
  `SELECT p.id, p.party_kind, p.display_name, p.active, p.created_at, p.updated_at, pe.family_name, pe.middle_name, pe.given_name, pe.gender, pe.birth_date,
          o.legal_name, o.tax_code, o.address, o.invoice_email, p.merged_into_id, p.merged_at, t.display_name AS merged_into_name
   FROM pty_party p LEFT JOIN pty_person pe ON pe.party_id = p.id LEFT JOIN pty_organization o ON o.party_id = p.id LEFT JOIN pty_party t ON t.id = p.merged_into_id
   WHERE p.id = ?1`,
);
const CONTACTS_OF = defineSql(
  "parties",
  "contacts_of",
  `SELECT id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, valid_to_date FROM pty_contact_point WHERE party_id = ?1
   ORDER BY (valid_to_date IS NOT NULL), contact_kind_code, is_primary DESC, valid_from_date DESC`,
);
const ROLES_OF = defineSql(
  "parties",
  "roles_of",
  `SELECT r.id, r.role_type_code, t.name AS role_name, r.location_id, l.name AS location_name, r.valid_from_date, r.valid_to_date
   FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code LEFT JOIN v_loc_location_label l ON l.id = r.location_id
   WHERE r.party_id = ?1 ORDER BY (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`,
);
const RELATIONSHIPS_OF = defineSql(
  "parties",
  "relationships_of",
  `SELECT r.id, r.relationship_type_code, t.name AS type_name, r.from_party_id, f.display_name AS from_name, r.to_party_id, tp.display_name AS to_name,
          r.valid_from_date, r.valid_to_date
   FROM pty_party_relationship r JOIN pty_relationship_type t ON t.code = r.relationship_type_code
     JOIN v_pty_party_label f ON f.id = r.from_party_id JOIN v_pty_party_label tp ON tp.id = r.to_party_id
   WHERE r.from_party_id = ?1 OR r.to_party_id = ?1 ORDER BY (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`,
);
// Mọi loại vai (cả vai đã ngưng) kèm nhóm: giao diện cần tên đúng của vai cũ để hiện; ô "thêm vai" tự lọc nhóm OTHER đang dùng.
// ADR-0117 điều 1: thêm / tắt / bật LOẠI ĐỐI TÁC (nhóm OTHER, cờ is_partner_label = 1). `sort_order` = 100 + số loại nhãn đã có, chỉ để xếp cuối. Cập nhật CHỈ chạm loại nhãn
// (`AND is_partner_label = 1`): năm vai bên ngoài cũ là vai đăng nhập, không tắt / bật ở đây. `active <> ?2`: đã đúng trạng thái ⇒ 0 dòng đổi (route trả 409 stale).
const LOAI_DOI_TAC_THEM = defineSql("parties", "partner_label_insert",
  `INSERT INTO pty_role_type (code, name, sort_order, active, role_group, is_partner_label)
   VALUES (?1, ?2, 100 + (SELECT count(*) FROM pty_role_type WHERE is_partner_label = 1), 1, 'OTHER', 1)`);
const LOAI_DOI_TAC_DAT = defineSql("parties", "partner_label_set_active",
  `UPDATE pty_role_type SET active = ?2 WHERE code = ?1 AND is_partner_label = 1 AND active <> ?2`);
const ROLE_TYPES = defineSql("parties", "role_types", "SELECT code, name, role_group, active, is_partner_label FROM pty_role_type ORDER BY sort_order");
const RELATIONSHIP_TYPES = defineSql("parties", "relationship_types", "SELECT code, name FROM pty_relationship_type WHERE active = 1 ORDER BY sort_order");
// ADR-0024 điều 6 / 6.2: hồ sơ "công ty chủ" = hồ sơ đang mở vai ?1. LIMIT 2 để nơi gọi phân biệt "đúng một" với "không có / hơn một" (bốn trigger của
// migration *_ho_so_cong_ty_chu giữ đúng một). Hotline = liên hệ PHONE đang mở có nhãn "Hotline" (6.1; không phân biệt hoa thường), ưu tiên liên hệ chính
// rồi mới nhất; email = liên hệ EMAIL đang mở, ưu tiên liên hệ chính. KHÔNG trả Zalo (chưa nơi nào đọc; CompanyDto cố ý không có).
// Định danh công ty của hồ sơ `p` (+ tổ chức `o`): MỘT định nghĩa cho hai câu dưới (công ty chủ hiện tại; một hồ sơ sắp làm công ty chủ — Ruling T8),
// để "Hotline là gì" không có hai bản.
const DINH_DANH_CONG_TY = `p.id, p.display_name, o.legal_name, o.tax_code, o.address,
     (SELECT c.value FROM pty_contact_point c WHERE c.party_id = p.id AND c.contact_kind_code = 'PHONE' AND c.valid_to_date IS NULL AND lower(trim(c.label)) = 'hotline'
       ORDER BY c.is_primary DESC, c.valid_from_date DESC, c.created_at DESC, c.id LIMIT 1) AS hotline,
     (SELECT c.value FROM pty_contact_point c WHERE c.party_id = p.id AND c.contact_kind_code = 'EMAIL' AND c.valid_to_date IS NULL
       ORDER BY c.is_primary DESC, c.valid_from_date DESC, c.created_at DESC, c.id LIMIT 1) AS email`;
const OWNER_COMPANY = defineSql(
  "parties",
  "owner_company",
  `SELECT ${DINH_DANH_CONG_TY}
   FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id LEFT JOIN pty_organization o ON o.party_id = p.id
   WHERE r.role_type_code = ?1 AND r.valid_to_date IS NULL LIMIT 2`,
);
// Ruling T8 (điều phối, áp ADR-0043 "không lúc nào trống"): định danh của MỘT hồ sơ ?1 — route gán "Công ty chủ" kiểm đủ mục trước khi đổi. Không có hồ sơ → không dòng.
const COMPANY_IDENTITY_OF = defineSql(
  "parties",
  "company_identity_of",
  `SELECT ${DINH_DANH_CONG_TY}
   FROM pty_party p LEFT JOIN pty_organization o ON o.party_id = p.id
   WHERE p.id = ?1`,
);

export interface ListFilter {
  today: string;
  kind: PartyKind | null;
  q: string | null; // dựng bằng mauLikeChua (escape LIKE, bọc %…%, ≤ 50 byte)
  phoneLike: string | null; // chỉ chữ số, bọc %…%
  roleCode: string | null;
  locationId: string | null;
  includeInactive: boolean;
  limit: number;
  offset: number;
}

export async function listParties(db: D1Database, f: ListFilter): Promise<{ rows: PartyListRow[]; hasMore: boolean }> {
  const { results } = await db
    .prepare(LIST)
    .bind(f.today, f.kind, f.q, f.phoneLike, f.roleCode, f.locationId, f.includeInactive ? 1 : 0, f.limit + 1, f.offset)
    .all<PartyListRow>();
  return { rows: results.slice(0, f.limit), hasMore: results.length > f.limit };
}

export async function findPartiesByPhone(db: D1Database, normalizedPhone: string, today: string): Promise<PartyListRow[]> {
  const { results } = await db.prepare(LOOKUP).bind(today, normalizedPhone).all<PartyListRow>();
  return results;
}

export function findParty(db: D1Database, id: string): Promise<PartyRow | null> {
  return db.prepare(FIND).bind(id).first<PartyRow>();
}

/** Hồ sơ + liên hệ + vai trò + quan hệ trong MỘT lượt gọi D1 (db.batch). Null nếu không có hồ sơ. */
export async function getPartyDetail(db: D1Database, id: string): Promise<{ party: PartyRow; contacts: ContactRow[]; roles: RoleRow[]; relationships: RelationshipRow[] } | null> {
  const [party, contacts, roles, relationships] = await db.batch([
    db.prepare(FIND).bind(id),
    db.prepare(CONTACTS_OF).bind(id),
    db.prepare(ROLES_OF).bind(id),
    db.prepare(RELATIONSHIPS_OF).bind(id),
  ]);
  const row = (party!.results as PartyRow[])[0];
  if (!row) return null;
  return { party: row, contacts: contacts!.results as ContactRow[], roles: roles!.results as RoleRow[], relationships: relationships!.results as RelationshipRow[] };
}

export interface RoleTypeRow { code: string; name: string; role_group: string; active: number; is_partner_label: number; /** ADR-0117: = is_partner_label = 1. */ partnerLabel: boolean }
export async function listRoleTypes(db: D1Database): Promise<RoleTypeRow[]> {
  return (await db.prepare(ROLE_TYPES).all<Omit<RoleTypeRow, "partnerLabel">>()).results.map((r) => ({ ...r, partnerLabel: r.is_partner_label === 1 }));
}
export const themLoaiDoiTacStatement = (db: D1Database, v: { code: string; ten: string }): D1PreparedStatement => db.prepare(LOAI_DOI_TAC_THEM).bind(v.code, v.ten);
export const datHoatDongLoaiDoiTacStatement = (db: D1Database, code: string, bat: boolean): D1PreparedStatement => db.prepare(LOAI_DOI_TAC_DAT).bind(code, bat ? 1 : 0);
// ADR-0024 6.4: hồ sơ ?1 có đang mở vai ?2 (mã vai công ty chủ) không — câu tra dữ liệu dùng NỘI BỘ module (route ghi, respondParty). KHÔNG xuất qua index.ts.
const IS_OWNER_COMPANY = defineSql("parties", "is_owner_company", "SELECT 1 AS x FROM pty_party_role WHERE party_id = ?1 AND role_type_code = ?2 AND valid_to_date IS NULL LIMIT 1");
export async function isOwnerCompanyParty(db: D1Database, partyId: string, roleCode: string): Promise<boolean> {
  return (await db.prepare(IS_OWNER_COMPANY).bind(partyId, roleCode).first()) !== null;
}
// ADR-0048 B1.2 (lớp route): hồ sơ ?1 có đang mở vai Nhà xe đối tác không — đọc view v_pty_carrier của CHÍNH module (một định nghĩa "đang là nhà xe" với
// trigger 0038). Dùng NỘI BỘ module (route quan hệ "Tài xế của"). KHÔNG xuất qua index.ts — module khác hỏi "nhà xe nào" qua nhaXeDangHopTac.
const IS_CARRIER = defineSql("parties", "is_carrier", "SELECT 1 AS x FROM v_pty_carrier WHERE party_id = ?1 LIMIT 1");
export async function isCarrierParty(db: D1Database, partyId: string): Promise<boolean> {
  return (await db.prepare(IS_CARRIER).bind(partyId).first()) !== null;
}
export interface OwnerCompanyRow { id: string; display_name: string; legal_name: string | null; tax_code: string | null; address: string | null; hotline: string | null; email: string | null }
/** Các hồ sơ đang mở vai `roleCode` (tối đa 2) kèm định danh — chỉ `ownerCompany` của index.ts gọi, với mã vai công ty chủ. */
export async function ownerCompanyRows(db: D1Database, roleCode: string): Promise<OwnerCompanyRow[]> {
  return (await db.prepare(OWNER_COMPANY).bind(roleCode).all<OwnerCompanyRow>()).results;
}
/** Định danh công ty của một hồ sơ (null nếu không có hồ sơ) — NỘI BỘ module: route gán "Công ty chủ" kiểm đủ mục (Ruling T8). KHÔNG xuất qua index.ts. */
export async function companyIdentityOf(db: D1Database, partyId: string): Promise<OwnerCompanyRow | null> {
  return db.prepare(COMPANY_IDENTITY_OF).bind(partyId).first<OwnerCompanyRow>();
}
export async function listRelationshipTypes(db: D1Database): Promise<TypeRow[]> {
  return (await db.prepare(RELATIONSHIP_TYPES).all<TypeRow>()).results;
}

// ---- Ghi (trả CÂU LỆNH chưa chạy để gộp vào một db.batch() cùng nhật ký — ARCHITECTURE quy tắc 3) ------------------
const INSERT_PARTY = defineSql(
  "parties",
  "insert_party",
  "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?4, ?5)",
);
const INSERT_PERSON = defineSql(
  "parties",
  "insert_person",
  `INSERT INTO pty_person (party_id, family_name, middle_name, given_name, gender, birth_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?7, ?8, ?5, ?6, ?5, ?6)`,
);
const INSERT_ORG = defineSql(
  "parties",
  "insert_org",
  `INSERT INTO pty_organization (party_id, legal_name, tax_code, address, invoice_email, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7)`,
);
const INSERT_CONTACT = defineSql(
  "parties",
  "insert_contact",
  `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?9, ?10)`,
);
const DEMOTE_PRIMARY = defineSql(
  "parties",
  "demote_primary",
  `UPDATE pty_contact_point SET is_primary = 0, updated_at = ?3, updated_by = ?4
   WHERE party_id = ?1 AND contact_kind_code = ?2 AND is_primary = 1 AND valid_to_date IS NULL`,
);
const END_CONTACT = defineSql(
  "parties",
  "end_contact",
  `UPDATE pty_contact_point SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND valid_to_date IS NULL AND ?3 >= valid_from_date`,
);
const INSERT_ROLE = defineSql(
  "parties",
  "insert_role",
  `INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
);
const END_ROLE = defineSql(
  "parties",
  "end_role",
  `UPDATE pty_party_role SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND valid_to_date IS NULL AND ?3 >= valid_from_date`,
);
const INSERT_RELATIONSHIP = defineSql(
  "parties",
  "insert_relationship",
  `INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
);
const END_RELATIONSHIP = defineSql(
  "parties",
  "end_relationship",
  `UPDATE pty_party_relationship SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND (from_party_id = ?2 OR to_party_id = ?2) AND valid_to_date IS NULL AND ?3 >= valid_from_date`,
);
// Khoá lạc quan: mọi câu sửa hồ sơ mang cùng điều kiện "mốc cập nhật của pty_party còn đúng mốc client đã đọc"; câu sửa pty_party đứng CUỐI
// (nó đổi mốc) nên các câu trước và sau đều thấy cùng một trạng thái trong giao dịch db.batch. Không cần dựa vào bảng của module khác.
const UPDATE_PERSON = defineSql(
  "parties",
  "update_person",
  `UPDATE pty_person SET family_name = ?2, middle_name = ?3, given_name = ?4, gender = ?8, birth_date = ?9, updated_at = ?5, updated_by = ?6
   WHERE party_id = ?1 AND (SELECT updated_at FROM pty_party WHERE id = ?1) = ?7`,
);
const UPDATE_ORG = defineSql(
  "parties",
  "update_org",
  `UPDATE pty_organization SET legal_name = ?2, tax_code = ?3, address = ?4, invoice_email = ?5, updated_at = ?6, updated_by = ?7
   WHERE party_id = ?1 AND (SELECT updated_at FROM pty_party WHERE id = ?1) = ?8`,
);
// Đổi tên KHÔNG khoá lạc quan: dành cho quản trị viên đổi tên tài khoản (module staff gọi). Sửa hồ sơ từ giao diện dùng updatePartyStatements.
// Cờ "chỉ đổi khi câu NGAY TRƯỚC trong cùng db.batch() đã áp dụng" (`changes() > 0`): để người gọi ghép hai câu này vào một batch có
// câu CHỐT thắng/thua của mình (vị từ chốt nằm ở bảng module khác nên không viết được vào đây — ADR-0002 điều 8(b)). Chỉ đúng khi câu
// ngay trước là câu chốt hoặc một câu đã mang cùng điều kiện; vì vậy hai câu dưới đây phải đứng LIỀN NHAU và pty_party đi TRƯỚC
// (dòng pty_party chắc chắn có — khoá ngoại staff.party_id; dòng pty_person có thể thiếu ở dữ liệu di trú nửa chừng).
const RENAME_PARTY = defineSql(
  "parties",
  "rename_party",
  "UPDATE pty_party SET display_name = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND (?5 = 0 OR changes() > 0)",
);
const RENAME_PERSON = defineSql(
  "parties",
  "rename_person",
  "UPDATE pty_person SET family_name = ?2, middle_name = ?3, given_name = ?4, updated_at = ?5, updated_by = ?6 WHERE party_id = ?1 AND (?7 = 0 OR changes() > 0)",
);
const UPDATE_PARTY = defineSql(
  "parties",
  "update_party",
  "UPDATE pty_party SET display_name = ?2, active = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND updated_at = ?6",
);

const contactStatement = (db: D1Database, partyId: string, c: ContactInput, from: string, actorId: string | null, at: string): D1PreparedStatement =>
  db.prepare(INSERT_CONTACT).bind(crypto.randomUUID(), partyId, c.kind, c.value, c.valueNormalized, c.label, c.isPrimary ? 1 : 0, from, at, actorId);

const roleStatement = (db: D1Database, partyId: string, r: RoleInput, actorId: string | null, at: string): D1PreparedStatement =>
  db.prepare(INSERT_ROLE).bind(crypto.randomUUID(), partyId, r.roleTypeCode, r.locationId, r.from, r.to, at, actorId);

/** Tạo hồ sơ cá nhân (+ liên hệ + vai trò ban đầu). API công khai cho module khác (staff tạo tài khoản kèm hồ sơ + vai STAFF). */
export function newPersonStatements(
  db: D1Database,
  input: { name: PersonName; gender?: GioiTinh | null; birthDate?: string | null; contacts?: ContactInput[]; roles?: RoleInput[]; contactsFrom: string },
  actorId: string | null,
  at: string,
): { partyId: string; statements: D1PreparedStatement[] } {
  const partyId = crypto.randomUUID();
  const { name } = input;
  return {
    partyId,
    statements: [
      db.prepare(INSERT_PARTY).bind(partyId, "PERSON", composePersonName(name), at, actorId),
      db.prepare(INSERT_PERSON).bind(partyId, name.family, name.middle, name.given, at, actorId, input.gender ?? null, input.birthDate ?? null),
      ...(input.contacts ?? []).map((c) => contactStatement(db, partyId, c, input.contactsFrom, actorId, at)),
      ...(input.roles ?? []).map((r) => roleStatement(db, partyId, r, actorId, at)),
    ],
  };
}

export function newOrganizationStatements(
  db: D1Database,
  input: { org: OrgFields; contacts?: ContactInput[]; contactsFrom: string },
  actorId: string | null,
  at: string,
): { partyId: string; statements: D1PreparedStatement[] } {
  const partyId = crypto.randomUUID();
  const { org } = input;
  return {
    partyId,
    statements: [
      db.prepare(INSERT_PARTY).bind(partyId, "ORGANIZATION", org.displayName, at, actorId),
      db.prepare(INSERT_ORG).bind(partyId, org.legalName, org.taxCode, org.address, org.invoiceEmail, at, actorId),
      ...(input.contacts ?? []).map((c) => contactStatement(db, partyId, c, input.contactsFrom, actorId, at)),
    ],
  };
}

/** Sửa hồ sơ có khoá lạc quan. Kết quả db.batch: phần tử CUỐI (UPDATE pty_party) có changes() = 0 nghĩa là mốc đã cũ (409). */
export function updatePartyStatements(
  db: D1Database,
  id: string,
  // `gender`, `birthDate` ĐÃ quyết (route thay "vắng ô" bằng giá trị đang lưu — ADR-0084 Đ1, ADR-0122 đ1).
  v: { kind: "PERSON"; name: PersonName; gender: GioiTinh | null; birthDate: string | null; active: boolean; expectedUpdatedAt: string } | { kind: "ORGANIZATION"; org: OrgFields; active: boolean; expectedUpdatedAt: string },
  actorId: string,
  at: string,
  // ADR-0125 / ADR-0122 đ3: ngày sinh ĐỔI ⇒ đánh dấu "cần xác minh lại" (nếu đang DA_XAC_MINH), đứng TRƯỚC câu đổi mốc pty_party (câu cuối), cùng khoá lạc quan.
  canXacMinhLai = false,
): D1PreparedStatement[] {
  if (v.kind === "PERSON") {
    return [
      db.prepare(UPDATE_PERSON).bind(id, v.name.family, v.name.middle, v.name.given, at, actorId, v.expectedUpdatedAt, v.gender, v.birthDate),
      ...(canXacMinhLai ? [canXacMinhLaiStatement(db, { partyId: id, targetKind: "ATTRIBUTE", targetId: null, attributeCode: "NGAY_SINH", expectedUpdatedAt: v.expectedUpdatedAt, actorId, at })] : []),
      db.prepare(UPDATE_PARTY).bind(id, composePersonName(v.name), v.active ? 1 : 0, at, actorId, v.expectedUpdatedAt),
    ];
  }
  return [
    db.prepare(UPDATE_ORG).bind(id, v.org.legalName, v.org.taxCode, v.org.address, v.org.invoiceEmail, at, actorId, v.expectedUpdatedAt),
    db.prepare(UPDATE_PARTY).bind(id, v.org.displayName, v.active ? 1 : 0, at, actorId, v.expectedUpdatedAt),
  ];
}

/**
 * Đổi tên hồ sơ cá nhân (hai câu LIỀN NHAU, pty_party trước). `onlyIfPrevApplied` = true: chỉ đổi khi câu ngay trước trong cùng
 * `db.batch()` đã áp dụng (`changes() > 0`) — dùng khi người gọi có câu chốt thắng/thua đứng trước, để một lần sửa không nửa vời.
 */
export function renamePersonStatements(db: D1Database, partyId: string, name: PersonName, actorId: string, at: string, onlyIfPrevApplied = false): D1PreparedStatement[] {
  const guard = onlyIfPrevApplied ? 1 : 0;
  return [
    db.prepare(RENAME_PARTY).bind(partyId, composePersonName(name), at, actorId, guard),
    db.prepare(RENAME_PERSON).bind(partyId, name.family, name.middle, name.given, at, actorId, guard),
  ];
}

/** Thêm một liên hệ; nếu là liên hệ chính thì hạ liên hệ chính đang mở cùng loại xuống trước (một liên hệ chính mỗi loại). */
export function addContactStatements(db: D1Database, partyId: string, c: ContactInput, from: string, actorId: string, at: string): D1PreparedStatement[] {
  return [...(c.isPrimary ? [db.prepare(DEMOTE_PRIMARY).bind(partyId, c.kind, at, actorId)] : []), contactStatement(db, partyId, c, from, actorId, at)];
}
export const endContactStatement = (db: D1Database, partyId: string, contactId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(END_CONTACT).bind(contactId, partyId, to, at, actorId);

export const addRoleStatement = (db: D1Database, partyId: string, r: RoleInput, actorId: string, at: string): D1PreparedStatement => roleStatement(db, partyId, r, actorId, at);
export const endRoleStatement = (db: D1Database, partyId: string, roleId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(END_ROLE).bind(roleId, partyId, to, at, actorId);

export const addRelationshipStatement = (db: D1Database, r: RelationshipInput, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_RELATIONSHIP).bind(crypto.randomUUID(), r.fromPartyId, r.toPartyId, r.typeCode, r.from, r.to, at, actorId);
export const endRelationshipStatement = (db: D1Database, partyId: string, relationshipId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(END_RELATIONSHIP).bind(relationshipId, partyId, to, at, actorId);

// ---- Vai với Tour Đảo của hồ sơ gắn tài khoản (ADR-0018 điều 3) — CHỈ hàm sinh quyền của module staff dùng, qua index.ts ---------------------
export interface AccountRoleRow { id: string; role_type_code: string; valid_from_date: string; valid_to_date: string | null }
// ?2 = hôm nay (giờ VN). Vai không gắn nơi: đang mở, hoặc đã đóng TỪ hôm nay trở đi (để mở lại trong ngày thay vì chèn dòng chồng lấn).
const ACCOUNT_ROLES_OF = defineSql(
  "parties",
  "account_roles_of",
  `SELECT id, role_type_code, valid_from_date, valid_to_date FROM pty_party_role
   WHERE party_id = ?1 AND location_id IS NULL AND (valid_to_date IS NULL OR valid_to_date >= ?2)
   ORDER BY valid_from_date, id`,
);
// ?1 = mảng JSON các id hồ sơ. Vai KHÔNG GẮN NƠI đang mở, gộp theo hồ sơ — MỘT truy vấn cho cả danh sách tài khoản. Cùng điều kiện
// location_id IS NULL với ACCOUNT_ROLES_OF (Ruling R1): vai gắn một nơi cụ thể (HDV/tài xế tại một bến…) không phải vai tài khoản.
const OPEN_ROLE_CODES_FOR = defineSql(
  "parties",
  "open_role_codes_for",
  `SELECT party_id, group_concat(role_type_code) AS codes FROM pty_party_role
   WHERE party_id IN (SELECT value FROM json_each(?1)) AND location_id IS NULL AND valid_to_date IS NULL GROUP BY party_id`,
);
// Nhóm + trạng thái "đang dùng" của MỘT loại vai (route thêm vai: vai tài khoản → màn Quản lý tài khoản; loại đã ngưng → không gán mới — Ruling R6, ADR-0040 D3).
const ROLE_TYPE_OF = defineSql("parties", "role_type_of", "SELECT role_group, active, is_partner_label FROM pty_role_type WHERE code = ?1");
// ADR-0117 điều 4: hồ sơ nào trong ?1 (mảng JSON id) đang mang loại đối tác được hưởng — đọc view công bố của CHÍNH module (một định nghĩa với trigger stf_permission).
const HO_SO_MANG_NHAN = defineSql("parties", "ho_so_mang_nhan", "SELECT party_id FROM v_pty_party_partner_label WHERE party_id IN (SELECT value FROM json_each(?1))");
// ADR-0117 điều 4 (chiều 1, lớp route): vai ĐANG MỞ của hồ sơ ?1 kèm nhóm — "đang mở" = valid_to_date IS NULL, KHÔNG lọc nơi: đúng định nghĩa của trigger
// *_partner_label_conflict (và R-P8: cùng cách với nguồn sinh quyền), để lớp route không lỏng hơn lớp CSDL. Dùng hỏi luật «nội bộ» (rules.ts hoSoNoiBo).
const VAI_DANG_MO = defineSql(
  "parties",
  "vai_dang_mo",
  `SELECT r.role_type_code AS code, t.role_group AS grp FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
   WHERE r.party_id = ?1 AND r.valid_to_date IS NULL`,
);
// Nhóm + mã vai của MỘT dòng vai thuộc hồ sơ ?2 (route kết thúc vai: vai tài khoản → màn Quản lý tài khoản; vai "Công ty chủ" → ô company.legal.write, ADR-0024 6.5).
const ROLE_ROW_OF = defineSql(
  "parties",
  "role_row_of",
  "SELECT t.role_group, r.role_type_code FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code WHERE r.id = ?1 AND r.party_id = ?2",
);
// Hai đầu của MỘT dòng quan hệ thuộc hồ sơ ?2 (ADR-0019 điều 2 / Q11: luật cấp bậc xét cả hai đầu khi kết thúc quan hệ). Không có dòng → null.
const RELATIONSHIP_ENDS = defineSql(
  "parties",
  "relationship_ends",
  "SELECT from_party_id, to_party_id FROM pty_party_relationship WHERE id = ?1 AND (from_party_id = ?2 OR to_party_id = ?2)",
);
const REOPEN_ROLE = defineSql(
  "parties",
  "reopen_role",
  "UPDATE pty_party_role SET valid_to_date = NULL, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND party_id = ?2 AND valid_to_date IS NOT NULL",
);

export async function accountRolesOf(db: D1Database, partyId: string, today: string): Promise<AccountRoleRow[]> {
  return (await db.prepare(ACCOUNT_ROLES_OF).bind(partyId, today).all<AccountRoleRow>()).results;
}
export async function openRoleCodesFor(db: D1Database, partyIds: readonly string[]): Promise<Map<string, string[]>> {
  if (partyIds.length === 0) return new Map();
  const { results } = await db.prepare(OPEN_ROLE_CODES_FOR).bind(JSON.stringify(partyIds)).all<{ party_id: string; codes: string }>();
  return new Map(results.map((r) => [r.party_id, r.codes.split(",")]));
}
/** Loại vai `code`: nhóm và còn dùng không; null nếu mã không có trong danh mục. */
export async function roleTypeOf(db: D1Database, code: string): Promise<{ group: string; active: boolean; partnerLabel: boolean } | null> {
  const r = await db.prepare(ROLE_TYPE_OF).bind(code).first<{ role_group: string; active: number; is_partner_label: number }>();
  return r ? { group: r.role_group, active: r.active === 1, partnerLabel: r.is_partner_label === 1 } : null;
}
/** ADR-0117: tập id (trong `partyIds`) đang mang loại đối tác được hưởng. */
export async function hoSoMangNhan(db: D1Database, partyIds: readonly string[]): Promise<Set<string>> {
  if (partyIds.length === 0) return new Set();
  const { results } = await db.prepare(HO_SO_MANG_NHAN).bind(JSON.stringify(partyIds)).all<{ party_id: string }>();
  return new Set(results.map((r) => r.party_id));
}
/** ADR-0117: vai đang mở (valid_to_date IS NULL, mọi nơi) của hồ sơ kèm nhóm. */
export async function vaiDangMo(db: D1Database, partyId: string): Promise<{ code: string; group: string }[]> {
  const { results } = await db.prepare(VAI_DANG_MO).bind(partyId).all<{ code: string; grp: string }>();
  return results.map((r) => ({ code: r.code, group: r.grp }));
}
export async function roleRowOf(db: D1Database, partyId: string, roleId: string): Promise<{ group: string; code: string } | null> {
  const r = await db.prepare(ROLE_ROW_OF).bind(roleId, partyId).first<{ role_group: string; role_type_code: string }>();
  return r ? { group: r.role_group, code: r.role_type_code } : null;
}
export async function relationshipEnds(db: D1Database, partyId: string, relationshipId: string): Promise<{ from: string; to: string } | null> {
  const r = await db.prepare(RELATIONSHIP_ENDS).bind(relationshipId, partyId).first<{ from_party_id: string; to_party_id: string }>();
  return r ? { from: r.from_party_id, to: r.to_party_id } : null;
}
export const reopenRoleStatement = (db: D1Database, partyId: string, roleId: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(REOPEN_ROLE).bind(roleId, partyId, at, actorId);

// ---- Giấy tờ của người (ADR-0040 D2) -------------------------------------------------------------------------------------------------------------------
// Số giấy tờ là dữ liệu cá nhân: câu ĐỌC danh sách chỉ lấy `number_key` để CHE ở index.ts (cheSo) — không lấy `document_number`; số đầy đủ chỉ rời máy chủ
// ở route "xem đủ số". "Hiện hành" = chưa huỷ và không có dòng gia hạn CHƯA huỷ nối tiếp (khớp trigger *_superseded của migration *_giay_to_cua_nguoi).
export interface PersonDocRow {
  id: string;
  document_type_code: string;
  type_name: string;
  license_class_code: string | null;
  class_name: string | null;
  number_key: string | null;
  issued_date: string | null;
  issued_place: string | null;
  expiry_date: string | null;
  previous_id: string | null;
  voided_at: string | null;
  updated_at: string;
  is_current: number;
  /** 1 = dòng đã ẩn danh (ADR-0126): số che trả null + `daXoa`, không "xem đủ số", không gia hạn / sửa sai. */
  da_xoa: number;
}
// ADR-0126 (lát H-5): dòng đã ẨN DANH (erased_at) không còn là "hiện hành" — không gia hạn, không nhận phiếu tự khai, không chép dấu XOA… sang dòng sống mới.
const HIEN_HANH = "(d.voided_at IS NULL AND d.erased_at IS NULL AND NOT EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL))";
// ?1 = hồ sơ; ?2 = 1 chỉ dòng hiện hành (giấy tờ của tôi — R15 điểm 6). Thứ tự (quyết định thiết kế 3 của bản vẽ): hiện hành trước; trong đó ngày hết hạn
// tăng dần (đã hết → sắp hết → còn hạn), "không hạn" cuối; rồi thứ tự loại, mốc tạo.
const LIST_PERSON_DOCS = defineSql(
  "parties",
  "list_person_documents",
  `SELECT d.id, d.document_type_code, t.name AS type_name, d.license_class_code, c.name AS class_name, d.number_key, d.issued_date, d.issued_place, d.expiry_date,
          d.previous_id, d.voided_at, d.updated_at, ${HIEN_HANH} AS is_current, d.erased_at IS NOT NULL AS da_xoa
   FROM pty_person_document d JOIN pty_person_document_type t ON t.code = d.document_type_code LEFT JOIN pty_license_class c ON c.code = d.license_class_code
   WHERE d.party_id = ?1 AND (?2 = 0 OR ${HIEN_HANH})
   ORDER BY is_current DESC, d.expiry_date IS NULL, d.expiry_date, t.sort_order, d.created_at, d.id`,
);
const LIST_DOC_TYPES = defineSql(
  "parties",
  "list_person_document_types",
  "SELECT code, name, has_expiry, sort_order, active, updated_at FROM pty_person_document_type ORDER BY sort_order, code",
);
const LIST_LICENSE_CLASSES = defineSql("parties", "list_license_classes", "SELECT code, name, sort_order, active, updated_at FROM pty_license_class ORDER BY sort_order, code");

export async function listPersonDocuments(db: D1Database, partyId: string, onlyCurrent: boolean): Promise<PersonDocRow[]> {
  return (await db.prepare(LIST_PERSON_DOCS).bind(partyId, onlyCurrent ? 1 : 0).all<PersonDocRow>()).results;
}
export interface DocTypeRow { code: string; name: string; has_expiry: number; sort_order: number; active: number; updated_at: string }
export interface LicenseClassRow { code: string; name: string; sort_order: number; active: number; updated_at: string }
export async function listPersonDocumentTypes(db: D1Database): Promise<DocTypeRow[]> {
  return (await db.prepare(LIST_DOC_TYPES).all<DocTypeRow>()).results;
}
export async function listLicenseClasses(db: D1Database): Promise<LicenseClassRow[]> {
  return (await db.prepare(LIST_LICENSE_CLASSES).all<LicenseClassRow>()).results;
}

// Một dòng giấy tờ của hồ sơ ?2 kèm cờ hiện hành — route ghi đọc trước khi quyết (gia hạn chép số của dòng này; sửa sai so với giá trị đang có).
// `document_number` chỉ ở trong máy chủ — KHÔNG bao giờ vào DTO, nhật ký, câu báo lỗi.
export interface PersonDocFull {
  id: string;
  party_id: string;
  document_type_code: string;
  document_number: string | null;
  number_key: string | null;
  license_class_code: string | null;
  issued_date: string | null;
  issued_place: string | null;
  expiry_date: string | null;
  previous_id: string | null;
  voided_at: string | null;
  updated_at: string;
  is_current: number;
  da_xoa: number;
}
const FIND_PERSON_DOC = defineSql(
  "parties",
  "find_person_document",
  `SELECT d.id, d.party_id, d.document_type_code, d.document_number, d.number_key, d.license_class_code, d.issued_date, d.issued_place, d.expiry_date,
          d.previous_id, d.voided_at, d.updated_at, ${HIEN_HANH} AS is_current, d.erased_at IS NOT NULL AS da_xoa
   FROM pty_person_document d WHERE d.id = ?1 AND d.party_id = ?2`,
);
const INSERT_PERSON_DOC = defineSql(
  "parties",
  "insert_person_document",
  `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
     previous_id, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?11, ?12)`,
);
// Sửa sai: MỘT câu tĩnh đặt đủ các trường sửa được (giá trị không đổi ghi lại như cũ) + khoá lạc quan updated_at. Không đổi người, loại, dòng trước (trigger
// *_identity của migration giữ). Dòng đã có dòng gia hạn / đã huỷ bị trigger chặn (lớp CSDL — route đã kiểm "hiện hành" trước, lớp route).
const UPDATE_PERSON_DOC = defineSql(
  "parties",
  "update_person_document",
  `UPDATE pty_person_document SET document_number = ?4, number_key = ?5, license_class_code = ?6, issued_date = ?7, issued_place = ?8, expiry_date = ?9,
     updated_at = ?10, updated_by = ?11
   WHERE id = ?1 AND party_id = ?2 AND updated_at = ?3`,
);
// "Nhập nhầm cả dòng" = huỷ dòng (không xoá — Hiến chương 5.5), cùng khoá lạc quan.
const VOID_PERSON_DOC = defineSql(
  "parties",
  "void_person_document",
  "UPDATE pty_person_document SET voided_at = ?4, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND party_id = ?2 AND updated_at = ?3",
);

// ---- Giấy tờ sắp hết / đã hết hạn của TÀI XẾ (ADR-0040 D1) — nguồn của hàm công bố expiringDriverDocuments (parties/index.ts) cho Vận chuyển ---------------
// ?1 = mã vai tài khoản tài xế công ty, ?4 = mã vai tài khoản tài xế ĐỐI TÁC (ADR-0048 D1), ?2 = hôm nay (giờ VN), ?3 = hạn cuối (hôm nay + ngưỡng).
// "Tài xế" = hồ sơ ĐANG DÙNG, đang mở vai ?1 hoặc ?4 — lọc BÁO CÁO (không phải điều kiện cho phép; câu tra vai nằm trong parties — R-N1-12). Chỉ dòng HIỆN HÀNH
// có ngày hết hạn ≤ ?3 (kể cả đã quá hạn). carrier_names = TÊN các nhà xe người đó đang "thuộc" (luật một nguồn ở view v_pty_carrier_driver), NULL = không
// thuộc nhà xe nào. KHÔNG chọn cột số, nơi cấp, id giấy tờ, liên hệ, MST (bài giay-to-sap-het-han.test.ts khoá văn bản câu này).
const EXPIRING_DRIVER_DOCS = defineSql(
  "parties",
  "expiring_driver_documents",
  `SELECT p.id AS party_id, p.display_name, t.name AS type_name, c.name AS class_name, d.expiry_date,
          (SELECT group_concat(cp.display_name, ', ') FROM v_pty_carrier_driver cd JOIN pty_party cp ON cp.id = cd.carrier_party_id
            WHERE cd.driver_party_id = p.id) AS carrier_names
   FROM pty_person_document d JOIN pty_party p ON p.id = d.party_id JOIN pty_person_document_type t ON t.code = d.document_type_code
     LEFT JOIN pty_license_class c ON c.code = d.license_class_code
   WHERE p.active = 1 AND d.expiry_date IS NOT NULL AND d.expiry_date <= ?3 AND ${HIEN_HANH}
     AND EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = p.id AND r.role_type_code IN (?1, ?4) AND r.valid_from_date <= ?2
                   AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?2))
   ORDER BY d.expiry_date, p.display_name, t.sort_order, d.id`,
);
export interface ExpiringDocRow { party_id: string; display_name: string; type_name: string; class_name: string | null; expiry_date: string; carrier_names: string | null }
export async function expiringDocumentsOfRoles(db: D1Database, roleCodes: readonly [string, string], today: string, until: string): Promise<ExpiringDocRow[]> {
  return (await db.prepare(EXPIRING_DRIVER_DOCS).bind(roleCodes[0], today, until, roleCodes[1]).all<ExpiringDocRow>()).results;
}

// ---- Nhà xe đang hợp tác (ADR-0048 D1) — nguồn của hàm công bố nhaXeDangHopTac (parties/index.ts) cho Vận chuyển ------------------------------------------
// Hồ sơ đang mở vai Nhà xe (view v_pty_carrier) + tên, loại hồ sơ + số tài xế "thuộc" (view v_pty_carrier_driver — luật một nguồn). Xếp theo khoá sắp
// tên kiểu Việt của v_pty_party_label. KHÔNG liên hệ, MST, tên pháp lý (bài giay-to-sap-het-han.test.ts khoá văn bản câu này).
const CARRIERS = defineSql(
  "parties",
  "carriers",
  `SELECT p.id AS party_id, p.display_name, p.party_kind,
          (SELECT count(*) FROM v_pty_carrier_driver cd WHERE cd.carrier_party_id = p.id) AS driver_count
   FROM v_pty_carrier c JOIN v_pty_party_label p ON p.id = c.party_id
   ORDER BY p.sort_key COLLATE NOCASE, p.id`,
);
export interface CarrierRow { party_id: string; display_name: string; party_kind: "PERSON" | "ORGANIZATION"; driver_count: number }
export async function listCarriers(db: D1Database): Promise<CarrierRow[]> {
  return (await db.prepare(CARRIERS).all<CarrierRow>()).results;
}

// ---- Tài xế cho điều phối xe (ADR-0049 D2) — nguồn của hàm công bố taiXeChoDieuPhoi (parties/index.ts) cho Vận chuyển -----------------------------------------
// ?1 = mã vai tài khoản tài xế công ty. "Tài xế" = hồ sơ cá nhân ĐANG DÙNG, và đang mở vai ?1 (tài xế công ty) hoặc có trong view v_pty_carrier_driver (tài
// xế nhà xe — luật một nguồn; kể cả người chưa có tài khoản, kể cả nhà xe cá nhân tự lái). "Đang mở" = `valid_to_date IS NULL` (R-P8, 29/9) — CÙNG cách với
// nguồn sinh quyền tài khoản (v_pty_open_role_group, OPEN_ROLE_CODES_FOR) và v_pty_carrier_driver, KHÔNG theo ngày (EXPIRING_DRIVER_DOCS còn tính theo ngày —
// nợ, nhật ký ADR-0049 N-13). carrier_ids = khoá các nhà xe người đó đang "thuộc" (nối ","), NULL = không thuộc nhà xe nào. Chỉ khoá + tên hiển thị.
const DRIVERS_FOR_DISPATCH = defineSql(
  "parties",
  "tai_xe_cho_dieu_phoi",
  `SELECT p.id AS party_id, p.display_name,
          EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = p.id AND r.role_type_code = ?1 AND r.valid_to_date IS NULL) AS la_cong_ty,
          (SELECT group_concat(cd.carrier_party_id) FROM v_pty_carrier_driver cd WHERE cd.driver_party_id = p.id) AS carrier_ids
   FROM v_pty_party_label p
   WHERE p.party_kind = 'PERSON' AND p.active = 1
     AND (EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = p.id AND r.role_type_code = ?1 AND r.valid_to_date IS NULL)
          OR EXISTS (SELECT 1 FROM v_pty_carrier_driver cd WHERE cd.driver_party_id = p.id))
   ORDER BY p.sort_key COLLATE NOCASE, p.id`,
);
export interface DriverForDispatchRow { party_id: string; display_name: string; la_cong_ty: 0 | 1; carrier_ids: string | null }
export async function driversForDispatch(db: D1Database, internalRole: string): Promise<DriverForDispatchRow[]> {
  return (await db.prepare(DRIVERS_FOR_DISPATCH).bind(internalRole).all<DriverForDispatchRow>()).results;
}
// ?1 = mảng JSON khoá hồ sơ tài xế. Giấy tờ HIỆN HÀNH (mọi loại — điều kiện xuất bến có thể đòi giấy bất kỳ): khoá dòng, mã loại, hạng, ngày hết hạn. KHÔNG
// chọn cột số, khoá số, nơi cấp, ngày cấp (bài tai-xe-dieu-phoi.test.ts khoá văn bản câu này).
const DRIVER_DOCS_FOR_DISPATCH = defineSql(
  "parties",
  "giay_to_tai_xe_cho_dieu_phoi",
  `SELECT d.party_id, d.id AS row_id, d.document_type_code, d.license_class_code, d.expiry_date
   FROM pty_person_document d JOIN pty_person_document_type t ON t.code = d.document_type_code
   WHERE d.party_id IN (SELECT value FROM json_each(?1)) AND ${HIEN_HANH}
   ORDER BY d.party_id, t.sort_order, d.id`,
);
export interface DriverDocForDispatchRow { party_id: string; row_id: string; document_type_code: string; license_class_code: string | null; expiry_date: string | null }
export async function driverDocsForDispatch(db: D1Database, partyIds: readonly string[]): Promise<DriverDocForDispatchRow[]> {
  return (await db.prepare(DRIVER_DOCS_FOR_DISPATCH).bind(JSON.stringify(partyIds)).all<DriverDocForDispatchRow>()).results;
}

// ---- Danh mục loại giấy tờ của người + hạng GPLX (Quản trị sửa — khuôn loc_location: dấu vết, active, khoá lạc quan; khoá chính là mã, Ruling R7) --------
const INSERT_DOC_TYPE = defineSql(
  "parties",
  "insert_person_document_type",
  `INSERT INTO pty_person_document_type (code, name, has_expiry, sort_order, active, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?5, ?6)`,
);
// Mã không đổi được sau khi tạo (khoá chính; câu UPDATE không đặt `code`).
const UPDATE_DOC_TYPE = defineSql(
  "parties",
  "update_person_document_type",
  "UPDATE pty_person_document_type SET name = ?2, has_expiry = ?3, sort_order = ?4, active = ?5, updated_at = ?6, updated_by = ?7 WHERE code = ?1 AND updated_at = ?8",
);
const FIND_DOC_TYPE = defineSql("parties", "find_person_document_type", "SELECT code, name, has_expiry, sort_order, active, updated_at FROM pty_person_document_type WHERE code = ?1");
const INSERT_LICENSE_CLASS = defineSql(
  "parties",
  "insert_license_class",
  `INSERT INTO pty_license_class (code, name, sort_order, active, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, 1, ?4, ?5, ?4, ?5)`,
);
const UPDATE_LICENSE_CLASS = defineSql(
  "parties",
  "update_license_class",
  "UPDATE pty_license_class SET name = ?2, sort_order = ?3, active = ?4, updated_at = ?5, updated_by = ?6 WHERE code = ?1 AND updated_at = ?7",
);
const FIND_LICENSE_CLASS = defineSql("parties", "find_license_class", "SELECT code, name, sort_order, active, updated_at FROM pty_license_class WHERE code = ?1");

export const findPersonDocumentType = (db: D1Database, code: string): Promise<DocTypeRow | null> => db.prepare(FIND_DOC_TYPE).bind(code).first<DocTypeRow>();
export const findLicenseClass = (db: D1Database, code: string): Promise<LicenseClassRow | null> => db.prepare(FIND_LICENSE_CLASS).bind(code).first<LicenseClassRow>();
export const insertPersonDocTypeStatement = (db: D1Database, t: { code: string; name: string; hasExpiry: boolean; sortOrder: number }, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_DOC_TYPE).bind(t.code, t.name, t.hasExpiry ? 1 : 0, t.sortOrder, at, actorId);
export const updatePersonDocTypeStatement = (
  db: D1Database, code: string, t: { name: string; hasExpiry: boolean; sortOrder: number; active: boolean; expectedUpdatedAt: string }, actorId: string, at: string,
): D1PreparedStatement => db.prepare(UPDATE_DOC_TYPE).bind(code, t.name, t.hasExpiry ? 1 : 0, t.sortOrder, t.active ? 1 : 0, at, actorId, t.expectedUpdatedAt);
export const insertLicenseClassStatement = (db: D1Database, c: { code: string; name: string; sortOrder: number }, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_LICENSE_CLASS).bind(c.code, c.name, c.sortOrder, at, actorId);
export const updateLicenseClassStatement = (
  db: D1Database, code: string, c: { name: string; sortOrder: number; active: boolean; expectedUpdatedAt: string }, actorId: string, at: string,
): D1PreparedStatement => db.prepare(UPDATE_LICENSE_CLASS).bind(code, c.name, c.sortOrder, c.active ? 1 : 0, at, actorId, c.expectedUpdatedAt);

// "Xem đủ số" (ô party.document.reveal): số đầy đủ + tên loại của MỘT dòng thuộc hồ sơ ?2 — câu DUY NHẤT mà kết quả rời máy chủ có số đầy đủ.
const FIND_PERSON_DOC_NUMBER = defineSql(
  "parties",
  "find_person_document_number",
  `SELECT d.document_number, t.name AS type_name, d.erased_at IS NOT NULL AS da_xoa FROM pty_person_document d JOIN pty_person_document_type t ON t.code = d.document_type_code
   WHERE d.id = ?1 AND d.party_id = ?2`,
);
export function findPersonDocumentNumber(db: D1Database, docId: string, partyId: string): Promise<{ document_number: string | null; type_name: string; da_xoa: number } | null> {
  return db.prepare(FIND_PERSON_DOC_NUMBER).bind(docId, partyId).first<{ document_number: string | null; type_name: string; da_xoa: number }>();
}

export function findPersonDocument(db: D1Database, docId: string, partyId: string): Promise<PersonDocFull | null> {
  return db.prepare(FIND_PERSON_DOC).bind(docId, partyId).first<PersonDocFull>();
}
/** Giá trị của một dòng giấy tờ (đã kiểm ở luật thuần giay-to.ts). */
export interface PersonDocValues {
  typeCode: string;
  number: string | null;
  numberKey: string | null;
  classCode: string | null;
  issuedDate: string | null;
  issuedPlace: string | null;
  expiryDate: string | null;
}
export const insertPersonDocStatement = (db: D1Database, id: string, partyId: string, v: PersonDocValues, previousId: string | null, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_PERSON_DOC).bind(id, partyId, v.typeCode, v.number, v.numberKey, v.classCode, v.issuedDate, v.issuedPlace, v.expiryDate, previousId, at, actorId);
export const updatePersonDocStatement = (db: D1Database, id: string, partyId: string, expectedUpdatedAt: string, v: PersonDocValues, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(UPDATE_PERSON_DOC).bind(id, partyId, expectedUpdatedAt, v.number, v.numberKey, v.classCode, v.issuedDate, v.issuedPlace, v.expiryDate, at, actorId);
export const voidPersonDocStatement = (db: D1Database, id: string, partyId: string, expectedUpdatedAt: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(VOID_PERSON_DOC).bind(id, partyId, expectedUpdatedAt, at, actorId);

// ---- Gộp hồ sơ cá nhân (ADR-0068) -----------------------------------------------------------------------------------------------------------------------
// Lính gác TRẠNG THÁI (kế hoạch R1): hai hồ sơ còn đang dùng và chưa gộp. parties là module nghiêm, không đọc audit_log nên KHÔNG dùng wonGuard; lô thua cuộc
// đua (hồ sơ phụ đã bị lật ở lô khác) → mọi câu thành không-làm-gì, câu lật changes = 0 — TRỪ câu chép giấy tờ (GOP_CHEP_GIAY_TO): lô thua có giấy tờ cần
// chép thì HỎNG CẢ LÔ (không đổi gì) thay vì changes = 0. Ngoài ra MỌI lệch giữa lúc tính kế hoạch và lúc ghi (giấy tờ A đổi, B vừa có giấy tờ cùng loại,
// A còn dòng mở) cũng HỎNG CẢ LÔ (xem GOP_CHEP_GIAY_TO, GOP_LAT). Route: lỗi lô = đọc lại A rồi báo. Đoạn chữ tĩnh (không nhận đầu vào).
const LINH_GAC = (a: string, b: string): string => `(SELECT count(*) FROM pty_party g WHERE g.id IN (${a}, ${b}) AND g.active = 1 AND g.merged_into_id IS NULL) = 2`;

// ?1 id liên hệ, ?2 hồ sơ phụ, ?3 ngày đóng (hôm nay VN), ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_DONG_LIEN_HE = defineSql(
  "parties",
  "gop_dong_lien_he",
  `UPDATE pty_contact_point SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND (valid_to_date IS NULL OR valid_to_date > ?3) AND ?3 >= valid_from_date AND ${LINH_GAC("?2", "?6")}`,
);
// ?1 id mới, ?2 hồ sơ chính, ?3 loại, ?4 giá trị, ?5 chuẩn hoá, ?6 ghi chú, ?7 chính, ?8 từ ngày, ?9 lúc, ?10 người, ?11 hồ sơ phụ
const GOP_MO_LIEN_HE = defineSql(
  "parties",
  "gop_mo_lien_he",
  `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?9, ?10 WHERE ${LINH_GAC("?11", "?2")}`,
);
// ?1 id vai, ?2 hồ sơ phụ, ?3 ngày đóng, ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_DONG_VAI = defineSql(
  "parties",
  "gop_dong_vai",
  `UPDATE pty_party_role SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND (valid_to_date IS NULL OR valid_to_date > ?3) AND ?3 >= valid_from_date AND ${LINH_GAC("?2", "?6")}`,
);
// ?1 id mới, ?2 hồ sơ chính, ?3 mã vai, ?4 nơi, ?5 từ ngày, ?6 đến ngày, ?7 lúc, ?8 người, ?9 hồ sơ phụ
const GOP_MO_VAI = defineSql(
  "parties",
  "gop_mo_vai",
  `INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8 WHERE ${LINH_GAC("?9", "?2")}`,
);
// ?1 id quan hệ, ?2 hồ sơ phụ, ?3 ngày đóng, ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_DONG_QUAN_HE = defineSql(
  "parties",
  "gop_dong_quan_he",
  `UPDATE pty_party_relationship SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND (from_party_id = ?2 OR to_party_id = ?2) AND (valid_to_date IS NULL OR valid_to_date > ?3) AND ?3 >= valid_from_date AND ${LINH_GAC("?2", "?6")}`,
);
// ?1 id mới, ?2 từ, ?3 tới, ?4 loại, ?5 từ ngày, ?6 đến ngày, ?7 lúc, ?8 người, ?9 hồ sơ phụ, ?10 hồ sơ chính
const GOP_MO_QUAN_HE = defineSql(
  "parties",
  "gop_mo_quan_he",
  `INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8 WHERE ${LINH_GAC("?9", "?10")}`,
);
// Huỷ một dòng giấy tờ của hồ sơ phụ (khoá lạc quan updated_at đã đọc). ?1 id, ?2 hồ sơ phụ, ?3 mốc đã đọc, ?4 lúc, ?5 người, ?6 hồ sơ chính
const GOP_HUY_GIAY_TO = defineSql(
  "parties",
  "gop_huy_giay_to",
  `UPDATE pty_person_document SET voided_at = ?4, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND updated_at = ?3 AND voided_at IS NULL AND ${LINH_GAC("?2", "?6")}`,
);
// Chép nội dung một dòng hiện hành sang hồ sơ chính (dòng MỚI, không dòng trước). Số CHỈ đi trong câu lệnh — không bao giờ vào DTO, nhật ký, câu lỗi.
// Dạng VALUES một dòng (KHÔNG `INSERT … SELECT … WHERE`): dạng SELECT làm SQLite quét bảng con trỏ tới pty_person_document (vc_trip_departure_check_item
// của van-chuyen) để kiểm khoá ngoại — bài ranh giới ADR-0002 điều 8(b) chặn. Lính gác nằm ở cột party_id (NOT NULL): thua cuộc đua → party_id NULL → lỗi
// NOT NULL (hoặc trigger BEFORE INSERT báo trước) → CẢ LÔ huỷ, không dòng nào đổi. Đừng dùng INSERT OR IGNORE (nuốt cả lỗi duy nhất/CHECK → mất giấy tờ).
// Cùng ô party_id còn hai điều kiện (vòng sửa 1 — mọi lệch giữa lúc tính kế hoạch và lúc ghi HỎNG CẢ LÔ): (a) dòng nguồn ?13 VỪA bị chính lô này huỷ
// (voided_at = mốc lô) — khoá lạc quan của câu huỷ làm 0 dòng khi A sửa giấy tờ trong khe thì không chép bản cũ; (b) B chưa có dòng HIỆN HÀNH cùng loại (Đ4)
// ngoài các dòng chính lô này vừa chép (created_at = mốc lô, created_by = người gộp — A có thể có nhiều chuỗi cùng loại).
// ?1 id mới, ?2 hồ sơ chính, ?3 loại, ?4 số, ?5 khoá số, ?6 hạng, ?7 ngày cấp, ?8 nơi cấp, ?9 hết hạn, ?10 lúc, ?11 người, ?12 hồ sơ phụ, ?13 dòng nguồn
const GOP_CHEP_GIAY_TO = defineSql(
  "parties",
  "gop_chep_giay_to",
  `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
     previous_id, created_at, created_by, updated_at, updated_by)
   VALUES (?1, (SELECT ?2 WHERE ${LINH_GAC("?12", "?2")}
       AND EXISTS (SELECT 1 FROM pty_person_document s WHERE s.id = ?13 AND s.party_id = ?12 AND s.voided_at = ?10)
       AND NOT EXISTS (SELECT 1 FROM pty_person_document d WHERE d.party_id = ?2 AND d.document_type_code = ?3 AND NOT (d.created_at = ?10 AND d.created_by IS ?11)
                         AND ${HIEN_HANH})),
     ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10, ?11, ?10, ?11)`,
);
// Câu LẬT hồ sơ phụ — đứng SAU mọi câu chuyển và câu đổi người đặt đơn, NGAY TRƯỚC hai dòng nhật ký `changes() > 0`. ?1 phụ, ?2 chính, ?3 lúc, ?4 người,
// ?5 hôm nay. Vòng sửa 1 (Đ3): A còn liên hệ / công việc / quan hệ MỞ (valid_to_date NULL hoặc > hôm nay — câu đóng gặp 0 dòng, hoặc dòng thêm trong khe) →
// merged_into_id NULL cùng merged_at khác NULL → trigger party_merge_target (0056) ABORT → CẢ LÔ huỷ. Lính gác trạng thái sai → 0 dòng (lô thua), không lỗi.
const GOP_LAT = defineSql(
  "parties",
  "gop_lat",
  `UPDATE pty_party SET active = 0,
     merged_into_id = (SELECT ?2 WHERE NOT EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = ?1 AND (c.valid_to_date IS NULL OR c.valid_to_date > ?5))
       AND NOT EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date > ?5))
       AND NOT EXISTS (SELECT 1 FROM pty_party_relationship x WHERE (x.from_party_id = ?1 OR x.to_party_id = ?1) AND (x.valid_to_date IS NULL OR x.valid_to_date > ?5))),
     merged_at = ?3, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND ${LINH_GAC("?1", "?2")}`,
);

export interface GopDocRow extends PersonDocFull { type_name: string; class_name: string | null }
// MỌI dòng giấy tờ của hồ sơ (kể cả số — CHỈ để chép trong lô gộp; không bao giờ ra DTO). Thứ tự tạo.
const DOCS_FOR_MERGE = defineSql(
  "parties",
  "docs_for_merge",
  `SELECT d.id, d.party_id, d.document_type_code, t.name AS type_name, c.name AS class_name, d.document_number, d.number_key, d.license_class_code, d.issued_date,
          d.issued_place, d.expiry_date, d.previous_id, d.voided_at, d.updated_at, ${HIEN_HANH} AS is_current
   FROM pty_person_document d JOIN pty_person_document_type t ON t.code = d.document_type_code LEFT JOIN pty_license_class c ON c.code = d.license_class_code
   WHERE d.party_id = ?1 ORDER BY d.created_at, d.id`,
);
const MERGED_FROM = defineSql("parties", "merged_from", "SELECT id, display_name, merged_at FROM pty_party WHERE merged_into_id = ?1 ORDER BY merged_at, id");
// Hồ sơ nghi trùng (Đ8) + hồ sơ khớp khi tạo tài khoản (Đ9): hồ sơ cá nhân đang dùng, chưa gộp; SĐT liên hệ đang mở của chúng.
const PERSONS_FOR_MATCH = defineSql("parties", "persons_for_match", "SELECT id, display_name FROM pty_party WHERE party_kind = 'PERSON' AND active = 1 AND merged_into_id IS NULL");
const OPEN_PERSON_PHONES = defineSql(
  "parties",
  "open_person_phones",
  `SELECT c.party_id, c.value_normalized FROM pty_contact_point c JOIN pty_party p ON p.id = c.party_id
   WHERE c.contact_kind_code = 'PHONE' AND c.valid_to_date IS NULL AND p.party_kind = 'PERSON' AND p.active = 1 AND p.merged_into_id IS NULL`,
);
// ?1 hôm nay, ?2 mảng JSON id hồ sơ — dòng danh sách (tên, SĐT chính, công việc hôm nay) cho các id đã biết.
const LIST_BY_IDS = defineSql("parties", "list_by_ids", `${LIST_SELECT} WHERE p.id IN (SELECT value FROM json_each(?2)) ORDER BY p.sort_key COLLATE NOCASE, p.id`);

export async function docsForMerge(db: D1Database, partyId: string): Promise<GopDocRow[]> {
  return (await db.prepare(DOCS_FOR_MERGE).bind(partyId).all<GopDocRow>()).results;
}
export async function mergedFromOf(db: D1Database, partyId: string): Promise<{ id: string; display_name: string; merged_at: string }[]> {
  return (await db.prepare(MERGED_FROM).bind(partyId).all<{ id: string; display_name: string; merged_at: string }>()).results;
}
export async function personsForMatch(db: D1Database): Promise<{ id: string; display_name: string }[]> {
  return (await db.prepare(PERSONS_FOR_MATCH).all<{ id: string; display_name: string }>()).results;
}
export async function openPersonPhones(db: D1Database): Promise<{ party_id: string; value_normalized: string }[]> {
  return (await db.prepare(OPEN_PERSON_PHONES).all<{ party_id: string; value_normalized: string }>()).results;
}
export async function listPartiesByIds(db: D1Database, ids: readonly string[], today: string): Promise<PartyListRow[]> {
  if (ids.length === 0) return [];
  return (await db.prepare(LIST_BY_IDS).bind(today, JSON.stringify(ids)).all<PartyListRow>()).results;
}

type Nguoi = { a: string; b: string; at: string; actorId: string };
export const gopDongLienHeStatement = (db: D1Database, v: Nguoi & { id: string; homNay: string }): D1PreparedStatement =>
  db.prepare(GOP_DONG_LIEN_HE).bind(v.id, v.a, v.homNay, v.at, v.actorId, v.b);
export const gopMoLienHeStatement = (
  db: D1Database, v: Nguoi & { kind: string; value: string; valueNormalized: string; label: string | null; isPrimary: boolean; from: string },
): D1PreparedStatement => db.prepare(GOP_MO_LIEN_HE).bind(crypto.randomUUID(), v.b, v.kind, v.value, v.valueNormalized, v.label, v.isPrimary ? 1 : 0, v.from, v.at, v.actorId, v.a);
export const gopDongVaiStatement = (db: D1Database, v: Nguoi & { id: string; homNay: string }): D1PreparedStatement =>
  db.prepare(GOP_DONG_VAI).bind(v.id, v.a, v.homNay, v.at, v.actorId, v.b);
export const gopMoVaiStatement = (db: D1Database, v: Nguoi & { code: string; locationId: string | null; from: string; to: string | null }): D1PreparedStatement =>
  db.prepare(GOP_MO_VAI).bind(crypto.randomUUID(), v.b, v.code, v.locationId, v.from, v.to, v.at, v.actorId, v.a);
export const gopDongQuanHeStatement = (db: D1Database, v: Nguoi & { id: string; homNay: string }): D1PreparedStatement =>
  db.prepare(GOP_DONG_QUAN_HE).bind(v.id, v.a, v.homNay, v.at, v.actorId, v.b);
export const gopMoQuanHeStatement = (db: D1Database, v: Nguoi & { fromId: string; toId: string; typeCode: string; from: string; to: string | null }): D1PreparedStatement =>
  db.prepare(GOP_MO_QUAN_HE).bind(crypto.randomUUID(), v.fromId, v.toId, v.typeCode, v.from, v.to, v.at, v.actorId, v.a, v.b);
export const gopHuyGiayToStatement = (db: D1Database, v: Nguoi & { id: string; expectedUpdatedAt: string }): D1PreparedStatement =>
  db.prepare(GOP_HUY_GIAY_TO).bind(v.id, v.a, v.expectedUpdatedAt, v.at, v.actorId, v.b);
export const gopChepGiayToStatement = (db: D1Database, v: Nguoi & { du: GopDocRow; id: string }): D1PreparedStatement =>
  db.prepare(GOP_CHEP_GIAY_TO).bind(
    v.id, v.b, v.du.document_type_code, v.du.document_number, v.du.number_key, v.du.license_class_code, v.du.issued_date, v.du.issued_place, v.du.expiry_date,
    v.at, v.actorId, v.a, v.du.id,
  );
export const gopLatStatement = (db: D1Database, v: Nguoi & { homNay: string }): D1PreparedStatement => db.prepare(GOP_LAT).bind(v.a, v.b, v.at, v.actorId, v.homNay);

// ---- Gộp hồ sơ mang ảnh (ADR-0068 Đ1 bước 4 + ADR-0123; ruling R15 kế hoạch 2026-10-16-goi-2-h2-kho-tep) ----
// Thêm dòng nối tệp → dòng giấy tờ MỚI vừa chép sang hồ sơ chính; dòng nối cũ (sang dòng đã huỷ của hồ sơ phụ) giữ nguyên — bảng chỉ-thêm.
// Dạng VALUES, lính gác ở cột target_id (NOT NULL) như GOP_CHEP_GIAY_TO: (a) dòng nối cũ tệp ?1 → dòng nguồn ?2 CÓ THẬT; (b) dòng mới ?3 thuộc hồ sơ chính ?4
// và do CHÍNH lô này tạo (created_at = mốc lô ?5). Sai một điều ⇒ target_id NULL ⇒ CẢ LÔ huỷ. Câu đứng SAU câu lật: trigger pty_attachment_link_target_ins
// chỉ nhận dòng giấy tờ của hồ sơ mà hồ sơ của tệp ĐÃ gộp vào.
// ?1 tệp, ?2 dòng giấy tờ nguồn, ?3 dòng giấy tờ mới, ?4 hồ sơ chính, ?5 lúc, ?6 người
const GOP_NOI_TEP = defineSql(
  "parties",
  "gop_noi_tep",
  `INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by)
   VALUES (?1, 'PERSON_DOCUMENT',
     (SELECT ?3 WHERE EXISTS (SELECT 1 FROM pty_attachment_link l WHERE l.attachment_id = ?1 AND l.target_kind = 'PERSON_DOCUMENT' AND l.target_id = ?2)
        AND EXISTS (SELECT 1 FROM pty_person_document d WHERE d.id = ?3 AND d.party_id = ?4 AND d.created_at = ?5)),
     ?5, ?6, ?5, ?6)`,
);
// Ảnh còn hiệu lực (đã lưu, chưa quyết xoá) của các dòng giấy tờ ?1 (mảng JSON mã dòng) — route gộp đọc trước khi dựng lô.
const TEP_CUA_GIAY_TO = defineSql(
  "parties",
  "attachments_of_person_documents",
  `SELECT l.target_id AS doc_id, a.id AS tep_id FROM pty_attachment_link l JOIN pty_attachment a ON a.id = l.attachment_id
   WHERE l.target_kind = 'PERSON_DOCUMENT' AND l.target_id IN (SELECT value FROM json_each(?1)) AND a.stored_at IS NOT NULL AND a.purged_at IS NULL
   ORDER BY a.created_at, a.id`,
);
export const gopNoiTepStatement = (db: D1Database, v: { tepId: string; docCu: string; docMoi: string; b: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(GOP_NOI_TEP).bind(v.tepId, v.docCu, v.docMoi, v.b, v.at, v.actorId);
export async function tepCuaGiayTo(db: D1Database, docIds: readonly string[]): Promise<Map<string, string[]>> {
  const m = new Map<string, string[]>();
  if (docIds.length === 0) return m;
  const rows = (await db.prepare(TEP_CUA_GIAY_TO).bind(JSON.stringify(docIds)).all<{ doc_id: string; tep_id: string }>()).results;
  for (const r of rows) m.set(r.doc_id, [...(m.get(r.doc_id) ?? []), r.tep_id]);
  return m;
}

// ---- Tài khoản nhận tiền của công ty chủ (ADR-0108 đ2; migration 0087) — số tài khoản chỉ đi ra route có ô company.legal.write và hàm công bố cho QR. ----
export interface BankRow {
  code: string;
  bin: string;
  short_name: string;
  name: string;
}
const BANKS_ACTIVE = defineSql("parties", "banks_active", "SELECT code, bin, short_name, name FROM pty_bank WHERE active = 1 ORDER BY sort_order, short_name");
export async function activeBanks(db: D1Database): Promise<BankRow[]> {
  return (await db.prepare(BANKS_ACTIVE).all<BankRow>()).results;
}
const BANK_ACTIVE_BY_CODE = defineSql("parties", "bank_active_by_code", "SELECT code FROM pty_bank WHERE code = ?1 AND active = 1");
export async function bankActive(db: D1Database, code: string): Promise<boolean> {
  return (await db.prepare(BANK_ACTIVE_BY_CODE).bind(code).first()) !== null;
}
export interface BankAccountRow {
  id: string;
  bank_code: string;
  bank_short_name: string;
  account_number: string;
  account_name: string;
  valid_from: string;
}
const BANK_ACCOUNT_OPEN_OF = defineSql(
  "parties",
  "bank_account_open_of",
  `SELECT a.id, a.bank_code, b.short_name AS bank_short_name, a.account_number, a.account_name, a.valid_from
   FROM pty_bank_account a JOIN pty_bank b ON b.code = a.bank_code WHERE a.party_id = ?1 AND a.valid_to IS NULL`,
);
export async function bankAccountOpenOf(db: D1Database, partyId: string): Promise<BankAccountRow | null> {
  return db.prepare(BANK_ACCOUNT_OPEN_OF).bind(partyId).first<BankAccountRow>();
}
export interface OwnerBankAccountRow {
  cong_ty: string;
  bank_short_name: string;
  bin: string;
  account_number: string;
  account_name: string;
}
/** Tài khoản mở của hồ sơ ĐANG giữ vai ?1 ("Công ty chủ"). LIMIT 2: nơi gọi coi "không đúng một dòng" là chưa cài. */
const OWNER_BANK_ACCOUNT = defineSql(
  "parties",
  "owner_bank_account",
  `SELECT COALESCE(o.legal_name, p.display_name) AS cong_ty, b.short_name AS bank_short_name, b.bin, a.account_number, a.account_name
   FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id LEFT JOIN pty_organization o ON o.party_id = p.id
   JOIN pty_bank_account a ON a.party_id = p.id AND a.valid_to IS NULL JOIN pty_bank b ON b.code = a.bank_code
   WHERE r.role_type_code = ?1 AND r.valid_to_date IS NULL LIMIT 2`,
);
export async function ownerBankAccountRows(db: D1Database, roleCode: string): Promise<OwnerBankAccountRow[]> {
  return (await db.prepare(OWNER_BANK_ACCOUNT).bind(roleCode).all<OwnerBankAccountRow>()).results;
}
const BANK_ACCOUNT_CLOSE = defineSql(
  "parties",
  "bank_account_close",
  "UPDATE pty_bank_account SET valid_to = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND party_id = ?2 AND valid_to IS NULL",
);
export const bankAccountCloseStatement = (db: D1Database, v: { id: string; partyId: string; at: string; by: string }) =>
  db.prepare(BANK_ACCOUNT_CLOSE).bind(v.id, v.partyId, v.at, v.by);
/** Mở dòng mới — lính gác: hồ sơ không còn dòng mở (câu đóng của CHÍNH lô đã chạy trước). Không áp ⇒ changes = 0 ⇒ route trả 409 stale. */
const BANK_ACCOUNT_INSERT = defineSql(
  "parties",
  "bank_account_insert",
  `INSERT INTO pty_bank_account (id, party_id, bank_code, account_number, account_name, valid_from, valid_to, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, NULL, ?6, ?7, ?6, ?7 WHERE NOT EXISTS (SELECT 1 FROM pty_bank_account WHERE party_id = ?2 AND valid_to IS NULL)`,
);
export const bankAccountInsertStatement = (
  db: D1Database,
  v: { id: string; partyId: string; bankCode: string; accountNumber: string; accountName: string; at: string; by: string },
) => db.prepare(BANK_ACCOUNT_INSERT).bind(v.id, v.partyId, v.bankCode, v.accountNumber, v.accountName, v.at, v.by);

// ---- Kho tệp hồ sơ (ADR-0123; migration 0104; lát H-2 Gói 2) — storage_key và content_hash là N3: CHỈ đi trong câu lệnh, KHÔNG BAO GIỜ ra DTO, nhật ký,
// câu lỗi. Tải lên ghi D1 TRƯỚC (dòng tệp + dòng nối, stored_at rỗng) rồi mới đặt R2, rồi mark_attachment_stored (ruling Q2 kế hoạch 2026-10-16-goi-2-h2-kho-tep).
export interface TepRow { id: string; content_kind: LoaiTep; byte_size: number; stored_at: string }
export interface TepTaiRow { id: string; storage_key: string; content_kind: LoaiTep; type_name: string }
const INSERT_TEP = defineSql(
  "parties",
  "insert_attachment",
  `INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
);
const INSERT_TEP_LINK = defineSql(
  "parties",
  "insert_attachment_link",
  "INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?5)",
);
const MARK_TEP_STORED = defineSql(
  "parties",
  "mark_attachment_stored",
  "UPDATE pty_attachment SET stored_at = ?2, updated_at = ?2 WHERE id = ?1 AND stored_at IS NULL AND purged_at IS NULL",
);
// Chỉ tệp ĐÃ LƯU, CHƯA quyết xoá, nối tới dòng giấy tờ ?2 của ĐÚNG hồ sơ ?1 (đường dẫn mang cả hai — không tin một mình mã tệp).
const LIST_TEP_CUA_GIAY_TO = defineSql(
  "parties",
  "list_attachments_of_person_document",
  `SELECT a.id, a.content_kind, a.byte_size, a.stored_at FROM pty_attachment a
   JOIN pty_attachment_link l ON l.attachment_id = a.id AND l.target_kind = 'PERSON_DOCUMENT' AND l.target_id = ?2
   JOIN pty_person_document d ON d.id = l.target_id AND d.party_id = ?1
   WHERE a.stored_at IS NOT NULL AND a.purged_at IS NULL ORDER BY a.stored_at, a.id`,
);
const FIND_TEP_DE_TAI = defineSql(
  "parties",
  "find_attachment_for_download",
  `SELECT a.id, a.storage_key, a.content_kind, t.name AS type_name FROM pty_attachment a
   JOIN pty_attachment_link l ON l.attachment_id = a.id AND l.target_kind = 'PERSON_DOCUMENT' AND l.target_id = ?2
   JOIN pty_person_document d ON d.id = l.target_id AND d.party_id = ?1
   JOIN pty_person_document_type t ON t.code = d.document_type_code
   WHERE a.id = ?3 AND a.stored_at IS NOT NULL AND a.purged_at IS NULL`,
);
// Quyết xoá (ADR-0123 đ6, ADR-0126 đ3): purged_at + mã lý do + băm về rỗng, MỘT lần (trigger một chiều). ?5 = điều kiện thêm cho tệp tải dở dang (Task 5):
// NULL = không điều kiện; có giá trị = chỉ khi stored_at còn rỗng và created_at < ?5 (tệp đã lưu xong trong khe thì KHÔNG bị quyết xoá).
const PURGE_TEP = defineSql(
  "parties",
  "purge_attachment",
  `UPDATE pty_attachment SET purged_at = ?2, purge_reason = ?3, content_hash = NULL, updated_at = ?2, updated_by = ?4
   WHERE id = ?1 AND purged_at IS NULL AND (?5 IS NULL OR (stored_at IS NULL AND created_at < ?5))`,
);
const MARK_TEP_R2_DELETED = defineSql(
  "parties",
  "mark_attachment_r2_deleted",
  "UPDATE pty_attachment SET r2_deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND purged_at IS NOT NULL AND r2_deleted_at IS NULL",
);

export const insertTepStatement = (
  db: D1Database, v: { id: string; partyId: string; key: string; loai: LoaiTep; kichThuoc: number; bam: string; at: string; actorId: string },
): D1PreparedStatement => db.prepare(INSERT_TEP).bind(v.id, v.partyId, v.key, v.loai, v.kichThuoc, v.bam, v.at, v.actorId);
export const insertTepLinkStatement = (
  db: D1Database, v: { tepId: string; kind: "PERSON_DOCUMENT" | "ORG_DOCUMENT"; targetId: string; at: string; actorId: string },
): D1PreparedStatement => db.prepare(INSERT_TEP_LINK).bind(v.tepId, v.kind, v.targetId, v.at, v.actorId);
export async function markTepStored(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(MARK_TEP_STORED).bind(id, at).run()).meta.changes ?? 0;
}
export async function listTepCuaGiayTo(db: D1Database, partyId: string, docId: string): Promise<TepRow[]> {
  return (await db.prepare(LIST_TEP_CUA_GIAY_TO).bind(partyId, docId).all<TepRow>()).results;
}
export function findTepDeTai(db: D1Database, partyId: string, docId: string, tepId: string): Promise<TepTaiRow | null> {
  return db.prepare(FIND_TEP_DE_TAI).bind(partyId, docId, tepId).first<TepTaiRow>();
}
export const datChoXoaTepStatement = (db: D1Database, v: { id: string; lyDo: string; at: string; actorId: string; doDangTruoc?: string }): D1PreparedStatement =>
  db.prepare(PURGE_TEP).bind(v.id, v.at, v.lyDo, v.actorId, v.doDangTruoc ?? null);
export async function markTepR2Deleted(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(MARK_TEP_R2_DELETED).bind(id, at).run()).meta.changes ?? 0;
}
export interface TepCanXoaRow { id: string; party_id: string; storage_key: string; purged_at: string | null; purge_reason: string | null; created_at: string }
/** Trần một lượt của hàng "chờ xoá" (ruling R16): cũ trước; câu đọc lấy thêm MỘT dòng để biết "còn nữa". */
export const TEP_CHO_XOA_MOT_LUOT = 50;
// Hàng "chờ xoá" (5.16): đã quyết xoá mà kho chưa xoá xong, HOẶC tải dở dang (chưa lưu, chưa quyết xoá) tạo trước ?1. Tối đa 50 dòng (+1 để biết còn nữa), cũ
// trước (ruling R16). storage_key chỉ để lệnh chạy lại xoá kho — route KHÔNG đưa ra DTO.
const LIST_TEP_CHO_XOA = defineSql(
  "parties",
  "list_attachments_pending_purge",
  `SELECT id, party_id, storage_key, purged_at, purge_reason, created_at FROM pty_attachment
   WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR (stored_at IS NULL AND created_at < ?1))
   ORDER BY created_at, id LIMIT 51`,
);
/** Tối đa `TEP_CHO_XOA_MOT_LUOT` dòng cũ nhất; `conNua` = còn dòng sau lượt này. */
export async function listTepChoXoa(db: D1Database, doDangTruoc: string): Promise<{ ds: TepCanXoaRow[]; conNua: boolean }> {
  const r = (await db.prepare(LIST_TEP_CHO_XOA).bind(doDangTruoc).all<TepCanXoaRow>()).results;
  return { ds: r.slice(0, TEP_CHO_XOA_MOT_LUOT), conNua: r.length > TEP_CHO_XOA_MOT_LUOT };
}

// ---- Chính sách riêng tư + đồng ý + phiếu tự khai (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2) ---------------------------------------------------------------
// Câu đọc phiếu KHÔNG chọn document_number (số đủ không bao giờ rời CSDL qua đường "của tôi"). Mọi câu chạm pty_self_submission chỉ dùng trong route /api/parties/cua-toi*
// (rào src/tu-khai-khong-len-nhan.test.ts — Hiến chương 5.23).
export interface PolicyRow { id: string; version: number; purposes: string; body: string; valid_from_at: string; erasure_days: number | null; session_retention_days: number | null }
export interface PhieuRow {
  id: string; subject_kind: string; status: string; policy_id: string; birth_date: string | null; address_value: string | null; document_type_code: string | null;
  type_name: string | null; number_key: string | null; license_class_code: string | null; class_name: string | null; issued_date: string | null;
  issued_place: string | null; expiry_date: string | null; created_at: string; decided_at: string | null; da_xoa: number;
}
const CURRENT_POLICY = defineSql("parties", "current_privacy_policy",
  "SELECT id, version, purposes, body, valid_from_at, erasure_days, session_retention_days FROM pty_privacy_policy WHERE valid_from_at <= ?1 ORDER BY version DESC LIMIT 1");
const MAX_POLICY_VERSION = defineSql("parties", "max_privacy_policy_version", "SELECT COALESCE(MAX(version), 0) AS v FROM pty_privacy_policy");
const INSERT_POLICY = defineSql("parties", "insert_privacy_policy",
  `INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, erasure_days, session_retention_days)
   VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6, ?7, ?8)`);
// Phiên bản chính sách mà quyết định MỚI NHẤT của hồ sơ là DONG_Y (vòng sửa 1, ruling I-2: rút được mọi phiên bản đang đồng ý, không chỉ bản hiện hành).
// Cùng khuôn "mới nhất" với trigger 0105 pty_self_submission_consent_ins và bất biến R-PTY-13 (created_at DESC, rowid DESC).
const CONSENTED_POLICIES = defineSql("parties", "consented_policies_of_party",
  `SELECT p.id, p.version FROM pty_privacy_policy p
   WHERE (SELECT c.decision FROM pty_consent c WHERE c.party_id = ?1 AND c.policy_id = p.id ORDER BY c.created_at DESC, c.rowid DESC LIMIT 1) = 'DONG_Y'
   ORDER BY p.version DESC`);
const INSERT_CONSENT = defineSql("parties", "insert_consent",
  "INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6)");
const RUT_MOI_PHIEU_CHO = defineSql("parties", "withdraw_pending_self_submissions_of_party",
  `UPDATE pty_self_submission SET status = 'RUT', decided_at = ?2, decided_by = ?3, updated_at = ?2, updated_by = ?3
   WHERE party_id = ?1 AND policy_id = ?4 AND status = 'CHO_XAC_MINH'`);
const LIST_PHIEU = defineSql("parties", "list_self_submissions_of_party",
  `SELECT s.id, s.subject_kind, s.status, s.policy_id, s.birth_date, s.address_value, s.document_type_code, t.name AS type_name, s.number_key,
          s.license_class_code, c.name AS class_name, s.issued_date, s.issued_place, s.expiry_date, s.created_at, s.decided_at, (s.erased_at IS NOT NULL) AS da_xoa
   FROM pty_self_submission s
   LEFT JOIN pty_person_document_type t ON t.code = s.document_type_code
   LEFT JOIN pty_license_class c ON c.code = s.license_class_code
   WHERE s.party_id = ?1 ORDER BY s.created_at DESC, s.id DESC LIMIT 50`);

// ADR-0126 đ8 — số ngày giữ IP / User-Agent của phiên đã kết thúc: đọc từ chính sách phiên bản LỚN NHẤT (bản mới nhất thắng, kể cả khi rỗng). Không có con số nào trong mã.
const HAN_GIU_PHIEN = defineSql("parties", "privacy_policy_session_retention_days",
  "SELECT session_retention_days AS ngay FROM pty_privacy_policy ORDER BY version DESC LIMIT 1");
export async function hanGiuPhienNgay(db: D1Database): Promise<number | null> {
  const r = await db.prepare(HAN_GIU_PHIEN).first<{ ngay: number | null }>();
  return r?.ngay ?? null;
}
export const chinhSachHienHanh = (db: D1Database, nowIso: string): Promise<PolicyRow | null> => db.prepare(CURRENT_POLICY).bind(nowIso).first<PolicyRow>();
export async function phienBanLonNhat(db: D1Database): Promise<number> {
  return (await db.prepare(MAX_POLICY_VERSION).first<{ v: number }>())?.v ?? 0;
}
/** `hanXuLyXoaNgay` → cột `erasure_days`, `hanGiuPhienNgay` → `session_retention_days` (ADR-0126 đ2, đ8): null = chưa có số; con số do người đăng nhập, mã không gieo. */
export const dangChinhSachStatement = (
  db: D1Database,
  v: { id: string; version: number; mucDich: string; noiDung: string; at: string; actorId: string; hanXuLyXoaNgay: number | null; hanGiuPhienNgay: number | null },
): D1PreparedStatement => db.prepare(INSERT_POLICY).bind(v.id, v.version, v.mucDich, v.noiDung, v.at, v.actorId, v.hanXuLyXoaNgay, v.hanGiuPhienNgay);
export async function phienBanDangDongY(db: D1Database, partyId: string): Promise<{ id: string; version: number }[]> {
  return (await db.prepare(CONSENTED_POLICIES).bind(partyId).all<{ id: string; version: number }>()).results;
}
export const ghiDongYStatement = (db: D1Database, v: { id: string; partyId: string; policyId: string; quyetDinh: "DONG_Y" | "RUT"; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(INSERT_CONSENT).bind(v.id, v.partyId, v.policyId, v.quyetDinh, v.at, v.actorId);
/** Rút mọi phiếu ĐANG CHỜ của hồ sơ khai theo ĐÚNG phiên bản `policyId` (rút đồng ý phiên bản đó — ruling Q2 + I-2; bất biến R-PTY-13 xét theo phiên bản). */
export const rutMoiPhieuChoStatement = (db: D1Database, v: { partyId: string; policyId: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(RUT_MOI_PHIEU_CHO).bind(v.partyId, v.at, v.actorId, v.policyId);
export async function listPhieuCuaHoSo(db: D1Database, partyId: string): Promise<PhieuRow[]> {
  return (await db.prepare(LIST_PHIEU).bind(partyId).all<PhieuRow>()).results;
}
export interface PhieuTimRow { id: string; subject_kind: string; status: string }
const INSERT_PHIEU = defineSql("parties", "insert_self_submission",
  `INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code, document_number, number_key,
     license_class_code, issued_date, issued_place, expiry_date, status, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'CHO_XAC_MINH', ?14, ?15, ?14, ?15
   WHERE (SELECT c.decision FROM pty_consent c WHERE c.party_id = ?2 AND c.policy_id = ?4 ORDER BY c.created_at DESC, c.rowid DESC LIMIT 1) = 'DONG_Y'`);
const FIND_PHIEU = defineSql("parties", "find_self_submission_of_party",
  "SELECT id, subject_kind, status FROM pty_self_submission WHERE id = ?1 AND party_id = ?2");
const RUT_PHIEU = defineSql("parties", "withdraw_self_submission",
  `UPDATE pty_self_submission SET status = 'RUT', decided_at = ?3, decided_by = ?4, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND party_id = ?2 AND status = 'CHO_XAC_MINH'`);

/** Lô gửi phiếu: câu có LÍNH GÁC đồng ý (đồng ý bị rút trong khe ⇒ không chèn, changes() = 0); trigger pty_self_submission_consent_ins là lớp thứ hai. */
export const ghiPhieuStatement = (db: D1Database, v: {
  id: string; partyId: string; loai: string; policyId: string; ngaySinh: string | null; diaChi: string | null;
  giayTo: { typeCode: string; number: string | null; numberKey: string | null; classCode: string | null; issuedDate: string | null; issuedPlace: string | null; expiryDate: string | null } | null;
  at: string; actorId: string;
}): D1PreparedStatement => {
  const g = v.giayTo;
  return db.prepare(INSERT_PHIEU).bind(
    v.id, v.partyId, v.loai, v.policyId, v.ngaySinh, v.diaChi, g?.typeCode ?? null, g?.number ?? null, g?.numberKey ?? null, g?.classCode ?? null,
    g?.issuedDate ?? null, g?.issuedPlace ?? null, g?.expiryDate ?? null, v.at, v.actorId,
  );
};
export const timPhieuCuaHoSo = (db: D1Database, id: string, partyId: string): Promise<PhieuTimRow | null> => db.prepare(FIND_PHIEU).bind(id, partyId).first<PhieuTimRow>();
export const rutPhieuStatement = (db: D1Database, v: { id: string; partyId: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(RUT_PHIEU).bind(v.id, v.partyId, v.at, v.actorId);

// ---- Xác minh phiếu tự khai (ADR-0125; lát H-4 Gói 2) -------------------------------------------------------------------------------------------------
// LÍNH GÁC TÁCH NHIỆM VỤ nằm TRONG câu quyết (ADR-0125 đ5; Hiến chương 5.23 bảng thi hành). ?3 = người xác minh, ?4 = 1 nếu người đó giữ Toàn quyền (chốt cuối,
// chỉ bỏ vế b, c — vế a luôn áp + trigger 0107). View v_aud_cham_tai_khoan do module audit công bố (parties không đọc audit_log). Biên 30 ngày: strftime %f (R21).
// Số giấy tờ đủ CHỈ rời CSDL qua hàm "số đủ của phiếu chờ" (route "xem đủ số", ghi nhật ký TRƯỚC); các câu đọc khác không chọn document_number.
export interface PhieuChoRow {
  id: string; party_id: string; subject_kind: string; document_type_code: string | null; created_at: string; created_by: string | null; display_name: string; merged: number;
}
export interface PhieuXongRow {
  id: string; party_id: string; created_by: string | null; created_at: string; subject_kind: string; status: string; reason_code: string | null; decided_by: string | null; decided_at: string | null; verifier_touched_account: number | null;
}
export interface PhieuChiTietRow {
  id: string; party_id: string; subject_kind: string; policy_id: string; birth_date: string | null; address_value: string | null; document_type_code: string | null;
  type_name: string | null; number_key: string | null; license_class_code: string | null; class_name: string | null; issued_date: string | null; issued_place: string | null;
  expiry_date: string | null; status: string; created_by: string | null; created_at: string; merged: number; display_name: string;
}
const LIST_PHIEU_CHO = defineSql("parties", "list_pending_self_submissions",
  `SELECT s.id, s.party_id, s.subject_kind, s.document_type_code, s.created_at, s.created_by, p.display_name,
          CASE WHEN p.merged_into_id IS NULL THEN 0 ELSE 1 END AS merged
   FROM pty_self_submission s JOIN pty_party p ON p.id = s.party_id
   WHERE s.status = 'CHO_XAC_MINH' ORDER BY s.created_at, s.id LIMIT ?1`);
const LIST_PHIEU_XONG = defineSql("parties", "list_decided_self_submissions",
  `SELECT s.id, s.party_id, s.created_by, s.created_at, s.subject_kind, s.status, s.reason_code, s.decided_by, s.decided_at, v.verifier_touched_account
   FROM pty_self_submission s LEFT JOIN pty_verification v ON v.id = s.id
   WHERE s.status IN ('DA_CHAP_NHAN', 'TU_CHOI') ORDER BY s.decided_at DESC, s.id DESC LIMIT ?1`);
const FIND_PHIEU_XET = defineSql("parties", "find_self_submission_for_verify",
  `SELECT s.id, s.party_id, s.subject_kind, s.policy_id, s.birth_date, s.address_value, s.document_type_code, t.name AS type_name, s.number_key,
          s.license_class_code, c.name AS class_name, s.issued_date, s.issued_place, s.expiry_date, s.status, s.created_by, s.created_at,
          CASE WHEN p.merged_into_id IS NULL THEN 0 ELSE 1 END AS merged, p.display_name
   FROM pty_self_submission s JOIN pty_party p ON p.id = s.party_id
   LEFT JOIN pty_person_document_type t ON t.code = s.document_type_code
   LEFT JOIN pty_license_class c ON c.code = s.license_class_code
   WHERE s.id = ?1`);
const FIND_SO_DU = defineSql("parties", "find_pending_self_submission_number",
  `SELECT s.document_number, t.name AS type_name FROM pty_self_submission s JOIN pty_person_document_type t ON t.code = s.document_type_code
   WHERE s.id = ?1 AND s.status = 'CHO_XAC_MINH' AND s.document_number IS NOT NULL`);
const LIST_CHAM = defineSql("parties", "list_account_touches",
  "SELECT actor_id, account_id, loai, at FROM v_aud_cham_tai_khoan WHERE account_id IN (SELECT value FROM json_each(?1))");
const SO_O_HO_SO_KHAC = defineSql("parties", "self_submission_number_elsewhere",
  `SELECT 1 AS x FROM pty_person_document d WHERE d.party_id <> ?1 AND d.number_key = ?2 AND d.document_type_code = ?3 AND d.voided_at IS NULL LIMIT 1`);
export const listPhieuCho = async (db: D1Database, tran = 5000): Promise<PhieuChoRow[]> => (await db.prepare(LIST_PHIEU_CHO).bind(tran).all<PhieuChoRow>()).results;
export const listPhieuDaXuLy = async (db: D1Database, limit = 50): Promise<PhieuXongRow[]> => (await db.prepare(LIST_PHIEU_XONG).bind(limit).all<PhieuXongRow>()).results;
export const timPhieuChoXet = (db: D1Database, id: string): Promise<PhieuChiTietRow | null> => db.prepare(FIND_PHIEU_XET).bind(id).first<PhieuChiTietRow>();
export const soDuCuaPhieuCho = (db: D1Database, id: string): Promise<{ document_number: string; type_name: string } | null> =>
  db.prepare(FIND_SO_DU).bind(id).first<{ document_number: string; type_name: string }>();
export async function chamCuaTaiKhoan(db: D1Database, accountIds: readonly string[]): Promise<ChamTaiKhoan[]> {
  if (accountIds.length === 0) return [];
  const r = await db.prepare(LIST_CHAM).bind(JSON.stringify(accountIds)).all<{ actor_id: string; account_id: string; loai: LoaiCham; at: string }>();
  return r.results.map((x) => ({ actorId: x.actor_id, accountId: x.account_id, loai: x.loai, at: x.at }));
}
export async function trungSoHoSoKhac(db: D1Database, partyId: string, numberKey: string, typeCode: string): Promise<boolean> {
  return (await db.prepare(SO_O_HO_SO_KHAC).bind(partyId, numberKey, typeCode).first()) !== null;
}

const CHAM_CUA_NGUOI = (actor: string, alias: string): string =>
  `EXISTS (SELECT 1 FROM v_aud_cham_tai_khoan c WHERE c.account_id = ${alias}.created_by AND c.actor_id = ${actor}
     AND (c.loai IN ('TAO', 'VINH_VIEN') OR (c.loai = 'CUA_SO_30' AND c.at >= strftime('%Y-%m-%dT%H:%M:%fZ', ${alias}.created_at, '-30 days'))))`;
const DECIDE = defineSql("parties", "decide_self_submission",
  `UPDATE pty_self_submission SET status = ?2, reason_code = ?5, decided_at = ?6, decided_by = ?3, updated_at = ?6, updated_by = ?3
   WHERE id IN (SELECT s.id FROM pty_self_submission s WHERE s.id = ?1 AND s.status = 'CHO_XAC_MINH' AND s.created_by <> ?3
                  AND (?4 = 1 OR NOT ${CHAM_CUA_NGUOI("?3", "s")}))`);
export const quyetPhieuStatement = (db: D1Database, v: { id: string; ketLuan: "DA_CHAP_NHAN" | "TU_CHOI"; lyDo: string | null; actorId: string; at: string; laToanQuyen: boolean }): D1PreparedStatement =>
  db.prepare(DECIDE).bind(v.id, v.ketLuan, v.actorId, v.laToanQuyen ? 1 : 0, v.ketLuan === "TU_CHOI" ? v.lyDo : null, v.at);

// Điều kiện THẮNG cho mọi câu phụ thuộc trong cùng lô (parties không có wonGuard — module nghiêm): chính dòng phiếu đã mang người + lúc của lô này.
// ?1 = mã phiếu, ?2 = người xác minh, ?3 = lúc.
const DA_THANG = `EXISTS (SELECT 1 FROM pty_self_submission w WHERE w.id = ?1 AND w.status = 'DA_CHAP_NHAN' AND w.decided_by = ?2 AND w.decided_at = ?3)`;
const ACCEPT_BIRTH = defineSql("parties", "accept_self_submission_birth_date",
  `UPDATE pty_person SET birth_date = (SELECT s.birth_date FROM pty_self_submission s WHERE s.id = ?1), updated_at = ?3, updated_by = ?2
   WHERE party_id = (SELECT s.party_id FROM pty_self_submission s WHERE s.id = ?1) AND ${DA_THANG}`);
const ACCEPT_ADDRESS = defineSql("parties", "accept_self_submission_address",
  `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, created_by, updated_at, updated_by)
   SELECT ?4, s.party_id, 'ADDRESS', s.address_value, ?5, NULL,
          CASE WHEN EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = s.party_id AND c.contact_kind_code = 'ADDRESS' AND c.valid_to_date IS NULL) THEN 0 ELSE 1 END,
          ?6, ?3, ?2, ?3, ?2
   FROM pty_self_submission s WHERE s.id = ?1 AND ${DA_THANG}`);
// previous_id = dòng giấy tờ hiện hành cùng loại (GPLX: cùng HẠNG — `IS` coi NULL = NULL cho loại không có hạng; vòng sửa 1, I-4) của hồ sơ (chưa huỷ, chưa có dòng gia hạn) — tính TRONG câu ghi nên không lệch giữa lúc đọc và lúc ghi (R14).
// DẠNG `INSERT OR IGNORE … VALUES (subselect)` CÓ CHỦ Ý (không `INSERT … SELECT`): chèn nhiều dòng vào pty_person_document làm SQLite đọc bảng con của module khác
// (vc_trip_departure_check_item, khoá ngoại tới giấy tờ) và bài ranh giới SQL của architecture.test.ts đỏ — dạng VALUES một dòng thì không. Điều kiện thắng nằm ở `party_id`:
// lô thua ⇒ NULL ⇒ vi phạm NOT NULL ⇒ IGNORE bỏ dòng (0 dòng, không lỗi). IGNORE cũng nuốt vi phạm CHECK / UNIQUE, nhưng câu dòng xác minh liền sau trỏ tới dòng giấy tờ
// này và trigger đích (verification_target_mismatch) làm cả lô hỏng — còn trigger RAISE(ABORT) (số CCCD thuộc hồ sơ khác) vẫn ném lỗi như thường.
// Mỗi cột đọc qua CÙNG điều kiện thắng ⇒ lô thua đưa NULL vào MỌI cột (trigger của bảng không thấy dòng nửa vời, ví dụ gia hạn nối dòng của lô thắng).
const COT_THANG = (col: string): string => `(SELECT s.${col} FROM pty_self_submission s WHERE s.id = ?1 AND ${DA_THANG})`;
const ACCEPT_DOCUMENT = defineSql("parties", "accept_self_submission_document",
  `INSERT OR IGNORE INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
     previous_id, created_at, created_by, updated_at, updated_by)
   VALUES (?4, ${COT_THANG("party_id")}, ${COT_THANG("document_type_code")}, ${COT_THANG("document_number")}, ${COT_THANG("number_key")}, ${COT_THANG("license_class_code")},
     ${COT_THANG("issued_date")}, ${COT_THANG("issued_place")}, ${COT_THANG("expiry_date")},
     (SELECT d.id FROM pty_person_document d WHERE d.party_id = ${COT_THANG("party_id")} AND d.document_type_code = ${COT_THANG("document_type_code")}
        AND d.license_class_code IS ${COT_THANG("license_class_code")}
        AND d.voided_at IS NULL AND d.erased_at IS NULL AND NOT EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)
        ORDER BY d.created_at DESC, d.id DESC LIMIT 1),
     ?3, ?2, ?3, ?2)`);
const ACCEPT_TOUCH_PARTY = defineSql("parties", "accept_self_submission_touch_party",
  `UPDATE pty_party SET updated_at = ?3, updated_by = ?2 WHERE id = (SELECT s.party_id FROM pty_self_submission s WHERE s.id = ?1) AND ${DA_THANG}`);
const ACCEPT_VERIFICATION = defineSql("parties", "accept_self_submission_verification",
  `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
   SELECT s.id, s.party_id, ?4, ?5, ?6, 'DA_XAC_MINH', NULL, CASE WHEN ${CHAM_CUA_NGUOI("?2", "s")} THEN 1 ELSE 0 END, ?3, ?2, ?3, ?2
   FROM pty_self_submission s WHERE s.id = ?1 AND ${DA_THANG}`);
interface TuPhieu { id: string; actorId: string; at: string }
export const ghiNgaySinhTuPhieuStatement = (db: D1Database, v: TuPhieu): D1PreparedStatement => db.prepare(ACCEPT_BIRTH).bind(v.id, v.actorId, v.at);
/** `valueNormalized` = khoá so của địa chỉ (chữ thường — cùng luật `validateContact` ADDRESS); `today` = ngày VN. Giá trị địa chỉ chép NGUYÊN VĂN từ phiếu. */
export const ghiDiaChiTuPhieuStatement = (db: D1Database, v: TuPhieu & { contactId: string; valueNormalized: string; today: string }): D1PreparedStatement =>
  db.prepare(ACCEPT_ADDRESS).bind(v.id, v.actorId, v.at, v.contactId, v.valueNormalized, v.today);
export const ghiGiayToTuPhieuStatement = (db: D1Database, v: TuPhieu & { documentId: string }): D1PreparedStatement =>
  db.prepare(ACCEPT_DOCUMENT).bind(v.id, v.actorId, v.at, v.documentId);
export const lamMoiHoSoTuPhieuStatement = (db: D1Database, v: TuPhieu): D1PreparedStatement => db.prepare(ACCEPT_TOUCH_PARTY).bind(v.id, v.actorId, v.at);
export const ghiXacMinhTuPhieuStatement = (db: D1Database, v: TuPhieu & { targetKind: "ATTRIBUTE" | "CONTACT" | "PERSON_DOCUMENT"; targetId: string | null; attributeCode: string | null }): D1PreparedStatement =>
  db.prepare(ACCEPT_VERIFICATION).bind(v.id, v.actorId, v.at, v.targetKind, v.targetId, v.attributeCode);

// ---- ĐÁNH DẤU "CẦN XÁC MINH LẠI" khi giá trị đã xác minh bị sửa bởi đường khác (ADR-0125, ADR-0122 đ3; R16) ----------------------------------------------------
// Cùng điều kiện khoá lạc quan với câu sửa đứng ngay sau nó (cùng giao dịch ⇒ ghi khi và chỉ khi câu sửa ghi); chỉ khi kết quả xác minh MỚI NHẤT của đích là DA_XAC_MINH
// (đã cần xác minh lại / từ chối thì không thêm). Dòng xác minh chỉ-thêm (trigger no_update / no_delete); created_by = người sửa; cờ chạm tài khoản luôn 0 (CHECK).
// ?1 mã mới, ?2 hồ sơ, ?3 mốc kỳ vọng, ?4 người sửa, ?5 lúc, ?6 mã thuộc tính hoặc mã dòng giấy tờ.
const MARK_REVERIFY_ATTRIBUTE = defineSql("parties", "mark_reverify_attribute",
  `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'ATTRIBUTE', NULL, ?6, 'CAN_XAC_MINH_LAI', NULL, 0, ?5, ?4, ?5, ?4
   WHERE (SELECT updated_at FROM pty_party WHERE id = ?2) = ?3
     AND (SELECT v.outcome FROM pty_verification v WHERE v.party_id = ?2 AND v.target_kind = 'ATTRIBUTE' AND v.attribute_code = ?6 ORDER BY v.created_at DESC, v.rowid DESC LIMIT 1) = 'DA_XAC_MINH'`);
const MARK_REVERIFY_DOCUMENT = defineSql("parties", "mark_reverify_document",
  `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 'PERSON_DOCUMENT', ?6, NULL, 'CAN_XAC_MINH_LAI', NULL, 0, ?5, ?4, ?5, ?4
   WHERE (SELECT updated_at FROM pty_person_document WHERE id = ?6 AND party_id = ?2) = ?3
     AND (SELECT v.outcome FROM pty_verification v WHERE v.party_id = ?2 AND v.target_kind = 'PERSON_DOCUMENT' AND v.target_id = ?6 ORDER BY v.created_at DESC, v.rowid DESC LIMIT 1) = 'DA_XAC_MINH'`);
export function canXacMinhLaiStatement(
  db: D1Database,
  v: { partyId: string; targetKind: "ATTRIBUTE" | "PERSON_DOCUMENT"; targetId: string | null; attributeCode: string | null; expectedUpdatedAt: string; actorId: string; at: string },
): D1PreparedStatement {
  return v.targetKind === "ATTRIBUTE"
    ? db.prepare(MARK_REVERIFY_ATTRIBUTE).bind(crypto.randomUUID(), v.partyId, v.expectedUpdatedAt, v.actorId, v.at, v.attributeCode)
    : db.prepare(MARK_REVERIFY_DOCUMENT).bind(crypto.randomUUID(), v.partyId, v.expectedUpdatedAt, v.actorId, v.at, v.targetId);
}

// ---- Xoá dữ liệu: phiếu yêu cầu xoá + ẩn danh hoá (ADR-0126; migration 0108; Hiến chương 5.24, 5.25; lát H-5 Gói 2) -----------------------------------------------
// Ẩn danh hoá là cửa MỘT CHIỀU: chỉ lô tám câu ẩn danh (hàm dựng lô ở cuối tệp) được đặt `erased_at` (ngoại lệ có tên — rào src/xoa-mot-lenh-co-ten.test.ts). Mỗi câu sau câu quyết mang LÍNH GÁC
// `DA_THANG_XOA` (parties không có wonGuard — module nghiêm): chính dòng phiếu đã mang người + lúc của lô này. Thời hạn (số ngày) KHÔNG có ở đây — chỉ đọc từ dòng chính sách.
// Dấu ẩn danh một nguồn ở xoa-an-danh.ts (khớp từng chữ với trigger 0108). Không giá trị nào dưới đây vào nhật ký / DTO mặc định / câu lỗi.
export interface PhieuXoaRow {
  id: string; party_id: string; policy_id: string | null; due_at: string | null; status: string; decided_at: string | null; decided_by: string | null;
  reason_code: string | null; name_kept: number | null; retained_codes: string | null; offsite_at: string | null; created_at: string; created_by: string;
}
/** `storage_key` chỉ để xoá kho SAU lô quyết xoá — route KHÔNG đưa ra DTO. `loai_giay_to` = tên loại giấy tờ đang nối (null = không nối đâu). */
export interface AnhHetGiuRow { id: string; party_id: string; storage_key: string; created_at: string; ten_ho_so: string; loai_giay_to: string | null; ly_do: string }
export interface XemTruocXoa { giayTo: number; phieuTuKhai: number; lienHe: number; coNgaySinh: boolean; tep: number }

/** Tập hồ sơ của một phiếu: hồ sơ chính + hồ sơ đã gộp vào nó (một bước — ADR-0068 Đ3). `n` = số thứ tự tham số mang mã hồ sơ. */
const TAP_HO_SO_TU = (n: number): string => `(SELECT p.id FROM pty_party p WHERE p.id = ?${n} OR p.merged_into_id = ?${n})`;
const TAP_HO_SO = TAP_HO_SO_TU(4);
// ?1 = mã phiếu, ?2 = người thực hiện, ?3 = lúc.
const DA_THANG_XOA = `EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.id = ?1 AND r.status = 'DA_THUC_HIEN' AND r.decided_by = ?2 AND r.decided_at = ?3)`;
const DAU_SO = `'XOA' || upper(replace(id, '-', ''))`;
const GIU_TEN_CUA_PHIEU = `(SELECT name_kept FROM pty_erasure_request WHERE id = ?1) = 1`;

const COT_PHIEU_XOA = "id, party_id, policy_id, due_at, status, decided_at, decided_by, reason_code, name_kept, retained_codes, offsite_at, created_at, created_by";
const FIND_PHIEU_XOA = defineSql("parties", "find_erasure_request", `SELECT ${COT_PHIEU_XOA} FROM pty_erasure_request WHERE id = ?1`);
// Quá hạn lên đầu, rồi cũ trước; hạn rỗng không bao giờ quá hạn (R7). Trần 5 000 dòng. ?1 = bây giờ (ISO UTC).
const LIST_PHIEU_XOA_CHO = defineSql("parties", "list_pending_erasure_requests",
  `SELECT ${COT_PHIEU_XOA} FROM pty_erasure_request WHERE status = 'CHO_XU_LY'
   ORDER BY (due_at IS NOT NULL AND due_at <= ?1) DESC, created_at, id LIMIT 5000`);
const LIST_PHIEU_XOA_CUA_HO_SO = defineSql("parties", "list_erasure_requests_of_party",
  `SELECT ${COT_PHIEU_XOA} FROM pty_erasure_request WHERE party_id = ?1 ORDER BY created_at DESC, id DESC LIMIT 20`);
const LIST_PHIEU_CHUA_CHEP_NGOAI = defineSql("parties", "list_erasure_requests_not_offsite",
  "SELECT id, party_id, decided_at FROM pty_erasure_request WHERE status = 'DA_THUC_HIEN' AND offsite_at IS NULL ORDER BY decided_at, id LIMIT 500");

// R6: số ngày CHỈ ở dòng chính sách — chính sách chưa có số, hoặc chưa đăng bản nào ⇒ policy_id / due_at rỗng (CHECK policy_id rỗng ⇒ due_at rỗng). "Hiện hành" = cùng nghĩa
// chinhSachHienHanh (đã có hiệu lực lúc gửi, phiên bản lớn nhất). ?1 mã phiếu, ?2 hồ sơ, ?3 người gửi, ?4 lúc.
const GUI_PHIEU_XOA = defineSql("parties", "insert_erasure_request",
  `INSERT INTO pty_erasure_request (id, party_id, policy_id, due_at, status, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, p.id,
          CASE WHEN p.erasure_days IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ?4, '+' || p.erasure_days || ' days') END,
          'CHO_XU_LY', ?4, ?3, ?4, ?3
   FROM (SELECT 1) LEFT JOIN (SELECT id, erasure_days FROM pty_privacy_policy WHERE valid_from_at <= ?4 ORDER BY version DESC LIMIT 1) p ON 1 = 1`);
// Rút phiếu tự khai đang chờ cùng lô với lúc gửi (R10): lính gác = phiếu xoá VỪA chèn (đúng mã, đúng người, đúng lúc, còn chờ). ?1 mã phiếu xoá, ?2 hồ sơ, ?3 người gửi, ?4 lúc.
const RUT_PHIEU_TU_KHAI_KHI_GUI_XOA = defineSql("parties", "withdraw_pending_self_submissions_on_erasure_request",
  `UPDATE pty_self_submission SET status = 'RUT', decided_at = ?4, decided_by = ?3, updated_at = ?4, updated_by = ?3
   WHERE party_id IN ${TAP_HO_SO_TU(2)} AND status = 'CHO_XAC_MINH'
     AND EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.id = ?1 AND r.party_id = ?2 AND r.status = 'CHO_XU_LY' AND r.created_by = ?3 AND r.created_at = ?4)`);
const RUT_PHIEU_XOA = defineSql("parties", "withdraw_erasure_request",
  `UPDATE pty_erasure_request SET status = 'RUT', decided_at = ?3, decided_by = ?2, updated_at = ?3, updated_by = ?2
   WHERE id = ?1 AND status = 'CHO_XU_LY' AND created_by = ?2`);
// Câu QUYẾT: người xử lý KHÁC người gửi (trigger decider là lớp hai). ?1 mã, ?2 người, ?3 lúc, ?4 giữ tên (0/1), ?5 mã phần giữ lại.
const QUYET_PHIEU_XOA = defineSql("parties", "decide_erasure_request",
  `UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = ?3, decided_by = ?2, name_kept = ?4, retained_codes = ?5, updated_at = ?3, updated_by = ?2
   WHERE id = ?1 AND status = 'CHO_XU_LY' AND created_by <> ?2`);
// Câu CHẶN LÔ (vòng sửa 1, I-1): đứng ngay sau câu quyết. Lô thắng ⇒ lính gác sai ⇒ 0 dòng, không gì xảy ra. Lô THUA ⇒ đặt lại 'CHO_XU_LY' lên dòng đã rút / bị từ chối / do chính người gửi xử lý ⇒ trigger
// pty_erasure_request_status_one_way ABORT ⇒ D1 huỷ cả lô, nên câu sổ phiên của auth (không lính gác — module khác) KHÔNG chạy. ?1 mã, ?2 người, ?3 lúc (cùng bộ với DA_THANG_XOA).
const CHAN_LO_NEU_THUA_XOA = defineSql("parties", "erasure_batch_abort_if_lost",
  `UPDATE pty_erasure_request SET status = 'CHO_XU_LY' WHERE id = ?1 AND NOT (${DA_THANG_XOA})`);
const TU_CHOI_PHIEU_XOA = defineSql("parties", "reject_erasure_request",
  `UPDATE pty_erasure_request SET status = 'TU_CHOI', decided_at = ?3, decided_by = ?2, reason_code = ?4, updated_at = ?3, updated_by = ?2
   WHERE id = ?1 AND status = 'CHO_XU_LY' AND created_by <> ?2`);
const DANH_DAU_OFFSITE = defineSql("parties", "mark_erasure_request_offsite",
  "UPDATE pty_erasure_request SET offsite_at = ?2, updated_at = ?2 WHERE id = ?1 AND status = 'DA_THUC_HIEN' AND offsite_at IS NULL");

// Tám câu ẩn danh — thứ tự CỐ ĐỊNH (người kiểm đối chiếu). ?1 mã phiếu, ?2 người thực hiện, ?3 lúc quyết, ?4 hồ sơ chính, ?5 hôm nay giờ VN (chỉ câu liên hệ).
const AN_DANH_RUT_PHIEU_CHO = defineSql("parties", "an_danh_rut_phieu_cho",
  `UPDATE pty_self_submission SET status = 'RUT', decided_at = ?3, decided_by = ?2, updated_at = ?3, updated_by = ?2
   WHERE party_id IN ${TAP_HO_SO} AND status = 'CHO_XAC_MINH' AND ${DA_THANG_XOA}`);
const AN_DANH_PHIEU_TU_KHAI = defineSql("parties", "an_danh_phieu_tu_khai",
  `UPDATE pty_self_submission SET erased_at = ?3,
     birth_date = CASE WHEN birth_date IS NULL THEN NULL ELSE '${DAU_NGAY_SINH_PHIEU}' END,
     address_value = CASE WHEN address_value IS NULL THEN NULL ELSE '${DAU_DIA_CHI_PHIEU}' END,
     document_number = CASE WHEN document_number IS NULL THEN NULL ELSE ${DAU_SO} END,
     number_key = CASE WHEN number_key IS NULL THEN NULL ELSE ${DAU_SO} END,
     issued_place = NULL, updated_at = ?3, updated_by = ?2
   WHERE party_id IN ${TAP_HO_SO} AND erased_at IS NULL AND ${DA_THANG_XOA}`);
// R11: đánh dấu "cần xác minh lại" TRƯỚC khi đổi giá trị (thứ tự đọc "đánh dấu rồi đổi" giống H-4 R16). `party_id` PHẢI là khoá phân nhóm đầu: đích ATTRIBUTE có target_id rỗng,
// thiếu party_id thì NGAY_SINH đã xác minh của hồ sơ chính và hồ sơ đã gộp rơi chung một nhóm, chỉ một bên được đánh dấu.
const AN_DANH_XAC_MINH_LAI = defineSql("parties", "an_danh_xac_minh_lai",
  `INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
   SELECT lower(hex(randomblob(16))), v.party_id, v.target_kind, v.target_id, v.attribute_code, 'CAN_XAC_MINH_LAI', NULL, 0, ?3, ?2, ?3, ?2
   FROM (SELECT party_id, target_kind, target_id, attribute_code, outcome,
                ROW_NUMBER() OVER (PARTITION BY party_id, target_kind, target_id, attribute_code ORDER BY created_at DESC, rowid DESC) AS n
         FROM pty_verification WHERE party_id IN ${TAP_HO_SO}) v
   WHERE v.n = 1 AND v.outcome = 'DA_XAC_MINH' AND ${DA_THANG_XOA}`);
const AN_DANH_GIAY_TO = defineSql("parties", "an_danh_giay_to",
  `UPDATE pty_person_document SET erased_at = ?3,
     document_number = CASE WHEN document_number IS NULL THEN NULL ELSE ${DAU_SO} END,
     number_key = CASE WHEN number_key IS NULL THEN NULL ELSE ${DAU_SO} END,
     issued_place = NULL, updated_at = ?3, updated_by = ?2
   WHERE party_id IN ${TAP_HO_SO} AND erased_at IS NULL AND ${DA_THANG_XOA}`);
// Liên hệ không có cột erased_at: "đã xoá" = dấu + đóng hiệu lực (đã đóng thì giữ ngày đóng cũ; chưa tới ngày bắt đầu thì đóng đúng ngày bắt đầu — CHECK valid_to >= valid_from).
const AN_DANH_LIEN_HE = defineSql("parties", "an_danh_lien_he",
  `UPDATE pty_contact_point SET value = '${DAU_LIEN_HE.value}', value_normalized = '${DAU_LIEN_HE.normalized}', label = NULL, is_primary = 0,
     valid_to_date = CASE WHEN valid_to_date IS NOT NULL THEN valid_to_date WHEN valid_from_date > ?5 THEN valid_from_date ELSE ?5 END,
     updated_at = ?3, updated_by = ?2
   WHERE party_id IN ${TAP_HO_SO}
     AND NOT (value = '${DAU_LIEN_HE.value}' AND value_normalized = '${DAU_LIEN_HE.normalized}' AND valid_to_date IS NOT NULL) AND ${DA_THANG_XOA}`);
const AN_DANH_NGUOI = defineSql("parties", "an_danh_nguoi",
  `UPDATE pty_person SET birth_date = NULL,
     family_name = CASE WHEN ${GIU_TEN_CUA_PHIEU} THEN family_name ELSE NULL END,
     middle_name = CASE WHEN ${GIU_TEN_CUA_PHIEU} THEN middle_name ELSE NULL END,
     given_name = CASE WHEN ${GIU_TEN_CUA_PHIEU} THEN given_name ELSE '${DAU_TEN}' END,
     updated_at = ?3, updated_by = ?2
   WHERE party_id IN ${TAP_HO_SO} AND ${DA_THANG_XOA}`);
const AN_DANH_TEN_HO_SO = defineSql("parties", "an_danh_ten_ho_so",
  `UPDATE pty_party SET display_name = '${DAU_TEN}', updated_at = ?3, updated_by = ?2
   WHERE id IN ${TAP_HO_SO} AND (SELECT name_kept FROM pty_erasure_request WHERE id = ?1) = 0 AND ${DA_THANG_XOA}`);
// R12: mọi tệp chưa quyết xoá của tập hồ sơ — theo hồ sơ nhận tệp HOẶC theo dòng nối tới giấy tờ của tập hồ sơ (không phân biệt loại nối). Xoá kho R2 làm SAU lô (route).
const AN_DANH_TEP = defineSql("parties", "an_danh_tep",
  `UPDATE pty_attachment SET purged_at = ?3, purge_reason = '${LY_DO_XOA_TEP_PHIEU}', content_hash = NULL, updated_at = ?3, updated_by = ?2
   WHERE purged_at IS NULL
     AND (party_id IN ${TAP_HO_SO}
          OR id IN (SELECT l.attachment_id FROM pty_attachment_link l JOIN pty_person_document d ON l.target_kind = 'PERSON_DOCUMENT' AND d.id = l.target_id
                    WHERE d.party_id IN ${TAP_HO_SO}))
     AND ${DA_THANG_XOA}`);

// Xem trước (số đếm thôi — không giá trị nào): ?1 = hồ sơ chính.
const XEM_TRUOC_XOA = defineSql("parties", "erasure_preview_counts",
  `SELECT
     (SELECT count(*) FROM pty_person_document d WHERE d.party_id IN ${TAP_HO_SO_TU(1)} AND d.erased_at IS NULL) AS giay_to,
     (SELECT count(*) FROM pty_self_submission s WHERE s.party_id IN ${TAP_HO_SO_TU(1)} AND s.erased_at IS NULL) AS phieu_tu_khai,
     (SELECT count(*) FROM pty_contact_point c WHERE c.party_id IN ${TAP_HO_SO_TU(1)}
        AND NOT (c.value = '${DAU_LIEN_HE.value}' AND c.value_normalized = '${DAU_LIEN_HE.normalized}' AND c.valid_to_date IS NOT NULL)) AS lien_he,
     (SELECT count(*) FROM pty_person p WHERE p.party_id IN ${TAP_HO_SO_TU(1)} AND p.birth_date IS NOT NULL) AS co_ngay_sinh,
     (SELECT count(*) FROM pty_attachment a WHERE a.purged_at IS NULL
        AND (a.party_id IN ${TAP_HO_SO_TU(1)}
             OR a.id IN (SELECT l.attachment_id FROM pty_attachment_link l JOIN pty_person_document d ON l.target_kind = 'PERSON_DOCUMENT' AND d.id = l.target_id
                         WHERE d.party_id IN ${TAP_HO_SO_TU(1)}))) AS tep`);
// Tệp đã quyết xoá mà kho chưa xoá của tập hồ sơ — route lấy khoá kho để xoá R2 sau lô (storage_key chỉ để xoá, KHÔNG ra DTO).
const TEP_CHO_XOA_CUA_PHIEU = defineSql("parties", "list_attachments_pending_purge_of_party",
  `SELECT id, party_id, storage_key, purged_at, purge_reason, created_at FROM pty_attachment
   WHERE purged_at IS NOT NULL AND r2_deleted_at IS NULL
     AND (party_id IN ${TAP_HO_SO_TU(1)}
          OR id IN (SELECT l.attachment_id FROM pty_attachment_link l JOIN pty_person_document d ON l.target_kind = 'PERSON_DOCUMENT' AND d.id = l.target_id
                    WHERE d.party_id IN ${TAP_HO_SO_TU(1)}))
   ORDER BY created_at, id LIMIT 500`);

// ---- Ảnh hết lý do giữ (đ6, 5.25): HÌNH CHIẾU ĐỌC tính lúc mở (không bảng, không Cron). Còn lý do giữ khi có ít nhất một dòng nối tới (a) giấy tờ người / tổ chức HIỆN HÀNH
// (chưa huỷ, chưa ẩn danh, không dòng gia hạn chưa huỷ) còn hạn VÀ chủ còn ít nhất một vai chưa đóng, hoặc (b) phiếu tự khai đang chờ. `n` = số thứ tự tham số mang
// "hôm nay giờ VN" — MỘT hàm cho cả câu đọc lẫn lính gác của câu quyết xoá (tránh lệch số tham số giữa hai câu). Bí danh `a` = pty_attachment ở cả hai câu.
const VAI_CON = (n: number): string => `EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = d.party_id AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?${n}))`;
const DONG_NOI_NGUOI = (dieuKien: string): string =>
  `EXISTS (SELECT 1 FROM pty_attachment_link l JOIN pty_person_document d ON l.target_kind = 'PERSON_DOCUMENT' AND d.id = l.target_id WHERE l.attachment_id = a.id AND ${dieuKien})`;
const DONG_NOI_TO_CHUC = (dieuKien: string): string =>
  `EXISTS (SELECT 1 FROM pty_attachment_link l JOIN pty_organization_document d ON l.target_kind = 'ORG_DOCUMENT' AND d.id = l.target_id WHERE l.attachment_id = a.id AND ${dieuKien})`;
const DONG_NOI_PHIEU = (dieuKien: string): string =>
  `EXISTS (SELECT 1 FROM pty_attachment_link l JOIN pty_self_submission s ON l.target_kind = 'SELF_SUBMISSION' AND s.id = l.target_id WHERE l.attachment_id = a.id AND ${dieuKien})`;
const CHUA_GIA_HAN_NGUOI = "NOT EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)";
const CHUA_GIA_HAN_TO_CHUC = "NOT EXISTS (SELECT 1 FROM pty_organization_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)";
const GIU_ANH = (n: number): string => [
  DONG_NOI_NGUOI(`d.voided_at IS NULL AND d.erased_at IS NULL AND ${CHUA_GIA_HAN_NGUOI} AND (d.expiry_date IS NULL OR d.expiry_date >= ?${n}) AND ${VAI_CON(n)}`),
  DONG_NOI_TO_CHUC(`d.voided_at IS NULL AND ${CHUA_GIA_HAN_TO_CHUC} AND (d.expiry_date IS NULL OR d.expiry_date >= ?${n}) AND ${VAI_CON(n)}`),
  DONG_NOI_PHIEU("s.status = 'CHO_XAC_MINH'"),
].join("\n OR ");
// Mã lý do (thứ tự ưu tiên khớp luật thuần `lyDoXoaAnh`): HET_QUAN_HE, DA_AN_DANH, DA_HUY, DA_GIA_HAN, HET_HAN, PHIEU_DA_XU_LY, KHONG_NOI. ?1 = hôm nay.
const LY_DO_ANH = `CASE
  WHEN ${DONG_NOI_NGUOI(`NOT ${VAI_CON(1)}`)} OR ${DONG_NOI_TO_CHUC(`NOT ${VAI_CON(1)}`)} THEN 'HET_QUAN_HE'
  WHEN ${DONG_NOI_NGUOI("d.erased_at IS NOT NULL")} THEN 'DA_AN_DANH'
  WHEN ${DONG_NOI_NGUOI("d.voided_at IS NOT NULL")} OR ${DONG_NOI_TO_CHUC("d.voided_at IS NOT NULL")} THEN 'DA_HUY'
  WHEN ${DONG_NOI_NGUOI(`NOT ${CHUA_GIA_HAN_NGUOI}`)} OR ${DONG_NOI_TO_CHUC(`NOT ${CHUA_GIA_HAN_TO_CHUC}`)} THEN 'DA_GIA_HAN'
  WHEN ${DONG_NOI_NGUOI("d.expiry_date < ?1")} OR ${DONG_NOI_TO_CHUC("d.expiry_date < ?1")} THEN 'HET_HAN'
  WHEN ${DONG_NOI_PHIEU("s.status <> 'CHO_XAC_MINH'")} THEN 'PHIEU_DA_XU_LY'
  ELSE 'KHONG_NOI' END`;
const LIST_ANH_HET_GIU = defineSql("parties", "list_attachments_without_keep_reason",
  `SELECT a.id, a.party_id, a.storage_key, a.created_at, p.display_name AS ten_ho_so,
     COALESCE(
       (SELECT t.name FROM pty_attachment_link l JOIN pty_person_document d ON l.target_kind = 'PERSON_DOCUMENT' AND d.id = l.target_id
          JOIN pty_person_document_type t ON t.code = d.document_type_code WHERE l.attachment_id = a.id ORDER BY l.created_at, l.target_id LIMIT 1),
       (SELECT t.name FROM pty_attachment_link l JOIN pty_organization_document d ON l.target_kind = 'ORG_DOCUMENT' AND d.id = l.target_id
          JOIN pty_organization_document_type t ON t.code = d.document_type_code WHERE l.attachment_id = a.id ORDER BY l.created_at, l.target_id LIMIT 1)) AS loai_giay_to,
     ${LY_DO_ANH} AS ly_do
   FROM pty_attachment a JOIN pty_party p ON p.id = a.party_id
   WHERE a.purged_at IS NULL AND a.stored_at IS NOT NULL AND NOT (${GIU_ANH(1)})
   ORDER BY a.created_at, a.id LIMIT 500`);
// Lính gác: đến lúc bấm tệp vẫn hết lý do giữ (đã có lại lý do giữ giữa lúc đọc danh sách và lúc bấm ⇒ 0 dòng). ?1 tệp, ?2 người, ?3 lúc, ?4 hôm nay.
const DAT_CHO_XOA_ANH_HET_GIU = defineSql("parties", "purge_attachment_without_keep_reason",
  `UPDATE pty_attachment AS a SET purged_at = ?3, purge_reason = '${LY_DO_XOA_TEP_HET_GIU}', content_hash = NULL, updated_at = ?3, updated_by = ?2
   WHERE a.id = ?1 AND a.purged_at IS NULL AND a.stored_at IS NOT NULL AND NOT (${GIU_ANH(4)})`);

// ---- Xử lý phiếu (route /api/parties/phieu-xoa*; ô party.erasure.process) ---------------------------------------------------------------------------------
export interface PhieuXoaCoTenRow extends PhieuXoaRow { display_name: string }
const COT_PHIEU_XOA_P = COT_PHIEU_XOA.split(", ").map((c) => `r.${c}`).join(", ");
const FIND_PHIEU_XOA_TEN = defineSql("parties", "find_erasure_request_named",
  `SELECT ${COT_PHIEU_XOA_P}, p.display_name FROM pty_erasure_request r JOIN pty_party p ON p.id = r.party_id WHERE r.id = ?1`);
const LIST_PHIEU_XOA_CHO_TEN = defineSql("parties", "list_pending_erasure_requests_named",
  `SELECT ${COT_PHIEU_XOA_P}, p.display_name FROM pty_erasure_request r JOIN pty_party p ON p.id = r.party_id WHERE r.status = 'CHO_XU_LY'
   ORDER BY (r.due_at IS NOT NULL AND r.due_at <= ?1) DESC, r.created_at, r.id LIMIT 5000`);
// Đã xử lý (thực hiện / từ chối / rút), mới nhất trước. Trần đọc 200 dòng để lọc cấp bậc rồi cắt 50 (khuôn hàng chờ xác minh).
const LIST_PHIEU_XOA_DA_XU_LY = defineSql("parties", "list_processed_erasure_requests",
  `SELECT ${COT_PHIEU_XOA} FROM pty_erasure_request WHERE status <> 'CHO_XU_LY' ORDER BY decided_at DESC, id DESC LIMIT 200`);
const DEM_HO_SO_GOP_VAO = defineSql("parties", "count_profiles_merged_into", "SELECT count(*) AS n FROM pty_party WHERE merged_into_id = ?1");
const TEP_CHO_XOA_LY_DO_PHIEU = defineSql("parties", "list_attachments_pending_purge_by_erasure",
  `SELECT id, party_id, storage_key, purged_at, purge_reason, created_at FROM pty_attachment
   WHERE purged_at IS NOT NULL AND r2_deleted_at IS NULL AND purge_reason IN ('${LY_DO_XOA_TEP_PHIEU}', '${LY_DO_XOA_TEP_HET_GIU}') ORDER BY created_at, id LIMIT 500`);
// Gộp bị chặn khi hồ sơ nào trong hai hồ sơ đang có / đã thực hiện phiếu xoá (ruling R16; lớp hai là trigger party_merge_erasure).
const CO_PHIEU_XOA_CHO_HOAC_DA = defineSql("parties", "count_open_or_done_erasure_requests",
  "SELECT count(*) AS n FROM pty_erasure_request WHERE party_id IN (?1, ?2) AND status IN ('CHO_XU_LY', 'DA_THUC_HIEN')");
export const timPhieuXoaCoTen = (db: D1Database, id: string): Promise<PhieuXoaCoTenRow | null> => db.prepare(FIND_PHIEU_XOA_TEN).bind(id).first<PhieuXoaCoTenRow>();
export async function listPhieuXoaChoCoTen(db: D1Database, nowIso: string): Promise<PhieuXoaCoTenRow[]> {
  return (await db.prepare(LIST_PHIEU_XOA_CHO_TEN).bind(nowIso).all<PhieuXoaCoTenRow>()).results;
}
export async function listPhieuXoaDaXuLy(db: D1Database): Promise<PhieuXoaRow[]> {
  return (await db.prepare(LIST_PHIEU_XOA_DA_XU_LY).all<PhieuXoaRow>()).results;
}
export async function demHoSoGopVao(db: D1Database, partyId: string): Promise<number> {
  return (await db.prepare(DEM_HO_SO_GOP_VAO).bind(partyId).first<{ n: number }>())?.n ?? 0;
}
export async function tepChoXoaLyDoPhieu(db: D1Database): Promise<TepCanXoaRow[]> {
  return (await db.prepare(TEP_CHO_XOA_LY_DO_PHIEU).all<TepCanXoaRow>()).results;
}
export async function coPhieuXoaChoHoacDa(db: D1Database, a: string, b: string): Promise<boolean> {
  return ((await db.prepare(CO_PHIEU_XOA_CHO_HOAC_DA).bind(a, b).first<{ n: number }>())?.n ?? 0) > 0;
}

export const timPhieuXoa = (db: D1Database, id: string): Promise<PhieuXoaRow | null> => db.prepare(FIND_PHIEU_XOA).bind(id).first<PhieuXoaRow>();
/** `nowIso` = bây giờ (ISO UTC) để đưa phiếu quá hạn lên đầu. */
export async function listPhieuXoaCho(db: D1Database, nowIso: string): Promise<PhieuXoaRow[]> {
  return (await db.prepare(LIST_PHIEU_XOA_CHO).bind(nowIso).all<PhieuXoaRow>()).results;
}
export async function listPhieuXoaCuaHoSo(db: D1Database, partyId: string): Promise<PhieuXoaRow[]> {
  return (await db.prepare(LIST_PHIEU_XOA_CUA_HO_SO).bind(partyId).all<PhieuXoaRow>()).results;
}
export async function listPhieuChuaChepNgoai(db: D1Database): Promise<{ id: string; party_id: string; decided_at: string }[]> {
  return (await db.prepare(LIST_PHIEU_CHUA_CHEP_NGOAI).all<{ id: string; party_id: string; decided_at: string }>()).results;
}
export async function demXemTruocXoa(db: D1Database, partyId: string): Promise<XemTruocXoa> {
  const r = await db.prepare(XEM_TRUOC_XOA).bind(partyId).first<{ giay_to: number; phieu_tu_khai: number; lien_he: number; co_ngay_sinh: number; tep: number }>();
  return { giayTo: r?.giay_to ?? 0, phieuTuKhai: r?.phieu_tu_khai ?? 0, lienHe: r?.lien_he ?? 0, coNgaySinh: (r?.co_ngay_sinh ?? 0) > 0, tep: r?.tep ?? 0 };
}
export async function tepChoXoaCuaPhieu(db: D1Database, partyId: string): Promise<TepCanXoaRow[]> {
  return (await db.prepare(TEP_CHO_XOA_CUA_PHIEU).bind(partyId).all<TepCanXoaRow>()).results;
}
export async function listAnhHetLyDoGiu(db: D1Database, homNay: string): Promise<AnhHetGiuRow[]> {
  return (await db.prepare(LIST_ANH_HET_GIU).bind(homNay).all<AnhHetGiuRow>()).results;
}

export const guiPhieuXoaStatement = (db: D1Database, v: { id: string; partyId: string; actorId: string; at: string }): D1PreparedStatement =>
  db.prepare(GUI_PHIEU_XOA).bind(v.id, v.partyId, v.actorId, v.at);
export const rutPhieuTuKhaiKhiGuiXoaStatement = (db: D1Database, v: { phieuXoaId: string; partyId: string; actorId: string; at: string }): D1PreparedStatement =>
  db.prepare(RUT_PHIEU_TU_KHAI_KHI_GUI_XOA).bind(v.phieuXoaId, v.partyId, v.actorId, v.at);
export const rutPhieuXoaStatement = (db: D1Database, v: { id: string; actorId: string; at: string }): D1PreparedStatement =>
  db.prepare(RUT_PHIEU_XOA).bind(v.id, v.actorId, v.at);
export const quyetPhieuXoaStatement = (db: D1Database, v: { id: string; actorId: string; at: string; giuTen: boolean; phanGiuLai: string }): D1PreparedStatement =>
  db.prepare(QUYET_PHIEU_XOA).bind(v.id, v.actorId, v.at, v.giuTen ? 1 : 0, v.phanGiuLai);
/** Đặt NGAY SAU câu quyết trong lô Thực hiện: nếu câu quyết thua thì ném lỗi `erasure_status_one_way` và D1 huỷ cả lô (câu sổ phiên của auth không chạy). Cùng ?1 ?2 ?3 với câu quyết. */
export const chanLoNeuThuaXoaStatement = (db: D1Database, v: { id: string; actorId: string; at: string }): D1PreparedStatement =>
  db.prepare(CHAN_LO_NEU_THUA_XOA).bind(v.id, v.actorId, v.at);
export const tuChoiPhieuXoaStatement = (db: D1Database, v: { id: string; actorId: string; at: string; lyDo: string }): D1PreparedStatement =>
  db.prepare(TU_CHOI_PHIEU_XOA).bind(v.id, v.actorId, v.at, v.lyDo);
export const danhDauOffsiteStatement = (db: D1Database, v: { id: string; at: string }): D1PreparedStatement => db.prepare(DANH_DAU_OFFSITE).bind(v.id, v.at);
/** Tám câu ẩn danh theo thứ tự CỐ ĐỊNH; đặt SAU `quyetPhieuXoaStatement` trong CÙNG một lô. Mỗi câu mang lính gác DA_THANG_XOA: câu quyết thua ⇒ mọi câu ở đây changes = 0.
 *  `actorId` / `at` PHẢI bằng đúng hai giá trị đã truyền cho câu quyết (lính gác so decided_by / decided_at). Chỉ route thực hiện được gọi (rào src/xoa-mot-lenh-co-ten.test.ts). */
export function anDanhStatements(db: D1Database, v: { id: string; partyId: string; actorId: string; at: string; homNay: string }): D1PreparedStatement[] {
  const b4 = (sql: string): D1PreparedStatement => db.prepare(sql).bind(v.id, v.actorId, v.at, v.partyId);
  return [
    b4(AN_DANH_RUT_PHIEU_CHO),
    b4(AN_DANH_PHIEU_TU_KHAI),
    b4(AN_DANH_XAC_MINH_LAI),
    b4(AN_DANH_GIAY_TO),
    db.prepare(AN_DANH_LIEN_HE).bind(v.id, v.actorId, v.at, v.partyId, v.homNay),
    b4(AN_DANH_NGUOI),
    b4(AN_DANH_TEN_HO_SO),
    b4(AN_DANH_TEP),
  ];
}
export const datChoXoaAnhHetGiuStatement = (db: D1Database, v: { tepId: string; actorId: string; at: string; homNay: string }): D1PreparedStatement =>
  db.prepare(DAT_CHO_XOA_ANH_HET_GIU).bind(v.tepId, v.actorId, v.at, v.homNay);
