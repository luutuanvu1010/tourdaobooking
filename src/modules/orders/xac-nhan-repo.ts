// TỆP SQL "NỬA NGHIÊM" của module orders cho BƯỚC XÁC NHẬN ĐƠN (ADR-0136; migration 0119; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu đăng ký bằng
// `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN. Chỉ chạm bảng của orders, view công bố `v_ctl_service_group` và `audit_log` ở lính gác `_guarded`.
// Import kèm đuôi .ts, KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node): câu nhật ký (`auditStatement`) do nơi gọi ghép vào lô.
//
// KHUÔN LÔ (src/CLAUDE.md "Dữ liệu"): MỌI lô ghi của bước này mở đầu bằng MỘT câu quyết định thắng/thua có khoá lạc quan (`orders.updated_at`, hoặc câu xác nhận / huỷ
// của đơn), rồi nhật ký `changes() > 0` mang id riêng, rồi các câu `_guarded` đứng SAU chỉ chạy khi dòng nhật ký của CHÍNH lô này đã ghi (`EXISTS (SELECT 1 FROM
// audit_log WHERE id = ?)` — khuôn `wonGuard`). Không bao giờ so `updated_at` để suy ra ai thắng.
import { defineSql } from "../../shared/sql-registry.ts";

// ---- Đọc yêu cầu ----------------------------------------------------------------------------------------------------------------------------------

export interface YeuCauRow {
  id: string;
  order_id: string;
  submitted_at: string;
  submitted_by: string;
  deadline_at: string;
}
const YC_COLS = "id, order_id, submitted_at, submitted_by, deadline_at";
/** Yêu cầu còn mở của MỘT đơn (chỉ mục duy nhất có điều kiện: tối đa một). */
const YC_MO_CUA_DON = defineSql("orders", "confirm_request_open_of_order", `SELECT ${YC_COLS} FROM ord_confirm_request WHERE order_id = ?1 AND decided_at IS NULL`);
export const yeuCauMoCuaDon = (db: D1Database, orderId: string): Promise<YeuCauRow | null> => db.prepare(YC_MO_CUA_DON).bind(orderId).first<YeuCauRow>();
/** Mọi yêu cầu còn mở của đơn NHÁP (danh sách chờ), cũ trước. */
const YC_MO_TAT_CA = defineSql(
  "orders",
  "confirm_request_open_all",
  `SELECT r.id, r.order_id, r.submitted_at, r.submitted_by, r.deadline_at FROM ord_confirm_request r JOIN orders o ON o.id = r.order_id
   WHERE r.decided_at IS NULL AND o.status = 'draft' ORDER BY r.submitted_at, r.id`,
);
export const yeuCauMoTatCa = async (db: D1Database): Promise<YeuCauRow[]> => (await db.prepare(YC_MO_TAT_CA).all<YeuCauRow>()).results;

// ---- Mở / rút lại (Đ3) ---------------------------------------------------------------------------------------------------------------------------

/**
 * CÂU ĐẦU lô Gửi / Rút lại: đẩy mốc đơn NHÁP khi còn đúng mốc đã đọc (khoá lạc quan). Đẩy mốc là chính điều làm người quyết định đang cầm mốc cũ THUA (409) khi người lập
 * Rút lại hoặc Gửi lại — nếu không, Hết vé / Huỷ (chỉ khoá theo `status` + `updated_at`) vẫn thắng sau khi người lập đã rút. Không lính gác (chính nó quyết định).
 */
const ORDER_TOUCH_DRAFT = defineSql("orders", "order_touch_draft", `UPDATE orders SET updated_at = ?1 WHERE id = ?2 AND status = 'draft' AND updated_at = ?3`);
export const orderTouchDraft = (db: D1Database, orderId: string, at: string, expected: string): D1PreparedStatement => db.prepare(ORDER_TOUCH_DRAFT).bind(at, orderId, expected);

/** Mở yêu cầu — CHỈ khi dòng nhật ký `order_confirm_requested` của lô này đã ghi (chuỗi `changes() > 0` từ câu đẩy mốc). Trùng yêu cầu mở → UNIQUE chặn, cả lô rơi. */
const YC_MO_GUARDED = defineSql(
  "orders",
  "confirm_request_open_guarded",
  `INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?3, ?4, ?3, ?4 WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?6)`,
);
export const cauMoYeuCau = (db: D1Database, v: { id: string; orderId: string; at: string; by: string; han: string; auditId: string }): D1PreparedStatement =>
  db.prepare(YC_MO_GUARDED).bind(v.id, v.orderId, v.at, v.by, v.han, v.auditId);

/** Khép yêu cầu ĐÚNG MỘT lần (trigger canh) — CHỈ khi dòng nhật ký của lô này (Rút lại / Còn vé / Hết vé / Huỷ) đã ghi. `ticket` NULL với RUT_LAI. */
const YC_KHEP_GUARDED = defineSql(
  "orders",
  "confirm_request_close_guarded",
  `UPDATE ord_confirm_request SET decided_at = ?1, decided_by = ?2, outcome = ?3, ticket = ?4, note = ?5, updated_at = ?1, updated_by = ?2
   WHERE id = ?6 AND decided_at IS NULL AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?7)`,
);
export const cauKhepYeuCau = (
  db: D1Database, v: { id: string; at: string; by: string; outcome: "XAC_NHAN" | "HUY" | "RUT_LAI"; ticket: "CON_VE" | "HET_VE" | "HUY" | null; note: string | null; auditId: string },
): D1PreparedStatement => db.prepare(YC_KHEP_GUARDED).bind(v.at, v.by, v.outcome, v.ticket, v.note, v.id, v.auditId);

// ---- Đổi ngày / giờ đón khi bấm Còn vé (Đ7) --------------------------------------------------------------------------------------------------------
// Mỗi câu mang CÙNG HAI ĐIỀU KIỆN với câu xác nhận: yêu cầu `?req` còn mở VÀ đơn còn nháp đúng mốc `?upd` — bên thua (yêu cầu vừa khép, đơn vừa đổi) không đổi được gì.
const CON_MO = (order: string, req: string, upd: string) =>
  `EXISTS (SELECT 1 FROM ord_confirm_request q WHERE q.id = ${req} AND q.order_id = ${order} AND q.decided_at IS NULL)
   AND EXISTS (SELECT 1 FROM orders o WHERE o.id = ${order} AND o.status = 'draft' AND o.updated_at = ${upd})`;

/** Dời chặng MỞ đang đón đúng ngày đi cũ của dịch vụ sang ngày đi mới. ĐỨNG TRƯỚC câu đổi ngày dịch vụ (đọc ngày cũ). */
const CHANG_DOI_NGAY_DECIDE = defineSql(
  "orders",
  "leg_move_date_decide_guarded",
  `UPDATE ord_transfer_leg SET pickup_date = ?1, updated_at = ?2, updated_by = ?3
   WHERE order_id = ?4 AND closed_at IS NULL AND pickup_date = (SELECT s.depart_date FROM order_service s WHERE s.id = ord_transfer_leg.order_service_id) AND ${CON_MO("?4", "?5", "?6")}`,
);
export const cauDoiNgayChang = (db: D1Database, v: { orderId: string; ngay: string; at: string; by: string; yeuCauId: string; prevUpdatedAt: string }): D1PreparedStatement =>
  db.prepare(CHANG_DOI_NGAY_DECIDE).bind(v.ngay, v.at, v.by, v.orderId, v.yeuCauId, v.prevUpdatedAt);
const DICH_VU_DOI_NGAY_DECIDE = defineSql(
  "orders",
  "service_move_date_decide_guarded",
  `UPDATE order_service SET depart_date = ?1 WHERE order_id = ?2 AND ${CON_MO("?2", "?3", "?4")}`,
);
export const cauDoiNgayDichVu = (db: D1Database, v: { orderId: string; ngay: string; yeuCauId: string; prevUpdatedAt: string }): D1PreparedStatement =>
  db.prepare(DICH_VU_DOI_NGAY_DECIDE).bind(v.ngay, v.orderId, v.yeuCauId, v.prevUpdatedAt);
/** Đổi giờ đón (và cuối khung) của MỘT chặng mở. */
const CHANG_DOI_GIO_DECIDE = defineSql(
  "orders",
  "leg_set_time_decide_guarded",
  `UPDATE ord_transfer_leg SET pickup_time = ?1, pickup_slot_end = ?2, updated_at = ?3, updated_by = ?4
   WHERE id = ?5 AND order_id = ?6 AND closed_at IS NULL AND ${CON_MO("?6", "?7", "?8")}`,
);
export const cauDoiGioChang = (
  db: D1Database, v: { legId: string; orderId: string; gio: string; cuoiKhung: string | null; at: string; by: string; yeuCauId: string; prevUpdatedAt: string },
): D1PreparedStatement => db.prepare(CHANG_DOI_GIO_DECIDE).bind(v.gio, v.cuoiKhung, v.at, v.by, v.legId, v.orderId, v.yeuCauId, v.prevUpdatedAt);
/** Ghi kép cột cũ `order_service.pickup_time` (phát hành 1, Ruling R3) cho chặng chiều đi — để lùi Worker vẫn thấy giờ đúng. */
const DICH_VU_GHI_KEP_GIO_DECIDE = defineSql(
  "orders",
  "service_mirror_time_decide_guarded",
  `UPDATE order_service SET pickup_time = ?1
   WHERE id = (SELECT l.order_service_id FROM ord_transfer_leg l WHERE l.id = ?2 AND l.order_id = ?3 AND l.direction = 'OUT') AND order_id = ?3 AND ${CON_MO("?3", "?4", "?5")}`,
);
export const cauGhiKepGio = (db: D1Database, v: { legId: string; orderId: string; gio: string; yeuCauId: string; prevUpdatedAt: string }): D1PreparedStatement =>
  db.prepare(DICH_VU_GHI_KEP_GIO_DECIDE).bind(v.gio, v.legId, v.orderId, v.yeuCauId, v.prevUpdatedAt);

// ---- Cờ «cần xác nhận» và công tắc tự xác nhận (Đ1, Đ5) --------------------------------------------------------------------------------------------
export interface CoHienHanhRow {
  scope: string;
  code: string;
  required: number;
}
/** Dòng cờ HIỆN HÀNH của từng (scope, code) lúc ?1: dòng có `valid_from_at` lớn nhất không vượt ?1 (khuôn `vc_leg_template`). */
const CO_HIEN_HANH = defineSql(
  "orders",
  "confirm_flag_current",
  `SELECT f.scope, f.code, f.required FROM ord_service_confirm_flag f
   WHERE f.valid_from_at <= ?1 AND f.valid_from_at = (SELECT max(g.valid_from_at) FROM ord_service_confirm_flag g WHERE g.scope = f.scope AND g.code = f.code AND g.valid_from_at <= ?1)
   ORDER BY f.scope, f.code`,
);
export const coHienHanh = async (db: D1Database, luc: string): Promise<CoHienHanhRow[]> => (await db.prepare(CO_HIEN_HANH).bind(luc).all<CoHienHanhRow>()).results;
const CO_MOI_NHAT = defineSql("orders", "confirm_flag_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ord_service_confirm_flag`);
export const coMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(CO_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;
const CO_THEM = defineSql(
  "orders",
  "confirm_flag_insert",
  `INSERT INTO ord_service_confirm_flag (id, scope, code, required, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6)`,
);
export const cauThemCo = (db: D1Database, v: { id: string; pham: "SERVICE" | "GROUP"; ma: string; can: boolean; at: string; by: string }): D1PreparedStatement =>
  db.prepare(CO_THEM).bind(v.id, v.pham, v.ma, v.can ? 1 : 0, v.at, v.by);

const CHINH_SACH_HIEN_HANH = defineSql(
  "orders",
  "confirm_policy_current",
  `SELECT self_confirm_internal, valid_from_at FROM ord_confirm_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1`,
);
/** Công tắc «nội bộ tự lập thì tự xác nhận» đang hiệu lực. Không có dòng (không xảy ra: migration gieo 1) → TẮT — đường an toàn là phải có người khác quyết. */
export async function tuXacNhanNoiBo(db: D1Database, luc: string): Promise<boolean> {
  const r = await db.prepare(CHINH_SACH_HIEN_HANH).bind(luc).first<{ self_confirm_internal: number }>();
  return r?.self_confirm_internal === 1;
}
const CHINH_SACH_MOI_NHAT = defineSql("orders", "confirm_policy_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ord_confirm_policy`);
export const chinhSachMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(CHINH_SACH_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;
const CHINH_SACH_THEM = defineSql(
  "orders",
  "confirm_policy_insert",
  `INSERT INTO ord_confirm_policy (id, self_confirm_internal, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?3, ?4, ?3, ?4)`,
);
export const cauThemChinhSach = (db: D1Database, v: { id: string; bat: boolean; at: string; by: string }): D1PreparedStatement => db.prepare(CHINH_SACH_THEM).bind(v.id, v.bat ? 1 : 0, v.at, v.by);

/** Nhóm HIỆN HÀNH của các mã dịch vụ (mảng JSON ở ?1) qua view công bố `v_ctl_service_group`; mã chưa phân nhóm / không có trong danh mục: vắng khỏi kết quả. */
const NHOM_THEO_MA = defineSql(
  "orders",
  "service_groups_of_codes",
  `SELECT catalog_code, group_code FROM v_ctl_service_group WHERE catalog_code IN (SELECT value FROM json_each(?1))`,
);
export async function nhomTheoMa(db: D1Database, maDichVu: readonly string[]): Promise<Map<string, string>> {
  if (maDichVu.length === 0) return new Map();
  const { results } = await db.prepare(NHOM_THEO_MA).bind(JSON.stringify([...new Set(maDichVu)])).all<{ catalog_code: string; group_code: string | null }>();
  return new Map(results.flatMap((r) => (r.group_code === null ? [] : [[r.catalog_code, r.group_code] as const])));
}
