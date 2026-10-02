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
