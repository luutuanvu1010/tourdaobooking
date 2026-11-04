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
  /** 1 = yêu cầu mang cờ «cần chốt giờ» (ADR-0154 Đ1.2): người xét phải ghi giờ ở Còn vé. Chụp một lần lúc Gửi đơn, trigger cấm đổi. */
  pickup_time_required: number;
}
const YC_COLS = "id, order_id, submitted_at, submitted_by, deadline_at, pickup_time_required";
/** Yêu cầu còn mở của MỘT đơn (chỉ mục duy nhất có điều kiện: tối đa một). */
const YC_MO_CUA_DON = defineSql("orders", "confirm_request_open_of_order", `SELECT ${YC_COLS} FROM ord_confirm_request WHERE order_id = ?1 AND decided_at IS NULL`);
export const yeuCauMoCuaDon = (db: D1Database, orderId: string): Promise<YeuCauRow | null> => db.prepare(YC_MO_CUA_DON).bind(orderId).first<YeuCauRow>();
/** Yêu cầu theo id (mọi trạng thái) — để bên THUA biết yêu cầu mình cầm đã khép (Rút lại / người khác quyết) mà không phải trả 404. */
const YC_THEO_ID = defineSql("orders", "confirm_request_by_id", `SELECT ${YC_COLS} FROM ord_confirm_request WHERE id = ?1`);
export const yeuCauTheoId = (db: D1Database, id: string): Promise<YeuCauRow | null> => db.prepare(YC_THEO_ID).bind(id).first<YeuCauRow>();
/** Mọi yêu cầu còn mở của đơn NHÁP (danh sách chờ), cũ trước. */
const YC_MO_TAT_CA = defineSql(
  "orders",
  "confirm_request_open_all",
  `SELECT r.id, r.order_id, r.submitted_at, r.submitted_by, r.deadline_at, r.pickup_time_required FROM ord_confirm_request r JOIN orders o ON o.id = r.order_id
   WHERE r.decided_at IS NULL AND o.status = 'draft' ORDER BY r.submitted_at, r.id`,
);
export const yeuCauMoTatCa = async (db: D1Database): Promise<YeuCauRow[]> => (await db.prepare(YC_MO_TAT_CA).all<YeuCauRow>()).results;

/**
 * Trong danh sách id đưa vào, những đơn NHÁP đang có yêu cầu còn mở (ADR-0166 câu 5: nhãn «Chờ xác nhận»). `json_each(?1)` nhận mảng JSON các id nên câu vẫn TĨNH;
 * lọc `status = 'draft'` để đơn đã quyết xong (xác nhận / huỷ) không bao giờ mang cờ, kể cả nếu dòng yêu cầu bị kẹt mở.
 */
const YC_MO_TRONG_DANH_SACH = defineSql(
  "orders",
  "confirm_request_open_among",
  `SELECT DISTINCT r.order_id FROM ord_confirm_request r JOIN orders o ON o.id = r.order_id
   WHERE r.order_id IN (SELECT value FROM json_each(?1)) AND r.decided_at IS NULL AND o.status = 'draft'`,
);
export async function donDangChoXacNhan(db: D1Database, orderIds: readonly string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  const { results } = await db.prepare(YC_MO_TRONG_DANH_SACH).bind(JSON.stringify(orderIds)).all<{ order_id: string }>();
  return new Set(results.map((r) => r.order_id));
}

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
  `INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, pickup_time_required, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?7, ?3, ?4, ?3, ?4 WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?6)`,
);
/** `canChotGio` BẮT BUỘC (không mặc định): nơi gọi phải nói rõ có chụp cờ «cần chốt giờ» hay không — quên thì `tsc` đỏ chứ không lặng lẽ thành 0. */
export const cauMoYeuCau = (db: D1Database, v: { id: string; orderId: string; at: string; by: string; han: string; auditId: string; canChotGio: boolean }): D1PreparedStatement =>
  db.prepare(YC_MO_GUARDED).bind(v.id, v.orderId, v.at, v.by, v.han, v.auditId, v.canChotGio ? 1 : 0);

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
export const CON_MO = (order: string, req: string, upd: string) =>
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

// ---- Công tắc «Ẩn thông tin khách khi đối tác đặt vé» (ADR-0154 Đ2) — khuôn `ord_confirm_policy`; mặc định TẮT ------------------------------------------------------
const AN_KHACH_HIEN_HANH = defineSql(
  "orders",
  "partner_customer_policy_current",
  `SELECT hide_customer_info FROM ord_partner_customer_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1`,
);
/** Công tắc ẩn thông tin khách đang hiệu lực lúc `luc`. Không có dòng (không xảy ra: migration gieo 0) → TẮT — đường an toàn là không đổi gì. */
export async function anKhachBat(db: D1Database, luc: string): Promise<boolean> {
  const r = await db.prepare(AN_KHACH_HIEN_HANH).bind(luc).first<{ hide_customer_info: number }>();
  return r?.hide_customer_info === 1;
}
const AN_KHACH_MOI_NHAT = defineSql("orders", "partner_customer_policy_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ord_partner_customer_policy`);
export const anKhachMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(AN_KHACH_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;
const AN_KHACH_THEM = defineSql(
  "orders",
  "partner_customer_policy_insert",
  `INSERT INTO ord_partner_customer_policy (id, hide_customer_info, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?3, ?4, ?3, ?4)`,
);
export const cauThemAnKhach = (db: D1Database, v: { id: string; bat: boolean; at: string; by: string }): D1PreparedStatement => db.prepare(AN_KHACH_THEM).bind(v.id, v.bat ? 1 : 0, v.at, v.by);

/**
 * Bốn trường khách đang lưu của đơn (tên, SĐT, email, ghi chú khách) — để `PUT` nháp lúc công tắc BẬT giữ nguyên chúng (ADR-0154 Đ2.3). Dữ liệu cá nhân: chỉ trả cho
 * nơi gọi đã qua cổng quyền của đơn, không bao giờ vào nhật ký. Không có đơn → `null`.
 */
const THONG_TIN_KHACH_DANG_LUU = defineSql(
  "orders",
  "order_customer_info_stored",
  `SELECT customer_name, customer_phone, customer_email, customer_note FROM orders WHERE id = ?1`,
);
export async function thongTinKhachDangLuu(
  db: D1Database, orderId: string,
): Promise<{ customerName: string; customerPhone: string; customerEmail: string | null; customerNote: string | null } | null> {
  const r = await db.prepare(THONG_TIN_KHACH_DANG_LUU).bind(orderId).first<{ customer_name: string; customer_phone: string; customer_email: string | null; customer_note: string | null }>();
  return r === null ? null : { customerName: r.customer_name, customerPhone: r.customer_phone, customerEmail: r.customer_email, customerNote: r.customer_note };
}

/**
 * Tài khoản `staffId` HIỆN GIỮ quyền Đối tác không (ADR-0154 Đ1.6, câu đã áp số 3): đọc qua view công bố `v_stf_quyen_mo` của `staff` (chỉ khoá + mã quyền còn hiệu lực), không thêm cột
 * «người lập là đối tác» vào đơn. Hệ quả chấp nhận: người lập đã thôi quyền thì ghi chú đơn của họ không còn bị che. Mã `PARTNER` là điều kiện DỮ LIỆU của lớp che, không phải điều kiện cho phép.
 */
const NGUOI_LAP_GIU_DOI_TAC = defineSql(
  "orders",
  "order_creator_holds_partner",
  `SELECT 1 AS co FROM v_stf_quyen_mo WHERE staff_id = ?1 AND permission_code = 'PARTNER' LIMIT 1`,
);
export const nguoiLapGiuDoiTac = async (db: D1Database, staffId: string): Promise<boolean> => (await db.prepare(NGUOI_LAP_GIU_DOI_TAC).bind(staffId).first()) !== null;

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

/** Nhóm có ít nhất một dịch vụ đang xếp vào (qua view công bố) — để từ chối cờ đặt cho mã nhóm không có thật. */
const NHOM_CO_DICH_VU = defineSql("orders", "service_group_in_use", `SELECT 1 AS co FROM v_ctl_service_group WHERE group_code = ?1 LIMIT 1`);
export const nhomDangDung = async (db: D1Database, ma: string): Promise<boolean> => (await db.prepare(NHOM_CO_DICH_VU).bind(ma).first()) !== null;

// ---- ADR-0159: lời khai «Khách đặt cọc trước» đang lưu của đơn (cổng lúc lưu nháp; câu ghi ở `updateDraftOrder`) ----
const LOI_KHAI_DANG_LUU = defineSql("orders", "loi_khai_dang_luu", `SELECT declared_deposit FROM orders WHERE id = ?1`);
export const loiKhaiDangLuu = async (db: D1Database, orderId: string): Promise<number> =>
  (await db.prepare(LOI_KHAI_DANG_LUU).bind(orderId).first<{ declared_deposit: number }>())?.declared_deposit ?? 0;

// ---- ADR-0142: Bán hàng phụ trách — ý định mời trên đơn nháp, nguồn của thẻ cảnh báo --------------------------------------------------------------
/**
 * Ghi HỒ SƠ người được mời trên đơn NHÁP VỪA TẠO (cùng lô tạo đơn, nên không cần lính gác). KHÔNG đụng `updated_at`. Lô LƯU nháp không dùng câu này: nó ghi cột ngay trong câu UPDATE chính của
 * `updateDraftOrder` (một câu, cùng khoá lạc quan — không cần đọc `audit_log`, không thêm ngoại lệ vào bài kiến trúc).
 */
const GHI_NGUOI_MOI = defineSql("orders", "order_sales_invitee_write", `UPDATE orders SET sales_invitee_party_id = ?1 WHERE id = ?2 AND status = 'draft'`);
export const cauGhiNguoiMoi = (db: D1Database, x: { orderId: string; partyId: string | null }): D1PreparedStatement => db.prepare(GHI_NGUOI_MOI).bind(x.partyId, x.orderId);

const NGUOI_MOI_CUA_DON = defineSql("orders", "order_sales_invitee_read", `SELECT sales_invitee_party_id FROM orders WHERE id = ?1`);
/** Hồ sơ người được mời đang ghi trên đơn (null = chưa mời). Chỉ trả khi nơi gọi đã qua cổng quyền của đơn. */
export const nguoiDuocMoiCuaDon = async (db: D1Database, orderId: string): Promise<string | null> =>
  (await db.prepare(NGUOI_MOI_CUA_DON).bind(orderId).first<{ sales_invitee_party_id: string | null }>())?.sales_invitee_party_id ?? null;

export interface UngVienTheBanHang { id: string; order_code: string; staff_id: string; ghi_nhan_luc: string; cho_xac_nhan: number }
/**
 * Đơn có thể vào thẻ «chưa có Bán hàng phụ trách» (chưa lọc theo Bán hàng phụ trách / giờ / ngày đi — nơi gọi lọc bằng luật thuần): đơn đã xác nhận chưa Đã giao / Hoàn thành, hoặc đơn
 * nháp có yêu cầu xác nhận đang mở. `?1` = mốc phát hành: chặn ngay ở câu hỏi để thẻ không đọc lại cả lịch sử đơn cũ.
 */
const UNG_VIEN_THE = defineSql(
  "orders",
  "order_sales_card_candidates",
  `SELECT o.id AS id, o.order_code AS order_code, o.staff_id AS staff_id, o.confirmed_at AS ghi_nhan_luc, 0 AS cho_xac_nhan
     FROM orders o WHERE o.status = 'confirmed' AND o.delivered_at IS NULL AND o.completed_at IS NULL AND o.confirmed_at >= ?1
   UNION ALL
   SELECT o.id, o.order_code, o.staff_id, r.submitted_at, 1
     FROM ord_confirm_request r JOIN orders o ON o.id = r.order_id
    WHERE r.decided_at IS NULL AND o.status = 'draft' AND r.submitted_at >= ?1
   ORDER BY 4, 1`,
);
export const ungVienTheBanHang = async (db: D1Database, mocPhatHanh: string): Promise<UngVienTheBanHang[]> => (await db.prepare(UNG_VIEN_THE).bind(mocPhatHanh).all<UngVienTheBanHang>()).results;

/** Lúc ghi nhận của MỘT đơn đã xác nhận (`confirmed_at`), và đã Đã giao / Hoàn thành chưa — cho cổng Nhận phụ trách của `dispatch` (đơn cũ). */
const GHI_NHAN_CUA_DON = defineSql("orders", "order_sales_recorded_at", `SELECT confirmed_at, status FROM orders WHERE id = ?1`);
export const ghiNhanCuaDon = async (db: D1Database, orderId: string): Promise<{ confirmedAt: string | null; status: string } | null> => {
  const r = await db.prepare(GHI_NHAN_CUA_DON).bind(orderId).first<{ confirmed_at: string | null; status: string }>();
  return r ? { confirmedAt: r.confirmed_at, status: r.status } : null;
};
