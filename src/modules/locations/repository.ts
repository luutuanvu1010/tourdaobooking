// SQL của các bảng module locations sở hữu (loc_location_type, loc_location). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và import bằng
// đuôi .ts để bài kiểm kiến trúc nạp được tệp này. Câu SQL TĨNH: không ghép chuỗi theo đầu vào.
import { defineSql } from "../../shared/sql-registry.ts";
import type { LocationCreate, LocationUpdate } from "./rules.ts";

export interface LocationRow {
  id: string;
  code: string;
  name: string;
  location_type_code: string;
  type_name: string;
  address: string | null;
  sort_order: number;
  active: number;
  /** ADR-0118 Đ4 (0121): thứ tự «Chọn nhanh» 1–99; NULL = không chọn nhanh. */
  quick_pick_order: number | null;
  updated_at: string;
}

const LIST = defineSql(
  "locations",
  "list",
  `SELECT l.id, l.code, l.name, l.location_type_code, t.name AS type_name, l.address, l.sort_order, l.active, l.quick_pick_order, l.updated_at
   FROM loc_location l JOIN loc_location_type t ON t.code = l.location_type_code
   ORDER BY l.active DESC, l.sort_order, l.name`,
);
const FIND = defineSql(
  "locations",
  "find",
  `SELECT l.id, l.code, l.name, l.location_type_code, t.name AS type_name, l.address, l.sort_order, l.active, l.quick_pick_order, l.updated_at
   FROM loc_location l JOIN loc_location_type t ON t.code = l.location_type_code WHERE l.id = ?`,
);
const TYPES = defineSql("locations", "types", "SELECT code, name FROM loc_location_type WHERE active = 1 ORDER BY sort_order");
const TYPE_EXISTS = defineSql("locations", "type_exists", "SELECT 1 AS ok FROM loc_location_type WHERE code = ? AND active = 1");
const INSERT = defineSql(
  "locations",
  "insert",
  `INSERT INTO loc_location (id, code, name, location_type_code, address, sort_order, active, created_at, created_by, updated_at, updated_by)
   VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
);
const UPDATE = defineSql(
  "locations",
  "update",
  `UPDATE loc_location SET name = ?, location_type_code = ?, address = ?, sort_order = ?, active = ?, quick_pick_order = ?, updated_at = ?, updated_by = ?
   WHERE id = ? AND updated_at = ?`,
);

export async function listLocations(db: D1Database): Promise<LocationRow[]> {
  const { results } = await db.prepare(LIST).all<LocationRow>();
  return results;
}

export function findLocation(db: D1Database, id: string): Promise<LocationRow | null> {
  return db.prepare(FIND).bind(id).first<LocationRow>();
}

export async function listLocationTypes(db: D1Database): Promise<{ code: string; name: string }[]> {
  const { results } = await db.prepare(TYPES).all<{ code: string; name: string }>();
  return results;
}

export async function locationTypeExists(db: D1Database, code: string): Promise<boolean> {
  return (await db.prepare(TYPE_EXISTS).bind(code).first()) !== null;
}

export function insertLocationStatement(db: D1Database, id: string, v: LocationCreate, actorId: string, at: string): D1PreparedStatement {
  return db.prepare(INSERT).bind(id, v.code, v.name, v.locationTypeCode, v.address, v.sortOrder, at, actorId, at, actorId);
}

/**
 * Sửa có khoá lạc quan: chỉ áp dụng khi `updated_at` còn đúng mốc client đã đọc (changes() = 0 → đã bị sửa). `quickPick` là giá trị SẼ GHI (nơi gọi đã quyết khoá vắng = giữ giá trị đang lưu —
 * ADR-0118 Ruling R-G; mốc lạc quan bảo đảm giá trị đang lưu chưa đổi giữa lúc đọc và lúc ghi).
 */
export function updateLocationStatement(db: D1Database, id: string, v: LocationUpdate, quickPick: number | null, actorId: string, at: string): D1PreparedStatement {
  return db.prepare(UPDATE).bind(v.name, v.locationTypeCode, v.address, v.sortOrder, v.active ? 1 : 0, quickPick, at, actorId, id, v.expectedUpdatedAt);
}
