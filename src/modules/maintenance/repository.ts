// SQL của bảng module maintenance sở hữu (mnt_setting — singleton, id = 'default'). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và import bằng đuôi .ts để
// bài kiểm kiến trúc nạp được tệp này. Câu SQL TĨNH, liệt kê cột tường minh (không `SELECT *`).
import { defineSql } from "../../shared/sql-registry.ts";

export interface SettingRow {
  enabled: number;
  ends_at: string | null;
}

// ADR-0071 điều 3d: cột allowed_phones THÔI được đọc (giữ cột — expand–contract; miễn trừ nay theo quyền Toàn quyền, không theo SĐT).
const FIND = defineSql("maintenance", "find", "SELECT enabled, ends_at FROM mnt_setting WHERE id = 'default'");
const UPDATE = defineSql(
  "maintenance",
  "update",
  "UPDATE mnt_setting SET enabled = ?1, ends_at = ?2, updated_at = ?3, updated_by = ?4 WHERE id = 'default'",
);

/** Dòng cài đặt duy nhất, hoặc null nếu chưa có dòng (migration 0016 luôn gieo; null chỉ khi ai đó xoá tay). */
export const findSetting = (db: D1Database): Promise<SettingRow | null> => db.prepare(FIND).first<SettingRow>();

/** Câu lệnh (CHƯA chạy) bật/tắt; người gọi gộp cùng câu nhật ký vào một `db.batch()`. `endsAt` = null khi tắt. */
export const updateSettingStatement = (db: D1Database, v: { enabled: boolean; endsAt: string | null; at: string; by: string }): D1PreparedStatement =>
  db.prepare(UPDATE).bind(v.enabled ? 1 : 0, v.endsAt, v.at, v.by);
