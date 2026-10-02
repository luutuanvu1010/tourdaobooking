// SQL TIỀN XE THUÊ của van-chuyen (ADR-0057 T1 B1/B5; T2 C3/C9) — tệp thứ BA của module nghiêm (src/architecture.test.ts nạp + EXPLAIN từng câu). Mọi câu
// TĨNH qua defineSql, tham số ?N. Chỉ đọc bảng vc_ của mình và VIEW công bố của parties (v_pty_carrier — nhà xe đang hợp tác; v_pty_party_label — tên).
// KHÔNG câu nào cộng tiền (`sum(`) — tổng chi phí chỉ tính ở tien-xe.ts (`tongChiPhiChuyen`, hàng rào src/tien-xe-mot-nguon.test.ts).
import { defineSql } from "../../shared/sql-registry.ts";

// ---- Tuyến ----------------------------------------------------------------------------------------------------------------------------------------------
export interface RouteRow { code: string; name: string; active: number; sort_order: number; updated_at: string }
const ROUTE_LIST = defineSql("van-chuyen", "vc_route_list", "SELECT code, name, active, sort_order, updated_at FROM vc_route ORDER BY active DESC, sort_order, name, code");
const ROUTE_BY_CODE = defineSql("van-chuyen", "vc_route_by_code", "SELECT code, name, active, sort_order, updated_at FROM vc_route WHERE code = ?1");
/** Mã tuyến máy sinh (`T` + số thứ tự 3 chữ số) — người dùng không nhập mã (bản vẽ Đợt 4). ?1 mã, ?2 tên, ?3 thứ tự, ?4 lúc, ?5 người. */
const ROUTE_INSERT = defineSql(
  "van-chuyen",
  "vc_route_insert",
  "INSERT INTO vc_route (code, name, active, sort_order, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, 1, ?3, ?4, ?5, ?4, ?5)",
);
const ROUTE_UPDATE = defineSql(
  "van-chuyen",
  "vc_route_update",
  "UPDATE vc_route SET name = ?2, active = ?3, sort_order = ?4, updated_at = ?5, updated_by = ?6 WHERE code = ?1",
);
const ROUTE_COUNT = defineSql("van-chuyen", "vc_route_count", "SELECT count(*) AS n FROM vc_route");

export const listRoutes = async (db: D1Database): Promise<RouteRow[]> => (await db.prepare(ROUTE_LIST).all<RouteRow>()).results;
export const findRoute = (db: D1Database, code: string): Promise<RouteRow | null> => db.prepare(ROUTE_BY_CODE).bind(code).first<RouteRow>();
export const routeCount = async (db: D1Database): Promise<number> => (await db.prepare(ROUTE_COUNT).first<{ n: number }>())?.n ?? 0;
export const insertRouteStatement = (db: D1Database, v: { code: string; name: string; sortOrder: number }, at: string, actor: string): D1PreparedStatement =>
  db.prepare(ROUTE_INSERT).bind(v.code, v.name, v.sortOrder, at, actor);
export const updateRouteStatement = (db: D1Database, v: { code: string; name: string; active: boolean; sortOrder: number }, at: string, actor: string): D1PreparedStatement =>
  db.prepare(ROUTE_UPDATE).bind(v.code, v.name, v.active ? 1 : 0, v.sortOrder, at, actor);

// ---- Cỡ xe ----------------------------------------------------------------------------------------------------------------------------------------------
export interface SizeRow { code: string; label: string; min_passengers: number; max_passengers: number; active: number; sort_order: number; so_dong_gia_dang_ap: number }
/** Kèm số dòng giá CHƯA KẾT THÚC tính tới ngày ?1 theo cỡ — màn nhắc trước khi ngưng dùng cỡ ("cỡ này còn N dòng giá đang áp" — kế hoạch Đợt 4). */
const SIZE_LIST = defineSql(
  "van-chuyen",
  "vc_size_list",
  `SELECT s.code, s.label, s.min_passengers, s.max_passengers, s.active, s.sort_order,
          (SELECT count(*) FROM vc_rental_rate r WHERE r.vehicle_size_code = s.code AND COALESCE(r.valid_to_date, '9999-12-31') >= ?1) AS so_dong_gia_dang_ap
   FROM vc_vehicle_size s ORDER BY s.active DESC, s.min_passengers, s.code`,
);
const SIZE_BY_CODE = defineSql(
  "van-chuyen",
  "vc_size_by_code",
  "SELECT code, label, min_passengers, max_passengers, active, sort_order, 0 AS so_dong_gia_dang_ap FROM vc_vehicle_size WHERE code = ?1",
);
const SIZE_INSERT = defineSql(
  "van-chuyen",
  "vc_size_insert",
  `INSERT INTO vc_vehicle_size (code, label, min_passengers, max_passengers, active, sort_order, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7, ?6, ?7)`,
);
const SIZE_UPDATE = defineSql("van-chuyen", "vc_size_update", "UPDATE vc_vehicle_size SET label = ?2, active = ?3, updated_at = ?4, updated_by = ?5 WHERE code = ?1");
const SIZE_COUNT = defineSql("van-chuyen", "vc_size_count", "SELECT count(*) AS n FROM vc_vehicle_size");

export const listSizes = async (db: D1Database, ngay: string): Promise<SizeRow[]> => (await db.prepare(SIZE_LIST).bind(ngay).all<SizeRow>()).results;
export const findSize = (db: D1Database, code: string): Promise<SizeRow | null> => db.prepare(SIZE_BY_CODE).bind(code).first<SizeRow>();
export const sizeCount = async (db: D1Database): Promise<number> => (await db.prepare(SIZE_COUNT).first<{ n: number }>())?.n ?? 0;
export const insertSizeStatement = (db: D1Database, v: { code: string; label: string; min: number; max: number; sortOrder: number }, at: string, actor: string): D1PreparedStatement =>
  db.prepare(SIZE_INSERT).bind(v.code, v.label, v.min, v.max, v.sortOrder, at, actor);
export const updateSizeStatement = (db: D1Database, v: { code: string; label: string; active: boolean }, at: string, actor: string): D1PreparedStatement =>
  db.prepare(SIZE_UPDATE).bind(v.code, v.label, v.active ? 1 : 0, at, actor);

// ---- Dòng giá thuê --------------------------------------------------------------------------------------------------------------------------------------
export interface RateRow {
  id: string;
  carrier_party_id: string;
  route_code: string | null;
  vehicle_size_code: string | null;
  unit: string;
  amount: number;
  valid_from_date: string;
  valid_to_date: string | null;
  note: string | null;
  replaces_id: string | null;
  created_at: string;
  updated_at: string;
}
const COT_GIA = "id, carrier_party_id, route_code, vehicle_size_code, unit, amount, valid_from_date, valid_to_date, note, replaces_id, created_at, updated_at";
/** MỌI dòng của một nhà xe (màn gắn nhãn đang áp / sắp áp / đã kết thúc theo ngày xem — không lọc). */
const RATE_LIST = defineSql("van-chuyen", "vc_rate_list", `SELECT ${COT_GIA} FROM vc_rental_rate WHERE carrier_party_id = ?1 ORDER BY valid_from_date DESC, id`);
const RATE_BY_ID = defineSql("van-chuyen", "vc_rate_by_id", `SELECT ${COT_GIA} FROM vc_rental_rate WHERE id = ?1`);
/** ?1 id, ?2 nhà xe, ?3 tuyến, ?4 cỡ, ?5 tiền, ?6 từ, ?7 đến, ?8 ghi chú, ?9 thay dòng, ?10 lúc, ?11 người. */
const RATE_INSERT = defineSql(
  "van-chuyen",
  "vc_rate_insert",
  `INSERT INTO vc_rental_rate (id, carrier_party_id, route_code, vehicle_size_code, unit, amount, valid_from_date, valid_to_date, note, replaces_id,
     created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, 'PER_TRIP', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11)`,
);
/** Đóng MỘT lần (dòng còn mở). ?1 id, ?2 đến ngày, ?3 lúc, ?4 người. */
const RATE_CLOSE = defineSql(
  "van-chuyen",
  "vc_rate_close",
  "UPDATE vc_rental_rate SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL",
);
/**
 * Nhà xe ĐÃ THÔI hợp tác (không còn trong v_pty_carrier) mà còn dòng giá chưa kết thúc tính tới ngày ?1 — để màn bảng giá cho "Kết thúc" được (ADR-0057 B4:
 * đóng giá của nhà xe đã thôi luôn làm được). Tên qua view công bố.
 */
const CARRIERS_INACTIVE_WITH_OPEN_RATE = defineSql(
  "van-chuyen",
  "vc_rate_inactive_carriers",
  `SELECT l.id AS party_id, l.display_name FROM v_pty_party_label l
   WHERE l.id IN (SELECT r.carrier_party_id FROM vc_rental_rate r WHERE COALESCE(r.valid_to_date, '9999-12-31') >= ?1)
     AND l.id NOT IN (SELECT c.party_id FROM v_pty_carrier c)
   ORDER BY l.display_name, l.id`,
);
/** Tên một hồ sơ (nhật ký: "tên nhà xe") qua view công bố. */
const PARTY_NAME = defineSql("van-chuyen", "vc_rate_party_name", "SELECT display_name FROM v_pty_party_label WHERE id = ?1");

export const ratesOfCarrier = async (db: D1Database, carrier: string): Promise<RateRow[]> => (await db.prepare(RATE_LIST).bind(carrier).all<RateRow>()).results;
export const findRate = (db: D1Database, id: string): Promise<RateRow | null> => db.prepare(RATE_BY_ID).bind(id).first<RateRow>();
export const insertRateStatement = (
  db: D1Database, v: { id: string; carrier: string; route: string | null; size: string | null; amount: number; from: string; to: string | null; note: string | null; replaces: string | null },
  at: string, actor: string,
): D1PreparedStatement => db.prepare(RATE_INSERT).bind(v.id, v.carrier, v.route, v.size, v.amount, v.from, v.to, v.note, v.replaces, at, actor);
export const closeRateStatement = (db: D1Database, id: string, to: string, at: string, actor: string): D1PreparedStatement => db.prepare(RATE_CLOSE).bind(id, to, at, actor);
export const inactiveCarriersWithOpenRate = async (db: D1Database, ngay: string): Promise<{ party_id: string; display_name: string }[]> =>
  (await db.prepare(CARRIERS_INACTIVE_WITH_OPEN_RATE).bind(ngay).all<{ party_id: string; display_name: string }>()).results;
export const partyName = async (db: D1Database, id: string): Promise<string | null> => (await db.prepare(PARTY_NAME).bind(id).first<{ display_name: string }>())?.display_name ?? null;

// ---- Dòng chi phí chuyến (ADR-0057 T2 C3) ---------------------------------------------------------------------------------------------------------------
export interface CostLineRow {
  id: string;
  trip_id: string;
  carrier_party_id: string;
  kind: "SNAPSHOT" | "AGREED" | "ADJUSTMENT" | "REVERSAL";
  amount: number;
  rate_id: string | null;
  route_code_snapshot: string | null;
  vehicle_size_code_snapshot: string | null;
  reason_code: string | null;
  note: string | null;
  reverses_id: string | null;
  occurred_date: string;
  cmd_id: string;
  created_at: string;
  created_by: string | null;
}
const COT_CP = `id, trip_id, carrier_party_id, kind, amount, rate_id, route_code_snapshot, vehicle_size_code_snapshot, reason_code, note, reverses_id, occurred_date, cmd_id,
  created_at, created_by`;
/** Mọi dòng của một chuyến theo THỨ TỰ GHI (rowid tăng — bảng chỉ-thêm, không xoá). */
const COST_LINES_OF_TRIP = defineSql("van-chuyen", "vc_cost_lines_of_trip", `SELECT ${COT_CP} FROM vc_trip_cost_line WHERE trip_id = ?1 ORDER BY created_at, rowid`);
export const costLinesOfTrip = async (db: D1Database, tripId: string): Promise<CostLineRow[]> => (await db.prepare(COST_LINES_OF_TRIP).bind(tripId).all<CostLineRow>()).results;

/**
 * Đảo một dòng TRONG LÔ LỆNH CHUYẾN (đổi xe / nhà xe / tuyến / ngày chạy; huỷ). ?1 id, ?2 chuyến, ?3 dấu lệnh, ?4 dòng gốc, ?5 số tiền (= −gốc), ?6 nhà xe của gốc,
 * ?7 lý do hệ thống, ?8 ngày phát sinh (ngày chạy), ?9 lúc, ?10 người. Lính gác dấu lệnh (bài thứ tự lô); phiên bản chi phí ở CÂU CỔNG (`TRIP_GATE_CHI_PHI` — TC-8).
 */
export const COST_REVERSE = defineSql(
  "van-chuyen",
  "vc_cost_reverse",
  `INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reverses_id, reason_code, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?6, 'REVERSAL', ?5, ?4, ?7, ?8, ?3, ?9, ?10, ?9, ?10
   WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)`,
);
// ---- Ghi của Kế toán / Quản trị (route chi phí — ADR-0057 C9; kế hoạch TC-8). KHÔNG dùng lại hai câu lô chuyến (gác bằng dấu lệnh của chuyến — route này không
// đổi dấu lệnh, và chuyến đã kết thúc thì không đổi được). Gác bằng PHIÊN BẢN CHI PHÍ: số dòng của chuyến vẫn bằng số đã đọc; 0 dòng chèn ⇒ 409 "vừa đổi".
// id dòng = requestId của màn (gửi lại ⇒ đọc thấy dòng ⇒ 200 kết quả hiện tại). cmd_id = id dòng nhật ký (cùng lô).
/** ?1 id, ?2 chuyến, ?3 nhà xe (của chuyến), ?4 số tiền (≠ 0), ?5 lý do, ?6 ghi chú, ?7 ngày phát sinh, ?8 dấu (= id nhật ký), ?9 lúc, ?10 người, ?11 phiên bản. */
export const COST_ADJUST_KT = defineSql(
  "van-chuyen",
  "vc_cost_adjust_kt",
  `INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reason_code, note, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, 'ADJUSTMENT', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?9, ?10
   WHERE (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?2) = ?11`,
);
/** ?1 id, ?2 chuyến, ?3 nhà xe của GỐC, ?4 số tiền (= −gốc), ?5 dòng gốc, ?6 lý do, ?7 ghi chú, ?8 ngày phát sinh, ?9 dấu, ?10 lúc, ?11 người, ?12 phiên bản. */
export const COST_REVERSE_KT = defineSql(
  "van-chuyen",
  "vc_cost_reverse_kt",
  `INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reverses_id, reason_code, note, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, 'REVERSAL', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11
   WHERE (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?2) = ?12`,
);
/** "Chụp lại" giá bảng (chỉ chuyến PLANNED, xe thuê). ?1 id, ?2 chuyến, ?3 nhà xe, ?4 tiền, ?5 dòng giá, ?6 tuyến, ?7 cỡ, ?8 số chỗ, ?9 ngày chạy, ?10 dấu, ?11 lúc, ?12 người, ?13 phiên bản. */
export const COST_SNAPSHOT_KT = defineSql(
  "van-chuyen",
  "vc_cost_snapshot_kt",
  `INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, rate_id, route_code_snapshot, vehicle_size_code_snapshot, passenger_capacity_snapshot,
     unit_amount_snapshot, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, 'SNAPSHOT', ?4, ?5, ?6, ?7, ?8, ?4, ?9, ?10, ?11, ?12, ?11, ?12
   WHERE (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?2) = ?13 AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND status = 'PLANNED' AND rented = 1)`,
);
/** Giá thoả thuận trước (chỉ PLANNED, xe thuê). ?1 id, ?2 chuyến, ?3 nhà xe, ?4 tiền, ?5 ghi chú, ?6 ngày chạy, ?7 dấu, ?8 lúc, ?9 người, ?10 phiên bản. */
export const COST_AGREED_KT = defineSql(
  "van-chuyen",
  "vc_cost_agreed_kt",
  `INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reason_code, note, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, 'AGREED', ?4, 'CPX_GIA_THOA_THUAN', ?5, ?6, ?7, ?8, ?9, ?8, ?9
   WHERE (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?2) = ?10 AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND status = 'PLANNED' AND rented = 1)`,
);
const COST_LINE_BY_ID = defineSql("van-chuyen", "vc_cost_line_by_id", `SELECT ${COT_CP} FROM vc_trip_cost_line WHERE id = ?1`);
export const findCostLine = (db: D1Database, id: string): Promise<CostLineRow | null> => db.prepare(COST_LINE_BY_ID).bind(id).first<CostLineRow>();
/** Lúc huỷ chuyến (sự kiện CANCELLED mới nhất — cùng mốc với R-VC-COST-4); null khi chưa huỷ. */
const TRIP_CANCELLED_AT = defineSql("van-chuyen", "vc_trip_cancelled_at", "SELECT occurred_at FROM vc_trip_event WHERE trip_id = ?1 AND kind = 'CANCELLED' ORDER BY created_at DESC LIMIT 1");
export const tripCancelledAt = async (db: D1Database, tripId: string): Promise<string | null> =>
  (await db.prepare(TRIP_CANCELLED_AT).bind(tripId).first<{ occurred_at: string }>())?.occurred_at ?? null;
/** Lý do nhóm chi phí xe (danh mục `vc_reason`, nhóm CHI_PHI_XE) — mã, nhãn, đang dùng. */
const COST_REASONS = defineSql("van-chuyen", "vc_cost_reasons", "SELECT code, label, active FROM vc_reason WHERE reason_group = 'CHI_PHI_XE' ORDER BY sort_order, code");
export const costReasons = async (db: D1Database): Promise<{ code: string; label: string; active: number }[]> =>
  (await db.prepare(COST_REASONS).all<{ code: string; label: string; active: number }>()).results;

// ---- Bảng kê (hình chiếu đọc — ADR-0057 C9; khoảng ngày chạy ≤ 92 ngày, TC-14). KHÔNG cộng tiền ở SQL. ------------------------------------------------
export interface BangKeTripRow {
  id: string; code: string; service_date: string; status: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED"; rented: 0 | 1; route_code: string | null;
  carrier_party_id: string; plate_number: string; carrier_name: string | null;
}
/** Chuyến có ngày chạy trong [?1, ?2], (?3 trống hoặc đúng nhà xe), là xe thuê HOẶC đã có dòng chi phí (chuyến đổi sang xe công ty còn dòng đã đảo). */
const BANG_KE_TRIPS = defineSql(
  "van-chuyen",
  "vc_bang_ke_trips",
  `SELECT t.id, t.code, t.service_date, t.status, t.rented, t.route_code, t.carrier_party_id, v.plate_number, l.display_name AS carrier_name
   FROM vc_trip t JOIN vc_vehicle v ON v.id = t.vehicle_id LEFT JOIN v_pty_party_label l ON l.id = t.carrier_party_id
   WHERE t.service_date >= ?1 AND t.service_date <= ?2 AND (?3 IS NULL OR t.carrier_party_id = ?3)
     AND (t.rented = 1 OR EXISTS (SELECT 1 FROM vc_trip_cost_line c WHERE c.trip_id = t.id))
   ORDER BY l.display_name, t.carrier_party_id, t.service_date, t.planned_start_ms, t.code`,
);
/** Mọi dòng chi phí của các chuyến có ngày chạy trong [?1, ?2] (một truy vấn, không N+1) — thứ tự ghi. */
const BANG_KE_LINES = defineSql(
  "van-chuyen",
  "vc_bang_ke_lines",
  `SELECT c.id, c.trip_id, c.carrier_party_id, c.kind, c.amount, c.rate_id, c.route_code_snapshot, c.vehicle_size_code_snapshot, c.reason_code, c.note, c.reverses_id,
          c.occurred_date, c.cmd_id, c.created_at, c.created_by
   FROM vc_trip_cost_line c JOIN vc_trip t ON t.id = c.trip_id
   WHERE t.service_date >= ?1 AND t.service_date <= ?2 ORDER BY c.created_at, c.rowid`,
);
export const bangKeTrips = async (db: D1Database, tu: string, den: string, nhaXe: string | null): Promise<BangKeTripRow[]> =>
  (await db.prepare(BANG_KE_TRIPS).bind(tu, den, nhaXe).all<BangKeTripRow>()).results;
export const bangKeLines = async (db: D1Database, tu: string, den: string): Promise<CostLineRow[]> =>
  (await db.prepare(BANG_KE_LINES).bind(tu, den).all<CostLineRow>()).results;

/** Chụp giá bảng TRONG LÔ LỆNH CHUYẾN. ?1 id, ?2 chuyến, ?3 dấu lệnh, ?4 nhà xe, ?5 tiền, ?6 dòng giá, ?7 tuyến, ?8 cỡ, ?9 số chỗ, ?10 ngày chạy, ?11 lúc, ?12 người. */
export const COST_SNAPSHOT = defineSql(
  "van-chuyen",
  "vc_cost_snapshot",
  `INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, rate_id, route_code_snapshot, vehicle_size_code_snapshot, passenger_capacity_snapshot,
     unit_amount_snapshot, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?4, 'SNAPSHOT', ?5, ?6, ?7, ?8, ?9, ?5, ?10, ?3, ?11, ?12, ?11, ?12
   WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)`,
);
