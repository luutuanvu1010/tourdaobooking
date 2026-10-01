// SQL của bảng `staff` và `stf_*`. Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và tệp này import bằng đuôi .ts để bài kiểm kiến trúc nạp được.
// Tên người dùng KHÔNG đọc từ cột staff.full_name (cột chết, ADR-0005) mà từ hồ sơ qua view công bố v_pty_party_label (LEFT JOIN: tài khoản
// chưa có hồ sơ — khoảng giữa hai lần triển khai N1 — vẫn hiện, nhãn "(chưa có hồ sơ)"). Quyền đọc từ stf_permission trong CÙNG một truy vấn
// (D1 giới hạn số truy vấn mỗi lần gọi Worker và getActiveStaff chạy ở mọi request). Không có SELECT * (R-N1-14).
import { PERMISSION_CODES, isPermissionCode, type PermissionCode } from "../../shared/permissions.ts";
import { defineSql } from "../../shared/sql-registry.ts";

export const NO_PARTY_LABEL = "(chưa có hồ sơ)";

/** Hàng tài khoản dùng cho hiển thị/quản trị (KHÔNG có pin_hash). */
export interface StaffRow {
  id: string;
  phone: string;
  active: number;
  created_at: string;
  credentials_changed_at: number | null;
  /** Lần đăng nhập thành công gần nhất (ISO UTC); null = chưa từng (kể từ migration 0015). */
  last_login_at: string | null;
  party_id: string | null;
  label: string;
  /** group_concat mã quyền đang mở; null nếu không có quyền nào. */
  permissions: string | null;
}
/** Hàng dùng khi xác thực: thêm pin_hash. */
export interface StaffAuthRow extends StaffRow {
  pin_hash: string;
}

export const parsePermissions = (s: string | null): PermissionCode[] =>
  PERMISSION_CODES.filter((code) => (s ?? "").split(",").filter(isPermissionCode).includes(code));

const COLUMNS = `s.id, s.phone, s.active, s.created_at, s.credentials_changed_at, s.last_login_at, s.party_id,
  COALESCE(pl.display_name, '${NO_PARTY_LABEL}') AS label,
  (SELECT group_concat(p.permission_type_code) FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL) AS permissions`;
const FROM = "FROM staff s LEFT JOIN v_pty_party_label pl ON pl.id = s.party_id";

const FIND_BY_PHONE = defineSql("staff", "find_by_phone", `SELECT ${COLUMNS}, s.pin_hash ${FROM} WHERE s.phone = ?1`);
const FIND_BY_ID = defineSql("staff", "find_by_id", `SELECT ${COLUMNS}, s.pin_hash ${FROM} WHERE s.id = ?1`);
// ADR-0013 điều 4: hồ sơ gắn tài khoản nào (kể cả tài khoản đang ngưng). staff_party_uq ⇒ tối đa một dòng.
const LIST = defineSql("staff", "list", `SELECT ${COLUMNS} ${FROM} ORDER BY s.active DESC, pl.sort_key COLLATE NOCASE, s.created_at`);

/** Đếm quản trị viên đang hoạt động (có quyền ADMIN đang mở). */
const COUNT_ACTIVE_ADMINS = defineSql(
  "staff",
  "count_active_admins",
  `SELECT count(*) AS n FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'ADMIN' AND p.valid_to_at IS NULL WHERE s.active = 1`,
);

// Câu bảo vệ "còn quản trị viên hoạt động KHÁC tài khoản ?N" — nằm ngay trong câu ghi nên hai admin sửa nhau cùng lúc cũng không thể làm hết admin
// (D1 tuần tự hoá các batch). ?N là id tài khoản bị ảnh hưởng.
const OTHER_ADMIN = (n: number): string =>
  `(SELECT count(*) FROM staff s2 JOIN stf_permission p2 ON p2.staff_id = s2.id AND p2.permission_type_code = 'ADMIN' AND p2.valid_to_at IS NULL WHERE s2.active = 1 AND s2.id <> ?${n}) >= 1`;

// role/full_name là cột CHẾT (ADR-0005): ghi hằng để thoả NOT NULL, không ai đọc. full_name ghi '' (không sao chép tên hồ sơ để khỏi lệch).
const INSERT_STAFF = defineSql(
  "staff",
  "insert",
  `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?1, '', ?2, ?3, 'sales', 1, ?4, ?5)`,
);
// phone/active tuỳ chọn (COALESCE); ?4 = 1 khi thay đổi này có thể làm mất một quản trị viên (ngưng tài khoản đang là ADMIN).
const UPDATE_STAFF = defineSql(
  "staff",
  "update",
  `UPDATE staff SET phone = COALESCE(?2, phone), active = COALESCE(?3, active) WHERE id = ?1 AND (?4 = 0 OR ${OTHER_ADMIN(1)})`,
);
const RECORD_LOGIN = defineSql("staff", "record_login", "UPDATE staff SET last_login_at = ?2 WHERE id = ?1");
/** Tên HIỂN THỊ theo id tài khoản (view công bố của chính module) — ruling R-P20: CHỈ id + nhãn, không SĐT, không email, không quyền. */
const LABELS_BY_IDS = defineSql("staff", "labels_by_ids", "SELECT id, label FROM v_stf_staff_label WHERE id IN (SELECT value FROM json_each(?1))");
export async function labelsByIds(db: D1Database, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  return new Map((await db.prepare(LABELS_BY_IDS).bind(JSON.stringify(ids)).all<{ id: string; label: string }>()).results.map((r) => [r.id, r.label]));
}
// ADR-0075 điều 7: chủ của các dòng sổ phiên — tên hiển thị + mốc lưới credentials_changed_at (để màn sổ phiên tính trạng thái theo lưới). Không SĐT, không quyền.
const SESSION_OWNERS = defineSql(
  "staff",
  "session_owners_by_ids",
  `SELECT s.id, COALESCE(pl.display_name, '${NO_PARTY_LABEL}') AS label, s.credentials_changed_at ${FROM} WHERE s.id IN (SELECT value FROM json_each(?1))`,
);
export async function sessionOwnersByIds(db: D1Database, ids: readonly string[]): Promise<Map<string, { label: string; credentialsChangedAt: number | null }>> {
  if (ids.length === 0) return new Map();
  const { results } = await db.prepare(SESSION_OWNERS).bind(JSON.stringify(ids)).all<{ id: string; label: string; credentials_changed_at: number | null }>();
  return new Map(results.map((r) => [r.id, { label: r.label, credentialsChangedAt: r.credentials_changed_at }]));
}
const SET_PIN = defineSql("staff", "set_pin", "UPDATE staff SET pin_hash = ?2, credentials_changed_at = ?3 WHERE id = ?1");
const TOUCH_CREDENTIALS = defineSql("staff", "touch_credentials", "UPDATE staff SET credentials_changed_at = ?2 WHERE id = ?1");
// Chỉ đẩy khi câu NGAY TRƯỚC trong cùng batch có đổi dòng (gỡ passkey): changes() trong WHERE nhìn thấy câu đã hoàn tất trước đó — cùng cơ chế với nhật ký `onlyIf`.
const TOUCH_CREDENTIALS_IF_CHANGED = defineSql("staff", "touch_credentials_if_changed", "UPDATE staff SET credentials_changed_at = ?2 WHERE id = ?1 AND changes() > 0");
const INSERT_PERMISSION = defineSql(
  "staff",
  "insert_permission",
  `INSERT OR IGNORE INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5 WHERE (?6 = 0 OR ${OTHER_ADMIN(2)})`,
);
const CLOSE_PERMISSION = defineSql(
  "staff",
  "close_permission",
  `UPDATE stf_permission SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4
   WHERE staff_id = ?1 AND permission_type_code = ?2 AND valid_to_at IS NULL AND (?5 = 0 OR ${OTHER_ADMIN(1)})`,
);

export const findByPhone = (db: D1Database, phone: string): Promise<StaffAuthRow | null> => db.prepare(FIND_BY_PHONE).bind(phone).first<StaffAuthRow>();
export const findById = (db: D1Database, id: string): Promise<StaffAuthRow | null> => db.prepare(FIND_BY_ID).bind(id).first<StaffAuthRow>();

export async function listAll(db: D1Database): Promise<StaffRow[]> {
  return (await db.prepare(LIST).all<StaffRow>()).results;
}

export async function countActiveAdmins(db: D1Database): Promise<number> {
  return (await db.prepare(COUNT_ACTIVE_ADMINS).first<{ n: number }>())?.n ?? 0;
}

export const insertStaffStatement = (db: D1Database, v: { id: string; phone: string; pinHash: string; createdAt: string; partyId: string }): D1PreparedStatement =>
  db.prepare(INSERT_STAFF).bind(v.id, v.phone, v.pinHash, v.createdAt, v.partyId);

export const updateStaffStatement = (db: D1Database, id: string, patch: { phone?: string; active?: boolean }, losesAdmin: boolean): D1PreparedStatement =>
  db.prepare(UPDATE_STAFF).bind(id, patch.phone ?? null, patch.active === undefined ? null : patch.active ? 1 : 0, losesAdmin ? 1 : 0);

export const recordLoginRow = (db: D1Database, id: string, at: string): Promise<D1Result> => db.prepare(RECORD_LOGIN).bind(id, at).run();

export const setPinStatement = (db: D1Database, id: string, pinHash: string, at: number): D1PreparedStatement => db.prepare(SET_PIN).bind(id, pinHash, at);

export const touchCredentialsStatement = (db: D1Database, id: string, at: number, onlyIfPreviousChanged: boolean): D1PreparedStatement =>
  db.prepare(onlyIfPreviousChanged ? TOUCH_CREDENTIALS_IF_CHANGED : TOUCH_CREDENTIALS).bind(id, at);

export const insertPermissionStatement = (db: D1Database, staffId: string, code: PermissionCode, actorId: string | null, at: string, guarded: boolean): D1PreparedStatement =>
  db.prepare(INSERT_PERMISSION).bind(crypto.randomUUID(), staffId, code, at, actorId, guarded ? 1 : 0);

export const closePermissionStatement = (db: D1Database, staffId: string, code: PermissionCode, actorId: string, at: string, guarded: boolean): D1PreparedStatement =>
  db.prepare(CLOSE_PERMISSION).bind(staffId, code, at, actorId, guarded ? 1 : 0);

// ---- Chỉnh quyền tay (ADR-0018 điều 3) — bảng stf_permission_adjustment ------------------------------------------------------------------------------
export interface AdjustmentRow { id: string; permission_type_code: string; direction: string; reason: string }
// Mới nhất trước: lý do của lần chỉnh gần nhất đứng đầu (giao diện điền sẵn).
const OPEN_ADJUSTMENTS = defineSql(
  "staff",
  "open_adjustments",
  "SELECT id, permission_type_code, direction, reason FROM stf_permission_adjustment WHERE staff_id = ?1 AND valid_to_at IS NULL ORDER BY valid_from_at DESC, permission_type_code",
);
// ?7 = 1 khi lần đổi này gỡ ADMIN: mang CÙNG điều kiện "còn quản trị viên khác" với các câu quyền (xem setPermissionStatements của index.ts).
const INSERT_ADJUSTMENT = defineSql(
  "staff",
  "insert_adjustment",
  `INSERT INTO stf_permission_adjustment (id, staff_id, permission_type_code, direction, reason, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?6, ?8, ?6, ?8 WHERE (?7 = 0 OR ${OTHER_ADMIN(2)})`,
);
const CLOSE_ADJUSTMENT = defineSql(
  "staff",
  "close_adjustment",
  `UPDATE stf_permission_adjustment SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND staff_id = ?2 AND valid_to_at IS NULL AND (?5 = 0 OR ${OTHER_ADMIN(2)})`,
);
const ACCOUNT_OF_PARTY = defineSql("staff", "account_of_party", "SELECT id FROM staff WHERE party_id = ?1");

export async function openAdjustments(db: D1Database, staffId: string): Promise<AdjustmentRow[]> {
  return (await db.prepare(OPEN_ADJUSTMENTS).bind(staffId).all<AdjustmentRow>()).results;
}

// ADR-0068 Đ8 (lý do LOGIN_PHONE) + Đ9 (hồ sơ khớp có tài khoản?): SĐT đăng nhập của mọi tài khoản có hồ sơ; tài khoản của một tập hồ sơ (mảng JSON ?1).
const PHONES_BY_PARTY = defineSql("staff", "phones_by_party", "SELECT party_id, phone FROM staff WHERE party_id IS NOT NULL");
const ACCOUNTS_OF_PARTIES = defineSql("staff", "accounts_of_parties", "SELECT party_id FROM staff WHERE party_id IN (SELECT value FROM json_each(?1))");
export async function phonesByParty(db: D1Database): Promise<{ partyId: string; phone: string }[]> {
  return (await db.prepare(PHONES_BY_PARTY).all<{ party_id: string; phone: string }>()).results.map((r) => ({ partyId: r.party_id, phone: r.phone }));
}
export async function partiesWithAccount(db: D1Database, partyIds: readonly string[]): Promise<Set<string>> {
  if (partyIds.length === 0) return new Set();
  return new Set((await db.prepare(ACCOUNTS_OF_PARTIES).bind(JSON.stringify(partyIds)).all<{ party_id: string }>()).results.map((r) => r.party_id));
}
export const insertAdjustmentStatement = (
  db: D1Database,
  v: { staffId: string; code: PermissionCode; direction: "ADD" | "REMOVE"; reason: string; at: string; actorId: string; guarded: boolean },
): D1PreparedStatement => db.prepare(INSERT_ADJUSTMENT).bind(crypto.randomUUID(), v.staffId, v.code, v.direction, v.reason, v.at, v.guarded ? 1 : 0, v.actorId);
export const closeAdjustmentStatement = (db: D1Database, v: { id: string; staffId: string; at: string; actorId: string; guarded: boolean }): D1PreparedStatement =>
  db.prepare(CLOSE_ADJUSTMENT).bind(v.id, v.staffId, v.at, v.actorId, v.guarded ? 1 : 0);
export async function accountIdOfParty(db: D1Database, partyId: string): Promise<string | null> {
  return (await db.prepare(ACCOUNT_OF_PARTY).bind(partyId).first<{ id: string }>())?.id ?? null;
}
