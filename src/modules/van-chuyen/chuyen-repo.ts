// SQL CHUYẾN XE của van-chuyen (ADR-0049 D1, D2; ADR-0050 VK1-A, VK1-B; kế hoạch mục 1.3–1.5, Task A13 / A15). Tệp thứ HAI của module nghiêm (STRICT —
// src/architecture.test.ts nạp và EXPLAIN từng câu; R-P4 (ii) đã thử thật "bài nhận hai tệp"). Mọi câu TĨNH qua defineSql, tham số ?N; import đuôi .ts.
// - Chỉ đọc bảng vc_ của mình và VIEW công bố: v_ord_leg_key / v_ord_order_flag (cờ chặng — lý do giữ cụ thể, I38), v_loc_location_label (tên điểm danh
//   mục), v_pty_party_label / v_pty_owner_company (tên chủ xe). Không đọc thẳng audit_log (lính gác lô = DẤU LỆNH `last_cmd_id` trên vc_trip — ADR-0049 D1);
//   riêng câu cổng của máy đồng bộ chuyến theo đơn (`TRIP_GATE_THEO_DON`, ADR-0104 Đ2.2) hỏi "câu cổng đơn đã thắng" qua view công bố v_aud_order_cmd (0089),
//   và câu đọc cam kết chặng qua v_ord_leg_commit (0089, phán quyết G10). Câu điểm dừng (`stops_by_trips`) đọc thêm v_loc_location_dia_chi (0091 — địa chỉ
//   điểm danh mục, CHỈ cho chuỗi đích "Chỉ đường" của DTO tài xế, ADR-0105).
// - Câu GHI sau câu cổng đều mang `EXISTS (SELECT 1 FROM vc_trip WHERE id = ?T AND last_cmd_id = ?cmd)` (bài thứ tự lô — Task A14). Mỗi suất MỘT câu INSERT
//   (trigger sức chứa theo dòng — kế hoạch mục 4 điểm 3). Không câu DELETE nào (không xoá cứng).
import { defineSql } from "../../shared/sql-registry.ts";
import type { ChuyenChoTin, HoiChuyenChoTin } from "../../shared/tin-chuyen.ts";

// ---- Đọc -------------------------------------------------------------------------------------------------------------------------------------------------------
export interface TripRow {
  id: string;
  code: string;
  vehicle_id: string;
  carrier_party_id: string;
  service_date: string;
  planned_start_ms: number;
  planned_end_ms: number;
  earliest_start_ms: number;
  rest_minutes_snapshot: number;
  rest_override_reason_code: string | null;
  status: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";
  departed_at: string | null;
  departed_ms: number | null;
  ended_at: string | null;
  ended_ms: number | null;
  cancel_reason_code: string | null;
  end_reason_code: string | null;
  version: number;
  last_cmd_id: string;
  updated_at: string;
  /** Tài xế ĐANG MỞ (dòng `vc_trip_driver` chưa đóng) — NULL = chưa có. */
  driver_party_id: string | null;
  /** ADR-0057 C2a: cờ xe thuê CHỤP lúc xếp / đổi xe (0073). */
  rented: 0 | 1;
  /** ADR-0057 C2: tuyến (nhãn tra giá thuê) — NULL = chưa chọn. */
  route_code: string | null;
  /** ADR-0057 C5: 1 = có SNAPSHOT / AGREED chưa đảo (cờ, KHÔNG số tiền — cùng truy vấn, không N+1). */
  co_nguon_gia: 0 | 1;
  /** ADR-0056 VK3-A (0077): lý do Quản trị phá lệ cam kết xe riêng / số chỗ (nhóm `PHA_LE`) — NULL = chưa phá lệ. */
  commitment_override_reason_code: string | null;
  /** ADR-0056 VK3-A (0077, C4): khoá tập vi phạm lúc phá lệ — CHỈ để so, không bao giờ vào DTO / nhật ký. */
  commitment_override_key: string | null;
}
const COT_CHUYEN = `t.id, t.code, t.vehicle_id, t.carrier_party_id, t.service_date, t.planned_start_ms, t.planned_end_ms, t.earliest_start_ms, t.rest_minutes_snapshot,
  t.rest_override_reason_code, t.status, t.departed_at, t.departed_ms, t.ended_at, t.ended_ms, t.cancel_reason_code, t.end_reason_code, t.version, t.last_cmd_id, t.updated_at,
  (SELECT d.driver_party_id FROM vc_trip_driver d WHERE d.trip_id = t.id AND d.valid_to_at IS NULL) AS driver_party_id, t.rented, t.route_code,
  EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = t.id AND l.kind IN ('SNAPSHOT', 'AGREED')
    AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id)) AS co_nguon_gia, t.commitment_override_reason_code, t.commitment_override_key`;
const TRIP_BY_ID = defineSql("van-chuyen", "trip_by_id", `SELECT ${COT_CHUYEN} FROM vc_trip t WHERE t.id = ?1`);
/** Chuyến của MỘT ngày chạy (lịch chung ngày D). */
const TRIPS_BY_DATE = defineSql("van-chuyen", "trips_by_date", `SELECT ${COT_CHUYEN} FROM vc_trip t WHERE t.service_date = ?1 ORDER BY t.planned_start_ms, t.code`);
/**
 * Chuyến chạm khung [?1, ?2) (ms) — cho trùng giờ (LC-03), khoảng nghỉ (CH-02), xe / tài xế đang chạy chuyến khác: mọi chuyến chưa huỷ có khoảng hiệu lực giao
 * khung, cộng mọi chuyến ĐANG CHẠY. Nơi gọi mở rộng khung ±1 ngày quanh chuyến đang xét.
 */
const TRIPS_TOUCHING = defineSql(
  "van-chuyen",
  "trips_touching",
  `SELECT ${COT_CHUYEN} FROM vc_trip t
   WHERE t.status = 'RUNNING' OR (t.status <> 'CANCELLED' AND t.planned_start_ms < ?2 AND COALESCE(t.ended_ms, t.planned_end_ms) > ?1)
   ORDER BY t.planned_start_ms, t.code`,
);
/**
 * Chuyến đã KẾT THÚC THẬT trong [?1, ?2] (ms, theo `ended_ms` — giờ xảy ra) — cho lệnh xuất bến và lý do giữ dự phóng: luật nghỉ (CH-02, ADR-0049 "từ giờ kết
 * thúc thật") và chống xuất bến trước khi chuyến trước kết thúc (ADR-0050) so giờ THẬT, nên khung KẾ HOẠCH ±1 ngày của `trips_touching` không đủ khi cửa sổ
 * xuất bến > 24 giờ (LC-20 cho tới 48 giờ). Nơi gọi lọc cùng xe / cùng tài xế.
 */
const TRIPS_ENDED_BETWEEN = defineSql(
  "van-chuyen",
  "trips_ended_between",
  `SELECT ${COT_CHUYEN} FROM vc_trip t
   WHERE t.status IN ('ENDED', 'ENDED_INTERRUPTED') AND t.ended_ms >= ?1 AND t.ended_ms <= ?2
   ORDER BY t.planned_start_ms, t.code`,
);
/** Số chuyến đã có của một ngày chạy (đặt mã CX-DDMM-NN). */
const TRIP_COUNT_BY_DATE = defineSql("van-chuyen", "trip_count_by_date", "SELECT count(*) AS n FROM vc_trip WHERE service_date = ?1");
/**
 * Sự kiện của lệnh lặp (LC-11): cùng request_id → 200 kết quả hiện tại — CHỈ khi sự kiện khớp chuyến + loại (+ suất / điểm) của lệnh đang gửi (C38;
 * `traLenhLap` / `chayLo` ở dieu-phoi-route.ts so), lệch → 409 `request_id_reused`.
 */
const EVENT_BY_REQUEST = defineSql(
  "van-chuyen",
  "event_by_request",
  "SELECT id, trip_id, related_trip_id, kind, stop_id, allocation_id FROM vc_trip_event WHERE request_id = ?1",
);

export async function tripById(db: D1Database, id: string): Promise<TripRow | null> {
  return db.prepare(TRIP_BY_ID).bind(id).first<TripRow>();
}
export async function tripsByDate(db: D1Database, ngay: string): Promise<TripRow[]> {
  return (await db.prepare(TRIPS_BY_DATE).bind(ngay).all<TripRow>()).results;
}
export async function tripsTouching(db: D1Database, tuMs: number, denMs: number): Promise<TripRow[]> {
  return (await db.prepare(TRIPS_TOUCHING).bind(tuMs, denMs).all<TripRow>()).results;
}
export async function tripsEndedBetween(db: D1Database, tuMs: number, denMs: number): Promise<TripRow[]> {
  return (await db.prepare(TRIPS_ENDED_BETWEEN).bind(tuMs, denMs).all<TripRow>()).results;
}
export async function tripCountByDate(db: D1Database, ngay: string): Promise<number> {
  return (await db.prepare(TRIP_COUNT_BY_DATE).bind(ngay).first<{ n: number }>())?.n ?? 0;
}
/** Một dòng `vc_trip_event` tra theo request_id (đủ để so với lệnh đang gửi — C38). */
export interface SuKienYeuCauRow {
  id: string;
  trip_id: string;
  related_trip_id: string | null;
  kind: string;
  stop_id: string | null;
  allocation_id: string | null;
}
export async function eventByRequest(db: D1Database, requestId: string): Promise<SuKienYeuCauRow | null> {
  return db.prepare(EVENT_BY_REQUEST).bind(requestId).first<SuKienYeuCauRow>();
}

export interface StopRow {
  id: string;
  trip_id: string;
  seq: number;
  kind: "PICKUP" | "DROPOFF";
  location_id: string | null;
  place_text: string | null;
  /** Khoá so sánh nơi — CHỈ để so; không bao giờ vào DTO / nhật ký (ADR-0050 VK1-B). */
  place_key: string;
  /** Tên điểm danh mục (view công bố của locations) hoặc NULL (chữ tự do — dùng place_text đã che). */
  location_name: string | null;
  /** ADR-0105: địa chỉ điểm danh mục (view v_loc_location_dia_chi) — CHỈ cho chuỗi đích chỉ đường của DTO tài xế; NULL với chữ tự do / chưa nhập. Không vào DTO văn phòng. */
  location_address: string | null;
  planned_date: string | null;
  planned_time: string | null;
  status: "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED";
  arrived_at: string | null;
  done_at: string | null;
  skip_reason_code: string | null;
  /** Đợt 5 D5.1: 1 = văn phòng thêm khi xe đang chạy. */
  added_while_running: number;
}
const STOPS_BY_TRIPS = defineSql(
  "van-chuyen",
  "stops_by_trips",
  `SELECT s.id, s.trip_id, s.seq, s.kind, s.location_id, s.place_text, s.place_key, l.name AS location_name, d.address AS location_address, s.planned_date,
          s.planned_time, s.status, s.arrived_at, s.done_at, s.skip_reason_code, s.added_while_running
   FROM vc_trip_stop s LEFT JOIN v_loc_location_label l ON l.id = s.location_id LEFT JOIN v_loc_location_dia_chi d ON d.id = s.location_id
   WHERE s.trip_id IN (SELECT value FROM json_each(?1))
   ORDER BY s.trip_id, s.seq, s.created_at, s.id`,
);
export async function stopsByTrips(db: D1Database, tripIds: readonly string[]): Promise<StopRow[]> {
  if (tripIds.length === 0) return [];
  return (await db.prepare(STOPS_BY_TRIPS).bind(JSON.stringify(tripIds)).all<StopRow>()).results;
}

export interface AllocRow {
  id: string;
  trip_id: string;
  kind: "PASSENGER" | "CREW";
  leg_id: string | null;
  passenger_key: string | null;
  crew_party_id: string | null;
  board_stop_id: string | null;
  alight_stop_id: string | null;
  status: "WAITING" | "BOARDED" | "NO_SHOW" | "CANCELLED_AT_STOP" | "DROPPED";
  valid_from_at: string;
  valid_to_at: string | null;
  close_reason: string | null;
  /** Đợt 5 D5.2: văn phòng báo huỷ (giờ + mã lý do; người bấm KHÔNG đọc ra DTO). */
  office_cancel_at: string | null;
  office_cancel_reason_code: string | null;
}
const COT_SUAT =
  "a.id, a.trip_id, a.kind, a.leg_id, a.passenger_key, a.crew_party_id, a.board_stop_id, a.alight_stop_id, a.status, a.valid_from_at, a.valid_to_at, a.close_reason, a.office_cancel_at, a.office_cancel_reason_code";
const ALLOCS_BY_TRIPS = defineSql(
  "van-chuyen",
  "allocs_by_trips",
  `SELECT ${COT_SUAT} FROM vc_trip_allocation a WHERE a.trip_id IN (SELECT value FROM json_each(?1)) ORDER BY a.trip_id, a.valid_from_at, a.id`,
);
/** Suất ĐANG MỞ của các chặng (mọi chuyến) — L-D1, LC-01 theo tên, đủ / thiếu / thừa suất. */
const ALLOCS_OPEN_BY_LEGS = defineSql(
  "van-chuyen",
  "allocs_open_by_legs",
  `SELECT ${COT_SUAT} FROM vc_trip_allocation a WHERE a.valid_to_at IS NULL AND a.leg_id IN (SELECT value FROM json_each(?1)) ORDER BY a.trip_id, a.id`,
);
export async function allocsByTrips(db: D1Database, tripIds: readonly string[]): Promise<AllocRow[]> {
  if (tripIds.length === 0) return [];
  return (await db.prepare(ALLOCS_BY_TRIPS).bind(JSON.stringify(tripIds)).all<AllocRow>()).results;
}
export async function allocsOpenByLegs(db: D1Database, legIds: readonly string[]): Promise<AllocRow[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(ALLOCS_OPEN_BY_LEGS).bind(JSON.stringify(legIds)).all<AllocRow>()).results;
}

export interface EventRow {
  id: string;
  trip_id: string;
  related_trip_id: string | null;
  kind: string;
  stop_id: string | null;
  allocation_id: string | null;
  count: number | null;
  decided_mode: "NGUOI" | "MAY";
  override_rule_code: string | null;
  override_reason_code: string | null;
  occurred_at: string;
  occurred_ms: number;
  occurred_source: "MAY_CHU" | "VAN_PHONG_KHAI";
  created_at: string;
  created_by: string | null;
}
/** Sự kiện CỦA chuyến (kể cả sự kiện dời khách VÀO chuyến — `related_trip_id`; GA-35, cùng tập với trigger vc_trip_departed_after_plan). */
const EVENTS_BY_TRIPS = defineSql(
  "van-chuyen",
  "events_by_trips",
  `SELECT e.id, e.trip_id, e.related_trip_id, e.kind, e.stop_id, e.allocation_id, e.count, e.decided_mode, e.override_rule_code, e.override_reason_code, e.occurred_at,
          e.occurred_ms, e.occurred_source, e.created_at, e.created_by
   FROM vc_trip_event e
   WHERE e.trip_id IN (SELECT value FROM json_each(?1)) OR e.related_trip_id IN (SELECT value FROM json_each(?1))
   ORDER BY e.created_at, e.id`,
);
export async function eventsByTrips(db: D1Database, tripIds: readonly string[]): Promise<EventRow[]> {
  if (tripIds.length === 0) return [];
  return (await db.prepare(EVENTS_BY_TRIPS).bind(JSON.stringify(tripIds)).all<EventRow>()).results;
}

/** Cờ của chặng qua VIEW công bố của orders (I38 — lý do giữ cụ thể cho chặng rơi khỏi `lichChungChang`). */
export interface LegFlagRow { id: string; order_id: string; order_code: string | null; is_open: number; is_confirmed: number; is_cancelled: number }
const LEG_FLAGS = defineSql(
  "van-chuyen",
  "leg_flags",
  `SELECT k.id, k.order_id, o.order_code, k.is_open, f.is_confirmed, f.is_cancelled
   FROM v_ord_leg_key k JOIN v_ord_order_flag f ON f.id = k.order_id LEFT JOIN v_ord_order_label o ON o.id = k.order_id
   WHERE k.id IN (SELECT value FROM json_each(?1))`,
);
export async function legFlags(db: D1Database, legIds: readonly string[]): Promise<LegFlagRow[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(LEG_FLAGS).bind(JSON.stringify(legIds)).all<LegFlagRow>()).results;
}

// ---- Đọc của máy ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2; gốc lắp ráp gọi — người sửa đơn có thể KHÔNG có trip.view: không câu nào trả dữ liệu ra ngoài) ----
/** Mọi chặng của MỘT đơn (kể cả chặng đã đóng) + mã đơn — qua view công bố của orders. */
const CHANG_CUA_DON_DONG_BO = defineSql(
  "van-chuyen",
  "chang_cua_don_dong_bo",
  `SELECT k.id, k.order_id, o.order_code, k.is_open FROM v_ord_leg_key k LEFT JOIN v_ord_order_label o ON o.id = k.order_id WHERE k.order_id = ?1 ORDER BY k.id`,
);
export async function changCuaDonDongBo(db: D1Database, orderId: string): Promise<{ id: string; order_id: string; order_code: string | null; is_open: number }[]> {
  return (await db.prepare(CHANG_CUA_DON_DONG_BO).bind(orderId).all<{ id: string; order_id: string; order_code: string | null; is_open: number }>()).results;
}
/** Khoá người HIỆN HÀNH của đơn (view công bố — cùng nguồn trigger LC-10). Không tên. */
const NGUOI_CUA_DON = defineSql(
  "van-chuyen",
  "nguoi_cua_don",
  "SELECT person_key FROM v_ord_passenger_key WHERE order_id = ?1 AND has_current_row = 1 ORDER BY person_key",
);
export async function nguoiCuaDon(db: D1Database, orderId: string): Promise<string[]> {
  return (await db.prepare(NGUOI_CUA_DON).bind(orderId).all<{ person_key: string }>()).results.map((r) => r.person_key);
}
/** Bốn cột cam kết của các chặng (0089 `v_ord_leg_commit` — phán quyết G10) + mã đơn (nhãn lý do cam kết). */
const CAM_KET_CHANG = defineSql(
  "van-chuyen",
  "cam_ket_chang",
  `SELECT c.id, c.order_id, o.order_code, c.exclusive_vehicle, c.min_vehicle_seats
   FROM v_ord_leg_commit c LEFT JOIN v_ord_order_label o ON o.id = c.order_id WHERE c.id IN (SELECT value FROM json_each(?1))`,
);
export async function camKetChang(db: D1Database, legIds: readonly string[]): Promise<{ id: string; order_id: string; order_code: string | null; exclusive_vehicle: number; min_vehicle_seats: number | null }[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(CAM_KET_CHANG).bind(JSON.stringify(legIds)).all<{ id: string; order_id: string; order_code: string | null; exclusive_vehicle: number; min_vehicle_seats: number | null }>()).results;
}
/** Chuyến theo danh sách id. */
const TRIPS_BY_IDS = defineSql("van-chuyen", "trips_by_ids", `SELECT ${COT_CHUYEN} FROM vc_trip t WHERE t.id IN (SELECT value FROM json_each(?1)) ORDER BY t.code, t.id`);
export async function tripsByIds(db: D1Database, ids: readonly string[]): Promise<TripRow[]> {
  if (ids.length === 0) return [];
  return (await db.prepare(TRIPS_BY_IDS).bind(JSON.stringify(ids)).all<TripRow>()).results;
}

/** Xe chưa ngừng + chủ (tên, cờ công ty chủ hiện tại) — danh sách chọn xe của văn phòng và dữ liệu vào luật thuần. */
export interface XeDieuPhoiRow {
  id: string;
  plate_number: string;
  passenger_capacity: number;
  status: "active" | "maintenance" | "retired";
  owner_party_id: string;
  owner_name: string;
  owner_is_company: number;
}
const COT_XE_DP = `v.id, v.plate_number, v.passenger_capacity, v.status, v.owner_party_id, COALESCE(l.display_name, '') AS owner_name, (oc.party_id IS NOT NULL) AS owner_is_company`;
const TU_XE_DP = "vc_vehicle v LEFT JOIN v_pty_party_label l ON l.id = v.owner_party_id LEFT JOIN v_pty_owner_company oc ON oc.party_id = v.owner_party_id";
const XE_DIEU_PHOI = defineSql("van-chuyen", "xe_dieu_phoi", `SELECT ${COT_XE_DP} FROM ${TU_XE_DP} WHERE v.status <> 'retired' ORDER BY v.plate_key, v.id`);
const XE_THEO_ID = defineSql("van-chuyen", "xe_theo_id", `SELECT ${COT_XE_DP} FROM ${TU_XE_DP} WHERE v.id IN (SELECT value FROM json_each(?1))`);
export async function xeDieuPhoi(db: D1Database): Promise<XeDieuPhoiRow[]> {
  return (await db.prepare(XE_DIEU_PHOI).all<XeDieuPhoiRow>()).results;
}
export async function xeTheoId(db: D1Database, ids: readonly string[]): Promise<XeDieuPhoiRow[]> {
  if (ids.length === 0) return [];
  return (await db.prepare(XE_THEO_ID).bind(JSON.stringify(ids)).all<XeDieuPhoiRow>()).results;
}
/** Giấy tờ HIỆN HÀNH của các xe (không số — luật chỉ cần loại, hạn). Cùng định nghĩa "hiện hành" với repository.ts (HIEN_HANH). */
const GIAY_TO_XE_HIEN_HANH = defineSql(
  "van-chuyen",
  "giay_to_xe_hien_hanh",
  `SELECT d.id, d.vehicle_id, d.document_type_code, d.expiry_date FROM vc_vehicle_document d
   WHERE d.vehicle_id IN (SELECT value FROM json_each(?1))
     AND d.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM vc_vehicle_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)`,
);
export async function giayToXeHienHanh(db: D1Database, vehicleIds: readonly string[]): Promise<{ id: string; vehicle_id: string; document_type_code: string; expiry_date: string | null }[]> {
  if (vehicleIds.length === 0) return [];
  return (await db.prepare(GIAY_TO_XE_HIEN_HANH).bind(JSON.stringify(vehicleIds)).all<{ id: string; vehicle_id: string; document_type_code: string; expiry_date: string | null }>()).results;
}
/** Dòng hạng bằng ĐANG HIỆU LỰC của MỌI hạng (valid_from_at mới nhất ≤ ?1). */
const HANG_BANG_HIEN_HANH = defineSql(
  "van-chuyen",
  "hang_bang_hien_hanh",
  `SELECT c.license_class_code, c.max_passengers FROM vc_license_capacity c
   WHERE c.valid_from_at <= ?1 AND NOT EXISTS (SELECT 1 FROM vc_license_capacity n WHERE n.license_class_code = c.license_class_code AND n.valid_from_at <= ?1 AND n.valid_from_at > c.valid_from_at)`,
);
export async function hangBangHienHanh(db: D1Database, nowIso: string): Promise<{ license_class_code: string; max_passengers: number | null }[]> {
  return (await db.prepare(HANG_BANG_HIEN_HANH).bind(nowIso).all<{ license_class_code: string; max_passengers: number | null }>()).results;
}
/** Điều kiện xuất bến ĐANG HIỆU LỰC (valid_from_at ≤ ?1 và chưa đóng hoặc đóng sau ?1). */
const DIEU_KIEN_HIEN_HANH = defineSql(
  "van-chuyen",
  "dieu_kien_hien_hanh",
  `SELECT id, min_capacity, subject, vehicle_document_type_code, person_document_type_code FROM vc_departure_rule
   WHERE valid_from_at <= ?1 AND (valid_to_at IS NULL OR valid_to_at > ?1) ORDER BY min_capacity, id`,
);
export async function dieuKienHienHanh(db: D1Database, nowIso: string): Promise<{ id: string; min_capacity: number; subject: "VEHICLE" | "DRIVER"; vehicle_document_type_code: string | null; person_document_type_code: string | null }[]> {
  return (await db.prepare(DIEU_KIEN_HIEN_HANH).bind(nowIso).all<{ id: string; min_capacity: number; subject: "VEHICLE" | "DRIVER"; vehicle_document_type_code: string | null; person_document_type_code: string | null }>()).results;
}
/** Lý do ĐANG DÙNG (mã + nhãn + nhóm) — đi kèm phản hồi lịch / chi tiết chuyến (I5). */
const LY_DO_DANG_DUNG = defineSql("van-chuyen", "ly_do_dang_dung", "SELECT code, reason_group, label FROM vc_reason WHERE active = 1 ORDER BY reason_group, sort_order, code");
export async function lyDoDangDung(db: D1Database): Promise<{ code: string; reason_group: string; label: string }[]> {
  return (await db.prepare(LY_DO_DANG_DUNG).all<{ code: string; reason_group: string; label: string }>()).results;
}
// Lời chủ 2026-10-01: TÊN người đi kèm (suất CREW) của một chuyến — qua view công bố v_pty_party_label (cạnh van-chuyen → parties đã khai). Chỉ tên.
const TEN_NGUOI_DI_KEM = defineSql(
  "van-chuyen",
  "ten_nguoi_di_kem",
  `SELECT l.id, l.display_name FROM v_pty_party_label l
   WHERE l.id IN (SELECT a.crew_party_id FROM vc_trip_allocation a WHERE a.trip_id = ?1 AND a.kind = 'CREW')`,
);
export async function tenNguoiDiKem(db: D1Database, tripId: string): Promise<Map<string, string>> {
  return new Map((await db.prepare(TEN_NGUOI_DI_KEM).bind(tripId).all<{ id: string; display_name: string }>()).results.map((x) => [x.id, x.display_name]));
}
/** Tên điểm danh mục (view công bố của locations) — nhãn nơi trong nhật ký `trip_stops_synced` (ADR-0050: tên danh mục hoặc "nơi tự do"). */
const TEN_DIEM = defineSql("van-chuyen", "ten_diem", "SELECT id, name FROM v_loc_location_label WHERE id IN (SELECT value FROM json_each(?1))");
export async function tenDiem(db: D1Database, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  return new Map((await db.prepare(TEN_DIEM).bind(JSON.stringify(ids)).all<{ id: string; name: string }>()).results.map((r) => [r.id, r.name]));
}

/** Bản chụp điều kiện xuất bến MỚI NHẤT của chuyến (ĐẠT) + dòng con + số dòng bản chốt — DTO chi tiết chuyến (không số giấy tờ). */
export interface BanChupRow { id: string; ket_qua: "DAT" | "KHONG_DAT"; plate_number: string; passenger_capacity: number; rest_minutes_used: number; checked_at: string; so_chot: number }
const BAN_CHUP_CUOI = defineSql(
  "van-chuyen",
  "ban_chup_cuoi",
  `SELECT c.id, c.ket_qua, c.plate_number, c.passenger_capacity, c.rest_minutes_used, c.checked_at,
          (SELECT count(*) FROM vc_trip_manifest m WHERE m.check_id = c.id) AS so_chot
   FROM vc_trip_departure_check c WHERE c.trip_id = ?1 ORDER BY c.checked_at DESC, c.id DESC LIMIT 1`,
);
const BAN_CHUP_MUC = defineSql(
  "van-chuyen",
  "ban_chup_muc",
  "SELECT item_kind, document_type_code, license_class_code, expiry_date FROM vc_trip_departure_check_item WHERE check_id = ?1 ORDER BY item_kind, document_type_code, id",
);
export async function banChupCuoi(db: D1Database, tripId: string): Promise<{ chup: BanChupRow; muc: { item_kind: string; document_type_code: string | null; license_class_code: string | null; expiry_date: string | null }[] } | null> {
  const chup = await db.prepare(BAN_CHUP_CUOI).bind(tripId).first<BanChupRow>();
  if (!chup) return null;
  return { chup, muc: (await db.prepare(BAN_CHUP_MUC).bind(chup.id).all<{ item_kind: string; document_type_code: string | null; license_class_code: string | null; expiry_date: string | null }>()).results };
}

// ---- Ghi (câu cổng + câu có lính gác dấu lệnh) -------------------------------------------------------------------------------------------------------------
/**
 * Tạo chuyến — CHÍNH câu INSERT là câu cổng (đặt last_cmd_id). ?1 id, ?2 mã, ?3 xe, ?4 chủ xe chụp, ?5 ngày chạy, ?6 bắt đầu, ?7 kết thúc, ?8 nghỉ chụp, ?9 phá lệ nghỉ,
 * ?10 dấu lệnh, ?11 lúc, ?12 người, ?13 cờ xe thuê (ADR-0057 C2a — `phanLoaiThue`; trigger vc_trip_rented_ins giữ khớp), ?14 tuyến.
 */
export const TRIP_INSERT = defineSql(
  "van-chuyen",
  "trip_insert",
  `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, rest_override_reason_code,
     status, version, last_cmd_id, created_at, created_by, updated_at, updated_by, rented, route_code)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?8, ?9, 'PLANNED', 1, ?10, ?11, ?12, ?11, ?12, ?13, ?14)`,
);
/** Câu cổng lệnh KẾ HOẠCH: version đúng + còn PLANNED → tăng version, đặt dấu lệnh. ?1 chuyến, ?2 version đã đọc, ?3 dấu lệnh, ?4 lúc, ?5 người. */
export const TRIP_GATE = defineSql(
  "van-chuyen",
  "trip_gate",
  "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND version = ?2 AND status = 'PLANNED'",
);
/**
 * Câu cổng của MỘT khúc chuyến trong lô ĐỒNG BỘ THEO ĐƠN (ADR-0104 Đ2.2, Đ2.3): như TRIP_GATE + "câu cổng đơn đứng trước trong CÙNG lô đã thắng" — dòng
 * nhật ký ?6 của ĐÚNG đơn ?7 có trong v_aud_order_cmd (đơn thua lặng lẽ thì không có dòng ⇒ cổng chuyến thua theo, không câu chuyến nào chạy). Điều kiện
 * `order_id` chặn truyền nhầm mã nhật ký của đơn khác. ?1 chuyến, ?2 version đã đọc, ?3 dấu lệnh của khúc, ?4 lúc, ?5 người sửa đơn, ?6 id nhật ký đơn, ?7 đơn.
 */
export const TRIP_GATE_THEO_DON = defineSql(
  "van-chuyen",
  "trip_gate_theo_don",
  `UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND version = ?2 AND status = 'PLANNED' AND EXISTS (SELECT 1 FROM v_aud_order_cmd WHERE id = ?6 AND order_id = ?7)`,
);
/**
 * Câu cổng lệnh KẾ HOẠCH có chạm CHI PHÍ chuyến xe thuê (ADR-0057 C4 — sửa, huỷ; kế hoạch Đợt 4 TC-8): như TRIP_GATE + "số dòng chi phí của chuyến vẫn bằng ?6 đã
 * đọc" (đếm MỌI dòng, lúc cổng — trước khi lô chèn gì). Có dòng chen giữa lúc đọc và lúc ghi ⇒ cổng 0 dòng ⇒ cả lô thua (409), không bao giờ "đảo một nửa".
 */
export const TRIP_GATE_CHI_PHI = defineSql(
  "van-chuyen",
  "trip_gate_chi_phi",
  `UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND version = ?2 AND status = 'PLANNED' AND (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?1) = ?6`,
);
/**
 * Câu cổng THỨ HAI của lệnh chạm hai chuyến (dời — cổng đôi, [TK] §3.3): chỉ thắng khi câu cổng thứ nhất (chuyến nguồn) đã mang CHÍNH dấu lệnh này — không
 * bao giờ có nửa lô. ?1 chuyến đích, ?2 version đích, ?3 dấu lệnh, ?4 lúc, ?5 người, ?6 chuyến nguồn.
 */
export const TRIP_GATE_DOI = defineSql(
  "van-chuyen",
  "trip_gate_doi",
  `UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND version = ?2 AND status = 'PLANNED' AND EXISTS (SELECT 1 FROM vc_trip s WHERE s.id = ?6 AND s.last_cmd_id = ?3)`,
);
/**
 * Sự kiện của lệnh (id = dấu lệnh = id nhật ký). ?1 id, ?2 chuyến, ?3 chuyến liên quan, ?4 loại, ?5 điểm, ?6 suất, ?7 số người, ?8 request_id, ?9 client_at,
 * ?10 cách quyết, ?11 luật phá lệ, ?12 lý do phá lệ, ?13 chính sách, ?14 giờ xảy ra (chuỗi), ?15 giờ xảy ra (ms), ?16 nguồn, ?17 lúc ghi, ?18 người.
 * Lính gác: chuyến ?2 mang dấu lệnh ?1.
 */
export const EVENT_INSERT = defineSql(
  "van-chuyen",
  "event_insert",
  `INSERT INTO vc_trip_event (id, trip_id, related_trip_id, kind, stop_id, allocation_id, count, request_id, client_at, decided_mode, override_rule_code, override_reason_code,
     policy_id, occurred_at, occurred_ms, occurred_source, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?17, ?18
   WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?1)`,
);
/**
 * Sửa kế hoạch chuyến (xe, chủ xe chụp, giờ, khoá dính, phá lệ nghỉ, cờ xe thuê, tuyến, khoảng nghỉ chụp). ?1 chuyến, ?2 dấu lệnh, ?3 xe, ?4 chủ xe, ?5 ngày chạy,
 * ?6 bắt đầu, ?7 kết thúc, ?8 giờ sớm nhất (do `batDauSomNhatSauDoiGio` tính — R-P7), ?9 phá lệ nghỉ, ?10 lúc, ?11 người, ?12 cờ xe thuê (ADR-0057 C2a — chỉ tính
 * lại khi đổi xe; trigger vc_trip_rented_* giữ), ?13 tuyến, ?14 khoảng nghỉ chụp (N3 — chụp lại khi lệnh đổi giờ / xe / tài xế, không thì số cũ).
 */
export const TRIP_UPDATE_PLAN = defineSql(
  "van-chuyen",
  "trip_update_plan",
  `UPDATE vc_trip SET vehicle_id = ?3, carrier_party_id = ?4, service_date = ?5, planned_start_ms = ?6, planned_end_ms = ?7, earliest_start_ms = ?8,
     rest_override_reason_code = ?9, updated_at = ?10, updated_by = ?11, rented = ?12, route_code = ?13, rest_minutes_snapshot = ?14
   WHERE id = ?1 AND last_cmd_id = ?2`,
);
/**
 * ADR-0056 VK3-A (Đợt 7 Task 4): ghi (Quản trị / Toàn quyền phá lệ — lý do + khoá) hoặc xoá về NULL (lệnh kiểm thấy hết vi phạm) cột phá lệ cam kết của chuyến
 * ?1. Gác: chuyến ?5 mang dấu lệnh ?2 (lệnh dời: ?5 = chuyến ĐÍCH, ?1 có thể là chuyến NGUỒN — cổng nguồn cũng đã mang cùng dấu lệnh). ?3 lý do, ?4 khoá —
 * đi CẶP (CHECK của 0077). Khoá chỉ để so, không bao giờ vào DTO / nhật ký (kế hoạch C4).
 */
export const TRIP_CAM_KET_PHA_LE = defineSql(
  "van-chuyen",
  "trip_cam_ket_pha_le",
  `UPDATE vc_trip SET commitment_override_reason_code = ?3, commitment_override_key = ?4
   WHERE id = ?1 AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?5 AND last_cmd_id = ?2)`,
);
/** Huỷ chuyến — câu TRẠNG THÁI CUỐI (đứng cuối lô). ?1 chuyến, ?2 dấu lệnh, ?3 lý do, ?4 lúc, ?5 người. */
export const TRIP_CANCEL = defineSql(
  "van-chuyen",
  "trip_cancel",
  "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND last_cmd_id = ?2",
);
/** Mở dòng tài xế. ?1 id, ?2 chuyến, ?3 tài xế, ?4 dấu lệnh, ?5 lúc, ?6 người. */
export const DRIVER_INSERT = defineSql(
  "van-chuyen",
  "driver_insert",
  `INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?5, ?5, ?6, ?5, ?6 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?4)`,
);
/** Đóng dòng tài xế đang mở. ?1 chuyến, ?2 dấu lệnh, ?3 lý do đóng, ?4 lúc, ?5 người. */
export const DRIVER_CLOSE = defineSql(
  "van-chuyen",
  "driver_close",
  `UPDATE vc_trip_driver SET valid_to_at = ?4, close_reason = ?3, closed_by = ?5, updated_at = ?4, updated_by = ?5
   WHERE trip_id = ?1 AND valid_to_at IS NULL AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?1 AND last_cmd_id = ?2)`,
);
/**
 * Thêm điểm dừng. ?1 id, ?2 chuyến, ?3 thứ tự, ?4 loại, ?5 điểm danh mục, ?6 chữ tự do (đã che), ?7 khoá nơi, ?8 dấu lệnh, ?9 lúc, ?10 người, ?11 cờ thêm khi
 * xe đang chạy (0076 — 1 chỉ ở lệnh Thêm điểm / Cập nhật điểm trên chuyến RUNNING; trigger LC-15 đòi cờ + sự kiện dấu lệnh).
 */
export const STOP_INSERT = defineSql(
  "van-chuyen",
  "stop_insert",
  `INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_text, place_key, added_while_running, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?11, ?9, ?10, ?9, ?10 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?8)`,
);
/** Thứ tự + giờ xe tới của MỘT điểm (thuộc tính kế hoạch — cập nhật). ?1 điểm, ?2 chuyến, ?3 dấu lệnh, ?4 thứ tự, ?5 ngày xe tới, ?6 giờ xe tới, ?7 lúc, ?8 người. */
export const STOP_UPDATE_PLAN = defineSql(
  "van-chuyen",
  "stop_update_plan",
  `UPDATE vc_trip_stop SET seq = ?4, planned_date = ?5, planned_time = ?6, updated_at = ?7, updated_by = ?8
   WHERE id = ?1 AND trip_id = ?2 AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)`,
);
/**
 * Bỏ qua MỘT điểm còn PENDING. ?1 điểm, ?2 chuyến, ?3 dấu lệnh, ?4 mã lý do, ?5 lúc, ?6 người, ?7 chuyến GÁC (mang dấu lệnh — thường chính ?2; lệnh dời: chuyến
 * ĐÍCH, vì câu cổng đích chỉ thắng khi câu cổng nguồn đã thắng — cổng đôi).
 */
export const STOP_SKIP = defineSql(
  "van-chuyen",
  "stop_skip",
  `UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = ?4, updated_at = ?5, updated_by = ?6
   WHERE id = ?1 AND trip_id = ?2 AND status = 'PENDING' AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?7 AND last_cmd_id = ?3)`,
);
/** Bỏ qua MỌI điểm còn PENDING / ARRIVED của chuyến (huỷ chuyến; lô gián đoạn — A15). ?1 chuyến, ?2 dấu lệnh, ?3 mã lý do, ?4 lúc, ?5 người. */
export const STOPS_SKIP_ALL = defineSql(
  "van-chuyen",
  "stops_skip_all",
  `UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = ?3, updated_at = ?4, updated_by = ?5
   WHERE trip_id = ?1 AND status IN ('PENDING', 'ARRIVED') AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?1 AND last_cmd_id = ?2)`,
);
/**
 * Mở MỘT suất (mỗi suất một câu — trigger sức chứa theo dòng). ?1 id, ?2 chuyến, ?3 loại, ?4 chặng, ?5 khoá người, ?6 người đi kèm, ?7 điểm lên, ?8 điểm xuống,
 * ?9 dấu lệnh (ghi vào `opened_cmd_id` — 0076, câu chốt D5.3a), ?10 lúc, ?11 người, ?12 cờ thêm sau xuất bến (1 chỉ trên chuyến RUNNING — LC-15 mới).
 */
export const ALLOC_INSERT = defineSql(
  "van-chuyen",
  "alloc_insert",
  `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, crew_party_id, board_stop_id, alight_stop_id, status, valid_from_at, added_after_departure,
     opened_cmd_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'WAITING', ?10, ?12, ?9, ?10, ?11, ?10, ?11 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?9)`,
);
/** Đóng MỘT suất đang mở (ghi `closed_cmd_id` = dấu lệnh — 0076). ?1 suất, ?2 chuyến, ?3 dấu lệnh, ?4 lý do đóng, ?5 lúc, ?6 người, ?7 chuyến GÁC (xem STOP_SKIP). */
export const ALLOC_CLOSE = defineSql(
  "van-chuyen",
  "alloc_close",
  `UPDATE vc_trip_allocation SET valid_to_at = ?5, close_reason = ?4, closed_by = ?6, closed_cmd_id = ?3, updated_at = ?5, updated_by = ?6
   WHERE id = ?1 AND trip_id = ?2 AND valid_to_at IS NULL AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?7 AND last_cmd_id = ?3)`,
);
/** Đóng MỌI suất đang mở của chuyến (huỷ chuyến). ?1 chuyến, ?2 dấu lệnh, ?3 lý do đóng, ?4 lúc, ?5 người. */
export const ALLOCS_CLOSE_ALL = defineSql(
  "van-chuyen",
  "allocs_close_all",
  `UPDATE vc_trip_allocation SET valid_to_at = ?4, close_reason = ?3, closed_by = ?5, closed_cmd_id = ?2, updated_at = ?4, updated_by = ?5
   WHERE trip_id = ?1 AND valid_to_at IS NULL AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?1 AND last_cmd_id = ?2)`,
);

// ---- Lệnh TIẾN ĐỘ (Task A15; kế hoạch mục 1.5 "lệnh tiến độ", "lô xuất bến", "lô kết thúc gián đoạn") --------------------------------------------------------
// Hai khuôn lô: (a) câu CHUYỂN TRẠNG THÁI của suất / điểm ĐỨNG ĐẦU (nó là cổng tranh chấp — bấm hai lần chỉ một lần đổi), tự gác "chuyến đang chạy" + trạng thái
// nguồn; câu cổng THỨ HAI `changes() > 0`; (b) lệnh không có câu chuyển (kết thúc, kết thúc gián đoạn, đổi thứ tự) — câu cổng đứng đầu, chỉ kiểm RUNNING.
// Xuất bến dùng câu cổng kế hoạch TRIP_GATE (version do máy chủ đọc — I23).
/** Câu cổng lệnh tiến độ khuôn (a): chỉ thắng khi câu chuyển trạng thái NGAY TRƯỚC đã đổi dòng. ?1 chuyến, ?2 dấu lệnh, ?3 lúc, ?4 người. */
export const TRIP_GATE_TIEN_DO = defineSql(
  "van-chuyen",
  "trip_gate_tien_do",
  "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status = 'RUNNING' AND changes() > 0",
);
/** Câu cổng lệnh tiến độ khuôn (b): chuyến đang chạy. ?1 chuyến, ?2 dấu lệnh, ?3 lúc, ?4 người. */
export const TRIP_GATE_DANG_CHAY = defineSql(
  "van-chuyen",
  "trip_gate_dang_chay",
  "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND status = 'RUNNING'",
);
/**
 * Câu CHUYỂN của suất (đã đón / vắng / khách huỷ / đã trả) — đứng ĐẦU lô, tự gác: suất mở của chuyến ?2, trạng thái nguồn thuộc ?6 (mảng JSON), chuyến đang
 * chạy, và điểm của lệnh (?7 = 'LEN' điểm lên, 'XUONG' điểm xuống) đã tới (ARRIVED / DONE) — người đi kèm (CREW) không có điểm. ?1 suất, ?3 trạng thái mới,
 * ?4 lúc, ?5 người.
 */
export const ALLOC_TIEN_DO = defineSql(
  "van-chuyen",
  "alloc_tien_do",
  `UPDATE vc_trip_allocation SET status = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND trip_id = ?2 AND valid_to_at IS NULL AND status IN (SELECT value FROM json_each(?6))
     AND EXISTS (SELECT 1 FROM vc_trip t WHERE t.id = ?2 AND t.status = 'RUNNING')
     AND (kind = 'CREW' OR EXISTS (SELECT 1 FROM vc_trip_stop s WHERE s.trip_id = ?2 AND s.status IN ('ARRIVED', 'DONE')
           AND s.id = CASE ?7 WHEN 'XUONG' THEN vc_trip_allocation.alight_stop_id ELSE vc_trip_allocation.board_stop_id END))`,
);
// ---- XE ĐANG CHẠY (ADR-0052 D5 — Đợt 5; migration 0076) ---------------------------------------------------------------------------------------------------
/** Câu cổng lệnh KẾ HOẠCH trên chuyến ĐANG CHẠY (D5.1 thêm điểm, D5.2 báo huỷ, D5.3a cập nhật điểm): version đúng + còn RUNNING. Tham số như TRIP_GATE. */
export const TRIP_GATE_DANG_CHAY_VERSION = defineSql(
  "van-chuyen",
  "trip_gate_dang_chay_version",
  "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND version = ?2 AND status = 'RUNNING'",
);
/** Văn phòng báo huỷ MỘT suất (D5.2): chỉ đặt cờ — không đổi trạng thái, không đóng suất. ?1 suất, ?2 chuyến, ?3 dấu lệnh, ?4 lúc, ?5 người, ?6 mã lý do. */
export const ALLOC_OFFICE_CANCEL = defineSql(
  "van-chuyen",
  "alloc_office_cancel",
  `UPDATE vc_trip_allocation SET office_cancel_at = ?4, office_cancel_by = ?5, office_cancel_reason_code = ?6, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND trip_id = ?2 AND valid_to_at IS NULL AND status = 'WAITING' AND office_cancel_at IS NULL
     AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)`,
);
/** CÂU CHỐT cuối lô D5.3a (trigger vc_trip_stop_changed_balance kiểm "đóng = mở cùng dấu lệnh"). Không đổi gì. ?1 chuyến, ?2 dấu lệnh. */
export const TRIP_CHOT = defineSql("van-chuyen", "trip_chot", "UPDATE vc_trip SET version = version WHERE id = ?1 AND last_cmd_id = ?2");
/**
 * Bản chốt dòng THÊM SAU xuất bến (check_id NULL, cờ 1 — CHECK của 0042) — suất khách CÓ tên văn phòng thêm vào xe đang chạy. ?1 id, ?2 chuyến, ?3 suất,
 * ?4 dòng hành khách, ?5 lúc, ?6 người, ?7 dấu lệnh.
 */
export const MANIFEST_THEM_SAU = defineSql(
  "van-chuyen",
  "manifest_them_sau",
  `INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id, crew_party_id, added_after_departure, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, NULL, ?3, ?4, NULL, 1, ?5, ?6, ?5, ?6 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?7)`,
);
// ---- SỰ KIỆN ĐIỀU CHỈNH CÓ LÝ DO (ADR-0097 — gói A1, V3-B; migration 0085) --------------------------------------------------------------------------------
/**
 * Sự kiện điều chỉnh (CORRECTION / DEPARTURE_REVOKED) — ĐÚNG khuôn tham số ?1…?18 của EVENT_INSERT (bài C38 của thu-tu-lo.test.ts đọc theo vị trí) + ?19
 * mã lý do (`reason_code`, nhóm DIEU_CHINH — trigger vc_trip_event_dieu_chinh_scope). Lính gác: chuyến ?2 mang dấu lệnh ?1.
 */
export const EVENT_DIEU_CHINH_INSERT = defineSql(
  "van-chuyen",
  "event_dieu_chinh_insert",
  `INSERT INTO vc_trip_event (id, trip_id, related_trip_id, kind, stop_id, allocation_id, count, request_id, client_at, decided_mode, override_rule_code, override_reason_code,
     policy_id, occurred_at, occurred_ms, occurred_source, created_at, created_by, updated_at, updated_by, reason_code)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?17, ?18, ?19
   WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?1)`,
);
/**
 * Suất THAY THẾ của lô điều chỉnh (Đ2.3): cùng chặng / người / điểm lên / điểm xuống với suất cũ, trạng thái mới (bảng Đ2.4 — máy chủ `kiemDieuChinh` + trigger
 * vc_trip_running_locked_alloc_ins), cờ thêm sau xuất bến, trỏ suất cũ. ?1 id, ?2 chuyến, ?3 suất cũ (corrects_allocation_id), ?4 trạng thái mới, ?5 dấu lệnh,
 * ?6 lúc, ?7 người. Các cột chép từ CHÍNH suất cũ (không nhận từ trình duyệt). Lính gác: chuyến ?2 mang dấu lệnh ?5.
 */
export const ALLOC_DIEU_CHINH_INSERT = defineSql(
  "van-chuyen",
  "alloc_dieu_chinh_insert",
  `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, crew_party_id, board_stop_id, alight_stop_id, status, valid_from_at, added_after_departure,
     opened_cmd_id, corrects_allocation_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, c.trip_id, c.kind, c.leg_id, c.passenger_key, c.crew_party_id, c.board_stop_id, c.alight_stop_id, ?4, ?6, 1, ?5, c.id, ?6, ?7, ?6, ?7
   FROM vc_trip_allocation c WHERE c.id = ?3 AND c.trip_id = ?2 AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?5)`,
);
/**
 * Thu hồi xuất bến (Đ3.3) — TRẠNG THÁI CUỐI của lô: RUNNING → PLANNED, xoá giờ xuất bến (CHECK của vc_trip). Trigger vc_trip_status_forward chỉ cho cạnh này khi
 * sự kiện của dấu lệnh là DEPARTURE_REVOKED; vc_trip_revoke_no_progress chặn khi đã có tiến độ. ?1 chuyến, ?2 dấu lệnh, ?3 lúc, ?4 người.
 */
export const TRIP_THU_HOI_XUAT_BEN = defineSql(
  "van-chuyen",
  "trip_thu_hoi_xuat_ben",
  "UPDATE vc_trip SET status = 'PLANNED', departed_at = NULL, departed_ms = NULL, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND last_cmd_id = ?2",
);
/** Câu CHUYỂN "xe đã tới điểm" — đứng ĐẦU lô, tự gác: điểm PENDING của chuyến đang chạy. ?1 điểm, ?2 chuyến, ?3 giờ xảy ra (chuỗi), ?4 lúc, ?5 người. */
export const STOP_DA_TOI = defineSql(
  "van-chuyen",
  "stop_da_toi",
  `UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND trip_id = ?2 AND status = 'PENDING' AND EXISTS (SELECT 1 FROM vc_trip t WHERE t.id = ?2 AND t.status = 'RUNNING')`,
);
/**
 * Điểm TỰ XONG khi không còn ai phải xử lý ở đó (I20): điểm ARRIVED, không còn suất mở chờ đón ở điểm lên này, không còn suất mở chờ / đang trên xe xuống ở
 * điểm này. ?1 điểm, ?2 chuyến, ?3 giờ xong (= giờ xảy ra của sự kiện cùng lô), ?4 lúc, ?5 người, ?6 dấu lệnh.
 */
export const STOP_XONG_NEU_HET = defineSql(
  "van-chuyen",
  "stop_xong_neu_het",
  `UPDATE vc_trip_stop SET status = 'DONE', done_at = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND trip_id = ?2 AND status = 'ARRIVED'
     AND NOT EXISTS (SELECT 1 FROM vc_trip_allocation a WHERE a.trip_id = ?2 AND a.valid_to_at IS NULL
                      AND ((a.board_stop_id = ?1 AND a.status = 'WAITING') OR (a.alight_stop_id = ?1 AND a.status IN ('WAITING', 'BOARDED'))))
     AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?6)`,
);
/** Gắn tên còn thiếu lúc xuất bến (I19b) — một lần (passenger_key NULL). ?1 suất, ?2 khoá người, ?3 dấu lệnh, ?4 lúc, ?5 người, ?6 chuyến. */
export const ALLOC_GAN_TEN = defineSql(
  "van-chuyen",
  "alloc_gan_ten",
  `UPDATE vc_trip_allocation SET passenger_key = ?2, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND trip_id = ?6 AND passenger_key IS NULL AND valid_to_at IS NULL AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?6 AND last_cmd_id = ?3)`,
);
/**
 * Bản chụp điều kiện xuất bến ĐẠT (LC-05: cmd_id = dấu lệnh). ?1 id, ?2 chuyến, ?3 dấu lệnh, ?4 chính sách, ?5 xe, ?6 biển số, ?7 số chỗ, ?8 chủ xe, ?9 tài xế,
 * ?10 phút nghỉ đã dùng, ?11 lúc, ?12 người.
 */
export const CHECK_INSERT = defineSql(
  "van-chuyen",
  "check_insert",
  `INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
     rest_minutes_used, checked_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, 'DAT', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?12, ?11, ?12 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)`,
);
/**
 * Dòng con bản chụp (không số giấy tờ). ?1 id, ?2 bản chụp, ?3 loại dòng, ?4 giấy tờ xe, ?5 giấy tờ người, ?6 mã loại giấy tờ, ?7 hạng, ?8 hạn, ?9 điều kiện,
 * ?10 lúc, ?11 người, ?12 chuyến, ?13 dấu lệnh.
 */
export const CHECK_ITEM_INSERT = defineSql(
  "van-chuyen",
  "check_item_insert",
  `INSERT INTO vc_trip_departure_check_item (id, check_id, item_kind, vehicle_document_id, person_document_id, document_type_code, license_class_code, expiry_date,
     rule_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?12 AND last_cmd_id = ?13)`,
);
/** Bản chốt danh sách lúc xuất bến — trỏ DÒNG hành khách đã dùng (không chép tên). ?1 id, ?2 chuyến, ?3 bản chụp, ?4 suất, ?5 dòng hành khách, ?6 người đi kèm, ?7 lúc, ?8 người, ?9 dấu lệnh. */
export const MANIFEST_INSERT = defineSql(
  "van-chuyen",
  "manifest_insert",
  `INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id, crew_party_id, added_after_departure, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?7, ?8 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?9)`,
);
/** Sang RUNNING (không phải trạng thái cuối; đứng SAU bản chụp vì LC-05). Giờ xuất bến = ĐÚNG cặp giờ xảy ra của sự kiện cùng lô (I33). ?1 chuyến, ?2 dấu lệnh, ?3 chuỗi, ?4 ms, ?5 lúc, ?6 người. */
export const TRIP_XUAT_BEN = defineSql(
  "van-chuyen",
  "trip_xuat_ben",
  "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?3, departed_ms = ?4, updated_at = ?5, updated_by = ?6 WHERE id = ?1 AND last_cmd_id = ?2",
);
/** Kết thúc (thường / gián đoạn) — câu TRẠNG THÁI CUỐI (cuối lô). ?1 chuyến, ?2 dấu lệnh, ?3 trạng thái, ?4 lý do gián đoạn, ?5 chuỗi giờ, ?6 ms, ?7 lúc, ?8 người. */
export const TRIP_KET_THUC = defineSql(
  "van-chuyen",
  "trip_ket_thuc",
  "UPDATE vc_trip SET status = ?3, end_reason_code = ?4, ended_at = ?5, ended_ms = ?6, updated_at = ?7, updated_by = ?8 WHERE id = ?1 AND last_cmd_id = ?2",
);
/** Kết thúc gián đoạn: đóng suất còn chờ / đang trên xe (TRIP_INTERRUPTED — ngoại lệ LC-15). ?1 chuyến, ?2 dấu lệnh, ?3 lúc, ?4 người. */
export const ALLOCS_DONG_GIAN_DOAN = defineSql(
  "van-chuyen",
  "allocs_dong_gian_doan",
  `UPDATE vc_trip_allocation SET valid_to_at = ?3, close_reason = 'TRIP_INTERRUPTED', closed_by = ?4, closed_cmd_id = ?2, updated_at = ?3, updated_by = ?4
   WHERE trip_id = ?1 AND valid_to_at IS NULL AND status IN ('WAITING', 'BOARDED') AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?1 AND last_cmd_id = ?2)`,
);
/** Đổi thứ tự MỘT điểm chưa tới (chỉ `seq` — không đụng giờ xe tới): xe đang chạy (route 29 / 39), hoặc lệnh xếp / dời / cập nhật điểm sắp đón trước trả
 *  (HT-01 — `sapLaiDiem`). ?1 điểm, ?2 chuyến, ?3 dấu lệnh, ?4 thứ tự, ?5 lúc, ?6 người. */
export const STOP_SET_SEQ = defineSql(
  "van-chuyen",
  "stop_set_seq",
  `UPDATE vc_trip_stop SET seq = ?4, updated_at = ?5, updated_by = ?6
   WHERE id = ?1 AND trip_id = ?2 AND status = 'PENDING' AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)`,
);

// ---- CHUYỂN KHÁCH GIỮA HAI XE (ADR-0111, thi hành ADR-0052 D4 / D5c; migration 0093) ----------------------------------------------------------------------
// Sự kiện + nhật ký ở chuyến ĐÍCH (B), nguồn (A) ở related_trip_id (G-A5-11). Mọi câu sau câu cổng GÁC theo B (lô xác nhận: cổng A trước, cổng B chỉ thắng
// khi A đã mang dấu lệnh này — khuôn loDoi). Đề nghị: id = dấu lệnh của lô GỬI (LC-14 đòi B mang dấu lệnh = id đề nghị).
/** Cổng lô GỬI ở chuyến ĐÍCH: version đúng (máy chủ đọc) + chưa chạy / đang chạy. Tham số như TRIP_GATE. */
export const TRIP_GATE_CHAY_HOAC_CHO = defineSql(
  "van-chuyen",
  "trip_gate_chay_hoac_cho",
  "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND version = ?2 AND status IN ('PLANNED', 'RUNNING')",
);
/**
 * Cổng lô VÒNG ĐỜI đề nghị (rút, không nhận, hết hạn, leo thang, bác) ở chuyến ĐÍCH ?1: chưa chạy / đang chạy + đề nghị ?5 của đúng chuyến đích còn ở một
 * trạng thái thuộc ?6 (mảng JSON) — bấm hai lần / hai người cùng bấm: chỉ một lô thắng. Không khoá version (lệnh không đổi kế hoạch chuyến). ?2 dấu lệnh, ?3 lúc,
 * ?4 người.
 */
export const TRIP_GATE_DE_NGHI = defineSql(
  "van-chuyen",
  "trip_gate_de_nghi",
  `UPDATE vc_trip SET version = version + 1, last_cmd_id = ?2, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND status IN ('PLANNED', 'RUNNING')
     AND EXISTS (SELECT 1 FROM vc_transfer_request r WHERE r.id = ?5 AND r.to_trip_id = ?1 AND r.status IN (SELECT value FROM json_each(?6)))`,
);
/**
 * Cổng THỨ HAI của lô XÁC NHẬN / DUYỆT (khuôn TRIP_GATE_DOI): chuyến đích ?1 version ?2 đúng, chưa chạy / đang chạy; chuyến nguồn ?6 đã mang CHÍNH dấu lệnh ?3
 * (cổng nguồn TRIP_GATE_DANG_CHAY_VERSION đứng trước); đề nghị ?7 (nguồn ?6 → đích ?1) còn ở trạng thái thuộc ?8. ?4 lúc, ?5 người.
 */
export const TRIP_GATE_DOI_CHAY = defineSql(
  "van-chuyen",
  "trip_gate_doi_chay",
  `UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND version = ?2 AND status IN ('PLANNED', 'RUNNING') AND EXISTS (SELECT 1 FROM vc_trip s WHERE s.id = ?6 AND s.last_cmd_id = ?3)
     AND EXISTS (SELECT 1 FROM vc_transfer_request r WHERE r.id = ?7 AND r.to_trip_id = ?1 AND r.from_trip_id = ?6 AND r.status IN (SELECT value FROM json_each(?8)))`,
);
/**
 * Đề nghị MỚI (Chờ). ?1 id (= dấu lệnh lô gửi), ?2 nguồn, ?3 đích, ?4 phạm vi, ?5 điểm nguồn (STOP), ?6 nơi gặp danh mục, ?7 chữ nơi gặp (đã che), ?8 số khách,
 * ?9 hồ sơ tài xế nguồn, ?10 tài khoản bấm, ?11 lúc, ?12 request_id, ?13 người. Chính sách = dòng hiện hành lúc gửi (đọc trong câu — LC-14 so lại).
 */
export const TRANSFER_INSERT = defineSql(
  "van-chuyen",
  "transfer_insert",
  `INSERT INTO vc_transfer_request (id, from_trip_id, to_trip_id, scope, from_stop_id, meet_location_id, meet_place_text, pax_count, proposed_by_party_id,
     proposed_by_staff_id, proposed_at, policy_id, request_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
     (SELECT p.id FROM vc_dispatch_policy p WHERE p.valid_from_at <= ?11 ORDER BY p.valid_from_at DESC LIMIT 1), ?12, ?11, ?13, ?11, ?13
   WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?3 AND last_cmd_id = ?1)`,
);
/**
 * Đóng đề nghị KHÔNG đụng cột quyết định (Rút / Hết hạn / Huỷ — Đ3 (b)). ?1 đề nghị, ?2 trạng thái mới, ?3 dấu lệnh, ?4 lúc, ?5 người, ?6 chuyến gác, ?7
 * trạng thái cũ hợp lệ (mảng JSON).
 */
export const TRANSFER_DONG = defineSql(
  "van-chuyen",
  "transfer_dong",
  `UPDATE vc_transfer_request SET status = ?2, closed_cmd_id = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND status IN (SELECT value FROM json_each(?7)) AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?6 AND last_cmd_id = ?3)`,
);
/**
 * Tài xế đích quyết lần thứ nhất (Chờ → Xác nhận MAY / Leo thang / Không nhận — Đ3 (b)). ?1 đề nghị, ?2 trạng thái mới, ?3 dấu lệnh, ?4 lúc, ?5 tài khoản bấm,
 * ?6 hồ sơ tài xế đích, ?7 chế độ (MAY khi xác nhận), ?8 dấu lệnh đóng (NULL khi leo thang), ?9 lý do Không nhận, ?10 chuyến gác (đích).
 */
export const TRANSFER_QUYET = defineSql(
  "van-chuyen",
  "transfer_quyet",
  `UPDATE vc_transfer_request SET status = ?2, decided_mode = ?7, decided_by = ?5, decided_at = ?4, decided_cmd_id = ?3, decided_by_party_id = ?6, closed_cmd_id = ?8,
     decline_reason_code = ?9, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND status = 'PENDING' AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?10 AND last_cmd_id = ?3)`,
);
/**
 * Quản trị / Toàn quyền quyết đề nghị LEO THANG (→ Xác nhận NGUOI có lý do phá lệ / → Bác có lý do): giữ hồ sơ tài xế đã bấm Nhận, dấu lệnh quyết mới = dấu lệnh
 * đóng. ?1 đề nghị, ?2 trạng thái mới, ?3 dấu lệnh, ?4 lúc, ?5 người, ?6 lý do phá lệ (xác nhận), ?7 lý do Bác, ?8 chuyến gác (đích).
 */
export const TRANSFER_DUYET = defineSql(
  "van-chuyen",
  "transfer_duyet",
  `UPDATE vc_transfer_request SET status = ?2, decided_mode = CASE WHEN ?2 = 'CONFIRMED' THEN 'NGUOI' END, decided_by = ?5, decided_at = ?4, decided_cmd_id = ?3,
     closed_cmd_id = ?3, override_reason_code = ?6, reject_reason_code = ?7, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND status = 'ESCALATED' AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?8 AND last_cmd_id = ?3)`,
);
/**
 * Tự huỷ trong lô XÁC NHẬN (P4, G-A5-6): mọi đề nghị Chờ / Leo thang KHÁC của chuyến nguồn ?1 — STOP (?3 = điểm): cùng điểm + mọi ONBOARD; ONBOARD (?3 NULL):
 * tất cả. Không sự kiện, không tin; vết ở closed_cmd_id. ?2 đề nghị vừa xác nhận, ?4 dấu lệnh, ?5 lúc, ?6 người, ?7 chuyến gác.
 */
export const TRANSFERS_VOID_KHAC = defineSql(
  "van-chuyen",
  "transfers_void_khac",
  `UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?4, updated_at = ?5, updated_by = ?6
   WHERE from_trip_id = ?1 AND id <> ?2 AND status IN ('PENDING', 'ESCALATED') AND (?3 IS NULL OR scope = 'ONBOARD' OR from_stop_id = ?3)
     AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?7 AND last_cmd_id = ?4)`,
);
/**
 * MQ-09 (ADR-0052 :79; kế hoạch G-A5-13): tự huỷ đề nghị chờ (Chờ / Leo thang) trong lô của lệnh KHÁC làm điểm nguồn / chuyến đổi. Không sự kiện, không tin;
 * vết ở closed_cmd_id (trigger ck_trong_lo: dấu lệnh của xe nhờ hoặc xe nhận). Ba phạm vi:
 *   - THEO ĐIỂM (Đã tới): đề nghị STOP của điểm ?1;
 *   - THEO SUẤT (Báo huỷ, Điều chỉnh): đề nghị STOP của điểm lên của suất ?1 VÀ đề nghị ONBOARD của chuyến có suất ?1 (tập khách của điểm / của xe đổi —
 *     cùng lý do lô xác nhận STOP huỷ ONBOARD của xe nhờ, G-A5-6);
 *   - THEO CHUYẾN (Kết thúc, Kết thúc gián đoạn, Huỷ, Thu hồi xuất bến): mọi đề nghị có chuyến ?1 là nguồn hoặc đích.
 * ?2 dấu lệnh, ?3 lúc, ?4 người, ?5 chuyến gác (chuyến của lô).
 */
export const TRANSFERS_VOID_BY_STOP = defineSql(
  "van-chuyen",
  "transfers_void_by_stop",
  `UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?2, updated_at = ?3, updated_by = ?4
   WHERE scope = 'STOP' AND from_stop_id = ?1 AND status IN ('PENDING', 'ESCALATED') AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?5 AND last_cmd_id = ?2)`,
);
export const TRANSFERS_VOID_BY_SUAT = defineSql(
  "van-chuyen",
  "transfers_void_by_suat",
  `UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?2, updated_at = ?3, updated_by = ?4
   WHERE status IN ('PENDING', 'ESCALATED')
     AND ((scope = 'STOP' AND from_stop_id = (SELECT a.board_stop_id FROM vc_trip_allocation a WHERE a.id = ?1))
       OR (scope = 'ONBOARD' AND from_trip_id = (SELECT a.trip_id FROM vc_trip_allocation a WHERE a.id = ?1)))
     AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?5 AND last_cmd_id = ?2)`,
);
export const TRANSFERS_VOID_BY_TRIP = defineSql(
  "van-chuyen",
  "transfers_void_by_trip",
  `UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?2, updated_at = ?3, updated_by = ?4
   WHERE (from_trip_id = ?1 OR to_trip_id = ?1) AND status IN ('PENDING', 'ESCALATED') AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?5 AND last_cmd_id = ?2)`,
);
/**
 * MQ-09 cho "Cập nhật điểm theo đơn" khi xe nhờ ĐANG CHẠY (đường bỏ qua điểm nguồn / đổi tập khách — G-A5-13): đề nghị chờ của chuyến ?1 mà (STOP) điểm nguồn là
 * điểm lên của suất do CHÍNH lệnh ?2 đóng, hoặc điểm nguồn đã hết PENDING; (ONBOARD) lệnh ?2 có đóng suất của chuyến. Đứng SAU câu đóng suất / bỏ qua điểm.
 */
export const TRANSFERS_VOID_BY_DOI_DIEM = defineSql(
  "van-chuyen",
  "transfers_void_by_doi_diem",
  `UPDATE vc_transfer_request SET status = 'VOID', closed_cmd_id = ?2, updated_at = ?3, updated_by = ?4
   WHERE from_trip_id = ?1 AND status IN ('PENDING', 'ESCALATED')
     AND ((scope = 'STOP' AND (from_stop_id IN (SELECT a.board_stop_id FROM vc_trip_allocation a WHERE a.trip_id = ?1 AND a.closed_cmd_id = ?2)
                               OR from_stop_id IN (SELECT s.id FROM vc_trip_stop s WHERE s.trip_id = ?1 AND s.status <> 'PENDING')))
       OR (scope = 'ONBOARD' AND EXISTS (SELECT 1 FROM vc_trip_allocation a WHERE a.trip_id = ?1 AND a.closed_cmd_id = ?2)))
     AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?5 AND last_cmd_id = ?2)`,
);
/**
 * Một dòng kiểm của lần bấm (trước câu đổi trạng thái đề nghị). Chính sách = dòng hiện hành lúc kiểm (đọc trong câu). ?1 id, ?2 đề nghị, ?3 dấu lệnh, ?4 mã
 * điều kiện, ?5 tầng (máy chủ — trigger so với danh mục), ?6 kết quả, ?7 giá trị, ?8 giới hạn, ?9 lúc, ?10 người, ?11 chuyến gác (đích).
 */
export const TRANSFER_CHECK_INSERT = defineSql(
  "van-chuyen",
  "transfer_check_insert",
  `INSERT INTO vc_transfer_check (id, transfer_id, cmd_id, rule_code, rule_tier, ket_qua, gia_tri, gioi_han, policy_row_id, checked_at, created_at, created_by, updated_at,
     updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, (SELECT p.id FROM vc_dispatch_policy p WHERE p.valid_from_at <= ?9 ORDER BY p.valid_from_at DESC LIMIT 1), ?9, ?9, ?10, ?9, ?10
   WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?11 AND last_cmd_id = ?3)`,
);
/** Đóng MỘT suất nguồn vì chuyển (TRANSFERRED + closed_transfer_id). ?1 suất, ?2 chuyến nguồn, ?3 dấu lệnh, ?4 lúc, ?5 người, ?6 đề nghị, ?7 chuyến gác (đích). */
export const ALLOC_CLOSE_TRANSFER = defineSql(
  "van-chuyen",
  "alloc_close_transfer",
  `UPDATE vc_trip_allocation SET valid_to_at = ?4, close_reason = 'TRANSFERRED', closed_by = ?5, closed_cmd_id = ?3, closed_transfer_id = ?6, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND trip_id = ?2 AND valid_to_at IS NULL AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?7 AND last_cmd_id = ?3)`,
);
/**
 * Mở MỘT suất ở chuyến đích, chép từ ĐÚNG một suất nguồn vừa đóng bằng đề nghị ?6 (loại, chặng, người, người đi kèm, TRẠNG THÁI — G-A5-24), gắn điểm của
 * đích (?4 lên, ?5 xuống; người đi kèm không điểm). Cờ "thêm sau xuất bến" = đích đang chạy. ?1 id, ?2 chuyến đích, ?3 suất nguồn, ?7 dấu lệnh, ?8 lúc, ?9 người.
 */
export const ALLOC_OPEN_TRANSFER = defineSql(
  "van-chuyen",
  "alloc_open_transfer",
  `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, crew_party_id, board_stop_id, alight_stop_id, status, valid_from_at, added_after_departure,
     opened_cmd_id, transfer_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, c.kind, c.leg_id, c.passenger_key, c.crew_party_id, ?4, ?5, c.status, ?8,
     CASE WHEN (SELECT t.status FROM vc_trip t WHERE t.id = ?2) = 'RUNNING' THEN 1 ELSE 0 END, ?7, ?6, ?8, ?9, ?8, ?9
   FROM vc_trip_allocation c WHERE c.id = ?3 AND c.closed_transfer_id = ?6 AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?7)`,
);
/** Điểm đón nguồn đã chuyển hết khách sang xe khác (STOP): PENDING → MOVED. ?1 điểm, ?2 chuyến nguồn, ?3 dấu lệnh, ?4 lúc, ?5 người, ?6 chuyến gác (đích). */
export const STOP_SET_MOVED = defineSql(
  "van-chuyen",
  "stop_set_moved",
  `UPDATE vc_trip_stop SET status = 'MOVED', updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND trip_id = ?2 AND status = 'PENDING' AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?6 AND last_cmd_id = ?3)`,
);
/**
 * Bản chốt dòng THÊM SAU xuất bến cho suất CHUYỂN SANG xe đích đang chạy — khách có tên (dòng hành khách) HOẶC người đi kèm (CHECK của 0042: đúng một). ?1 id,
 * ?2 chuyến đích, ?3 suất, ?4 dòng hành khách, ?5 người đi kèm, ?6 lúc, ?7 người, ?8 dấu lệnh.
 */
export const MANIFEST_CHUYEN_KHACH = defineSql(
  "van-chuyen",
  "manifest_chuyen_khach",
  `INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id, crew_party_id, added_after_departure, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, NULL, ?3, ?4, ?5, 1, ?6, ?7, ?6, ?7 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?8)`,
);

/** "Cuốc của tôi" (route 19): chuyến tài xế ?1 đang có dòng lái MỞ, ngày chạy trong [?2, ?3] hoặc đang chạy. */
const TRIPS_CUA_TAI_XE = defineSql(
  "van-chuyen",
  "trips_cua_tai_xe",
  `SELECT ${COT_CHUYEN} FROM vc_trip t
   WHERE EXISTS (SELECT 1 FROM vc_trip_driver d WHERE d.trip_id = t.id AND d.valid_to_at IS NULL AND d.driver_party_id = ?1)
     AND (t.status = 'RUNNING' OR t.service_date BETWEEN ?2 AND ?3)
   ORDER BY t.planned_start_ms, t.code`,
);
export async function tripsCuaTaiXe(db: D1Database, partyId: string, tu: string, den: string): Promise<TripRow[]> {
  return (await db.prepare(TRIPS_CUA_TAI_XE).bind(partyId, tu, den).all<TripRow>()).results;
}

// ---- Mốc "giờ hẹn đã biết" của chặng (ADR-0051 GB1 — migration 0043) ---------------------------------------------------------------------------------------
/**
 * Câu CHỤP MỐC trong lô xếp (nhãn GHI): dòng XEP seq 1 = ngày giờ hẹn của chặng đọc trong CHÍNH request — CHỈ khi chặng chưa có mốc nào ("lần đầu lên xe";
 * dời / cập nhật điểm / rút rồi xếp lại không chụp lại — bẫy "tái mốc"); lính gác dấu lệnh. Không `INSERT OR IGNORE` (nuốt cả lỗi CHECK / NOT NULL).
 * ?1 id, ?2 chặng, ?3 ngày hẹn, ?4 giờ hẹn (NULL = chưa chốt), ?5 lúc, ?6 người, ?7 chuyến, ?8 dấu lệnh.
 */
export const MOC_XEP_INSERT = defineSql(
  "van-chuyen",
  "moc_xep_insert",
  `INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, 1, 'XEP', ?3, ?4, ?5, ?6, ?5, ?6
   WHERE NOT EXISTS (SELECT 1 FROM vc_leg_appt_ack WHERE leg_id = ?2) AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?7 AND last_cmd_id = ?8)`,
);
/** Mọi dòng mốc của các chặng (chuỗi theo seq). */
export interface MocRow {
  id: string;
  leg_id: string;
  seq: number;
  kind: "XEP" | "DA_GOI" | "BO_DANH_DAU";
  appt_date: string;
  appt_time: string | null;
  prev_appt_date: string | null;
  prev_appt_time: string | null;
  created_at: string;
  created_by: string | null;
  /** GA-59: kết quả lần đầu của "Bỏ đánh dấu" (JSON `{ moi, maChuyen }` hoặc `null`); NULL ở dòng XEP / DA_GOI. */
  bo_gio_hen_doi: string | null;
}
const MOC_BY_LEGS = defineSql(
  "van-chuyen",
  "moc_by_legs",
  `SELECT id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, created_at, created_by, bo_gio_hen_doi FROM vc_leg_appt_ack
   WHERE leg_id IN (SELECT value FROM json_each(?1)) ORDER BY leg_id, seq`,
);
export async function mocByLegs(db: D1Database, legIds: readonly string[]): Promise<MocRow[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(MOC_BY_LEGS).bind(JSON.stringify(legIds)).all<MocRow>()).results;
}
const MOC_BY_REQUEST = defineSql(
  "van-chuyen",
  "moc_by_request",
  "SELECT id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, created_at, created_by, bo_gio_hen_doi FROM vc_leg_appt_ack WHERE request_id = ?1",
);
/** Dòng mốc do lệnh `requestId` ghi (DA_GOI / BO_DANH_DAU — dòng XEP không mang requestId): phản hồi lệnh (lần đầu "Bỏ đánh dấu" và mọi lệnh lặp) dựng TỪ dòng này (ADR-0051 bước 4, K2a T2, GA-59). */
export async function mocByRequest(db: D1Database, requestId: string): Promise<MocRow | null> {
  return db.prepare(MOC_BY_REQUEST).bind(requestId).first<MocRow>();
}
/** Suất KHÁCH đang mở của các chặng (mọi chuyến) + mã / ngày / trạng thái chuyến — điều 1 của mục "Giờ hẹn đổi". */
export interface SuatChangRow { leg_id: string; trip_id: string; code: string; service_date: string; trip_status: TripRow["status"]; status: AllocRow["status"] }
const SUAT_KHACH_MO_CUA_CHANG = defineSql(
  "van-chuyen",
  "suat_khach_mo_cua_chang",
  `SELECT a.leg_id, a.trip_id, t.code, t.service_date, t.status AS trip_status, a.status FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id
   WHERE a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND a.leg_id IN (SELECT value FROM json_each(?1)) ORDER BY t.service_date, t.code, a.id`,
);
export async function suatKhachMoCuaChang(db: D1Database, legIds: readonly string[]): Promise<SuatChangRow[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(SUAT_KHACH_MO_CUA_CHANG).bind(JSON.stringify(legIds)).all<SuatChangRow>()).results;
}
/** Chặng có khách CHỜ ĐÓN trên chuyến chưa kết thúc, ngày CHUYẾN trong [?1, ?2] — danh sách nhắc lọc theo NGÀY CHUYẾN, không theo ngày hẹn (ADR-0051 "Nơi hiện"). */
const CHANG_CHO_TRONG_KHOANG = defineSql(
  "van-chuyen",
  "chang_cho_trong_khoang",
  `SELECT DISTINCT a.leg_id FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id
   WHERE a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND a.status = 'WAITING' AND t.status IN ('PLANNED', 'RUNNING') AND t.service_date BETWEEN ?1 AND ?2`,
);
export async function changChoTrongKhoang(db: D1Database, tu: string, den: string): Promise<string[]> {
  return (await db.prepare(CHANG_CHO_TRONG_KHOANG).bind(tu, den).all<{ leg_id: string }>()).results.map((r) => r.leg_id);
}
/** Chặng → đơn → người lập, qua VIEW công bố của orders (`v_ord_leg_key`, `v_ord_order_owner` — tiền lệ thongbao). Không có dòng = chặng lạ (404). */
const CHANG_CHU_DON = defineSql(
  "van-chuyen",
  "chang_chu_don",
  `SELECT k.id, k.order_id, o.staff_id AS owner_id FROM v_ord_leg_key k LEFT JOIN v_ord_order_owner o ON o.id = k.order_id WHERE k.id IN (SELECT value FROM json_each(?1))`,
);
export async function changChuDon(db: D1Database, legIds: readonly string[]): Promise<{ id: string; order_id: string; owner_id: string | null }[]> {
  if (legIds.length === 0) return [];
  return (await db.prepare(CHANG_CHU_DON).bind(JSON.stringify(legIds)).all<{ id: string; order_id: string; owner_id: string | null }>()).results;
}
/**
 * CÂU CỔNG của họ lệnh mốc giờ hẹn (nhãn CONG_MOC — ADR-0051; ruling VỪA-2): dòng mới seq = phienBan + 1 CHỈ khi mốc hiện hành của chặng đúng là `phienBan`
 * (khoá lạc quan riêng — không chạm vc_trip, không tăng version). ?1 id (= dấu lệnh = id nhật ký), ?2 chặng, ?3 phienBan, ?4 loại (DA_GOI / BO_DANH_DAU),
 * ?5 ngày mới, ?6 giờ mới, ?7 ngày trước, ?8 giờ trước, ?9 request_id, ?10 lúc, ?11 người, ?12 bản chụp kết quả lần đầu (chỉ BO_DANH_DAU — GA-59; DA_GOI NULL).
 */
export const MOC_GOI_INSERT = defineSql(
  "van-chuyen",
  "moc_goi_insert",
  `INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, request_id, created_at, created_by, updated_at, updated_by,
                                bo_gio_hen_doi)
   SELECT ?1, ?2, ?3 + 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11, ?12 WHERE (SELECT max(seq) FROM vc_leg_appt_ack WHERE leg_id = ?2) = ?3`,
);

// ---- XE TRÊN CHI TIẾT ĐƠN (ADR-0059) — chỉ đọc, qua view công bố của orders (`v_ord_order_label` — đơn có tồn tại; `v_ord_leg_key` — chặng mở của đơn) và
// parties (`v_pty_party_label` — tên tài xế). Không đọc SĐT, tên khách, khoá so sánh nơi. Bỏ chuyến huỷ; chỉ đếm suất KHÁCH đang mở.
const DON_TON_TAI = defineSql("van-chuyen", "don_ton_tai", "SELECT 1 AS co FROM v_ord_order_label WHERE id = ?1");
const CHANG_MO_CUA_DON = defineSql("van-chuyen", "chang_mo_cua_don", "SELECT k.id FROM v_ord_leg_key k WHERE k.order_id = ?1 AND k.is_open = 1 ORDER BY k.id");
export interface XeCuaDonRow {
  leg_id: string;
  plate_number: string;
  driver_name: string | null;
  status: TripRow["status"];
  so_khach: number;
}
const XE_CUA_DON = defineSql(
  "van-chuyen",
  "xe_cua_don",
  `SELECT a.leg_id, v.plate_number, l.display_name AS driver_name, t.status, count(*) AS so_khach
   FROM v_ord_leg_key k
   JOIN vc_trip_allocation a ON a.leg_id = k.id AND a.kind = 'PASSENGER' AND a.valid_to_at IS NULL
   JOIN vc_trip t ON t.id = a.trip_id AND t.status <> 'CANCELLED'
   JOIN vc_vehicle v ON v.id = t.vehicle_id
   LEFT JOIN vc_trip_driver d ON d.trip_id = t.id AND d.valid_to_at IS NULL
   LEFT JOIN v_pty_party_label l ON l.id = d.driver_party_id
   WHERE k.order_id = ?1 AND k.is_open = 1
   GROUP BY a.leg_id, t.id
   ORDER BY a.leg_id, t.planned_start_ms, t.code`,
);
export async function donTonTai(db: D1Database, orderId: string): Promise<boolean> {
  return (await db.prepare(DON_TON_TAI).bind(orderId).first<{ co: number }>()) !== null;
}
export async function changMoCuaDon(db: D1Database, orderId: string): Promise<string[]> {
  return (await db.prepare(CHANG_MO_CUA_DON).bind(orderId).all<{ id: string }>()).results.map((r) => r.id);
}
export async function xeCuaDon(db: D1Database, orderId: string): Promise<XeCuaDonRow[]> {
  return (await db.prepare(XE_CUA_DON).bind(orderId).all<XeCuaDonRow>()).results;
}

// ---- ADR-0068 Đ2 (gộp hồ sơ): việc xe đang mở của MỘT hồ sơ — CHỈ gốc lắp ráp gọi qua hàm công bố viecXeCuaNguoi ----------------------------------------
// "Chưa chốt" = chuyến PLANNED hoặc RUNNING. ?1 = hồ sơ. Chỉ đếm, không trả chuyến / xe.
// Luật đếm này được chép ở scripts/audit-checks.mjs (R-PTY-MERGE-4): sửa một nơi thì sửa nơi kia.
const VIEC_XE_CUA_NGUOI = defineSql(
  "van-chuyen",
  "viec_xe_cua_nguoi",
  `SELECT
     (SELECT count(*) FROM vc_trip_driver d JOIN vc_trip t ON t.id = d.trip_id
       WHERE d.driver_party_id = ?1 AND d.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')) AS lai,
     (SELECT count(*) FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id
       WHERE a.kind = 'CREW' AND a.crew_party_id = ?1 AND a.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')) AS to_lai,
     (SELECT count(*) FROM vc_trip t WHERE t.carrier_party_id = ?1 AND t.status IN ('PLANNED', 'RUNNING')) AS chu_xe,
     (SELECT count(*) FROM vc_vehicle v WHERE v.owner_party_id = ?1 AND v.status <> 'retired') AS so_xe`,
);
export async function viecXeCuaNguoi(db: D1Database, partyId: string): Promise<{ laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }> {
  const r = await db.prepare(VIEC_XE_CUA_NGUOI).bind(partyId).first<{ lai: number; to_lai: number; chu_xe: number; so_xe: number }>();
  return { laiChuyen: r?.lai ?? 0, toLaiChuyen: r?.to_lai ?? 0, chuXeChuyen: r?.chu_xe ?? 0, soXe: r?.so_xe ?? 0 };
}

// ---- ĐỌC đề nghị chuyển khách (ADR-0111) — chữ nơi gặp (đã che) chỉ đi vào DTO đề nghị; khoá nơi không bao giờ đọc ra. -------------------------------------
export interface DeNghiRow {
  id: string; from_trip_id: string; to_trip_id: string; scope: "STOP" | "ONBOARD"; from_stop_id: string | null; meet_location_id: string | null;
  meet_place_text: string | null; pax_count: number; proposed_by_party_id: string; proposed_by_staff_id: string; proposed_at: string;
  status: "PENDING" | "WITHDRAWN" | "DECLINED" | "EXPIRED" | "VOID" | "CONFIRMED" | "ESCALATED" | "REJECTED"; decided_mode: "MAY" | "NGUOI" | null;
  decided_by: string | null; decided_at: string | null; decided_by_party_id: string | null; decided_cmd_id: string | null; closed_cmd_id: string | null;
  policy_id: string; decline_reason_code: string | null;
  override_reason_code: string | null; reject_reason_code: string | null; request_id: string; updated_at: string;
  /** Hạn chờ (phút) của dòng chính sách LÚC GỬI (MQ-08). */ accept_wait_minutes: number;
  from_code: string; to_code: string; service_date: string;
}
const COT_DE_NGHI = `r.id, r.from_trip_id, r.to_trip_id, r.scope, r.from_stop_id, r.meet_location_id, r.meet_place_text, r.pax_count, r.proposed_by_party_id,
  r.proposed_by_staff_id, r.proposed_at, r.status, r.decided_mode, r.decided_by, r.decided_at, r.decided_by_party_id, r.decided_cmd_id, r.closed_cmd_id,
  r.policy_id, r.decline_reason_code,
  r.override_reason_code, r.reject_reason_code, r.request_id, r.updated_at, p.accept_wait_minutes, f.code AS from_code, t.code AS to_code, t.service_date`;
const TU_DE_NGHI = `vc_transfer_request r JOIN vc_dispatch_policy p ON p.id = r.policy_id JOIN vc_trip f ON f.id = r.from_trip_id JOIN vc_trip t ON t.id = r.to_trip_id`;
const DE_NGHI_BY_ID = defineSql("van-chuyen", "de_nghi_by_id", `SELECT ${COT_DE_NGHI} FROM ${TU_DE_NGHI} WHERE r.id = ?1`);
const DE_NGHI_BY_REQUEST = defineSql("van-chuyen", "de_nghi_by_request", `SELECT ${COT_DE_NGHI} FROM ${TU_DE_NGHI} WHERE r.request_id = ?1`);
const DE_NGHI_CUA_CHUYEN = defineSql(
  "van-chuyen",
  "de_nghi_cua_chuyen",
  `SELECT ${COT_DE_NGHI} FROM ${TU_DE_NGHI}
   WHERE r.from_trip_id IN (SELECT value FROM json_each(?1)) OR r.to_trip_id IN (SELECT value FROM json_each(?1)) ORDER BY r.proposed_at DESC, r.id`,
);
const DE_NGHI_THEO_NGAY = defineSql("van-chuyen", "de_nghi_theo_ngay", `SELECT ${COT_DE_NGHI} FROM ${TU_DE_NGHI} WHERE t.service_date = ?1 ORDER BY r.proposed_at DESC, r.id`);
export interface KiemRow {
  transfer_id: string; cmd_id: string; rule_code: string; rule_tier: "LOI" | "CAU_HINH"; ket_qua: "DAT" | "KHONG_DAT" | "CANH_BAO"; gia_tri: number | null;
  gioi_han: number | null; checked_at: string; label: string; sort_order: number;
}
const KIEM_CUA_DE_NGHI = defineSql(
  "van-chuyen",
  "kiem_cua_de_nghi",
  `SELECT c.transfer_id, c.cmd_id, c.rule_code, c.rule_tier, c.ket_qua, c.gia_tri, c.gioi_han, c.checked_at, d.label, d.sort_order
   FROM vc_transfer_check c JOIN vc_transfer_rule d ON d.code = c.rule_code
   WHERE c.transfer_id IN (SELECT value FROM json_each(?1)) ORDER BY c.checked_at, d.sort_order, c.rule_code`,
);
const DIEU_KIEN_CHUYEN_DANG_DUNG = defineSql("van-chuyen", "dieu_kien_chuyen_dang_dung", "SELECT code, label, tier FROM vc_transfer_rule WHERE active = 1 ORDER BY sort_order, code");
export async function deNghiById(db: D1Database, id: string): Promise<DeNghiRow | null> {
  return await db.prepare(DE_NGHI_BY_ID).bind(id).first<DeNghiRow>();
}
export async function deNghiByRequest(db: D1Database, requestId: string): Promise<DeNghiRow | null> {
  return await db.prepare(DE_NGHI_BY_REQUEST).bind(requestId).first<DeNghiRow>();
}
export async function deNghiCuaChuyen(db: D1Database, tripIds: readonly string[]): Promise<DeNghiRow[]> {
  if (tripIds.length === 0) return [];
  return (await db.prepare(DE_NGHI_CUA_CHUYEN).bind(JSON.stringify([...new Set(tripIds)])).all<DeNghiRow>()).results;
}
export async function deNghiTheoNgay(db: D1Database, ngay: string): Promise<DeNghiRow[]> {
  return (await db.prepare(DE_NGHI_THEO_NGAY).bind(ngay).all<DeNghiRow>()).results;
}
export async function kiemCuaDeNghi(db: D1Database, ids: readonly string[]): Promise<KiemRow[]> {
  if (ids.length === 0) return [];
  return (await db.prepare(KIEM_CUA_DE_NGHI).bind(JSON.stringify([...new Set(ids)])).all<KiemRow>()).results;
}
/** Danh mục điều kiện chuyển ĐANG DÙNG (vc_transfer_rule) — lô kiểm ghi đúng một dòng cho mỗi mã ở đây (trigger confirm_may / escalate đếm theo danh mục). */
export async function dieuKienChuyenDangDung(db: D1Database): Promise<{ code: string; label: string; tier: "LOI" | "CAU_HINH" }[]> {
  return (await db.prepare(DIEU_KIEN_CHUYEN_DANG_DUNG).all<{ code: string; label: string; tier: "LOI" | "CAU_HINH" }>()).results;
}

// ---- TIN CHUYẾN (ADR-0052 D6.3): dữ kiện cho thongbao / gốc lắp ráp qua hàm tiêm — chỉ khoá, mã chuyến, ngày, khoảng lái, đơn của suất vắng. ----
const SU_KIEN_THEO_YEU_CAU = defineSql("van-chuyen", "su_kien_theo_yeu_cau", `SELECT id, trip_id, related_trip_id FROM vc_trip_event WHERE request_id = ?1`);
// Phiếu kiểm D1 CAO-2 (ADR-0104 Đ1.6): chuyến được hỏi (?1) CỘNG chuyến NGUỒN của các sự kiện dời có bỏ qua luật trong số sự kiện được hỏi (?2) — sự kiện ghi
// ở chuyến đích, nguồn = `related_trip_id`; tài xế nguồn cũng nhận tin. Một tập cho cả hai câu (chuyến + khoảng lái) — `CHUYEN_NGUON_KHAN_CAP`.
// CAO-C (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật"): cùng vị từ với cờ tin `khan_cap_cho_tin` — `override_rule_code IS NOT NULL`, mọi luật.
const CHUYEN_NGUON_KHAN_CAP = `SELECT e.related_trip_id FROM vc_trip_event e
  WHERE e.id IN (SELECT value FROM json_each(?2)) AND e.kind = 'ALLOCATION_MOVED' AND e.override_rule_code IS NOT NULL AND e.related_trip_id IS NOT NULL`;
// ADR-0111 (gói A5, kế hoạch T10 — đường tin chuyển khách RIÊNG): chuyến XE NHỜ (`related_trip_id`) của sự kiện TRANSFER_* trong số được hỏi (?2) — tài xế xe
// nhờ nhận kết quả đề nghị dù sự kiện không mang luật bị bỏ qua.
const CHUYEN_NGUON_CHUYEN_KHACH = `SELECT e.related_trip_id FROM vc_trip_event e
  WHERE e.id IN (SELECT value FROM json_each(?2)) AND e.kind LIKE 'TRANSFER\\_%' ESCAPE '\\' AND e.related_trip_id IS NOT NULL`;
const CHUYEN_CHO_TIN = defineSql("van-chuyen", "chuyen_cho_tin",
  `SELECT t.id AS trip_id, t.code AS ma, t.service_date AS ngay_chay, t.departed_at AS xuat_ben FROM vc_trip t
   WHERE t.id IN (SELECT value FROM json_each(?1)) OR t.id IN (${CHUYEN_NGUON_KHAN_CAP}) OR t.id IN (${CHUYEN_NGUON_CHUYEN_KHACH})`);
const LAI_CHO_TIN = defineSql("van-chuyen", "lai_cho_tin",
  `SELECT d.trip_id, d.driver_party_id AS party_id, d.valid_from_at AS tu, d.valid_to_at AS den FROM vc_trip_driver d
   WHERE d.trip_id IN (SELECT value FROM json_each(?1)) OR d.trip_id IN (${CHUYEN_NGUON_KHAN_CAP}) OR d.trip_id IN (${CHUYEN_NGUON_CHUYEN_KHACH})`);
/** ADR-0111 (T10): id sự kiện TRANSFER_* (trong số được hỏi) → chuyến xe nhờ. */
const CHUYEN_KHACH_CHO_TIN = defineSql("van-chuyen", "chuyen_khach_cho_tin",
  `SELECT e.id, e.related_trip_id AS nguon FROM vc_trip_event e
   WHERE e.id IN (SELECT value FROM json_each(?1)) AND e.kind LIKE 'TRANSFER\\_%' ESCAPE '\\' AND e.related_trip_id IS NOT NULL`);
const VANG_CHO_TIN = defineSql("van-chuyen", "vang_cho_tin", `
  SELECT e.id AS su_kien_id, k.order_id FROM vc_trip_event e
  JOIN vc_trip_allocation a ON a.id = e.allocation_id JOIN v_ord_leg_key k ON k.id = a.leg_id
  WHERE e.id IN (SELECT value FROM json_each(?1)) AND e.kind = 'PASSENGER_NO_SHOW'`);
// ADR-0104 Đ1 mục 6 + CAO-C (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật (Recommended)" — lệch có chủ ý với chữ ADR-0104 :95, SYSTEM-DESIGN §16): sự
// kiện (trong số được hỏi) mang BẤT KỲ luật bị bỏ qua (`override_rule_code IS NOT NULL`) — cờ tin cho tài xế; id + chuyến nguồn khi là sự kiện dời (CAO-2)
// + `moc` = luật bị bỏ qua là MOC_TOI_THIEU (câu "điều chỉnh khẩn cấp"; luật khác → câu trung tính).
const KHAN_CAP_CHO_TIN = defineSql("van-chuyen", "khan_cap_cho_tin",
  `SELECT e.id, CASE WHEN e.kind = 'ALLOCATION_MOVED' THEN e.related_trip_id END AS nguon, e.override_rule_code = 'MOC_TOI_THIEU' AS moc FROM vc_trip_event e
   WHERE e.id IN (SELECT value FROM json_each(?1)) AND e.override_rule_code IS NOT NULL`);
// MQ-07 (ADR-0052 D6.2): MỌI suất khách (mở lẫn đã đóng — kèm khoảng hiệu lực) của các chặng được hỏi; thongbao lọc "mở lúc sự kiện" bằng hàm thuần.
const SUAT_CHANG_CHO_TIN = defineSql("van-chuyen", "suat_chang_cho_tin", `
  SELECT a.leg_id, a.trip_id, a.valid_from_at AS tu, a.valid_to_at AS den FROM vc_trip_allocation a
  WHERE a.kind = 'PASSENGER' AND a.leg_id IN (SELECT value FROM json_each(?1))`);

export async function suKienTheoYeuCau(db: D1Database, requestId: string): Promise<{ id: string; tripId: string; relatedTripId: string | null } | null> {
  const r = await db.prepare(SU_KIEN_THEO_YEU_CAU).bind(requestId).first<{ id: string; trip_id: string; related_trip_id: string | null }>();
  return r ? { id: r.id, tripId: r.trip_id, relatedTripId: r.related_trip_id } : null;
}
export async function chuyenChoTinTheoId(db: D1Database, q: HoiChuyenChoTin): Promise<ChuyenChoTin> {
  // MQ-07: hỏi theo chặng → đọc suất trước, chuyến của các suất đó vào cùng ba câu dưới (một lần gọi hàm tiêm — không vòng hai).
  const suat = q.legIds?.length
    ? (await db.prepare(SUAT_CHANG_CHO_TIN).bind(JSON.stringify([...new Set(q.legIds)])).all<{ leg_id: string; trip_id: string; tu: string; den: string | null }>()).results
    : null;
  const tj = JSON.stringify([...new Set([...q.tripIds, ...(suat ?? []).map((x) => x.trip_id)])]);
  const sk = JSON.stringify([...new Set(q.suKienIds)]);
  const [t, l, v, k, ck] = await Promise.all([
    db.prepare(CHUYEN_CHO_TIN).bind(tj, sk).all<{ trip_id: string; ma: string; ngay_chay: string; xuat_ben: string | null }>(),
    db.prepare(LAI_CHO_TIN).bind(tj, sk).all<{ trip_id: string; party_id: string; tu: string; den: string | null }>(),
    q.suKienIds.length ? db.prepare(VANG_CHO_TIN).bind(sk).all<{ su_kien_id: string; order_id: string }>() : Promise.resolve({ results: [] }),
    q.suKienIds.length ? db.prepare(KHAN_CAP_CHO_TIN).bind(sk).all<{ id: string; nguon: string | null; moc: number }>() : Promise.resolve({ results: [] }),
    q.suKienIds.length ? db.prepare(CHUYEN_KHACH_CHO_TIN).bind(sk).all<{ id: string; nguon: string }>() : Promise.resolve({ results: [] }),
  ]);
  return {
    chuyen: t.results.map((c) => ({ tripId: c.trip_id, ma: c.ma, ngayChay: c.ngay_chay, xuatBen: c.xuat_ben,
      lai: l.results.filter((x) => x.trip_id === c.trip_id).map((x) => ({ partyId: x.party_id, tu: x.tu, den: x.den })) })),
    vang: v.results.map((x) => ({ suKienId: x.su_kien_id, orderId: x.order_id })),
    khanCap: k.results.map((x) => x.id),
    vuotMoc: k.results.filter((x) => x.moc === 1).map((x) => x.id),
    khanCapNguon: k.results.flatMap((x) => (x.nguon ? [{ suKienId: x.id, tripId: x.nguon }] : [])),
    chuyenKhachNguon: ck.results.map((x) => ({ suKienId: x.id, tripId: x.nguon })),
    ...(suat ? { suatChang: suat.map((x) => ({ legId: x.leg_id, tripId: x.trip_id, tu: x.tu, den: x.den })) } : {}),
  };
}
