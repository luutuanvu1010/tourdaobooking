// SQL của Trả sau theo hạn mức (ADR-0168; migration 0141): bảng `bil_credit_limit`, `bil_credit_guard` và đọc đơn Trả sau qua view công bố `v_ord_don_tra_sau` của orders.
// Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, tham số ?N), chịu bài EXPLAIN. Hạn mức chỉ-thêm; chỉ câu đóng dòng mới UPDATE bảng này.
// Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
import { defineSql } from "../../shared/sql-registry.ts";
import { soNgayTuongThich } from "../../shared/tra-sau.ts";

export interface HanMucRow { id: string; party_id: string; limit_amount: number; term_days: number; term_hours: number | null; grace_hours: number; valid_from_date: string; valid_to_date: string | null }

// ---- Hạn mức ----
// ADR-0181 Đ2 (a): hạn mức CHỈ có hiệu lực khi hồ sơ đang mang loại đối tác được hưởng — đúng định nghĩa trigger `bil_credit_limit_party_ok` (migration 0141): có vai đang mở
// (`v_pty_open_role`) thuộc nhóm EXTERNAL, hoặc nhóm OTHER có nhãn đối tác. Áp ở MỌI câu đọc hạn mức hiệu lực (cổng xác nhận, Cấp độ đại lý, «Trả sau của tôi», con-duoc-dung,
// màn danh sách) để dòng hạn mức còn mở trên hồ sơ đã thôi vai (đường gộp hồ sơ, dữ liệu cũ) không bao giờ dùng được. Đọc parties chỉ qua view công bố.
const HAN_MUC_TAI = defineSql(
  "billing",
  "credit_limit_at",
  `SELECT l.id, l.party_id, l.limit_amount, l.term_days, l.term_hours, l.grace_hours, l.valid_from_date, l.valid_to_date FROM bil_credit_limit l
   WHERE l.party_id = ?1 AND l.valid_from_date <= ?2 AND (l.valid_to_date IS NULL OR l.valid_to_date >= ?2)
     AND EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code
                 WHERE r.party_id = l.party_id AND (t.role_group = 'EXTERNAL' OR (t.role_group = 'OTHER' AND t.is_partner_label = 1)))
   ORDER BY l.valid_from_date DESC LIMIT 1`,
);
export const hanMucRowTai = (db: D1Database, partyId: string, ngay: string): Promise<HanMucRow | null> => db.prepare(HAN_MUC_TAI).bind(partyId, ngay).first<HanMucRow>();

const HAN_MUC_MOI_BEN = defineSql(
  "billing",
  "credit_limit_all_at",
  `SELECT l.id, l.party_id, l.limit_amount, l.term_days, l.term_hours, l.grace_hours, l.valid_from_date, l.valid_to_date FROM bil_credit_limit l
   WHERE l.valid_from_date <= ?1 AND (l.valid_to_date IS NULL OR l.valid_to_date >= ?1)
     AND EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code
                 WHERE r.party_id = l.party_id AND (t.role_group = 'EXTERNAL' OR (t.role_group = 'OTHER' AND t.is_partner_label = 1)))
   ORDER BY l.party_id`,
);
export const hanMucRowMoiBen = async (db: D1Database, ngay: string): Promise<HanMucRow[]> => (await db.prepare(HAN_MUC_MOI_BEN).bind(ngay).all<HanMucRow>()).results;

const HAN_MUC_DANG_MO = defineSql("billing", "credit_limit_open", `SELECT id FROM bil_credit_limit WHERE party_id = ?1 AND valid_to_date IS NULL LIMIT 1`);
export const hanMucDangMo = async (db: D1Database, partyId: string): Promise<boolean> => (await db.prepare(HAN_MUC_DANG_MO).bind(partyId).first()) !== null;

const HAN_MUC_DONG = defineSql(
  "billing",
  "credit_limit_close",
  `UPDATE bil_credit_limit SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE party_id = ?1 AND valid_to_date IS NULL`,
);
export const dongHanMucStatement = (db: D1Database, partyId: string, denNgay: string, at: string, by: string) => db.prepare(HAN_MUC_DONG).bind(partyId, denNgay, at, by);
/**
 * ADR-0181 Đ2 (b): đóng hạn mức KHI VÀ CHỈ KHI hồ sơ không còn vai được hưởng nào — điều kiện nằm NGAY TRONG câu (cùng định nghĩa trigger 0141), nên câu đặt SAU câu đóng vai
 * trong cùng lô: lô đóng vai không đổi dòng nào (vai đã đóng trước đó) hoặc hồ sơ còn vai được hưởng khác ⇒ câu này không đổi dòng nào, câu nhật ký đi sau (`changes() > 0`) không ghi.
 */
const HAN_MUC_DONG_KHI_HET_VAI = defineSql(
  "billing",
  "credit_limit_close_no_role",
  `UPDATE bil_credit_limit SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE party_id = ?1 AND valid_to_date IS NULL
     AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code
                     WHERE r.party_id = ?1 AND (t.role_group = 'EXTERNAL' OR (t.role_group = 'OTHER' AND t.is_partner_label = 1)))`,
);
export const dongHanMucKhiHetVaiStatement = (db: D1Database, partyId: string, denNgay: string, at: string, by: string) =>
  db.prepare(HAN_MUC_DONG_KHI_HET_VAI).bind(partyId, denNgay, at, by);

const HAN_MUC_THEM = defineSql(
  "billing",
  "credit_limit_insert",
  `INSERT INTO bil_credit_limit (id, party_id, limit_amount, term_days, term_hours, grace_hours, valid_from_date, valid_to_date, reason, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?9, ?10, ?5, NULL, ?6, ?7, ?8, ?7, ?8)`,
);
/** `term_days` vẫn ghi (= trần giờ/24) để lùi về bản trước an toàn (migration 0143 chỉ mở rộng). */
export const themHanMucStatement = (db: D1Database, v: { id: string; partyId: string; hanMuc: number; gioTra: number; gioAnHan: number; tuNgay: string; lyDo: string | null; at: string; by: string }) =>
  db.prepare(HAN_MUC_THEM).bind(v.id, v.partyId, v.hanMuc, soNgayTuongThich(v.gioTra), v.tuNgay, v.lyDo, v.at, v.by, v.gioTra, v.gioAnHan);

// ---- Dòng phiên bản (chống ghi trùng — ADR-0168 Đ2 mục 4) ----
const GUARD_DOC = defineSql("billing", "credit_guard_read", `SELECT version FROM bil_credit_guard WHERE party_id = ?1`);
export async function phienBanHienTai(db: D1Database, partyId: string): Promise<number> {
  return (await db.prepare(GUARD_DOC).bind(partyId).first<{ version: number }>())?.version ?? 0;
}
const GUARD_CHEN = defineSql(
  "billing",
  "credit_guard_ensure",
  `INSERT OR IGNORE INTO bil_credit_guard (party_id, version, created_at, updated_at) VALUES (?1, 0, ?2, ?2)`,
);
const GUARD_GAC = defineSql("billing", "credit_guard_expect", `UPDATE bil_credit_guard SET version = ?2 + 1, updated_at = ?3 WHERE party_id = ?1`);
const GUARD_TANG = defineSql("billing", "credit_guard_bump", `UPDATE bil_credit_guard SET version = version + 1, updated_at = ?2 WHERE party_id = ?1`);
export const guardChenStatement = (db: D1Database, partyId: string, at: string) => db.prepare(GUARD_CHEN).bind(partyId, at);
export const guardGacStatement = (db: D1Database, partyId: string, daDoc: number, at: string) => db.prepare(GUARD_GAC).bind(partyId, daDoc, at);
export const guardTangStatement = (db: D1Database, partyId: string, at: string) => db.prepare(GUARD_TANG).bind(partyId, at);

// ---- Đơn Trả sau (view công bố của orders) ----
export interface DonTraSauRow {
  id: string; order_code: string; booker_party_id: string | null; status: "draft" | "confirmed" | "cancelled"; delivered_at: string | null; credit_due_at: string | null; credit_grace_until: string | null;
}
const DON_CUA_BEN = defineSql(
  "billing",
  "credit_orders_of_parties",
  `SELECT id, order_code, booker_party_id, status, delivered_at, credit_due_at, credit_grace_until FROM v_ord_don_tra_sau
   WHERE status = 'confirmed' AND booker_party_id IN (SELECT value FROM json_each(?1)) ORDER BY order_code`,
);
export async function donTraSauCuaCacBen(db: D1Database, partyIds: readonly string[]): Promise<DonTraSauRow[]> {
  if (partyIds.length === 0) return [];
  return (await db.prepare(DON_CUA_BEN).bind(JSON.stringify(partyIds)).all<DonTraSauRow>()).results;
}
const DON_THEO_ID = defineSql("billing", "credit_order_by_id", `SELECT id, order_code, booker_party_id, status, delivered_at, credit_due_at, credit_grace_until FROM v_ord_don_tra_sau WHERE id = ?1`);
export const donTraSauTheoId = (db: D1Database, orderId: string): Promise<DonTraSauRow | null> => db.prepare(DON_THEO_ID).bind(orderId).first<DonTraSauRow>();
const BEN_CO_DON = defineSql("billing", "credit_parties_with_orders", `SELECT DISTINCT booker_party_id AS party_id FROM v_ord_don_tra_sau WHERE status = 'confirmed' AND booker_party_id IS NOT NULL`);
export const benCoDonTraSau = async (db: D1Database): Promise<string[]> => (await db.prepare(BEN_CO_DON).all<{ party_id: string }>()).results.map((r) => r.party_id);

// ---- Dòng sổ và dấu đối chiếu của NHIỀU đơn (một câu, không lặp theo đơn) ----
export interface DongNoRow { id: string; order_id: string; debtor_party_id: string; creditor_party_id: string; amount: number; kind_code: string; receipt_id: string | null; reverses_line_id: string | null }
const DONG_CUA_CAC_DON = defineSql(
  "billing",
  "lines_of_orders",
  `SELECT l.id, l.order_id, l.debtor_party_id, l.creditor_party_id, l.amount, l.kind_code, l.receipt_id, l.reverses_line_id FROM bil_debt_line l
   WHERE l.order_id IN (SELECT value FROM json_each(?1)) ORDER BY l.rowid`,
);
export async function dongCuaCacDon(db: D1Database, orderIds: readonly string[]): Promise<DongNoRow[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(DONG_CUA_CAC_DON).bind(JSON.stringify(orderIds)).all<DongNoRow>()).results;
}
export interface DoiChieuDonRow { order_id: string; receipt_id: string; kind_code: "DECLARED" | "CONFIRMED"; occurred_date: string }
const DOI_CHIEU_CUA_CAC_DON = defineSql(
  "billing",
  "recon_of_orders",
  `SELECT r.order_id, d.receipt_id, d.kind_code, d.occurred_date FROM bil_receipt_recon d JOIN bil_payment_receipt r ON r.id = d.receipt_id
   WHERE r.order_id IN (SELECT value FROM json_each(?1)) ORDER BY d.rowid`,
);
export async function doiChieuCuaCacDon(db: D1Database, orderIds: readonly string[]): Promise<DoiChieuDonRow[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(DOI_CHIEU_CUA_CAC_DON).bind(JSON.stringify(orderIds)).all<DoiChieuDonRow>()).results;
}

// ---- Mức tối đa Quản trị được cấp (ADR-0173 Đ1 mục 1; bảng chỉ thêm, dòng mới nhất là hiệu lực) ----
const MUC_TOI_DA_DOC = defineSql("billing", "credit_setting_current", `SELECT admin_limit_ceiling FROM bil_credit_setting ORDER BY created_at DESC, rowid DESC LIMIT 1`);
export const mucToiDaQuanTri = async (db: D1Database): Promise<number | null> => (await db.prepare(MUC_TOI_DA_DOC).first<{ admin_limit_ceiling: number }>())?.admin_limit_ceiling ?? null;
const MUC_TOI_DA_THEM = defineSql(
  "billing",
  "credit_setting_insert",
  `INSERT INTO bil_credit_setting (id, admin_limit_ceiling, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?3, ?4)`,
);
export const themMucToiDaStatement = (db: D1Database, v: { id: string; so: number; at: string; by: string }) => db.prepare(MUC_TOI_DA_THEM).bind(v.id, v.so, v.at, v.by);

// ---- Số gợi ý theo cấp (ADR-0172 Đ2): CHỈ để điền sẵn — không cổng nào đọc (bài src/tra-sau-goi-y-khong-cong.test.ts) ----
export interface GoiYCapRow { tier_code: string; limit_amount: number; term_hours: number; grace_hours: number }
const GOI_Y_DOC = defineSql("billing", "credit_tier_default_all", `SELECT tier_code, limit_amount, term_hours, grace_hours FROM bil_credit_tier_default ORDER BY tier_code`);
export const goiYTheoCap = async (db: D1Database): Promise<GoiYCapRow[]> => (await db.prepare(GOI_Y_DOC).all<GoiYCapRow>()).results;
const GOI_Y_GHI = defineSql(
  "billing",
  "credit_tier_default_upsert",
  `INSERT INTO bil_credit_tier_default (tier_code, limit_amount, term_hours, grace_hours, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6)
   ON CONFLICT (tier_code) DO UPDATE SET limit_amount = excluded.limit_amount, term_hours = excluded.term_hours, grace_hours = excluded.grace_hours, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
);
export const ghiGoiYStatement = (db: D1Database, v: { cap: string; hanMuc: number; gioTra: number; gioAnHan: number; at: string; by: string }) =>
  db.prepare(GOI_Y_GHI).bind(v.cap, v.hanMuc, v.gioTra, v.gioAnHan, v.at, v.by);

// ---- Tin nhắc đã gửi (ADR-0173 Đ3 mục 2): khoá chính (đơn, loại, mốc) chặn gửi lặp ----
const NHAC_DA_GUI = defineSql(
  "billing",
  "credit_reminder_sent",
  `SELECT order_id, kind, due_at FROM bil_credit_reminder WHERE order_id IN (SELECT value FROM json_each(?1))`,
);
export const nhacDaGui = async (db: D1Database, orderIds: readonly string[]): Promise<{ order_id: string; kind: string; due_at: string }[]> =>
  orderIds.length === 0 ? [] : (await db.prepare(NHAC_DA_GUI).bind(JSON.stringify(orderIds)).all<{ order_id: string; kind: string; due_at: string }>()).results;
const NHAC_GHI = defineSql(
  "billing",
  "credit_reminder_insert",
  `INSERT OR IGNORE INTO bil_credit_reminder (order_id, kind, due_at, party_id, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?5, NULL)`,
);
export const ghiNhacStatement = (db: D1Database, v: { orderId: string; loai: string; moc: string; partyId: string; at: string }) =>
  db.prepare(NHAC_GHI).bind(v.orderId, v.loai, v.moc, v.partyId, v.at);
/**
 * Đơn Trả sau đã xác nhận còn mốc hạn trả (ứng viên nhắc) — lọc nợ ở JS bằng cùng hàm tính nợ. GỒM CẢ đơn đã tới bước «Khách đã trả đủ» (ADR-0181 Đ1): đối tác ghi đủ tiền mà chưa nộp
 * thì đơn vẫn còn nợ (ADR-0177) và vẫn được nhắc; ADR-0173 Đ3 mục 2 chỉ bỏ đơn ĐÃ TRẢ ĐỦ. Danh sách lớn dần theo mọi đơn Trả sau đã xong (ADR-0181 Hệ quả, xem lại khi lớn).
 */
const DON_CO_HAN = defineSql(
  "billing",
  "credit_orders_with_due",
  `SELECT id, order_code, booker_party_id, status, delivered_at, credit_due_at, credit_grace_until FROM v_ord_don_tra_sau
   WHERE status = 'confirmed' AND credit_due_at IS NOT NULL AND booker_party_id IS NOT NULL ORDER BY credit_due_at`,
);
export const donCoHanTra = async (db: D1Database): Promise<DonTraSauRow[]> => (await db.prepare(DON_CO_HAN).all<DonTraSauRow>()).results;
/** Tài khoản ĐANG HOẠT ĐỘNG của các hồ sơ bên đặt (người nhận tin nhắc) — view công bố của staff, một câu cho nhiều hồ sơ. */
const TAI_KHOAN_CUA_BEN = defineSql(
  "billing",
  "credit_reminder_accounts",
  `SELECT id, party_id FROM v_stf_staff_label WHERE active = 1 AND party_id IN (SELECT value FROM json_each(?1))`,
);
export const taiKhoanCuaBen = async (db: D1Database, partyIds: readonly string[]): Promise<{ id: string; party_id: string }[]> =>
  partyIds.length === 0 ? [] : (await db.prepare(TAI_KHOAN_CUA_BEN).bind(JSON.stringify([...new Set(partyIds)])).all<{ id: string; party_id: string }>()).results;
