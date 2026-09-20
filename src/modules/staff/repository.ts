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

const COLUMNS = `s.id, s.phone, s.active, s.created_at, s.credentials_changed_at, s.party_id,
  COALESCE(pl.display_name, '${NO_PARTY_LABEL}') AS label,
  (SELECT group_concat(p.permission_type_code) FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL) AS permissions`;
const FROM = "FROM staff s LEFT JOIN v_pty_party_label pl ON pl.id = s.party_id";

const FIND_BY_PHONE = defineSql("staff", "find_by_phone", `SELECT ${COLUMNS}, s.pin_hash ${FROM} WHERE s.phone = ?1`);
const FIND_BY_ID = defineSql("staff", "find_by_id", `SELECT ${COLUMNS}, s.pin_hash ${FROM} WHERE s.id = ?1`);
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
const SET_PIN = defineSql("staff", "set_pin", "UPDATE staff SET pin_hash = ?2, credentials_changed_at = ?3 WHERE id = ?1");
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

export const setPinStatement = (db: D1Database, id: string, pinHash: string, at: number): D1PreparedStatement => db.prepare(SET_PIN).bind(id, pinHash, at);

export const insertPermissionStatement = (db: D1Database, staffId: string, code: PermissionCode, actorId: string | null, at: string, guarded: boolean): D1PreparedStatement =>
  db.prepare(INSERT_PERMISSION).bind(crypto.randomUUID(), staffId, code, at, actorId, guarded ? 1 : 0);

export const closePermissionStatement = (db: D1Database, staffId: string, code: PermissionCode, actorId: string, at: string, guarded: boolean): D1PreparedStatement =>
  db.prepare(CLOSE_PERMISSION).bind(staffId, code, at, actorId, guarded ? 1 : 0);
