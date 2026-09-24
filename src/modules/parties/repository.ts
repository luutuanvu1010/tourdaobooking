// SQL của các bảng module parties sở hữu (pty_*). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và import bằng đuôi .ts để bài kiểm
// kiến trúc nạp được tệp này. Câu SQL TĨNH: tham số tuỳ chọn viết `?N IS NULL OR …`; tham số đánh số ?N để dùng lại một giá trị.
// Đọc địa điểm CHỈ qua view công bố v_loc_location_label (ADR-0008); không đụng bảng loc_* trực tiếp.
import { defineSql } from "../../shared/sql-registry.ts";
import type { ContactInput, OrgFields, PersonName, RelationshipInput, RoleInput } from "./rules.ts";
import { composePersonName } from "./rules.ts";

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
  legal_name: string | null;
  tax_code: string | null;
  address: string | null;
  invoice_email: string | null;
}
export interface ContactRow { id: string; contact_kind_code: string; value: string; label: string | null; is_primary: number; valid_from_date: string; valid_to_date: string | null }
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

// ?2 loại, ?3 LIKE tên, ?4 LIKE số (chuẩn hoá), ?5 mã vai trò, ?6 địa điểm, ?7 gồm cả đã ngưng, ?8 giới hạn, ?9 vị trí bắt đầu
const LIST = defineSql(
  "parties",
  "list",
  `${LIST_SELECT}
   WHERE (?2 IS NULL OR p.party_kind = ?2)
     AND (?3 IS NULL OR p.display_name LIKE ?3 ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = p.id AND c.valid_to_date IS NULL AND c.value_normalized LIKE ?4 ESCAPE '\\'))
     AND ((?5 IS NULL AND ?6 IS NULL)
          OR EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = p.id AND (?5 IS NULL OR r.role_type_code = ?5) AND (?6 IS NULL OR r.location_id = ?6)
                       AND r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)))
     AND (?7 = 1 OR p.active = 1)
   ORDER BY p.sort_key COLLATE NOCASE, p.id LIMIT ?8 OFFSET ?9`,
);

// ?2 = số điện thoại đã chuẩn hoá. Chỉ liên hệ đang mở. Không chặn tạo trùng — chỉ để giao diện hỏi "dùng có sẵn hay tạo mới" (ADR-0001 mục 8).
const LOOKUP = defineSql(
  "parties",
  "lookup_phone",
  `${LIST_SELECT}
   WHERE p.id IN (SELECT c.party_id FROM pty_contact_point c WHERE c.contact_kind_code = 'PHONE' AND c.value_normalized = ?2 AND c.valid_to_date IS NULL)
   ORDER BY p.sort_key COLLATE NOCASE, p.id LIMIT 20`,
);

const FIND = defineSql(
  "parties",
  "find",
  `SELECT p.id, p.party_kind, p.display_name, p.active, p.created_at, p.updated_at, pe.family_name, pe.middle_name, pe.given_name,
          o.legal_name, o.tax_code, o.address, o.invoice_email
   FROM pty_party p LEFT JOIN pty_person pe ON pe.party_id = p.id LEFT JOIN pty_organization o ON o.party_id = p.id WHERE p.id = ?1`,
);
const CONTACTS_OF = defineSql(
  "parties",
  "contacts_of",
  `SELECT id, contact_kind_code, value, label, is_primary, valid_from_date, valid_to_date FROM pty_contact_point WHERE party_id = ?1
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
const ROLE_TYPES = defineSql("parties", "role_types", "SELECT code, name, role_group, active FROM pty_role_type ORDER BY sort_order");
const RELATIONSHIP_TYPES = defineSql("parties", "relationship_types", "SELECT code, name FROM pty_relationship_type WHERE active = 1 ORDER BY sort_order");

export interface ListFilter {
  today: string;
  kind: PartyKind | null;
  q: string | null; // đã escape LIKE và bọc %…%
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

export interface RoleTypeRow { code: string; name: string; role_group: string; active: number }
export async function listRoleTypes(db: D1Database): Promise<RoleTypeRow[]> {
  return (await db.prepare(ROLE_TYPES).all<RoleTypeRow>()).results;
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
  `INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6)`,
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
  `UPDATE pty_person SET family_name = ?2, middle_name = ?3, given_name = ?4, updated_at = ?5, updated_by = ?6
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
  input: { name: PersonName; contacts?: ContactInput[]; roles?: RoleInput[]; contactsFrom: string },
  actorId: string | null,
  at: string,
): { partyId: string; statements: D1PreparedStatement[] } {
  const partyId = crypto.randomUUID();
  const { name } = input;
  return {
    partyId,
    statements: [
      db.prepare(INSERT_PARTY).bind(partyId, "PERSON", composePersonName(name), at, actorId),
      db.prepare(INSERT_PERSON).bind(partyId, name.family, name.middle, name.given, at, actorId),
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
  v: { kind: "PERSON"; name: PersonName; active: boolean; expectedUpdatedAt: string } | { kind: "ORGANIZATION"; org: OrgFields; active: boolean; expectedUpdatedAt: string },
  actorId: string,
  at: string,
): D1PreparedStatement[] {
  if (v.kind === "PERSON") {
    return [
      db.prepare(UPDATE_PERSON).bind(id, v.name.family, v.name.middle, v.name.given, at, actorId, v.expectedUpdatedAt),
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
const ROLE_TYPE_GROUP = defineSql("parties", "role_type_group", "SELECT role_group FROM pty_role_type WHERE code = ?1");
const ROLE_ROW_GROUP = defineSql(
  "parties",
  "role_row_group",
  "SELECT t.role_group FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code WHERE r.id = ?1 AND r.party_id = ?2",
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
export async function roleTypeGroup(db: D1Database, code: string): Promise<string | null> {
  return (await db.prepare(ROLE_TYPE_GROUP).bind(code).first<{ role_group: string }>())?.role_group ?? null;
}
export async function roleRowGroup(db: D1Database, partyId: string, roleId: string): Promise<string | null> {
  return (await db.prepare(ROLE_ROW_GROUP).bind(roleId, partyId).first<{ role_group: string }>())?.role_group ?? null;
}
export const reopenRoleStatement = (db: D1Database, partyId: string, roleId: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(REOPEN_ROLE).bind(roleId, partyId, at, actorId);
