// TỆP SQL "NỬA NGHIÊM" của module orders (ADR-0047 A3, Ruling R5; hằng `NUA_NGHIEM` ở src/architecture.test.ts). `orders` còn ở LEGACY (SQL cũ của
// repository.ts chưa đăng ký), nhưng MỌI câu SQL MỚI của orders — chặng đưa đón `ord_transfer_leg`, hành khách `ord_passenger`, số khách hiệu lực —
// nằm ở tệp này, đăng ký bằng `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN (chỉ chạm bảng của orders / view công bố / khoá ngoại được phép)
// cùng bài `.prepare(<chuỗi thô>)`. KHÔNG viết câu `ord_*` thô ở repository.ts — repository.ts/index.ts GỌI các hàm ở đây rồi ghép vào lô.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node): câu nhật ký (`auditStatement`) do nơi gọi
// ghép vào lô.
//
// HAI NGOẠI LỆ CÓ TÊN ở bài EXPLAIN (src/architecture.test.ts — NỚI hàng rào đã duyệt, ĐÃ DUYỆT 2026-09-29 (lần 5) ở
// docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md):
//   - `XOA_CUNG_NHAP` (mục 2): hai câu `leg_delete_draft`, `passenger_delete_draft` xoá cứng dòng của ĐƠN NHÁP (lưu nháp xoá–chèn lại; lệch có chủ ý hẹp
//     của Hiến chương 5.5 — chủ trả lời Q0 2026-09-29 "Cách 1: chỉ giữ bản cuối"). Điều kiện đơn nháp nằm TRONG câu; trigger `*_no_delete` là lưới CSDL.
//   - `DOC_AUDIT_LOG_WONGUARD` (mục 3, có hạn): câu có đuôi `_guarded`/`_draft` đọc `audit_log` CHỈ ở lính gác "lô này đã thắng" (`EXISTS (SELECT 1 FROM
//     audit_log WHERE id = ?)` — khuôn `wonGuard` của repository.ts): chỉ chạy khi câu UPDATE có điều kiện đứng đầu lô của CHÍNH request này đã áp dụng.
// Tên cột `full_name` của `ord_passenger` (ADR-0047 A2) CHỈ xuất hiện trong chuỗi SQL ở tệp này, và luôn đọc ra dưới bí danh `ten` (bài R-N1-14 —
// ngoại lệ có tên cho đúng tệp này, ĐÃ DUYỆT 2026-09-29 (lần 5) ở đề xuất luật mục 7).
import { defineSql } from "../../shared/sql-registry.ts";
import { CON_MO } from "./xac-nhan-repo.ts";

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

/** Dịch vụ CÓ MÃ DANH MỤC và CÓ NGÀY ĐI của một đơn (ADR-0153: chỉ loại dịch vụ này mới có thể giữ vé; nhập tay không mã thì không). Kèm số khách ĐÃ LƯU. */
const SERVICE_CHO_VE = defineSql(
  "orders",
  "service_cho_ve",
  `SELECT id, order_id, catalog_code, depart_date, pax_adult, pax_child, pax_senior, pax_infant FROM order_service WHERE order_id = ?1 AND catalog_code IS NOT NULL AND depart_date IS NOT NULL`,
);
export interface ServiceChoVeRow extends ServicePaxRow { catalog_code: string; depart_date: string }
export async function serviceChoVe(db: D1Database, orderId: string): Promise<ServiceChoVeRow[]> {
  return (await db.prepare(SERVICE_CHO_VE).bind(orderId).all<ServiceChoVeRow>()).results;
}

/**
 * ADR-0175 Đ1.5a (cấp bù khi lô vào kho): đơn ĐÃ XÁC NHẬN có dòng dịch vụ mã ?1 ngày đi từ ?2 (hôm nay giờ Việt Nam), sắp theo ngày đi GẦN NHẤT của dòng mã đó rồi theo id.
 * Chỉ khoá đơn; «Có vé» và «còn thiếu» do gốc lắp ráp lọc tiếp (ô của catalog, phân bổ của ve-dien-tu). Trần ?3 dòng.
 */
const DON_XAC_NHAN_THEO_MA = defineSql(
  "orders",
  "confirmed_orders_by_catalog_code",
  `SELECT s.order_id, min(s.depart_date) AS ngay FROM order_service s JOIN orders o ON o.id = s.order_id
   WHERE o.status = 'confirmed' AND s.catalog_code = ?1 AND s.depart_date >= ?2 GROUP BY s.order_id ORDER BY ngay, s.order_id LIMIT ?3`,
);
export async function donXacNhanTheoMa(db: D1Database, catalogCode: string, tuNgay: string, gioiHan: number): Promise<string[]> {
  return (await db.prepare(DON_XAC_NHAN_THEO_MA).bind(catalogCode, tuNgay, gioiHan).all<{ order_id: string }>()).results.map((r) => r.order_id);
}

/**
 * ADR-0175 §2.7 (màn đối chiếu): dịch vụ có mã danh mục của đơn ĐÃ XÁC NHẬN đi đúng ngày ?1 (không đơn nháp, chờ xác nhận, huỷ). Chỉ tên dịch vụ và số khách đã lưu: không tên khách, không SĐT, không tiền.
 * Trần 5.000 dòng (một ngày không tới được; vượt thì bị cắt lặng lẽ: route đối chiếu chưa báo, dựa vào việc một ngày không tới số này).
 */
const DICH_VU_XAC_NHAN_THEO_NGAY = defineSql(
  "orders",
  "confirmed_services_by_day",
  `SELECT s.id, s.order_id, s.catalog_code, s.name AS ten, s.pax_adult, s.pax_child, s.pax_senior, s.pax_infant FROM order_service s JOIN orders o ON o.id = s.order_id
   WHERE o.status = 'confirmed' AND s.depart_date = ?1 AND s.catalog_code IS NOT NULL ORDER BY s.id LIMIT 5000`,
);
export interface DichVuNgayRow extends ServicePaxRow { catalog_code: string; ten: string }
export async function dichVuXacNhanTheoNgay(db: D1Database, ngay: string): Promise<DichVuNgayRow[]> {
  return (await db.prepare(DICH_VU_XAC_NHAN_THEO_NGAY).bind(ngay).all<DichVuNgayRow>()).results;
}

/** Số khách ĐÃ LƯU của mọi dịch vụ của MỘT đơn (cờ "danh sách nhiều hơn số khách" — R9). */
const SERVICE_PAX_BY_ORDER = defineSql("orders", "service_pax_by_order", `SELECT id, order_id, pax_adult, pax_child, pax_senior, pax_infant FROM order_service WHERE order_id = ?1`);
export async function servicePaxByOrder(db: D1Database, orderId: string): Promise<ServicePaxRow[]> {
  return (await db.prepare(SERVICE_PAX_BY_ORDER).bind(orderId).all<ServicePaxRow>()).results;
}

// ---- Đọc chặng --------------------------------------------------------------------------------------------------------------------------------

const LEG_COLS = `l.id, l.order_id, l.order_service_id, l.direction, l.pickup_date, l.pickup_time, l.pickup_location_id, l.pickup_place,
  COALESCE(pl.name, l.pickup_place) AS pickup_label, l.dropoff_location_id, l.dropoff_place, COALESCE(dl.name, l.dropoff_place) AS dropoff_label,
  l.closed_at, l.created_at, l.created_by, l.updated_at,
  l.short_notice_reason, l.short_notice_note, l.short_notice_at, sl.label AS short_notice_by_label, l.flight_code, l.pax_override, l.exclusive_vehicle, l.min_vehicle_seats, l.pickup_slot_end`;
// Người duyệt đặt gấp: TÊN HIỂN THỊ qua view công bố của staff (không SĐT) — chủ H4 / N-14; lớp route quyết ai thấy tên (ô order.leg.short_notice.view).
const LEG_JOIN = `FROM ord_transfer_leg l
  LEFT JOIN v_loc_location_label pl ON pl.id = l.pickup_location_id
  LEFT JOIN v_loc_location_label dl ON dl.id = l.dropoff_location_id
  LEFT JOIN v_stf_staff_label sl ON sl.id = l.short_notice_by`;

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
  /** Dấu đặt gấp (0040): mã lý do, ghi chú đã che, lúc duyệt, TÊN HIỂN THỊ người duyệt (NULL khi chặng không đặt gấp). */
  short_notice_reason: string | null;
  short_notice_note: string | null;
  short_notice_at: string | null;
  short_notice_by_label: string | null;
  /** Số hiệu chuyến bay (0057, ADR-0055 VK2-C) — chữ HOA đã chuẩn hoá, NULL = chưa có. */
  flight_code: string | null;
  /** Số người riêng của chặng VỀ (0057, ADR-0054 D10.3) — NULL = theo số khách dịch vụ. */
  pax_override: number | null;
  /** Cam kết xe riêng (0077, ADR-0056 VK3-A): 0 / 1. */
  exclusive_vehicle: number;
  /** Cam kết xe tối thiểu N chỗ (0077) — NULL = không cam kết. */
  min_vehicle_seats: number | null;
  /** Giờ cuối khung đón (0115, ADR-0134 Đ3) — NULL = "Giờ khác" / chưa chọn khung. */
  pickup_slot_end: string | null;
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

/**
 * ADR-0118 Đ2: mã dịch vụ (trong danh sách) mà nhóm HIỆN HÀNH tắt đưa đón — đọc view công bố `v_ctl_service_transfer` của `catalog` (chỉ khoá + cờ), KHÔNG đọc `ctl_group`
 * (bài src/orders-khong-doc-nhom-truc-tiep.test.ts). Chưa phân loại / nhóm ngưng dùng / mã không có trong danh mục: không có dòng `transfer_enabled = 0` ⇒ cho đưa đón.
 */
const DICH_VU_TAT_DUA_DON = defineSql(
  "orders",
  "service_transfer_disabled",
  `SELECT catalog_code FROM v_ctl_service_transfer WHERE transfer_enabled = 0 AND catalog_code IN (SELECT value FROM json_each(?1))`,
);

export async function dichVuTatDuaDon(db: D1Database, codes: readonly string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();
  const { results } = await db.prepare(DICH_VU_TAT_DUA_DON).bind(JSON.stringify([...new Set(codes)])).all<{ catalog_code: string }>();
  return new Set(results.map((r) => r.catalog_code));
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
  /** Số hiệu chuyến bay (0057) — giá trị ĐÃ GIẢI ở route (khoá vắng → giá trị đang lưu / NULL). */
  flightCode: string | null;
  /** Số người riêng của chặng VỀ (0057) — giá trị ĐÃ GIẢI ở route (quyền + L-R1 đã kiểm). */
  paxOverride: number | null;
  /** Cam kết xe riêng (0077) — giá trị ĐÃ GIẢI ở route (khoá vắng → giá trị đang lưu / false). */
  exclusiveVehicle: boolean;
  /** Cam kết xe tối thiểu N chỗ (0077) — giá trị ĐÃ GIẢI ở route (khoá vắng → giá trị đang lưu / NULL). */
  minVehicleSeats: number | null;
  /** Giờ cuối khung đón (0115, ADR-0134 Đ3) — từ thân (đã qua `kiemChang`); vắng = NULL ("Giờ khác"). */
  pickupSlotEnd: string | null;
  /**
   * Dấu ĐẶT GẤP (ADR-0049 D2) ghi cùng dòng — CHỈ từ: dấu MỚI của `xetDatGapSua` (lệnh thêm / thay chặng, `PUT …/trip` — ADR-0107), hoặc dấu CŨ của chính
   * chặng khớp đúng một-một khi lưu lại đơn nháp (Q1 = (a) — `datGapCuaDong`, giá trị đọc từ CSDL). Kiểu `DauGhi` ép điều này lúc typecheck. Không bao giờ
   * từ thân trình duyệt của lập / sửa nháp (I16). null = không dấu.
   */
  datGap?: DauGhi | null;
}

const LEG_INSERT_COLS = `id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place,
  closed_at, close_reason_code, created_at, created_by, updated_at, updated_by, flight_code, pax_override, exclusive_vehicle, min_vehicle_seats`;
/** Chèn chặng KHÔNG lính gác — chỉ dùng khi LẬP đơn (lô mới hoàn toàn, không có câu thắng/thua). ?19 = cuối khung đón (0115) — đứng SAU các cột cũ. */
const LEG_INSERT = defineSql(
  "orders",
  "leg_insert",
  `INSERT INTO ord_transfer_leg (${LEG_INSERT_COLS}, pickup_slot_end) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, NULL, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`,
);
/**
 * Chèn chặng CÓ lính gác (lưu nháp, route thêm chặng, `PUT /trip` tương thích): chỉ chạy khi dòng nhật ký ?17 của lô này đã được chèn. Thứ tự tham số: 1–16 = cột
 * của `LEG_INSERT_COLS` (15, 16 = hai ô phụ 0057; 17, 18 = hai ô cam kết 0077), ?19 = id nhật ký, ?20–?24 = năm cột đặt gấp, ?25 = cuối khung đón (0115 —
 * thêm SAU, không đánh số lại tham số cũ).
 */
const LEG_INSERT_GUARDED = defineSql(
  "orders",
  "leg_insert_guarded",
  `INSERT INTO ord_transfer_leg (${LEG_INSERT_COLS}, short_notice_reason, short_notice_note, short_notice_by, short_notice_at, short_notice_lead_minutes, pickup_slot_end)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, NULL, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?20, ?21, ?22, ?23, ?24, ?25 WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?19)`,
);
/** Năm giá trị cột đặt gấp (null cả năm = không dấu / bỏ dấu). Chỉ nhận dấu đã qua MỘT chỗ canh (`DauGhi` — ADR-0107). */
const datGapBinds = (d: DauGhi | null | undefined) => (d ? [d.lyDo, d.ghiChu, d.by, d.at, d.phut] : [null, null, null, null, null]);
const legBinds = (l: LegWrite) => [
  l.id, l.orderId, l.serviceId, l.direction, l.pickupDate, l.pickupTime, l.pickupLocationId, l.pickupPlace, l.dropoffLocationId, l.dropoffPlace,
  l.createdAt, l.createdBy, l.updatedAt, l.updatedBy, l.flightCode, l.paxOverride, l.exclusiveVehicle ? 1 : 0, l.minVehicleSeats,
];
export const legInsert = (db: D1Database, l: LegWrite): D1PreparedStatement => db.prepare(LEG_INSERT).bind(...legBinds(l), l.pickupSlotEnd);
export const legInsertGuarded = (db: D1Database, l: LegWrite, auditId: string): D1PreparedStatement =>
  db.prepare(LEG_INSERT_GUARDED).bind(...legBinds(l), auditId, ...datGapBinds(l.datGap), l.pickupSlotEnd);

/**
 * XOÁ CỨNG chặng của ĐƠN NHÁP — ngoại lệ có tên `XOA_CUNG_NHAP` (ĐÃ DUYỆT 2026-09-29 (lần 5), đề xuất luật mục 2). Lưu nháp xoá–chèn lại chặng cùng lô, TRƯỚC câu xoá
 * dịch vụ (khoá ngoại). Điều kiện "đơn nháp" nằm TRONG câu; trigger `ord_transfer_leg_no_delete` cấm xoá khi đơn không còn nháp.
 */
const LEG_DELETE_DRAFT = defineSql(
  "orders",
  "leg_delete_draft",
  `DELETE FROM ord_transfer_leg WHERE order_id = ?1 AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND status = 'draft') AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?2)`,
);
export const legDeleteDraft = (db: D1Database, orderId: string, auditId: string): D1PreparedStatement => db.prepare(LEG_DELETE_DRAFT).bind(orderId, auditId);

/**
 * Cuối khung đón (0115, ADR-0134 Đ3) trong câu SỬA: không có tham số riêng — GIỮ khi giờ đón không đổi, XOÁ (NULL) khi giờ đón đổi (vế phải của SET đọc giá
 * trị CŨ của dòng). Nhờ vậy mọi đường sửa (`PUT /trip`, route sửa chặng) không bao giờ vỡ CHECK "cuối khung sau giờ đón" (500) và không giữ khung đã sai.
 */
const LEG_SET = `pickup_date = ?1, pickup_time = ?2, pickup_location_id = ?3, pickup_place = ?4, dropoff_location_id = ?5, dropoff_place = ?6, updated_at = ?7, updated_by = ?8,
  pickup_slot_end = CASE WHEN pickup_time IS ?2 THEN pickup_slot_end ELSE NULL END`;
/**
 * Nội dung VẬN HÀNH của chặng (ngày, giờ, nơi) đổi thì dấu ĐẶT GẤP cũ không còn duyệt nội dung mới (I16 — "dấu duyệt nội dung cũ"; cùng luật Q1 = (a) của lưu
 * nháp): câu sửa GHI LẠI năm cột đặt gấp — dấu MỚI (`xetDatGapSua`: lệnh kèm lý do và giờ SAU lệnh của chặng dưới mốc — ADR-0107) hoặc NULL cả năm (bỏ dấu). NGOẠI LỆ (chủ Q-B 1/10 "Giữ dấu đặt
 * gấp cũ"): lệnh CHỈ đổi ô phụ (số hiệu chuyến bay / số người chiều về — `chiDoiOPhu`) mà thân không có `datGap` → cờ ?21 = 1 GIỮ năm cột đang lưu. `PUT /trip`
 * luôn truyền 0.
 */
const LEG_SET_DAT_GAP = `short_notice_reason = CASE WHEN ?21 = 1 THEN short_notice_reason ELSE ?12 END,
  short_notice_note = CASE WHEN ?21 = 1 THEN short_notice_note ELSE ?13 END, short_notice_by = CASE WHEN ?21 = 1 THEN short_notice_by ELSE ?14 END,
  short_notice_at = CASE WHEN ?21 = 1 THEN short_notice_at ELSE ?15 END, short_notice_lead_minutes = CASE WHEN ?21 = 1 THEN short_notice_lead_minutes ELSE ?16 END`;
/**
 * Các ô PHỤ (0057: số hiệu, số người về; 0077: xe riêng, số chỗ tối thiểu) — đoạn SET RIÊNG có cờ "ghi" (kế hoạch Task 3.2, phát hiện C1): cờ = 0 GIỮ giá trị đang lưu. Chỉ route sửa chặng truyền 1 khi thân CÓ khoá;
 * `PUT /trip` (`legUpdateGuarded`) luôn 0 — dời ngày / đổi giờ không bao giờ xoá số hiệu, số người. KHÔNG nhét vào `LEG_SET` dùng chung.
 */
const LEG_SET_O_PHU = `flight_code = CASE WHEN ?17 = 1 THEN ?18 ELSE flight_code END, pax_override = CASE WHEN ?19 = 1 THEN ?20 ELSE pax_override END,
  exclusive_vehicle = CASE WHEN ?22 = 1 THEN ?23 ELSE exclusive_vehicle END, min_vehicle_seats = CASE WHEN ?24 = 1 THEN ?25 ELSE min_vehicle_seats END`;
/** Sửa trường vận hành của chặng MỞ, CÓ lính gác (`PUT /trip`: dời ngày, trộn giờ/nơi cũ). */
const LEG_UPDATE_GUARDED = defineSql(
  "orders",
  "leg_update_guarded",
  `UPDATE ord_transfer_leg SET ${LEG_SET}, ${LEG_SET_DAT_GAP}, ${LEG_SET_O_PHU}
   WHERE id = ?9 AND order_id = ?10 AND closed_at IS NULL AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?11)`,
);
/**
 * Sửa trường vận hành của chặng MỞ, CÂU ĐẦU LÔ của route sửa chặng (khoá lạc quan theo `updated_at` CỦA CHẶNG — ADR A1): chỉ khi đơn đã xác nhận, chặng
 * còn mở và đúng mốc ?11 client đã đọc. Không lính gác (chính nó quyết định thắng/thua; nhật ký theo sau bằng `changes() > 0`).
 */
const LEG_UPDATE_CHECKED = defineSql(
  "orders",
  "leg_update_checked",
  `UPDATE ord_transfer_leg SET ${LEG_SET}, ${LEG_SET_DAT_GAP}, ${LEG_SET_O_PHU}
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
/** Các ô phụ sẽ GHI (khoá vắng = giữ giá trị đang lưu): số hiệu, số người về, và hai ô cam kết (0077, ADR-0056 VK3-A). */
export interface OPhuGhi {
  flightCode?: string | null;
  paxOverride?: number | null;
  exclusiveVehicle?: boolean;
  minVehicleSeats?: number | null;
}
/**
 * ?17–?21: cờ ghi + giá trị số hiệu, cờ ghi + giá trị số người, cờ GIỮ dấu đặt gấp; ?22–?25 (0077): cờ ghi + giá trị xe riêng, cờ ghi + giá trị số chỗ tối
 * thiểu (hai cột mới đứng SAU cờ ?21 để không đánh số lại các tham số cũ).
 */
const oPhuBinds = (o: OPhuGhi, giuDatGap: boolean) => [
  o.flightCode !== undefined ? 1 : 0, o.flightCode ?? null, o.paxOverride !== undefined ? 1 : 0, o.paxOverride ?? null, giuDatGap ? 1 : 0,
  o.exclusiveVehicle !== undefined ? 1 : 0, o.exclusiveVehicle ? 1 : 0, o.minVehicleSeats !== undefined ? 1 : 0, o.minVehicleSeats ?? null,
];
/** `PUT /trip`: cờ ô phụ = 0 (giữ), cờ giữ dấu = 0 (luật I16 cũ). */
export const legUpdateGuarded = (db: D1Database, legId: string, orderId: string, f: LegFields, at: string, by: string, auditId: string, datGap: DauDatGapMoi | null = null): D1PreparedStatement =>
  db.prepare(LEG_UPDATE_GUARDED).bind(...fieldBinds(f, at, by), legId, orderId, auditId, ...datGapBinds(datGap), ...oPhuBinds({}, false));
export const legUpdateChecked = (
  db: D1Database, legId: string, orderId: string, f: LegFields, at: string, by: string, expectedLegUpdatedAt: string, datGap: DauDatGapMoi | null = null,
  oPhu: OPhuGhi = {}, giuDatGap = false,
): D1PreparedStatement => db.prepare(LEG_UPDATE_CHECKED).bind(...fieldBinds(f, at, by), legId, orderId, expectedLegUpdatedAt, ...datGapBinds(datGap), ...oPhuBinds(oPhu, giuDatGap));

/**
 * NHÁNH NHÁP của `PUT /api/orders/:id/legs/:legId` (ADR-0054 D10.3 "đường mới cho đơn nháp"; kế hoạch Task 3.5): CHỈ ghi `pax_override` của chặng VỀ còn mở
 * của ĐƠN NHÁP, khoá lạc quan theo `updated_at` CỦA CHẶNG. CÂU ĐẦU LÔ (tự quyết thắng / thua, không đọc `audit_log`, không lính gác — không vào
 * `DOC_AUDIT_LOG_WONGUARD`); nhật ký theo sau bằng `changes() > 0`.
 */
const LEG_PAX_OVERRIDE_CHECKED = defineSql(
  "orders",
  "leg_pax_override_checked",
  `UPDATE ord_transfer_leg SET pax_override = ?1, updated_at = ?2, updated_by = ?3
   WHERE id = ?4 AND order_id = ?5 AND closed_at IS NULL AND updated_at = ?6 AND direction = 'RETURN' AND EXISTS (SELECT 1 FROM orders WHERE id = ?5 AND status = 'draft')`,
);
export const legPaxOverrideChecked = (db: D1Database, legId: string, orderId: string, pax: number | null, at: string, by: string, expectedLegUpdatedAt: string): D1PreparedStatement =>
  db.prepare(LEG_PAX_OVERRIDE_CHECKED).bind(pax, at, by, legId, orderId, expectedLegUpdatedAt);

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
/**
 * Đóng chặng — CÂU ĐẦU LÔ của route THAY chặng (C14): khoá lạc quan theo `updated_at` CỦA ĐƠN (một khoá cho cả lệnh đóng + thêm), đơn đã xác nhận, chặng
 * còn mở. Đóng VÀ khoá trong MỘT câu: lô chỉ thắng khi chặng cũ thật sự được đóng ở chính câu này — chặng vừa bị bỏ ở lệnh khác (mà mốc đơn chưa kịp đẩy)
 * thì lô thua, không thêm chặng mới. Không đọc `audit_log`, không lính gác (chính nó quyết định thắng/thua; nhật ký theo sau bằng `changes() > 0`).
 */
const LEG_CLOSE_REPLACE_CHECKED = defineSql(
  "orders",
  "leg_close_replace_checked",
  `UPDATE ord_transfer_leg SET closed_at = ?1, close_reason_code = ?2, updated_at = ?1, updated_by = ?3
   WHERE id = ?4 AND order_id = ?5 AND closed_at IS NULL AND EXISTS (SELECT 1 FROM orders WHERE id = ?5 AND status = 'confirmed' AND updated_at = ?6)`,
);
export const legCloseGuarded = (db: D1Database, legId: string, orderId: string, reason: string, at: string, by: string, auditId: string): D1PreparedStatement =>
  db.prepare(LEG_CLOSE_GUARDED).bind(at, reason, by, legId, orderId, auditId);
export const legCloseReplaceChecked = (db: D1Database, legId: string, orderId: string, reason: string, at: string, by: string, expectedOrderUpdatedAt: string): D1PreparedStatement =>
  db.prepare(LEG_CLOSE_REPLACE_CHECKED).bind(at, reason, by, legId, orderId, expectedOrderUpdatedAt);
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
 * (dấu mới thay dấu cũ) là hợp lệ (I14). Năm cột chỉ được ghi ở đây và ở các câu ghi chặng nhận `DauGhi` (I16) — thân lập/sửa nháp không đọc khoá này.
 * ADR-0107 ý (ii): route đã xét "giờ chặng ĐANG dưới mốc" trên giờ đọc lúc trước — ?8, ?9 = đúng ngày, giờ đó; chặng vừa bị dời (lệnh khác chen giữa) thì câu
 * không áp dụng (không bao giờ ghi dấu lên giờ chưa được xét).
 */
const LEG_SHORT_NOTICE = defineSql(
  "orders",
  "leg_short_notice",
  `UPDATE ord_transfer_leg SET short_notice_reason = ?1, short_notice_note = ?2, short_notice_by = ?3, short_notice_at = ?4, short_notice_lead_minutes = ?5,
     updated_at = ?4, updated_by = ?3
   WHERE id = ?6 AND order_id = ?7 AND closed_at IS NULL AND pickup_date IS ?8 AND pickup_time IS ?9
     AND EXISTS (SELECT 1 FROM orders WHERE id = ?7 AND status IN ('draft', 'confirmed'))`,
);
/** Năm giá trị cột đặt gấp — chỉ là DỮ LIỆU; câu ghi KHÔNG nhận kiểu trần này (ADR-0107: MỘT chỗ canh, xem `DauGhi`). */
export interface DatGapWrite {
  lyDo: string;
  ghiChu: string | null;
  by: string;
  at: string;
  phut: number;
}
declare const DAU_MOI: unique symbol;
declare const DAU_CHEP: unique symbol;
/**
 * Dấu MỚI (ADR-0107 Hướng A, mục 4): CHỈ `xetDatGapSua` (orders/index.ts) dựng được — sau khi xét ô `order.leg.short_notice`, lý do, và giờ SAU lệnh của
 * chính chặng đang dưới mốc. Khoá `unique symbol` không viết được bằng chữ: một đường mới tự dựng dấu (đối tượng chữ) thì `npm run typecheck` đỏ.
 */
export type DauDatGapMoi = DatGapWrite & { readonly [DAU_MOI]: true };
/** Dấu CHÉP khi lưu lại đơn nháp (ngoại lệ có tên `chepDatGapNhap`, ADR-0049 Q1 = (a)): CHỈ `datGapCuaDong` (orders/dat-gap.ts) dựng được, từ dòng CSDL. */
export type DauChepNhap = DatGapWrite & { readonly [DAU_CHEP]: true };
/** Mọi dấu được phép GHI xuống năm cột. */
export type DauGhi = DauDatGapMoi | DauChepNhap;
export const legShortNotice = (db: D1Database, legId: string, orderId: string, d: DauDatGapMoi, gio: { pickupDate: string | null; pickupTime: string | null }): D1PreparedStatement =>
  db.prepare(LEG_SHORT_NOTICE).bind(d.lyDo, d.ghiChu, d.by, d.at, d.phut, legId, orderId, gio.pickupDate, gio.pickupTime);

/**
 * ĐÓNG DẤU đặt gấp cho một lượt TRONG LÔ CÒN VÉ (ADR-0154 Đ1.4) — cùng năm cột, cùng nguồn dấu (`DauDatGapMoi`, chỉ `xetDatGapSua` dựng) như `legShortNotice`, khác ở chỗ canh: mang CÙNG
 * hai điều kiện `CON_MO` với câu xác nhận (yêu cầu `?10` còn mở VÀ đơn còn nháp đúng mốc `?11`) nên bên thua (người lập Rút lại / người khác vừa quyết) không để lại dấu mồ côi, và khớp
 * ĐÚNG ngày, giờ mà dòng đang giữ (`?8`, `?9`) tại thời điểm câu chạy trong lô: PHẢI đứng SAU các câu đổi ngày, đổi giờ của cùng lô, và nơi gọi truyền giá trị dòng SẼ giữ lúc đó
 * (ngày đang NULL vẫn NULL tới câu điền ngày trong `soanXacNhan`), không giá trị dự phòng. Lệch thì câu không ghi gì và câu xác nhận thua vế mốc — an toàn. Không đọc `audit_log`:
 * dòng nhật ký `order_leg_short_notice` theo sau bằng `changes() > 0`. Tên `_decide_guarded` cùng khuôn các câu Còn vé khác.
 */
const LEG_SHORT_NOTICE_CON_VE = defineSql(
  "orders",
  "leg_short_notice_decide_guarded",
  `UPDATE ord_transfer_leg SET short_notice_reason = ?1, short_notice_note = ?2, short_notice_by = ?3, short_notice_at = ?4, short_notice_lead_minutes = ?5,
     updated_at = ?4, updated_by = ?3
   WHERE id = ?6 AND order_id = ?7 AND closed_at IS NULL AND pickup_date IS ?8 AND pickup_time IS ?9 AND ${CON_MO("?7", "?10", "?11")}`,
);
export const legShortNoticeConVe = (db: D1Database, v: { legId: string; orderId: string; d: DauDatGapMoi; gio: { pickupDate: string | null; pickupTime: string | null }; yeuCauId: string; prevUpdatedAt: string }): D1PreparedStatement =>
  db.prepare(LEG_SHORT_NOTICE_CON_VE).bind(v.d.lyDo, v.d.ghiChu, v.d.by, v.d.at, v.d.phut, v.legId, v.orderId, v.gio.pickupDate, v.gio.pickupTime, v.yeuCauId, v.prevUpdatedAt);

/**
 * Chặng CÒN MỞ ĐÃ MANG DẤU đặt gấp của MỘT đơn, kèm mã danh mục + vị trí dịch vụ (khớp một-một khi lưu lại đơn nháp — Q1 = (a)) và năm cột dấu (chép từ CSDL,
 * không từ trình duyệt). Cũng dùng để biết chặng nào đã đặt gấp (cảnh báo mốc, lý do 409 lúc xác nhận).
 */
const LEG_DAT_GAP_BY_ORDER = defineSql(
  "orders",
  "leg_dat_gap_by_order",
  `SELECT l.id, s.catalog_code, s.sort_order, l.direction, l.pickup_date, l.pickup_time, l.pickup_location_id, l.pickup_place, l.dropoff_location_id, l.dropoff_place,
     l.short_notice_reason, l.short_notice_note, l.short_notice_by, l.short_notice_at, l.short_notice_lead_minutes
   FROM ord_transfer_leg l JOIN order_service s ON s.id = l.order_service_id
   WHERE l.order_id = ?1 AND l.closed_at IS NULL AND l.short_notice_reason IS NOT NULL`,
);
export interface LegDatGapRow {
  id: string;
  catalog_code: string | null;
  sort_order: number;
  direction: "OUT" | "RETURN";
  pickup_date: string | null;
  pickup_time: string | null;
  pickup_location_id: string | null;
  pickup_place: string | null;
  dropoff_location_id: string | null;
  dropoff_place: string | null;
  short_notice_reason: string;
  short_notice_note: string | null;
  short_notice_by: string;
  short_notice_at: string;
  short_notice_lead_minutes: number;
}
export async function legDatGapByOrder(db: D1Database, orderId: string): Promise<LegDatGapRow[]> {
  return (await db.prepare(LEG_DAT_GAP_BY_ORDER).bind(orderId).all<LegDatGapRow>()).results;
}

/**
 * XÁC NHẬN ĐƠN (chuyển từ SQL thô của repository.ts — kế hoạch I15; ADR-0047 A3 "SQL mới của orders chỉ ở tệp nửa nghiêm"). Giữ NGUYÊN mọi điều kiện cũ
 * (có dịch vụ; mọi dịch vụ có ngày đi trong [?3, ?4] và ≥ 1 khách) + vế MỐC TỐI THIỂU LÚC ĐẶT (ADR-0049 D2): không còn chặng MỞ nào có giờ, KHÔNG mang dấu đặt
 * gấp, có `ngày giờ` < ngưỡng ?5 (chuỗi 'YYYY-MM-DD HH:MM' giờ VN của bây giờ + mốc, tính bằng `nguongMocVn` — MỘT luật với `kiemMocDat`). Chặng chưa chốt
 * giờ không bị xét (I13). Câu ĐẦU quyết định thắng/thua (sau câu điền ngày chặng); không đọc `audit_log` (nhật ký theo sau bằng `changes() > 0`).
 * KHOÁ PHIÊN BẢN (Task 4b — lời chủ 2026-10-08, "báo tải lại, bấm lại"): thêm `updated_at = ?6` = mốc route đã đọc TRƯỚC khi dựng bản chụp mức. Lưu nháp luôn
 * đẩy `updated_at` (`updateDraftOrder`, `changeBooker`, gộp hồ sơ…), nên nếu đơn đổi sau lúc route đọc thì câu này không đổi dòng nào ⇒ cả lô không ghi gì (chuỗi
 * `changes() > 0`) và route trả 409 "vừa được người khác sửa". Không có vế này, bản chụp (bên hưởng, mã dòng danh mục) có thể lệch đơn vừa lưu.
 * ADR-0193 câu (ii) — vế thứ hai về chặng: không còn chặng MỞ nào CHƯA giờ mà `ngày đón || ' 00:00'` < ?5 (cùng ngưỡng, không thêm tham số). Câu điền ngày đón đứng trước trong lô nên chặng
 * trống ngày đã mang ngày đi. MỘT luật với `changChuaGioVaoHanChot` (src/shared/moc-toi-thieu.ts; bài khoá hai phía ở chua-gio-sat-ngay.test.ts). Lớp chặn CUỐI: các cửa xác nhận đã kiểm
 * bằng hàm thuần trước khi dựng lô (ruling R6).
 */
// ADR-0225 Đ2 (đề xuất; migration 0184): câu xác nhận chụp dấu «đơn đối tác chỉ thu hộ tiền mặt» — 1 khi đơn do tài khoản giữ quyền Đối tác lập (dấu kênh thu khác NULL) HOẶC
// bên đặt đang mang vai được hưởng hoa hồng (CÙNG vế EXISTS với BOOKER_LA_DOI_TAC của repository.ts — bài don-doi-tac-chi-tien-mat.test.ts so chữ). Trigger 0184 chỉ cho NULL → giá trị trong câu này.
const ORDER_CONFIRM = defineSql(
  "orders",
  "order_confirm",
  `UPDATE orders SET status = 'confirmed', updated_at = ?1, confirmed_at = ?1,
     partner_cash_only = (company_collects_snapshot IS NOT NULL OR EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_prc_beneficiary_role b ON b.role_type_code = r.role_type_code WHERE r.party_id = orders.booker_party_id))
   WHERE id = ?2 AND status = 'draft' AND updated_at = ?6
     AND EXISTS (SELECT 1 FROM order_service WHERE order_id = orders.id)
     AND NOT EXISTS (
       SELECT 1 FROM order_service s WHERE s.order_id = orders.id
         AND (s.depart_date IS NULL OR s.depart_date < ?3 OR s.depart_date > ?4 OR s.pax_adult + s.pax_child + s.pax_senior + s.pax_infant < 1))
     AND NOT EXISTS (
       SELECT 1 FROM ord_transfer_leg l WHERE l.order_id = orders.id AND l.closed_at IS NULL AND l.pickup_time IS NOT NULL
         AND l.short_notice_reason IS NULL AND l.pickup_date || ' ' || l.pickup_time < ?5)
     AND NOT EXISTS (
       SELECT 1 FROM ord_transfer_leg l WHERE l.order_id = orders.id AND l.closed_at IS NULL AND l.pickup_time IS NULL
         AND l.pickup_date IS NOT NULL AND l.pickup_date || ' 00:00' < ?5)
     AND (?7 IS NULL OR EXISTS (SELECT 1 FROM ord_confirm_request q WHERE q.id = ?7 AND q.order_id = orders.id AND q.decided_at IS NULL))`,
);
/**
 * `yeuCauId` (Task 3.3, ADR-0136 Đ7): khi người xét duyệt bấm Còn vé, câu xác nhận còn mang vế «yêu cầu đã đọc VẪN CÒN MỞ» — người lập vừa Rút lại / người khác vừa quyết
 * thì câu không đổi dòng nào. NULL = xác nhận thường (`/status`, không qua yêu cầu).
 */
export const orderConfirm = (db: D1Database, orderId: string, at: string, from: string, to: string, nguongMoc: string, prevUpdatedAt: string, yeuCauId: string | null = null): D1PreparedStatement =>
  db.prepare(ORDER_CONFIRM).bind(at, orderId, from, to, nguongMoc, prevUpdatedAt, yeuCauId);

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

/**
 * Mọi dòng hành khách của các đơn (mảng JSON ở ?1), theo thứ tự NHẬP. Họ tên đọc dưới bí danh `ten`.
 * Cả lô chèn cùng `created_at` ⇒ hoà giờ sắp theo `rowid` (thứ tự câu INSERT trong lô — nơi chèn đi theo thứ tự mảng), KHÔNG theo `id` (UUID ngẫu
 * nhiên — PM-2). `created_at` vẫn đứng trước để thứ tự không lệ thuộc riêng `rowid` (VACUUM có thể đánh số lại, nhưng giữ thứ tự tương đối).
 * Dòng thay thế (sửa tên) chèn sau dòng đầu chuỗi ⇒ `dongHienHanh` xếp người theo dòng đầu ⇒ người sửa tên giữ chỗ.
 */
const PASSENGER_ROWS_BY_ORDERS = defineSql(
  "orders",
  "passenger_rows_by_orders",
  `SELECT id, order_id, person_key, previous_id, voided_at IS NOT NULL AS voided, full_name AS ten, birth_year, pax_code, updated_at
   FROM ord_passenger WHERE order_id IN (SELECT value FROM json_each(?1)) ORDER BY order_id, created_at, rowid`,
);
/** Số dòng hành khách ĐANG LƯU của đơn (chưa huỷ) — cho kiểm «bắt buộc có danh sách khách» khi sửa nháp không gửi khoá `passengers` (ADR-0194 đợt 1). */
const PASSENGER_COUNT_ACTIVE = defineSql("orders", "passenger_count_active", `SELECT count(*) AS n FROM ord_passenger WHERE order_id = ?1 AND voided_at IS NULL`);
export async function soHanhKhachDangLuu(db: D1Database, orderId: string): Promise<number> {
  return (await db.prepare(PASSENGER_COUNT_ACTIVE).bind(orderId).first<{ n: number }>())?.n ?? 0;
}
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

/**
 * Đợt 5 A-1b (ADR-0052 D5b): hành khách do TÀI XẾ nhập — chuỗi mới (`previous_id` NULL, `person_key = id`), `source = 'DRIVER'`. Gác: dòng nhật ký `?8`
 * (lô của van-chuyen ghi trước), đơn đã xác nhận + chưa giao, và số người có tên HIỆN HÀNH của đơn < `?9` (số khách hiệu lực của dịch vụ đông nhất — L-A1,
 * cùng thước R-ORD-9). Không đạt → 0 dòng (lô bên gọi kiểm `changes`). KHÔNG tự kiểm quyền: nơi gọi đứng sau can(trip.passenger.add) — orders-cong-bo.test.ts.
 */
const PASSENGER_INSERT_DRIVER = defineSql(
  "orders",
  "passenger_insert_driver",
  `INSERT INTO ord_passenger (${PASSENGER_INSERT_COLS})
   SELECT ?1, ?2, ?3, ?4, ?5, NULL, ?1, NULL, 'DRIVER', ?6, ?7, ?6, ?7
   WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?8)
     AND EXISTS (SELECT 1 FROM orders WHERE id = ?2 AND status = 'confirmed' AND delivered_at IS NULL)
     AND (SELECT count(DISTINCT p.person_key) FROM ord_passenger p WHERE p.order_id = ?2 AND p.voided_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL)) < ?9`,
);
export interface PassengerDriverWrite { id: string; orderId: string; ten: string; birthYear: number; paxCode: string | null; at: string; by: string }
export const passengerInsertDriver = (db: D1Database, p: PassengerDriverWrite, auditId: string, toiDa: number): D1PreparedStatement =>
  db.prepare(PASSENGER_INSERT_DRIVER).bind(p.id, p.orderId, p.ten, p.birthYear, p.paxCode, p.at, p.by, auditId, toiDa);

/** XOÁ CỨNG danh sách khách của ĐƠN NHÁP — ngoại lệ có tên `XOA_CUNG_NHAP` (ĐÃ DUYỆT 2026-09-29 (lần 5)); điều kiện nháp TRONG câu; trigger `ord_passenger_no_delete`. */
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
     COALESCE(pl.name, l.pickup_place) AS noi_don, COALESCE(dl.name, l.dropoff_place) AS noi_tra, l.pax_override, l.exclusive_vehicle, l.min_vehicle_seats
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
  /** Số người riêng của chặng về — CHỈ để tính `soNguoiChang` (không trả ra nguyên cột). */
  pax_override: number | null;
  /** Cam kết xe riêng / xe tối thiểu N chỗ (0077, ADR-0056 VK3-A → khoá `xeRieng` / `choToiThieu`). */
  exclusive_vehicle: number;
  min_vehicle_seats: number | null;
}
export async function legTripRows(db: D1Database, legIds: readonly string[]): Promise<LegTripRow[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(LEG_TRIP_VIEW).bind(JSON.stringify(legIds)).all<LegTripRow>()).results;
}

// ---- Hàm đọc hẹp cho LỊCH CHUNG điều phối (ADR-0049 D1, lát 1.4; kế hoạch A11; ADR-0050 VK1-B) ----------------------------------------------------------

/**
 * Nguồn của `lichChungChang` — chặng CÒN MỞ của đơn ĐÃ XÁC NHẬN có NGÀY ĐÓN trong [?1, ?2], CHỈ cột phần hẹp: mã đơn, tên dịch vụ, chiều, ngày giờ, nhãn nơi,
 * id điểm danh mục, cờ đặt gấp. Đọc thêm chữ nơi CHƯA CHE (`pickup_place`, `dropoff_place`) CHỈ để tính khoá so sánh nơi (VK1-B) — hàm dựng bỏ chúng sau khi
 * băm, không trả ra. Không tiền, ghi chú, người lập, liên hệ khách (lớp thứ nhất; lớp thứ hai là hàm dựng từng khoá ở index.ts).
 */
const LEG_LICH_CHUNG = defineSql(
  "orders",
  "leg_lich_chung",
  `SELECT l.id, l.order_id, o.order_code, s.id AS service_id, s.name AS service_name, l.direction, l.pickup_date, l.pickup_time,
     l.pickup_location_id, l.pickup_place, COALESCE(pl.name, l.pickup_place) AS noi_don,
     l.dropoff_location_id, l.dropoff_place, COALESCE(dl.name, l.dropoff_place) AS noi_tra,
     l.short_notice_reason IS NOT NULL AS dat_gap, l.flight_code, l.pax_override, l.exclusive_vehicle, l.min_vehicle_seats, o.manifest_exempt
   FROM ord_transfer_leg l
   JOIN orders o ON o.id = l.order_id
   JOIN order_service s ON s.id = l.order_service_id
   LEFT JOIN v_loc_location_label pl ON pl.id = l.pickup_location_id
   LEFT JOIN v_loc_location_label dl ON dl.id = l.dropoff_location_id
   WHERE l.closed_at IS NULL AND o.status = 'confirmed' AND l.pickup_date BETWEEN ?1 AND ?2`,
);
export interface LegLichChungRow {
  id: string;
  order_id: string;
  order_code: string;
  service_id: string;
  service_name: string;
  direction: "OUT" | "RETURN";
  pickup_date: string;
  pickup_time: string | null;
  pickup_location_id: string | null;
  pickup_place: string | null;
  noi_don: string;
  dropoff_location_id: string | null;
  dropoff_place: string | null;
  noi_tra: string | null;
  dat_gap: number;
  /** Số hiệu chuyến bay (ADR-0055 C3 → khoá `soHieuChuyenBay`). */
  flight_code: string | null;
  /** Số người riêng của chặng về — CHỈ để tính `soNguoiChang`. */
  pax_override: number | null;
  /** Cam kết xe riêng / xe tối thiểu N chỗ (0077, ADR-0056 VK3-A → khoá `xeRieng` / `choToiThieu`). */
  exclusive_vehicle: number;
  min_vehicle_seats: number | null;
  /** Dấu miễn danh sách khách của ĐƠN (`orders.manifest_exempt`, ADR-0154 Đ3 → khoá `mienDanhSach`): chụp lúc lập đơn, không đổi sau đó. Chỉ cờ 0 / 1. */
  manifest_exempt: number;
}
export async function legLichChungRows(db: D1Database, tuNgay: string, denNgay: string): Promise<LegLichChungRow[]> {
  return (await db.prepare(LEG_LICH_CHUNG).bind(tuNgay, denNgay).all<LegLichChungRow>()).results;
}
/**
 * Chặng MỞ của đơn NHÁP có ngày đón trong [?1, ?2] (I11): CHỈ khoá, mã đơn, ngày giờ, cờ đặt gấp — không nơi, không số người.
 * ADR-0135 Đ9 (đặc tả 5d.1): lịch chung điều phối chỉ được thấy chặng của nháp CÓ YÊU CẦU XÁC NHẬN CÒN MỞ. Đơn nháp không có yêu cầu mở là vùng riêng của người lập,
 * không lộ qua lịch chung (Task 3.3 lát 4b: điều kiện EXISTS yêu cầu còn mở thay cho `0 = 1` của Đợt 2).
 */
const LEG_LICH_CHUNG_NHAP = defineSql(
  "orders",
  "leg_lich_chung_nhap",
  `SELECT l.id, l.order_id, o.order_code, l.pickup_date, l.pickup_time, l.short_notice_reason IS NOT NULL AS dat_gap
   FROM ord_transfer_leg l JOIN orders o ON o.id = l.order_id
   WHERE l.closed_at IS NULL AND o.status = 'draft' AND EXISTS (SELECT 1 FROM ord_confirm_request q WHERE q.order_id = o.id AND q.decided_at IS NULL) AND l.pickup_date BETWEEN ?1 AND ?2`,
);
export interface LegLichChungNhapRow {
  id: string;
  order_id: string;
  order_code: string;
  pickup_date: string;
  pickup_time: string | null;
  dat_gap: number;
}
export async function legLichChungNhapRows(db: D1Database, tuNgay: string, denNgay: string): Promise<LegLichChungNhapRow[]> {
  return (await db.prepare(LEG_LICH_CHUNG_NHAP).bind(tuNgay, denNgay).all<LegLichChungNhapRow>()).results;
}

/** Nguồn của `lienHeChoTaiXe` (ADR-0049 D3 — tài xế, TRONG ngày chạy): tên + SĐT người liên hệ chụp trên đơn ĐÃ XÁC NHẬN, theo danh sách id đơn (?1). */
const ORDER_CONTACT_FOR_DRIVER = defineSql(
  "orders",
  "order_contact_for_driver",
  `SELECT id, order_code, customer_name, customer_phone FROM orders WHERE id IN (SELECT value FROM json_each(?1)) AND status = 'confirmed'`,
);
export interface OrderContactRow {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
}
export async function orderContactRows(db: D1Database, orderIds: readonly string[]): Promise<OrderContactRow[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(ORDER_CONTACT_FOR_DRIVER).bind(JSON.stringify(orderIds)).all<OrderContactRow>()).results;
}

// ---- Chính sách "Dịch vụ nhập tay" (ADR-0061 điều 1 — bảng ord_manual_service_policy, migration 0052) ------------------------------------------

/** Dòng hiệu lực = valid_from_at lớn nhất ≤ ?1 (bây giờ); kèm valid_from_at lớn nhất của MỌI dòng (để dòng mới không lùi, không trùng). */
const MANUAL_POLICY_CURRENT = defineSql(
  "orders",
  "manual_policy_current",
  `SELECT (SELECT enabled FROM ord_manual_service_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1) AS enabled,
          (SELECT valid_from_at FROM ord_manual_service_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1) AS valid_from_at,
          (SELECT MAX(valid_from_at) FROM ord_manual_service_policy) AS latest_at`,
);
const MANUAL_POLICY_INSERT = defineSql(
  "orders",
  "manual_policy_insert",
  `INSERT INTO ord_manual_service_policy (id, enabled, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?3, ?4, ?3, ?4)`,
);
export interface ManualPolicy {
  /** Công tắc đang BẬT. Bảng rỗng / chưa có dòng hiệu lực ⇒ false (ADR-0061 A-8: không đoán "bật"). */
  bat: boolean;
  /** Mốc hiệu lực của dòng đang áp; null = chưa có dòng nào hiệu lực. */
  tuLuc: string | null;
  /** valid_from_at lớn nhất của mọi dòng (dòng mới phải ĐI SAU mốc này — không lùi, không trùng UNIQUE). */
  moiNhat: string | null;
}
/** Đọc MỘT lần mỗi request (ADR-0061 điều 3). */
export async function manualPolicy(db: D1Database, nowIso: string): Promise<ManualPolicy> {
  const r = await db.prepare(MANUAL_POLICY_CURRENT).bind(nowIso).first<{ enabled: number | null; valid_from_at: string | null; latest_at: string | null }>();
  return { bat: r?.enabled === 1, tuLuc: r?.valid_from_at ?? null, moiNhat: r?.latest_at ?? null };
}
/** Câu chèn dòng chính sách mới (chưa chạy) — nơi gọi ghép cùng câu nhật ký vào MỘT db.batch. */
export const manualPolicyInsert = (db: D1Database, id: string, bat: boolean, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(MANUAL_POLICY_INSERT).bind(id, bat ? 1 : 0, at, actorId);

// ---- Chính sách khung giờ đón (ADR-0134 Đ5, Đ6 — bảng ord_pickup_slot_policy, migration 0115; khuôn chính sách nhập tay ở trên) -------------------------

/** Dòng hiệu lực = valid_from_at lớn nhất ≤ ?1 (bây giờ); kèm valid_from_at lớn nhất của MỌI dòng (dòng mới không lùi, không trùng UNIQUE). */
const SLOT_POLICY_CURRENT = defineSql(
  "orders",
  "pickup_slot_policy_current",
  `SELECT p.slots_json, p.note, (SELECT MAX(valid_from_at) FROM ord_pickup_slot_policy) AS latest_at
   FROM ord_pickup_slot_policy p WHERE p.valid_from_at <= ?1 ORDER BY p.valid_from_at DESC LIMIT 1`,
);
const SLOT_POLICY_LATEST = defineSql("orders", "pickup_slot_policy_latest", `SELECT MAX(valid_from_at) AS latest_at FROM ord_pickup_slot_policy`);
const SLOT_POLICY_INSERT = defineSql(
  "orders",
  "pickup_slot_policy_insert",
  `INSERT INTO ord_pickup_slot_policy (id, slots_json, note, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5)`,
);
export interface SlotPolicyRow {
  /** Chuỗi JSON mảng khung đang hiệu lực (nơi gọi kiểm lại bằng `kiemDanhSachKhung`); null = chưa có dòng hiệu lực. */
  slotsJson: string | null;
  note: string | null;
  /** valid_from_at lớn nhất của mọi dòng (dòng mới phải ĐI SAU mốc này). */
  moiNhat: string | null;
}
/** Đọc MỘT lần mỗi request. */
export async function slotPolicy(db: D1Database, nowIso: string): Promise<SlotPolicyRow> {
  const r = await db.prepare(SLOT_POLICY_CURRENT).bind(nowIso).first<{ slots_json: string; note: string; latest_at: string | null }>();
  if (r) return { slotsJson: r.slots_json, note: r.note, moiNhat: r.latest_at };
  const l = await db.prepare(SLOT_POLICY_LATEST).first<{ latest_at: string | null }>();
  return { slotsJson: null, note: null, moiNhat: l?.latest_at ?? null };
}
/** Câu chèn dòng chính sách khung giờ mới (chưa chạy) — nơi gọi ghép cùng câu nhật ký vào MỘT db.batch. */
export const slotPolicyInsert = (db: D1Database, id: string, slotsJson: string, note: string, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(SLOT_POLICY_INSERT).bind(id, slotsJson, note, at, actorId);

// ---- Người đã lập đơn (ADR-0067 — bộ lọc danh sách đơn, ô "Người lập") ------------------------------------------------------------------------------
// Mọi người đã lập ít nhất một đơn (mọi trạng thái, kể cả nháp / huỷ), gồm người đã nghỉ và tài khoản Đối tác (chủ 30/9: "Hiện, không đánh dấu";
// "Chung, không nhãn"). Tên qua view công bố `v_stf_staff_label` (như "Người lập: …" của thẻ đơn); KHÔNG đọc cột `active` của view (không lộ ai đã
// nghỉ). Xếp theo đơn gần nhất (mới trước) rồi theo tên. Quét cả bảng `orders` (GROUP BY) — nơi gọi chỉ gọi MỘT lần khi mở bảng lọc. Nơi gọi PHẢI
// hỏi quyền "xem mọi đơn" trước (route `GET /api/orders/nguoi-lap`).
const NGUOI_DA_LAP_DON = defineSql(
  "orders",
  "nguoi_da_lap_don",
  `SELECT o.staff_id AS id, s.label AS ten, MAX(o.created_at) AS gan_nhat FROM orders o JOIN v_stf_staff_label s ON s.id = o.staff_id
   GROUP BY o.staff_id, s.label ORDER BY gan_nhat DESC, s.label`,
);
export interface NguoiDaLapDonRow {
  id: string;
  ten: string;
  /** Dấu thời gian ISO UTC của đơn gần nhất (nơi gọi đổi sang ngày giờ Việt Nam). */
  gan_nhat: string;
}
export async function nguoiDaLapDon(db: D1Database): Promise<NguoiDaLapDonRow[]> {
  return (await db.prepare(NGUOI_DA_LAP_DON).all<NguoiDaLapDonRow>()).results;
}

// ---- Trả sau: hai mốc hạn trả của đơn (ADR-0172 Đ3, ADR-0173 Đ1 mục 3; migration 0143) ------------------------------------------------------------

export interface DonTraSauMocRow {
  id: string; order_code: string; status: string; payment_term: "PREPAID" | "CREDIT"; booker_party_id: string | null; delivered_at: string | null; credit_due_at: string | null; credit_grace_until: string | null;
}
const ORDER_CREDIT_MOC = defineSql(
  "orders",
  "order_credit_moc",
  `SELECT id, order_code, status, payment_term, booker_party_id, delivered_at, credit_due_at, credit_grace_until FROM orders WHERE id = ?1`,
);
export const mocTraSauCuaDon = (db: D1Database, orderId: string): Promise<DonTraSauMocRow | null> => db.prepare(ORDER_CREDIT_MOC).bind(orderId).first<DonTraSauMocRow>();
/**
 * Lùi hạn trả (lệnh «Ân hạn»): ĐỨNG ĐẦU lô, chỉ áp khi hạn trả vẫn là số đã đọc (?6 — hai người bấm cùng lúc thì người sau 0 dòng). Cột ngày cũ ghi theo (lùi bản an toàn).
 * Trigger `orders_credit_due_forward_only` là lưới CSDL: hạn chỉ đi về sau, khoảng ân hạn giữ nguyên.
 */
const ORDER_CREDIT_EXTEND = defineSql(
  "orders",
  "order_credit_extend",
  `UPDATE orders SET credit_due_at = ?2, credit_grace_until = ?3, credit_due_date = ?4, updated_at = ?5
   WHERE id = ?1 AND credit_due_at = ?6 AND payment_term = 'CREDIT' AND status = 'confirmed'`,
);
export const noiHanTraSauStatement = (db: D1Database, v: { orderId: string; hanMoi: string; hetAnHanMoi: string; ngayMoi: string; at: string; hanCu: string }) =>
  db.prepare(ORDER_CREDIT_EXTEND).bind(v.orderId, v.hanMoi, v.hetAnHanMoi, v.ngayMoi, v.at, v.hanCu);

// ---- Phí đưa đón trên đơn (Đợt C, Task 3; ADR-0147, ADR-0203; migration 0169) ---------------------------------------------------------------------
// Dòng phí là dòng `order_item` loại `TRANSFER_FEE`: không dịch vụ, không danh mục; trỏ chặng; mang bản chụp mức (kiểu, số người chiều về; từ ADR-0214 nguồn CHON + kiểu chọn, trước đó mã mức, vùng, cấp).
// Chỉ ĐƠN NHÁP mới ghi / xoá dòng phí: điều kiện `status = 'draft'` nằm TRONG mọi câu (đơn đã xác nhận ⇒ câu không khớp dòng nào, không chạm trigger 0081).
// Câu tính lại tạm tính / tổng của đơn nháp sau khi đổi dòng phí ở lô sửa chặng nằm ở repository.ts (`cauTienNhapSauPhi` — ba cột cọc cũ chỉ được ghi ở đó, NT-R9).
// Không câu nào ở đây đọc `audit_log`: lính gác «lô này thắng» dùng hai cách không cần ngoại lệ DOC_AUDIT_LOG_WONGUARD —
//   (a) câu ĐỨNG TRƯỚC câu khoá lạc quan của lô (`*_truoc`): điều kiện = đúng mốc đã đọc (lô D1 chạy tuần tự, nguyên tử: lô nào chạy trước đổi mốc, lô sau 0 dòng);
//   (b) câu ĐỨNG SAU (`fee_item_insert`): có mặt một dòng id MỚI SINH của chính lô (dòng tiền dịch vụ vừa chèn, hoặc chặng vừa chèn) — dòng đó chỉ tồn tại khi lô thắng.

/** Nội dung một dòng phí (chưa có id dòng, id đơn, thứ tự) — `dongPhiThanhItem` (phi-don-don.ts) dựng từ mức văn phòng chọn (ADR-0214, nguồn CHON). */
export interface OrderItemRowPhiDon {
  legId: string;
  /** Nguồn mức (0173): 'CHON' = văn phòng chọn (ADR-0214); 'BANG_PHI' / null = bảng phí của Đợt C (dòng cũ). */
  feeSource: "BANG_PHI" | "CHON" | null;
  /** Kiểu chọn (0173, chỉ nguồn CHON): 'DANH_SACH' (đơn giá thuộc danh sách) hoặc 'SO_KHAC' (1–5.000.000 đ). */
  feeChoice: "DANH_SACH" | "SO_KHAC" | null;
  /** Mã mức của bảng phí; null với nguồn CHON (trigger 0173 bắt buộc). */
  feeRuleId: string | null;
  feeKind: "PER_PAX" | "PER_TRIP";
  /** Khu vực của bảng phí; null với nguồn CHON. */
  feeZoneCode: string | null;
  /** null = mức không có cấp (luôn null với nguồn CHON). */
  feeTierCode: string | null;
  /** Số người chiều về (`pax_override`) lúc tính; null = theo số khách của dịch vụ. */
  feeReturnPax: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
export type DongPhiGhi = OrderItemRowPhiDon & { id: string; orderId: string; sortOrder: number };
const FEE_COLS = "id, order_id, line_kind, transfer_leg_id, fee_rule_id, fee_kind, fee_zone_code, fee_tier_code, fee_return_pax, description, detail, quantity, unit_price, line_total, sort_order, fee_source, fee_choice";
const FEE_VALUES = "?1, ?2, 'TRANSFER_FEE', ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10, ?11, ?12, ?13, ?14, ?15";
const feeBinds = (d: DongPhiGhi) =>
  [d.id, d.orderId, d.legId, d.feeRuleId, d.feeKind, d.feeZoneCode, d.feeTierCode, d.feeReturnPax, d.description, d.quantity, d.unitPrice, d.lineTotal, d.sortOrder, d.feeSource, d.feeChoice];

/** (b) Chèn dòng phí SAU chặng của lô (khoá ngoại tới chặng): đơn còn nháp VÀ dòng id mới sinh ?16 của chính lô có mặt (dòng tiền dịch vụ hoặc chặng của đơn). */
const FEE_ITEM_INSERT = defineSql(
  "orders",
  "fee_item_insert",
  `INSERT INTO order_item (${FEE_COLS}) SELECT ${FEE_VALUES}
   WHERE EXISTS (SELECT 1 FROM orders WHERE id = ?2 AND status = 'draft')
     AND (EXISTS (SELECT 1 FROM order_item WHERE id = ?16 AND order_id = ?2) OR EXISTS (SELECT 1 FROM ord_transfer_leg WHERE id = ?16 AND order_id = ?2))`,
);
export const feeItemInsert = (db: D1Database, d: DongPhiGhi, idMoiCuaLo: string): D1PreparedStatement => db.prepare(FEE_ITEM_INSERT).bind(...feeBinds(d), idMoiCuaLo);

/**
 * (a) Lính gác của câu ĐỨNG TRƯỚC = ĐÚNG điều kiện của câu khoá lạc quan đi ngay sau trong lô (không câu nào ở giữa đổi đơn / chặng), nên câu này ghi ⇔ câu khoá lạc
 * quan thắng ⇔ câu tính lại tiền (gác `wonGuard`, ở repository.ts) chạy — tạm tính luôn khớp Σ dòng. Đơn còn nháp; `PUT /trip`: đúng mốc ĐƠN đã đọc (?moc, câu khoá
 * là `UPDATE orders … updated_at = ?`); `PUT /legs/:id` nhánh nháp: chặng còn mở, đúng mốc CHẶNG đã đọc (?mocChang, câu khoá là `leg_pax_override_checked`), ?moc trống.
 */
const GAC_TRUOC = (o: string, moc: string, chang: string, mocChang: string) =>
  `EXISTS (SELECT 1 FROM orders WHERE id = ${o} AND status = 'draft' AND (${moc} IS NULL OR updated_at = ${moc}))
   AND (${chang} IS NULL OR EXISTS (SELECT 1 FROM ord_transfer_leg WHERE id = ${chang} AND order_id = ${o} AND closed_at IS NULL AND updated_at = ${mocChang}))`;
export interface GacTruoc { orderId: string; mocDon: string | null; legId: string | null; mocChang: string | null }

const FEE_ITEMS_DELETE_TRUOC = defineSql(
  "orders",
  "fee_items_delete_truoc",
  `DELETE FROM order_item WHERE order_id = ?1 AND line_kind = 'TRANSFER_FEE' AND ${GAC_TRUOC("?1", "?2", "?3", "?4")}`,
);
export const feeItemsDeleteTruoc = (db: D1Database, g: GacTruoc): D1PreparedStatement => db.prepare(FEE_ITEMS_DELETE_TRUOC).bind(g.orderId, g.mocDon, g.legId, g.mocChang);

const FEE_ITEM_INSERT_TRUOC = defineSql(
  "orders",
  "fee_item_insert_truoc",
  `INSERT INTO order_item (${FEE_COLS}) SELECT ${FEE_VALUES} WHERE ${GAC_TRUOC("?2", "?16", "?17", "?18")}`,
);
export const feeItemInsertTruoc = (db: D1Database, d: DongPhiGhi, g: GacTruoc): D1PreparedStatement =>
  db.prepare(FEE_ITEM_INSERT_TRUOC).bind(...feeBinds(d), g.mocDon, g.legId, g.mocChang);

/** Dòng phí đã lưu của một đơn (cho `OrderDto.phiDuaDon`) — kèm chiều + dịch vụ của chặng và tên khu vực (view công bố của locations). */
const FEE_ROWS_BY_ORDER = defineSql(
  "orders",
  "fee_rows_by_order",
  `SELECT i.id, i.transfer_leg_id, l.order_service_id, l.direction, i.fee_kind, i.fee_zone_code, z.name AS zone_name, i.fee_tier_code, i.fee_return_pax,
     i.description, i.quantity, i.unit_price, i.line_total, i.fee_choice
   FROM order_item i JOIN ord_transfer_leg l ON l.id = i.transfer_leg_id LEFT JOIN v_loc_zone_label z ON z.code = i.fee_zone_code
   WHERE i.order_id = ?1 AND i.line_kind = 'TRANSFER_FEE' ORDER BY i.sort_order`,
);
export interface FeeRow {
  id: string; transfer_leg_id: string; order_service_id: string; direction: "OUT" | "RETURN"; fee_kind: "PER_PAX" | "PER_TRIP"; fee_zone_code: string | null; zone_name: string | null;
  fee_tier_code: string | null; fee_return_pax: number | null; description: string; quantity: number; unit_price: number; line_total: number;
  /** Kiểu chọn của dòng do văn phòng chọn (ADR-0214); null = dòng bảng phí cũ (trigger 0173: chỉ nguồn CHON mang kiểu chọn). */
  fee_choice: "DANH_SACH" | "SO_KHAC" | null;
}
export const feeRowsStatement = (db: D1Database, orderId: string): D1PreparedStatement => db.prepare(FEE_ROWS_BY_ORDER).bind(orderId);

/**
 * Dòng phí đã lưu của NHIỀU đơn, đủ để tính tiền hiệu lực (Đợt C, Task 5): dịch vụ của chặng, kiểu mức, số người chiều về ĐÃ CHỤP, số lượng, đơn giá, thành tiền. KHÔNG lọc chặng đã
 * đóng (phí đã chụp theo dòng, không theo chặng — chặng đóng sau xác nhận vẫn giữ dòng phí). Dùng cho phải thu / danh sách / Trang chủ (`getPhiChoHieuLuc`) và công nợ đại lý.
 */
const FEE_MONEY_MANY = defineSql(
  "orders",
  "fee_money_many",
  `SELECT i.order_id, l.order_service_id, i.fee_kind, i.fee_return_pax, i.description, i.quantity, i.unit_price, i.line_total
   FROM order_item i JOIN ord_transfer_leg l ON l.id = i.transfer_leg_id
   WHERE i.order_id IN (SELECT value FROM json_each(?1)) AND i.line_kind = 'TRANSFER_FEE' ORDER BY i.order_id, i.sort_order`,
);
/** `description` = tên dòng «Phí đưa đón — chiều đi/về, <khu vực>» đã lưu — phiếu công nợ in mỗi chặng một dòng với đúng tên này (ADR-0203 ĐB3, cùng tên với biên nhận). */
export interface FeeMoneyRow { order_id: string; order_service_id: string; fee_kind: "PER_PAX" | "PER_TRIP"; fee_return_pax: number | null; description: string; quantity: number; unit_price: number; line_total: number }
export async function dongPhiTienNhieuDon(db: D1Database, orderIds: readonly string[]): Promise<FeeMoneyRow[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(FEE_MONEY_MANY).bind(JSON.stringify([...new Set(orderIds)])).all<FeeMoneyRow>()).results;
}

/**
 * CÂU CHỐT của lô xác nhận có câu phí (Đợt C, Task 4; migration 0169 mục 5): chèn vào bảng đổ `ord_xac_nhan_phi_gac` — đơn đã 'confirmed' ⇒ trigger bỏ qua (không lưu dòng);
 * chưa ⇒ trigger ném `transfer_fee_confirm_lost` ⇒ CẢ lô lui, kể cả câu xoá / chèn dòng phí và câu tiền đứng TRƯỚC câu xác nhận. Phải đứng SAU chuỗi `changes() > 0` của
 * nhật ký `confirmed` và bản chụp (câu bị bỏ qua để lại `changes() = 0`) — `soanXacNhan` đặt nó CUỐI phần soạn.
 */
const ORDER_FEE_CONFIRM_LOCK = defineSql("orders", "order_fee_confirm_lock", `INSERT INTO ord_xac_nhan_phi_gac (order_id) VALUES (?1)`);
export const chotLoPhiDon = (db: D1Database, orderId: string): D1PreparedStatement => db.prepare(ORDER_FEE_CONFIRM_LOCK).bind(orderId);

// ---- ADR-0213 Đ8.4 (mốc B2 Task 16): nháp của thành viên «chờ người quản lý» — bảng chỉ thêm `ord_member_submit` (không thuộc XOA_CUNG_NHAP). Mọi câu ghi đứng SAU câu đẩy mốc đơn
// (`orderTouchDraft`) hoặc sau câu quyết của lô xác nhận, gác bằng điều kiện của chính orders (không đọc audit_log — không nới DOC_AUDIT_LOG_WONGUARD).
const TV_CHO_MO = defineSql("orders", "member_submit_open", "SELECT id, member_staff_id, org_party_id FROM ord_member_submit WHERE order_id = ?1 AND status = 'MO'");
export async function tvChoMo(db: D1Database, orderId: string): Promise<{ id: string; memberStaffId: string; orgPartyId: string } | null> {
  const r = await db.prepare(TV_CHO_MO).bind(orderId).first<{ id: string; member_staff_id: string; org_party_id: string }>();
  return r ? { id: r.id, memberStaffId: r.member_staff_id, orgPartyId: r.org_party_id } : null;
}
/** Thành viên «Gửi người quản lý xác nhận»: mở dòng CHỈ khi câu đẩy mốc đơn đứng ngay trước đã thắng (`changes() > 0`). Đã có dòng mở ⇒ UNIQUE chặn, cả lô rơi. ?1 id, ?2 đơn, ?3 thành viên, ?4 tổ chức, ?5 lúc */
const TV_MO = defineSql(
  "orders",
  "member_submit_open_guarded",
  `INSERT INTO ord_member_submit (id, order_id, member_staff_id, org_party_id, status, opened_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, 'MO', ?5, ?5, ?3, ?5, ?3 WHERE changes() > 0`,
);
export const tvMoStatement = (db: D1Database, v: { id: string; orderId: string; memberStaffId: string; orgPartyId: string; at: string }): D1PreparedStatement =>
  db.prepare(TV_MO).bind(v.id, v.orderId, v.memberStaffId, v.orgPartyId, v.at);
/** Đóng dòng đang mở (rút lại / trả lại) CHỈ khi câu đẩy mốc đơn đứng ngay trước đã thắng. ?1 đơn, ?2 trạng thái đích, ?3 lý do, ?4 lúc, ?5 người đóng */
const TV_DONG = defineSql(
  "orders",
  "member_submit_close_guarded",
  `UPDATE ord_member_submit SET status = ?2, reason_code = ?3, closed_at = ?4, closed_by = ?5, updated_at = ?4, updated_by = ?5
   WHERE order_id = ?1 AND status = 'MO' AND changes() > 0`,
);
export const tvDongStatement = (db: D1Database, v: { orderId: string; trangThai: "TRA_LAI" | "DA_RUT"; lyDo: string | null; at: string; by: string }): D1PreparedStatement =>
  db.prepare(TV_DONG).bind(v.orderId, v.trangThai, v.lyDo, v.at, v.by);
/**
 * Người quản lý GỬI LÊN Tour Đảo nháp của thành viên (Đ8.5). Gác bằng dấu của CHÍNH lô (vòng sửa 1, I-3 — không gác bằng «đơn đã xác nhận», vì lô thua cuộc đua cũng thấy điều đó):
 * - nhánh A (`tvGuiLenTheoYeuCau`): yêu cầu xác nhận của chính lô (?3 = mã yêu cầu sinh cho lô này) đã mở; nối CUỐI lô.
 * - nhánh B (`tvGuiLenTheoChuoi`): chuỗi `changes() > 0` nối từ câu xác nhận → nhật ký `confirmed` → bản chụp → nhật ký `order_terms_captured` (đặt ngay sau câu cuối của chuỗi đó).
 * (1) chế độ «Chỉ soạn» chưa có dòng mở ⇒ mở một dòng; (2) đóng dòng mở ⇒ DA_GUI_LEN. Nhật ký `order_member_forwarded` ngay sau với `changes() > 0`. Không đọc audit_log.
 * ?1 đơn, ?2 lúc, ?3 mã yêu cầu (chỉ nhánh A), ?4 người gửi, ?5 id dòng mới, ?6 thành viên, ?7 tổ chức
 */
const TV_YC = "EXISTS (SELECT 1 FROM ord_confirm_request y WHERE y.id = ?3 AND y.order_id = ?1)";
const TV_MO_KHI_GUI_YC = defineSql(
  "orders",
  "member_submit_open_on_forward",
  `INSERT INTO ord_member_submit (id, order_id, member_staff_id, org_party_id, status, opened_at, created_at, created_by, updated_at, updated_by)
   SELECT ?5, ?1, ?6, ?7, 'MO', ?2, ?2, ?4, ?2, ?4
   WHERE ${TV_YC} AND NOT EXISTS (SELECT 1 FROM ord_member_submit s WHERE s.order_id = ?1 AND s.status = 'MO')`,
);
const TV_GUI_LEN_YC = defineSql(
  "orders",
  "member_submit_forward",
  `UPDATE ord_member_submit SET status = 'DA_GUI_LEN', closed_at = ?2, closed_by = ?4, updated_at = ?2, updated_by = ?4
   WHERE order_id = ?1 AND status = 'MO' AND ${TV_YC}`,
);
export const tvGuiLenTheoYeuCau = (db: D1Database, v: { orderId: string; at: string; yeuCauId: string; by: string; memberStaffId: string; orgPartyId: string }): D1PreparedStatement[] => [
  db.prepare(TV_MO_KHI_GUI_YC).bind(v.orderId, v.at, v.yeuCauId, v.by, crypto.randomUUID(), v.memberStaffId, v.orgPartyId),
  db.prepare(TV_GUI_LEN_YC).bind(v.orderId, v.at, v.yeuCauId, v.by),
];
const TV_MO_KHI_GUI_CHUOI = defineSql(
  "orders",
  "member_submit_open_on_forward_chain",
  `INSERT INTO ord_member_submit (id, order_id, member_staff_id, org_party_id, status, opened_at, created_at, created_by, updated_at, updated_by)
   SELECT ?4, ?1, ?5, ?6, 'MO', ?2, ?2, ?3, ?2, ?3 WHERE changes() > 0`,
);
const TV_GUI_LEN_CHUOI = defineSql(
  "orders",
  "member_submit_forward_chain",
  `UPDATE ord_member_submit SET status = 'DA_GUI_LEN', closed_at = ?2, closed_by = ?3, updated_at = ?2, updated_by = ?3 WHERE order_id = ?1 AND status = 'MO' AND changes() > 0`,
);
/** `coDongMo` = lúc đọc đơn đã có dòng chờ mở («Soạn và gửi»); không ⇒ chèn rồi đóng (dòng chèn trong lô làm câu đóng khớp một dòng — chuỗi không đứt). */
export const tvGuiLenTheoChuoi = (db: D1Database, v: { orderId: string; at: string; by: string; memberStaffId: string; orgPartyId: string; coDongMo: boolean }): D1PreparedStatement[] => [
  ...(v.coDongMo ? [] : [db.prepare(TV_MO_KHI_GUI_CHUOI).bind(v.orderId, v.at, v.by, crypto.randomUUID(), v.memberStaffId, v.orgPartyId)]),
  db.prepare(TV_GUI_LEN_CHUOI).bind(v.orderId, v.at, v.by),
];

// ---- ADR-0213 Đ8 (mốc B2, Task 18 phần 1a): «Nháp chờ» trên màn tổ chức của người quản lý — CHỈ ỨNG VIÊN: nháp tư cách THÀNH VIÊN lúc lập (R10) có bên đặt là chính tổ chức ?1,
// không do người gọi ?2 lập. Câu KHÔNG quyết «ai thấy nháp nào» (chế độ, dòng chờ mở): nơi gọi lọc từng dòng bằng `quanLyThayNhapThanhVien` (src/shared/xem-don-nhap.ts — một nơi).
// Tên người lập qua view công bố `v_stf_staff_label`; ngày đi = dịch vụ đầu tiên theo `sort_order` (cùng quy ước `OrderSummaryTripDto`). Không tên / số điện thoại khách.
const NHAP_THANH_VIEN_CUA_TO_CHUC = defineSql(
  "orders",
  "member_drafts_of_org",
  `SELECT o.id, o.order_code, o.created_at, sl.label AS nguoi_lap,
          (SELECT s.depart_date FROM order_service s WHERE s.order_id = o.id ORDER BY s.sort_order LIMIT 1) AS ngay_di,
          EXISTS (SELECT 1 FROM ord_member_submit m WHERE m.order_id = o.id AND m.status = 'MO') AS cho_quan_ly,
          EXISTS (SELECT 1 FROM ord_confirm_request r WHERE r.order_id = o.id AND r.decided_at IS NULL) AS cho_van_phong
   FROM orders o JOIN v_stf_staff_label sl ON sl.id = o.staff_id
   WHERE o.status = 'draft' AND o.acting_link_kind = 'MEMBER' AND o.acting_party_id = ?1 AND o.booker_party_id = ?1 AND o.staff_id <> ?2
   ORDER BY o.created_at DESC`,
);
export interface NhapThanhVienRow { id: string; order_code: string; created_at: string; nguoi_lap: string; ngay_di: string | null; cho_quan_ly: number; cho_van_phong: number }
export async function nhapThanhVienCuaToChuc(db: D1Database, orgPartyId: string, nguoiGoi: string): Promise<NhapThanhVienRow[]> {
  return (await db.prepare(NHAP_THANH_VIEN_CUA_TO_CHUC).bind(orgPartyId, nguoiGoi).all<NhapThanhVienRow>()).results;
}

// ---- Kiểm toàn mốc B2 (I-B): mã lý do của lần «chờ người quản lý» GẦN NHẤT nếu lần đó là TRẢ LẠI (ADR-0213 Đ8.2 «trả lại kèm lý do») — cho khối `thanhVien` của NGƯỜI LẬP. ----
const TV_LY_DO_TRA_LAI_GAN_NHAT = defineSql(
  "orders",
  "member_submit_last_return_reason",
  `SELECT status, reason_code FROM ord_member_submit WHERE order_id = ?1 ORDER BY opened_at DESC, rowid DESC LIMIT 1`,
);
/** null = chưa từng gửi, hoặc lần gần nhất không phải trả lại (đang chờ, đã rút, đã gửi lên). */
export async function tvLyDoTraLaiGanNhat(db: D1Database, orderId: string): Promise<string | null> {
  const r = await db.prepare(TV_LY_DO_TRA_LAI_GAN_NHAT).bind(orderId).first<{ status: string; reason_code: string | null }>();
  return r && r.status === "TRA_LAI" ? r.reason_code : null;
}

// ---- ADR-0220 Đ5: đếm ĐƠN ĐÃ XÁC NHẬN có dịch vụ thuộc các mã ?1 với ngày khởi hành trong [?2, ?3] — chỉ con số, cho màn «Ngừng bán theo ngày» (qua gốc lắp ráp tiêm). ----
const CONFIRMED_COUNT_BY_CODE_DATE = defineSql(
  "orders",
  "confirmed_count_by_code_date",
  `SELECT COUNT(DISTINCT s.order_id) AS n FROM order_service s JOIN orders o ON o.id = s.order_id
   WHERE o.status = 'confirmed' AND s.catalog_code IN (SELECT value FROM json_each(?1)) AND s.depart_date >= ?2 AND s.depart_date <= ?3`,
);
export async function demDonXacNhanTheoMaVaNgay(db: D1Database, codes: readonly string[], tuNgay: string, denNgay: string): Promise<number> {
  if (codes.length === 0) return 0;
  return (await db.prepare(CONFIRMED_COUNT_BY_CODE_DATE).bind(JSON.stringify(codes), tuNgay, denNgay).first<{ n: number }>())?.n ?? 0;
}
