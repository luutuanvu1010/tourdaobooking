// SQL của bảng module giao-dien sở hữu (gd_setting — một dòng, id = 'default', ADR-0087). Câu tĩnh qua defineSql, cột tường minh.
import { defineSql } from "../../shared/sql-registry.ts";

export interface GiaoDienRow { tokens: string; version: number }

const FIND = defineSql("giao-dien", "find", "SELECT tokens, version FROM gd_setting WHERE id = 'default'");
const UPDATE = defineSql(
  "giao-dien",
  "update",
  "UPDATE gd_setting SET tokens = ?1, version = version + 1, updated_at = ?2, updated_by = ?3 WHERE id = 'default' AND version = ?4",
);

/** Dòng duy nhất, hoặc null nếu bị xoá tay (migration luôn gieo). */
export const findGiaoDien = (db: D1Database): Promise<GiaoDienRow | null> => db.prepare(FIND).first<GiaoDienRow>();

/** Câu (CHƯA chạy) ghi khi `version` khớp — người gọi gộp với câu nhật ký `onlyIf: "changes() > 0"` trong một db.batch(). */
export const updateGiaoDienStatement = (db: D1Database, v: { tokens: string; at: string; by: string; version: number }): D1PreparedStatement =>
  db.prepare(UPDATE).bind(v.tokens, v.at, v.by, v.version);

// ---- gd_field_policy — chính sách hiện / ẩn / bắt buộc (ADR-0194 đợt 1; chỉ-thêm, khuôn ord_partner_customer_policy) -----------------------------------------
export interface DongChinhSachRow { man: string; truong: string; quyen: string; cheDo: string }

const CS_HIEU_LUC = defineSql(
  "giao-dien",
  "field_policy_effective",
  `SELECT p.man AS man, p.truong AS truong, p.quyen AS quyen, p.che_do AS cheDo FROM gd_field_policy p
   WHERE p.valid_from_at <= ?1 AND p.valid_from_at = (SELECT max(q.valid_from_at) FROM gd_field_policy q WHERE q.man = p.man AND q.truong = p.truong AND q.quyen = p.quyen AND q.valid_from_at <= ?1)
   ORDER BY p.man, p.truong, p.quyen`,
);
/** Mọi dòng đang hiệu lực lúc `luc` (mỗi ô một dòng, kể cả chế độ HIEN). Bảng rỗng ⇒ []. */
export const chinhSachHieuLuc = async (db: D1Database, luc: string): Promise<DongChinhSachRow[]> => (await db.prepare(CS_HIEU_LUC).bind(luc).all<DongChinhSachRow>()).results;

const CS_MOI_NHAT = defineSql("giao-dien", "field_policy_latest", "SELECT max(valid_from_at) AS moiNhat FROM gd_field_policy");
export const chinhSachMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(CS_MOI_NHAT).first<{ moiNhat: string | null }>())?.moiNhat ?? null;

const CS_THEM = defineSql(
  "giao-dien",
  "field_policy_insert",
  "INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?6, ?7)",
);
/** Câu (CHƯA chạy) thêm một dòng; người gọi gộp với câu nhật ký trong một db.batch(). Trùng (màn, trường, quyền, mốc) ⇒ UNIQUE ném lỗi. */
export const themChinhSach = (db: D1Database, v: { id: string; man: string; truong: string; quyen: string; cheDo: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(CS_THEM).bind(v.id, v.man, v.truong, v.quyen, v.cheDo, v.at, v.by);
