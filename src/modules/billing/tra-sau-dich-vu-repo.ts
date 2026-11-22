// SQL dấu «Trả sau theo dịch vụ» (ADR-0178 Đ2 mục 1, ADR-0230 Đ1 mục 1; migration 0186): bảng `bil_service_credit_rule`, CHỈ THÊM, dòng mở = `valid_to IS NULL`,
// mỗi đích (loại + mã) tối đa MỘT dòng mở (chỉ mục duy nhất `bil_service_credit_rule_one_open`). Đổi số giờ = đóng dòng mở + chèn dòng mới; gỡ = đóng dòng mở.
// Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, tham số ?N). Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
// Chống hai tab: câu đóng nhắm ĐÚNG `id` dòng mở đã đọc; câu chèn KHÔNG có gác NOT EXISTS — tab thua (dòng đã bị tab kia đóng) chèn va chỉ mục duy nhất, cả lô huỷ (nơi gọi trả 409).
import { defineSql } from "../../shared/sql-registry.ts";

export interface DauMoRow {
  id: string;
  target_kind: "GROUP" | "SERVICE";
  target_code: string;
  due_hours: number;
  grace_hours: number;
  valid_from: string;
}

const DAU_MO = defineSql(
  "billing",
  "service_credit_rule_open",
  `SELECT id, target_kind, target_code, due_hours, grace_hours, valid_from FROM bil_service_credit_rule WHERE valid_to IS NULL ORDER BY target_kind, target_code`,
);
/** Mọi dòng đang mở. */
export const dauDangMo = async (db: D1Database): Promise<DauMoRow[]> => (await db.prepare(DAU_MO).all<DauMoRow>()).results;

const DAU_MO_CUA = defineSql(
  "billing",
  "service_credit_rule_open_of",
  `SELECT id, target_kind, target_code, due_hours, grace_hours, valid_from FROM bil_service_credit_rule WHERE target_kind = ?1 AND target_code = ?2 AND valid_to IS NULL`,
);
/** Dòng đang mở của MỘT đích, hoặc `null`. */
export const dauMoCua = async (db: D1Database, kind: "GROUP" | "SERVICE", code: string): Promise<DauMoRow | null> =>
  (await db.prepare(DAU_MO_CUA).bind(kind, code).first<DauMoRow>()) ?? null;

// Trigger `bil_service_credit_rule_close_only` chỉ cho đổi `valid_to` (một lần) cùng `updated_at` / `updated_by`.
const DAU_DONG = defineSql(
  "billing",
  "service_credit_rule_close",
  `UPDATE bil_service_credit_rule SET valid_to = ?2, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND valid_to IS NULL`,
);
/** Đóng dòng mở có `id` đã đọc. `meta.changes = 0` ⇒ tab khác đã đóng trước. */
export const dongDauStatement = (db: D1Database, id: string, at: string, by: string) => db.prepare(DAU_DONG).bind(id, at, by);

const DAU_THEM = defineSql(
  "billing",
  "service_credit_rule_insert",
  `INSERT INTO bil_service_credit_rule (id, target_kind, target_code, due_hours, grace_hours, valid_from, valid_to, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?6, ?7, ?6, ?7)`,
);
export const themDauStatement = (
  db: D1Database,
  v: { id: string; kind: "GROUP" | "SERVICE"; code: string; gioTra: number; gioAnHan: number; at: string; by: string },
) => db.prepare(DAU_THEM).bind(v.id, v.kind, v.code, v.gioTra, v.gioAnHan, v.at, v.by);
