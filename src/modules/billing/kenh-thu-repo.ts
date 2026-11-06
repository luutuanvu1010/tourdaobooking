// SQL của công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1; migration 0144): bảng `bil_partner_channel_setting`, CHỈ THÊM, hiệu lực = dòng đang mở tại thời điểm hỏi.
// Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, tham số ?N). Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
import { defineSql } from "../../shared/sql-registry.ts";

const KENH_THU_DOC = defineSql(
  "billing",
  "partner_channel_setting_at",
  `SELECT company_collects FROM bil_partner_channel_setting WHERE valid_from <= ?1 AND (valid_to IS NULL OR valid_to > ?1) ORDER BY valid_from DESC, rowid DESC LIMIT 1`,
);
/** `null` = chưa có dòng hiệu lực (chưa ai đổi công tắc). */
export const kenhThuTai = async (db: D1Database, at: string): Promise<number | null> =>
  (await db.prepare(KENH_THU_DOC).bind(at).first<{ company_collects: number }>())?.company_collects ?? null;

// ---- Đổi công tắc (ADR-0178 Đ1 mục 1; khuôn bil_credit_setting ở tra-sau-repo.ts): đóng dòng đang mở rồi chèn dòng mới trong MỘT db.batch ----
const KENH_THU_DONG = defineSql(
  "billing",
  "partner_channel_setting_close",
  `UPDATE bil_partner_channel_setting SET valid_to = ?1, updated_at = ?1, updated_by = ?2 WHERE valid_to IS NULL`,
);
export const dongKenhThuStatement = (db: D1Database, at: string, by: string) => db.prepare(KENH_THU_DONG).bind(at, by);
// Câu gác: chỉ chèn khi KHÔNG còn dòng nào đang mở (sau câu đóng ở trên) — hai lần đổi đua nhau không bao giờ để hai dòng cùng hiệu lực.
const KENH_THU_THEM = defineSql(
  "billing",
  "partner_channel_setting_insert",
  `INSERT INTO bil_partner_channel_setting (id, company_collects, valid_from, valid_to, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, NULL, ?3, ?4, ?3, ?4 WHERE NOT EXISTS (SELECT 1 FROM bil_partner_channel_setting WHERE valid_to IS NULL)`,
);
export const themKenhThuStatement = (db: D1Database, v: { id: string; congTyThu: 0 | 1; at: string; by: string }) => db.prepare(KENH_THU_THEM).bind(v.id, v.congTyThu, v.at, v.by);

export interface KenhThuLichSuRow { company_collects: number; valid_from: string; nguoi_doi: string | null }
// Tên người đổi qua view nhãn nhân viên (không đọc bảng staff thô; không SĐT/email).
const KENH_THU_LICH_SU = defineSql(
  "billing",
  "partner_channel_setting_history",
  `SELECT c.company_collects, c.valid_from, s.label AS nguoi_doi FROM bil_partner_channel_setting c LEFT JOIN v_stf_staff_label s ON s.id = c.created_by ORDER BY c.valid_from DESC, c.rowid DESC LIMIT 50`,
);
export const kenhThuLichSu = async (db: D1Database): Promise<KenhThuLichSuRow[]> => (await db.prepare(KENH_THU_LICH_SU).all<KenhThuLichSuRow>()).results;

// ---- Cổng người thu của đơn mang dấu Tắt (ADR-0178 Đ1 mục 3): dấu của đơn + hồ sơ người lập, đọc qua view công bố (không đọc bảng orders/staff thô) ----
// Cùng nguồn với trigger `bil_receipt_partner_channel` (0144) và `hoSoNhanVien` (coc-repo.ts). `undefined` = không có đơn.
const KENH_THU_CUA_DON = defineSql(
  "billing",
  "partner_channel_of_order",
  `SELECT k.company_collects_snapshot AS dau, s.party_id AS nguoi_lap FROM v_ord_kenh_thu k LEFT JOIN v_stf_staff_label s ON s.id = k.staff_id WHERE k.id = ?1`,
);
export const kenhThuCuaDon = async (db: D1Database, orderId: string): Promise<{ dau: 0 | 1 | null; nguoiLap: string | null } | undefined> => {
  const r = await db.prepare(KENH_THU_CUA_DON).bind(orderId).first<{ dau: number | null; nguoi_lap: string | null }>();
  if (!r) return undefined;
  return { dau: r.dau === 0 ? 0 : r.dau === 1 ? 1 : null, nguoiLap: r.nguoi_lap ?? null };
};
