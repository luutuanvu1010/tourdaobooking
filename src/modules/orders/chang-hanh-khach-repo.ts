// TỆP SQL "NỬA NGHIÊM" của module orders (ADR-0047 A3, Ruling R5; hằng `NUA_NGHIEM` ở src/architecture.test.ts). `orders` còn ở LEGACY (SQL cũ của
// repository.ts chưa đăng ký), nhưng MỌI câu SQL MỚI của orders — chặng đưa đón `ord_transfer_leg`, hành khách `ord_passenger`, số khách hiệu lực —
// nằm ở tệp này, đăng ký bằng `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN (chỉ chạm bảng của orders / view công bố / khoá ngoại được phép)
// cùng bài `.prepare(<chuỗi thô>)`. KHÔNG viết câu `ord_*` thô ở repository.ts — repository.ts/index.ts GỌI các hàm ở đây rồi ghép vào lô.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node): câu nhật ký (`auditStatement`) do nơi gọi
// ghép vào lô.
//
// HAI NGOẠI LỆ CÓ TÊN ở bài EXPLAIN (src/architecture.test.ts — NỚI hàng rào đã duyệt, CHỜ CHỦ DUYỆT ở
// docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md):
//   - `XOA_CUNG_NHAP` (mục 2): hai câu `leg_delete_draft`, `passenger_delete_draft` xoá cứng dòng của ĐƠN NHÁP (lưu nháp xoá–chèn lại; lệch có chủ ý hẹp
//     của Hiến chương 5.5 — chủ trả lời Q0 2026-09-29 "Cách 1: chỉ giữ bản cuối"). Điều kiện đơn nháp nằm TRONG câu; trigger `*_no_delete` là lưới CSDL.
//   - `DOC_AUDIT_LOG_WONGUARD` (mục 3, có hạn): câu có đuôi `_guarded`/`_draft` đọc `audit_log` CHỈ ở lính gác "lô này đã thắng" (`EXISTS (SELECT 1 FROM
//     audit_log WHERE id = ?)` — khuôn `wonGuard` của repository.ts): chỉ chạy khi câu UPDATE có điều kiện đứng đầu lô của CHÍNH request này đã áp dụng.
// Tên cột `full_name` của `ord_passenger` (ADR-0047 A2) CHỈ xuất hiện trong chuỗi SQL ở tệp này, và luôn đọc ra dưới bí danh `ten` (bài R-N1-14 —
// ngoại lệ có tên cho đúng tệp này, CHỜ CHỦ DUYỆT ở đề xuất luật mục 7).
import { defineSql } from "../../shared/sql-registry.ts";

// ---- Số khách hiệu lực (ADR-0047 A3) -----------------------------------------------------------------------------------------------------------

/** Số khách ĐÃ LƯU của các dịch vụ theo id (mảng JSON ở ?1 — câu vẫn tĩnh dù số id đổi). */
const SERVICE_PAX_BY_IDS = defineSql(
  "orders",
  "service_pax_by_ids",
  `SELECT id, order_id, pax_adult, pax_child, pax_senior, pax_infant FROM order_service WHERE id IN (SELECT value FROM json_each(?1))`,
);

export interface ServicePaxRow {
  id: string;
  order_id: string;
  pax_adult: number;
  pax_child: number;
  pax_senior: number;
  pax_infant: number;
}

/** Dòng số khách đã lưu của các dịch vụ trong `serviceIds` (id lạ: không có dòng). Rỗng → không truy vấn. */
export async function servicePaxByIds(db: D1Database, serviceIds: readonly string[]): Promise<ServicePaxRow[]> {
  if (serviceIds.length === 0) return [];
  return (await db.prepare(SERVICE_PAX_BY_IDS).bind(JSON.stringify(serviceIds)).all<ServicePaxRow>()).results;
}

/** Số khách ĐÃ LƯU của mọi dịch vụ của MỘT đơn (cờ "danh sách nhiều hơn số khách" — R9). */
const SERVICE_PAX_BY_ORDER = defineSql("orders", "service_pax_by_order", `SELECT id, order_id, pax_adult, pax_child, pax_senior, pax_infant FROM order_service WHERE order_id = ?1`);
export async function servicePaxByOrder(db: D1Database, orderId: string): Promise<ServicePaxRow[]> {
  return (await db.prepare(SERVICE_PAX_BY_ORDER).bind(orderId).all<ServicePaxRow>()).results;
}

// ---- Đọc chặng --------------------------------------------------------------------------------------------------------------------------------

const LEG_COLS = `l.id, l.order_id, l.order_service_id, l.direction, l.pickup_date, l.pickup_time, l.pickup_location_id, l.pickup_place,
  COALESCE(pl.name, l.pickup_place) AS pickup_label, l.dropoff_location_id, l.dropoff_place, COALESCE(dl.name, l.dropoff_place) AS dropoff_label,
  l.closed_at, l.created_at, l.created_by, l.updated_at`;
const LEG_JOIN = `FROM ord_transfer_leg l
  LEFT JOIN v_loc_location_label pl ON pl.id = l.pickup_location_id
  LEFT JOIN v_loc_location_label dl ON dl.id = l.dropoff_location_id`;

/** Chặng CÒN HIỆU LỰC của các đơn (mảng JSON id đơn ở ?1), kèm nhãn nơi (tên điểm danh mục qua view công bố của locations, hoặc chữ). */
const LEG_OPEN_BY_ORDERS = defineSql("orders", "leg_open_by_orders", `SELECT ${LEG_COLS} ${LEG_JOIN} WHERE l.closed_at IS NULL AND l.order_id IN (SELECT value FROM json_each(?1))`);
/** Một chặng (cả đã đóng) của đúng đơn ?2. */
const LEG_BY_ID = defineSql("orders", "leg_by_id", `SELECT ${LEG_COLS} ${LEG_JOIN} WHERE l.id = ?1 AND l.order_id = ?2`);

export interface LegRow {
  id: string;
  order_id: string;
  order_service_id: string;
  direction: "OUT" | "RETURN";
  pickup_date: string | null;
  pickup_time: string | null;
  pickup_location_id: string | null;
  pickup_place: string | null;
  pickup_label: string;
  dropoff_location_id: string | null;
  dropoff_place: string | null;
  dropoff_label: string | null;
  closed_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export async function openLegsByOrders(db: D1Database, orderIds: readonly string[]): Promise<LegRow[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(LEG_OPEN_BY_ORDERS).bind(JSON.stringify(orderIds)).all<LegRow>()).results;
}
/** Cùng câu, dạng CHƯA CHẠY để ghép vào `db.batch()` đọc (chi tiết đơn, dịch vụ đã lưu). */
export const openLegsStatement = (db: D1Database, orderIds: readonly string[]): D1PreparedStatement => db.prepare(LEG_OPEN_BY_ORDERS).bind(JSON.stringify(orderIds));

export async function legById(db: D1Database, legId: string, orderId: string): Promise<LegRow | null> {
  return db.prepare(LEG_BY_ID).bind(legId, orderId).first<LegRow>();
}

/** Điểm danh mục ĐANG DÙNG trong danh sách id (Ruling R7 — mọi loại điểm; đọc qua view công bố của locations). */
const LOCATION_ACTIVE = defineSql("orders", "location_active", `SELECT id, name FROM v_loc_location_label WHERE active = 1 AND id IN (SELECT value FROM json_each(?1))`);

export async function activeLocations(db: D1Database, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { results } = await db.prepare(LOCATION_ACTIVE).bind(JSON.stringify([...new Set(ids)])).all<{ id: string; name: string }>();
  return new Map(results.map((r) => [r.id, r.name] as const));
}

// ---- Ghi chặng ---------------------------------------------------------------------------------------------------------------------------------

/** Giá trị ghi của một chặng (dạng GHI, rỗng → null). */
export interface LegWrite {
  id: string;
  orderId: string;
  serviceId: string;
  direction: "OUT" | "RETURN";
  pickupDate: string | null;
  pickupTime: string | null;
  pickupLocationId: string | null;
  pickupPlace: string | null;
  dropoffLocationId: string | null;
  dropoffPlace: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

const LEG_INSERT_COLS = `id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place,
  closed_at, close_reason_code, created_at, created_by, updated_at, updated_by`;
/** Chèn chặng KHÔNG lính gác — chỉ dùng khi LẬP đơn (lô mới hoàn toàn, không có câu thắng/thua). */
const LEG_INSERT = defineSql(
  "orders",
  "leg_insert",
  `INSERT INTO ord_transfer_leg (${LEG_INSERT_COLS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, NULL, ?11, ?12, ?13, ?14)`,
);
/** Chèn chặng CÓ lính gác (lưu nháp, route thêm chặng, `PUT /trip` tương thích): chỉ chạy khi dòng nhật ký ?15 của lô này đã được chèn. */
const LEG_INSERT_GUARDED = defineSql(
  "orders",
  "leg_insert_guarded",
  `INSERT INTO ord_transfer_leg (${LEG_INSERT_COLS})
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, NULL, ?11, ?12, ?13, ?14 WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?15)`,
);
const legBinds = (l: LegWrite) => [
  l.id, l.orderId, l.serviceId, l.direction, l.pickupDate, l.pickupTime, l.pickupLocationId, l.pickupPlace, l.dropoffLocationId, l.dropoffPlace,
  l.createdAt, l.createdBy, l.updatedAt, l.updatedBy,
];
export const legInsert = (db: D1Database, l: LegWrite): D1PreparedStatement => db.prepare(LEG_INSERT).bind(...legBinds(l));
export const legInsertGuarded = (db: D1Database, l: LegWrite, auditId: string): D1PreparedStatement => db.prepare(LEG_INSERT_GUARDED).bind(...legBinds(l), auditId);

/**
 * XOÁ CỨNG chặng của ĐƠN NHÁP — ngoại lệ có tên `XOA_CUNG_NHAP` (CHỜ CHỦ DUYỆT, đề xuất luật mục 2). Lưu nháp xoá–chèn lại chặng cùng lô, TRƯỚC câu xoá
 * dịch vụ (khoá ngoại). Điều kiện "đơn nháp" nằm TRONG câu; trigger `ord_transfer_leg_no_delete` cấm xoá khi đơn không còn nháp.
 */
const LEG_DELETE_DRAFT = defineSql(
  "orders",
  "leg_delete_draft",
  `DELETE FROM ord_transfer_leg WHERE order_id = ?1 AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = 'draft') AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?2)`,
);
export const legDeleteDraft = (db: D1Database, orderId: string, auditId: string): D1PreparedStatement => db.prepare(LEG_DELETE_DRAFT).bind(orderId, auditId);

const LEG_SET = `pickup_date = ?1, pickup_time = ?2, pickup_location_id = ?3, pickup_place = ?4, dropoff_location_id = ?5, dropoff_place = ?6, updated_at = ?7, updated_by = ?8`;
/** Sửa trường vận hành của chặng MỞ, CÓ lính gác (`PUT /trip`: dời ngày, trộn giờ/nơi cũ). */
const LEG_UPDATE_GUARDED = defineSql(
  "orders",
  "leg_update_guarded",
  `UPDATE ord_transfer_leg SET ${LEG_SET} WHERE id = ?9 AND order_id = ?10 AND closed_at IS NULL AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?11)`,
);
/**
 * Sửa trường vận hành của chặng MỞ, CÂU ĐẦU LÔ của route sửa chặng (khoá lạc quan theo `updated_at` CỦA CHẶNG — ADR A1): chỉ khi đơn đã xác nhận, chặng
 * còn mở và đúng mốc ?11 client đã đọc. Không lính gác (chính nó quyết định thắng/thua; nhật ký theo sau bằng `changes() > 0`).
 */
const LEG_UPDATE_CHECKED = defineSql(
  "orders",
  "leg_update_checked",
  `UPDATE ord_transfer_leg SET ${LEG_SET}
   WHERE id = ?9 AND order_id = ?10 AND closed_at IS NULL AND updated_at = ?11 AND EXISTS (SELECT 1 FROM orders WHERE id = ?10 AND status = 'confirmed')`,
);
export interface LegFields {
  pickupDate: string | null;
  pickupTime: string | null;
  pickupLocationId: string | null;
  pickupPlace: string | null;
  dropoffLocationId: string | null;
  dropoffPlace: string | null;
}
const fieldBinds = (f: LegFields, at: string, by: string | null) => [f.pickupDate, f.pickupTime, f.pickupLocationId, f.pickupPlace, f.dropoffLocationId, f.dropoffPlace, at, by];
export const legUpdateGuarded = (db: D1Database, legId: string, orderId: string, f: LegFields, at: string, by: string, auditId: string): D1PreparedStatement =>
  db.prepare(LEG_UPDATE_GUARDED).bind(...fieldBinds(f, at, by), legId, orderId, auditId);
export const legUpdateChecked = (db: D1Database, legId: string, orderId: string, f: LegFields, at: string, by: string, expectedLegUpdatedAt: string): D1PreparedStatement =>
  db.prepare(LEG_UPDATE_CHECKED).bind(...fieldBinds(f, at, by), legId, orderId, expectedLegUpdatedAt);

/** Đóng chặng (bỏ chặng = đóng dòng có lý do — không xoá), CÓ lính gác (`PUT /trip` tương thích: giờ + nơi cũ đều rỗng → đóng chiều đi, lý do NOT_NEEDED). */
const LEG_CLOSE_GUARDED = defineSql(
  "orders",
  "leg_close_guarded",
  `UPDATE ord_transfer_leg SET closed_at = ?1, close_reason_code = ?2, updated_at = ?1, updated_by = ?3
   WHERE id = ?4 AND order_id = ?5 AND closed_at IS NULL AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?6)`,
);
/** Đóng chặng — CÂU ĐẦU LÔ của route đóng chặng (khoá lạc quan theo `updated_at` của chặng; đơn đã xác nhận; chặng còn mở). */
const LEG_CLOSE_CHECKED = defineSql(
  "orders",
  "leg_close_checked",
  `UPDATE ord_transfer_leg SET closed_at = ?1, close_reason_code = ?2, updated_at = ?1, updated_by = ?3
   WHERE id = ?4 AND order_id = ?5 AND closed_at IS NULL AND updated_at = ?6 AND EXISTS (SELECT 1 FROM orders WHERE id = ?5 AND status = 'confirmed')`,
);
export const legCloseGuarded = (db: D1Database, legId: string, orderId: string, reason: string, at: string, by: string, auditId: string): D1PreparedStatement =>
  db.prepare(LEG_CLOSE_GUARDED).bind(at, reason, by, legId, orderId, auditId);
export const legCloseChecked = (db: D1Database, legId: string, orderId: string, reason: string, at: string, by: string, expectedLegUpdatedAt: string): D1PreparedStatement =>
  db.prepare(LEG_CLOSE_CHECKED).bind(at, reason, by, legId, orderId, expectedLegUpdatedAt);

/**
 * Xác nhận đơn (Ruling R4c): điền ngày đón = ngày đi của dịch vụ cho chặng MỞ còn trống ngày — cùng lô, ĐỨNG TRƯỚC câu `UPDATE orders` đổi trạng thái
 * (trigger `orders_confirm_requires_leg_date` xét lúc đó). Chỉ khi đơn còn nháp. Không lính gác: chạy trước câu quyết định thắng/thua; điền ngày đi vào
 * chặng nháp chưa có ngày là vô hại (lưu nháp cũng tự điền — R4b) nếu lần xác nhận thua.
 */
const LEG_FILL_DATE_ON_CONFIRM = defineSql(
  "orders",
  "leg_fill_date_on_confirm",
  `UPDATE ord_transfer_leg SET pickup_date = (SELECT s.depart_date FROM order_service s WHERE s.id = ord_transfer_leg.order_service_id), updated_at = ?2
   WHERE order_id = ?1 AND closed_at IS NULL AND pickup_date IS NULL AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = 'draft')`,
);
export const legFillDateOnConfirm = (db: D1Database, orderId: string, at: string): D1PreparedStatement => db.prepare(LEG_FILL_DATE_ON_CONFIRM).bind(orderId, at);

// ---- Đặt gấp (ADR-0049 D2, D3; kế hoạch Task A10) ----------------------------------------------------------------------------------------------

/**
 * ĐÓNG DẤU đặt gấp lên MỘT chặng còn mở của đơn nháp hoặc đã xác nhận — CÂU ĐẦU LÔ của route đặt gấp (không lính gác: chính nó quyết định thắng/thua;
 * nhật ký theo sau bằng `changes() > 0`). Đẩy mốc CỦA CHẶNG (khoá lạc quan của route sửa chặng — form đang mở thấy "vừa có người sửa"). Đóng dấu lại
 * (dấu mới thay dấu cũ) là hợp lệ (I14). Năm cột chỉ được ghi ở đây và ở nhánh `datGap` của lệnh sửa chặng (I16) — thân lập/sửa nháp không đọc khoá này.
 */
const LEG_SHORT_NOTICE = defineSql(
  "orders",
  "leg_short_notice",
  `UPDATE ord_transfer_leg SET short_notice_reason = ?1, short_notice_note = ?2, short_notice_by = ?3, short_notice_at = ?4, short_notice_lead_minutes = ?5,
     updated_at = ?4, updated_by = ?3
   WHERE id = ?6 AND order_id = ?7 AND closed_at IS NULL AND EXISTS (SELECT 1 FROM orders WHERE id = ?7 AND status IN ('draft', 'confirmed'))`,
);
export interface DatGapWrite {
  lyDo: string;
  ghiChu: string | null;
  by: string;
  at: string;
  phut: number;
}
export const legShortNotice = (db: D1Database, legId: string, orderId: string, d: DatGapWrite): D1PreparedStatement =>
  db.prepare(LEG_SHORT_NOTICE).bind(d.lyDo, d.ghiChu, d.by, d.at, d.phut, legId, orderId);

// ---- Ghi kép hai cột cũ (Ruling R3, phát hành 1) ---------------------------------------------------------------------------------------------

/**
 * GHI KÉP (Ruling R3 — chỉ phát hành 1; phát hành 2 bỏ): chép giá trị DẪN XUẤT (`chieuDiDau`: giờ đón + tên điểm/chữ của chiều đi đầu) vào hai cột cũ của
 * `order_service`, để lùi Worker về 1.36 vẫn thấy đúng giờ, nơi đón. CÓ lính gác. Trigger 0008 cho sửa hai cột này cả sau xác nhận.
 */
const SERVICE_MIRROR_UPDATE_GUARDED = defineSql(
  "orders",
  "service_mirror_update_guarded",
  `UPDATE order_service SET pickup_time = ?1, pickup_place = ?2 WHERE id = ?3 AND order_id = ?4 AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?5)`,
);
export const serviceMirrorUpdateGuarded = (db: D1Database, serviceId: string, orderId: string, derived: { pickupTime: string | null; pickupPlace: string | null }, auditId: string) =>
  db.prepare(SERVICE_MIRROR_UPDATE_GUARDED).bind(derived.pickupTime, derived.pickupPlace, serviceId, orderId, auditId);

// ---- Đẩy mốc cập nhật của đơn -----------------------------------------------------------------------------------------------------------------

/**
 * CÂU ĐẦU LÔ của route thêm chặng và route hành khách (khoá lạc quan theo `orders.updated_at` — ADR A2): đẩy mốc đơn ĐÃ XÁC NHẬN khi còn đúng mốc client
 * đã đọc. Không lính gác (chính nó quyết định thắng/thua).
 */
const ORDER_TOUCH = defineSql("orders", "order_touch", `UPDATE orders SET updated_at = ?1 WHERE id = ?2 AND status = 'confirmed' AND updated_at = ?3`);
/**
 * Đẩy mốc đơn SAU khi câu đầu lô (sửa/đóng chặng theo mốc CỦA CHẶNG) đã thắng — để form khác đang mở trên cùng đơn thấy "vừa có người sửa". CÓ lính gác.
 * Chỉ đẩy khi mốc đơn còn đúng mốc route đã đọc (?3): có người vừa ghi đơn thì mốc đã đổi — mục đích đã đạt, không lùi mốc.
 */
const ORDER_TOUCH_GUARDED = defineSql(
  "orders",
  "order_touch_guarded",
  `UPDATE orders SET updated_at = ?1 WHERE id = ?2 AND updated_at = ?3 AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?4)`,
);
export const orderTouch = (db: D1Database, orderId: string, at: string, expected: string): D1PreparedStatement => db.prepare(ORDER_TOUCH).bind(at, orderId, expected);
export const orderTouchGuarded = (db: D1Database, orderId: string, at: string, expected: string, auditId: string): D1PreparedStatement =>
  db.prepare(ORDER_TOUCH_GUARDED).bind(at, orderId, expected, auditId);

// ---- Hành khách ---------------------------------------------------------------------------------------------------------------------------------

/** Mọi dòng hành khách của các đơn (mảng JSON ở ?1), theo thứ tự tạo. Họ tên đọc dưới bí danh `ten`. */
const PASSENGER_ROWS_BY_ORDERS = defineSql(
  "orders",
  "passenger_rows_by_orders",
  `SELECT id, order_id, person_key, previous_id, voided_at IS NOT NULL AS voided, full_name AS ten, birth_year, pax_code, updated_at
   FROM ord_passenger WHERE order_id IN (SELECT value FROM json_each(?1)) ORDER BY order_id, created_at, id`,
);
export interface PassengerRow {
  id: string;
  order_id: string;
  person_key: string;
  previous_id: string | null;
  voided: number;
  ten: string;
  birth_year: number;
  pax_code: "adult" | "child" | "senior" | "infant" | null;
  updated_at: string;
}
export async function passengerRowsByOrders(db: D1Database, orderIds: readonly string[]): Promise<PassengerRow[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(PASSENGER_ROWS_BY_ORDERS).bind(JSON.stringify(orderIds)).all<PassengerRow>()).results;
}

export interface PassengerWrite {
  id: string;
  orderId: string;
  ten: string;
  birthYear: number;
  paxCode: string | null;
  previousId: string | null;
  personKey: string;
  at: string;
  by: string | null;
}
const PASSENGER_INSERT_COLS = `id, order_id, full_name, birth_year, pax_code, previous_id, person_key, voided_at, source, created_at, created_by, updated_at, updated_by`;
/** Chèn hành khách KHÔNG lính gác — chỉ khi LẬP đơn. Nguồn luôn 'OFFICE' (đường ghi của tài xế chờ ADR lượt 2). */
const PASSENGER_INSERT = defineSql(
  "orders",
  "passenger_insert",
  `INSERT INTO ord_passenger (${PASSENGER_INSERT_COLS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, 'OFFICE', ?8, ?9, ?8, ?9)`,
);
/** Chèn hành khách CÓ lính gác (lưu nháp; route hành khách sau xác nhận). */
const PASSENGER_INSERT_GUARDED = defineSql(
  "orders",
  "passenger_insert_guarded",
  `INSERT INTO ord_passenger (${PASSENGER_INSERT_COLS})
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, 'OFFICE', ?8, ?9, ?8, ?9 WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?10)`,
);
const passengerBinds = (p: PassengerWrite) => [p.id, p.orderId, p.ten, p.birthYear, p.paxCode, p.previousId, p.personKey, p.at, p.by];
export const passengerInsert = (db: D1Database, p: PassengerWrite): D1PreparedStatement => db.prepare(PASSENGER_INSERT).bind(...passengerBinds(p));
export const passengerInsertGuarded = (db: D1Database, p: PassengerWrite, auditId: string): D1PreparedStatement =>
  db.prepare(PASSENGER_INSERT_GUARDED).bind(...passengerBinds(p), auditId);

/** XOÁ CỨNG danh sách khách của ĐƠN NHÁP — ngoại lệ có tên `XOA_CUNG_NHAP` (CHỜ CHỦ DUYỆT); điều kiện nháp TRONG câu; trigger `ord_passenger_no_delete`. */
const PASSENGER_DELETE_DRAFT = defineSql(
  "orders",
  "passenger_delete_draft",
  `DELETE FROM ord_passenger WHERE order_id = ?1 AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = 'draft') AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?2)`,
);
export const passengerDeleteDraft = (db: D1Database, orderId: string, auditId: string): D1PreparedStatement => db.prepare(PASSENGER_DELETE_DRAFT).bind(orderId, auditId);

/** Huỷ MỘT dòng hành khách (nhập nhầm / huỷ người — nơi gọi truyền từng dòng theo thứ tự mới trước cũ sau, R8). CÓ lính gác. */
const PASSENGER_VOID_GUARDED = defineSql(
  "orders",
  "passenger_void_guarded",
  `UPDATE ord_passenger SET voided_at = ?1, updated_at = ?1, updated_by = ?2 WHERE id = ?3 AND order_id = ?4 AND voided_at IS NULL AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?5)`,
);
export const passengerVoidGuarded = (db: D1Database, rowId: string, orderId: string, at: string, by: string, auditId: string): D1PreparedStatement =>
  db.prepare(PASSENGER_VOID_GUARDED).bind(at, by, rowId, orderId, auditId);

// ---- Hàm đọc hẹp cho Vận chuyển (ADR-0047 A3) ---------------------------------------------------------------------------------------------------

/**
 * Nguồn của `hanhKhachChoChuyen`: chặng CÒN MỞ của đơn ĐÃ XÁC NHẬN theo danh sách id chặng (?1), CHỈ các cột phần hẹp cần (mã đơn, tên dịch vụ, chiều, ngày
 * giờ, nhãn nơi) — không tên/SĐT khách, không tiền, không ghi chú, không người lập (lớp thứ nhất; lớp thứ hai là hàm dựng từng khoá ở index.ts).
 */
const LEG_TRIP_VIEW = defineSql(
  "orders",
  "leg_trip_view",
  `SELECT l.id, l.order_id, o.order_code, s.id AS service_id, s.name AS service_name, l.direction, l.pickup_date, l.pickup_time,
     COALESCE(pl.name, l.pickup_place) AS noi_don, COALESCE(dl.name, l.dropoff_place) AS noi_tra
   FROM ord_transfer_leg l
   JOIN orders o ON o.id = l.order_id
   JOIN order_service s ON s.id = l.order_service_id
   LEFT JOIN v_loc_location_label pl ON pl.id = l.pickup_location_id
   LEFT JOIN v_loc_location_label dl ON dl.id = l.dropoff_location_id
   WHERE l.id IN (SELECT value FROM json_each(?1)) AND l.closed_at IS NULL AND o.status = 'confirmed'`,
);
export interface LegTripRow {
  id: string;
  order_id: string;
  order_code: string;
  service_id: string;
  service_name: string;
  direction: "OUT" | "RETURN";
  pickup_date: string | null;
  pickup_time: string | null;
  noi_don: string;
  noi_tra: string | null;
}
export async function legTripRows(db: D1Database, legIds: readonly string[]): Promise<LegTripRow[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(LEG_TRIP_VIEW).bind(JSON.stringify(legIds)).all<LegTripRow>()).results;
}
