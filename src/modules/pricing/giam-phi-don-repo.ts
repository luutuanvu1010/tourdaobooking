// SQL của MỨC GIẢM PHÍ ĐƯA ĐÓN THEO CẤP (ADR-0218 Đ1.4; migration 0178): bảng `prc_transfer_fee_tier_discount`. Module nghiêm: câu TĨNH qua `defineSql`, tham số ?N.
// Import kèm đuôi .ts, không import index.ts (bài kiểm nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô.
import { defineSql } from "../../shared/sql-registry.ts";

export interface DongGiamPhiDon { id: string; tier_code: string; tier_name: string; amount: number; valid_from_date: string; valid_to_date: string | null; updated_at: string }

const DONG_TU = defineSql("pricing", "transfer_discount_from",
  `SELECT d.id, d.tier_code, t.name AS tier_name, d.amount, d.valid_from_date, d.valid_to_date, d.updated_at
   FROM prc_transfer_fee_tier_discount d JOIN prc_rate_tier t ON t.code = d.tier_code
   WHERE d.valid_to_date IS NULL OR d.valid_to_date >= ?1
   ORDER BY t.name, d.valid_from_date, d.id`);
/** Mọi dòng chưa hết hạn từ ngày `ngay` (kể cả dòng chưa tới ngày bắt đầu — màn quản lý cần thấy). */
export async function docGiamPhiDonTu(db: D1Database, ngay: string): Promise<DongGiamPhiDon[]> {
  return (await db.prepare(DONG_TU).bind(ngay).all<DongGiamPhiDon>()).results;
}

const DONG_TIM = defineSql("pricing", "transfer_discount_find",
  `SELECT d.id, d.tier_code, t.name AS tier_name, d.amount, d.valid_from_date, d.valid_to_date, d.updated_at
   FROM prc_transfer_fee_tier_discount d JOIN prc_rate_tier t ON t.code = d.tier_code WHERE d.id = ?1`);
export const giamPhiDonTheoId = async (db: D1Database, id: string): Promise<DongGiamPhiDon | null> => (await db.prepare(DONG_TIM).bind(id).first<DongGiamPhiDon>()) ?? null;

const CAP_TIM = defineSql("pricing", "transfer_discount_tier_find", `SELECT code, name, active FROM prc_rate_tier WHERE code = ?1`);
export const capTheoMa = async (db: D1Database, code: string): Promise<{ code: string; name: string; active: number } | null> => (await db.prepare(CAP_TIM).bind(code).first<{ code: string; name: string; active: number }>()) ?? null;

const MUC_NGAY = defineSql("pricing", "transfer_discount_on_date",
  `SELECT amount FROM prc_transfer_fee_tier_discount WHERE tier_code = ?1 AND valid_from_date <= ?2 AND (valid_to_date IS NULL OR valid_to_date >= ?2) ORDER BY valid_from_date DESC LIMIT 1`);
/** Mức giảm mỗi khách của cấp `tierCode` tại ngày `ngay`; null = cấp chưa đặt mức (hàm tính phí hiểu là 0, không phải lỗi). */
export async function mucGiamPhiDonTheoNgay(db: D1Database, tierCode: string, ngay: string): Promise<number | null> {
  return (await db.prepare(MUC_NGAY).bind(tierCode, ngay).first<{ amount: number }>())?.amount ?? null;
}

const THEM = defineSql("pricing", "transfer_discount_insert",
  `INSERT INTO prc_transfer_fee_tier_discount (id, tier_code, amount, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?5, ?6)`);
export const cauThemGiamPhiDon = (db: D1Database, v: { id: string; tierCode: string; amount: number; validFrom: string; at: string; by: string }): D1PreparedStatement =>
  db.prepare(THEM).bind(v.id, v.tierCode, v.amount, v.validFrom, v.at, v.by);

// Đóng dòng đang mở: khoá lạc quan theo `updated_at` đã đọc (trigger `close_only` là lưới CSDL).
const DONG = defineSql("pricing", "transfer_discount_close",
  `UPDATE prc_transfer_fee_tier_discount SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND updated_at = ?5 AND valid_to_date IS NULL`);
export const cauDongGiamPhiDon = (db: D1Database, v: { id: string; denNgay: string; at: string; by: string; truocLuc: string }): D1PreparedStatement =>
  db.prepare(DONG).bind(v.id, v.denNgay, v.at, v.by, v.truocLuc);
