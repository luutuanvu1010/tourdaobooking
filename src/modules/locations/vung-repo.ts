// SQL của bảng loc_zone (khu vực đón, ADR-0147 Đ1). Mọi câu đi qua defineSql; câu SQL TĨNH. Import bằng đuôi .ts để bài kiểm kiến trúc nạp được tệp này.
import { defineSql } from "../../shared/sql-registry.ts";
import type { VungSua, VungTao } from "./vung-rules.ts";

export interface VungRow {
  code: string;
  name: string;
  sort_order: number;
  active: number;
  so_dia_diem: number;
  updated_at: string;
}

const LIST = defineSql(
  "locations",
  "zone_list",
  `SELECT z.code, z.name, z.sort_order, z.active, (SELECT COUNT(*) FROM loc_location l WHERE l.zone_code = z.code OR (z.code = 'NGOAI_VUNG' AND l.zone_code IS NULL)) AS so_dia_diem, z.updated_at
   FROM loc_zone z
   ORDER BY z.active DESC, z.sort_order, z.code`,
);
const FIND = defineSql(
  "locations",
  "zone_find",
  `SELECT z.code, z.name, z.sort_order, z.active, (SELECT COUNT(*) FROM loc_location l WHERE l.zone_code = z.code OR (z.code = 'NGOAI_VUNG' AND l.zone_code IS NULL)) AS so_dia_diem, z.updated_at
   FROM loc_zone z WHERE z.code = ?`,
);
const INSERT = defineSql(
  "locations",
  "zone_insert",
  `INSERT INTO loc_zone (code, name, sort_order, active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
);
const UPDATE = defineSql(
  "locations",
  "zone_update",
  `UPDATE loc_zone SET name = ?, sort_order = ?, active = ?, updated_at = ?, updated_by = ? WHERE code = ? AND updated_at = ?`,
);
const ACTIVE_LIST = defineSql("locations", "zone_active_list", "SELECT code, name FROM loc_zone WHERE active = 1 ORDER BY sort_order, code");
const ACTIVE_EXISTS = defineSql("locations", "zone_active_exists", "SELECT 1 AS ok FROM loc_zone WHERE code = ? AND active = 1");

export async function listVung(db: D1Database): Promise<VungRow[]> {
  const { results } = await db.prepare(LIST).all<VungRow>();
  return results;
}

export function findVung(db: D1Database, code: string): Promise<VungRow | null> {
  return db.prepare(FIND).bind(code).first<VungRow>();
}

export async function listVungDangBat(db: D1Database): Promise<{ code: string; name: string }[]> {
  const { results } = await db.prepare(ACTIVE_LIST).all<{ code: string; name: string }>();
  return results;
}

export async function vungDangBatTonTai(db: D1Database, code: string): Promise<boolean> {
  return (await db.prepare(ACTIVE_EXISTS).bind(code).first()) !== null;
}

export function insertVungStatement(db: D1Database, v: VungTao, actorId: string, at: string): D1PreparedStatement {
  return db.prepare(INSERT).bind(v.code, v.name, v.sortOrder, at, actorId, at, actorId);
}

/** Sửa có khoá lạc quan: chỉ áp dụng khi `updated_at` còn đúng mốc client đã đọc (changes() = 0 → đã bị sửa). */
export function updateVungStatement(db: D1Database, code: string, v: VungSua, actorId: string, at: string): D1PreparedStatement {
  return db.prepare(UPDATE).bind(v.name, v.sortOrder, v.active ? 1 : 0, at, actorId, code, v.expectedUpdatedAt);
}

/** Khu vực đón của các địa điểm theo id (mảng JSON ở ?1) — đọc view công bố `v_loc_location_zone` (địa điểm chưa xếp vùng ⇒ NGOAI_VUNG, một luật với view). */
const KHU_VUC_CUA_DIA_DIEM = defineSql(
  "locations",
  "zone_of_locations",
  `SELECT location_id, zone_code FROM v_loc_location_zone WHERE location_id IN (SELECT value FROM json_each(?1))`,
);
export async function khuVucCuaDiaDiem(db: D1Database, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { results } = await db.prepare(KHU_VUC_CUA_DIA_DIEM).bind(JSON.stringify([...new Set(ids)])).all<{ location_id: string; zone_code: string }>();
  return new Map(results.map((r) => [r.location_id, r.zone_code] as const));
}
