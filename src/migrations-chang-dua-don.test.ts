// Kiểm migration CHẶNG ĐƯA ĐÓN (ADR-0047 A1; module orders — kế hoạch Task A4): bảng `ord_transfer_leg`, ba loại điểm mới, CHÉP giờ/nơi đón cũ của
// `order_service` thành chặng chiều đi, và các bất biến sát dữ liệu (phạm vi đơn, cấm xoá sau xác nhận, khoá danh tính chặng, chặng đã đóng không sửa,
// ngày đón bắt buộc sau xác nhận). Chèn/sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh chặn nằm ở CSDL. Dựng schema bằng node:sqlite từ
// migrations/*.sql. Tệp tìm theo ĐUÔI tên (CHANGE-GUIDE công thức d). Tên, SĐT dùng ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chang_dua_don.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
const AT = "2026-09-29T03:00:00.000Z";
const UUID_RE = /^[0-9a-f-]{36}$/; // src/shared/http.ts — route 2, 3 nhận :legId theo khuôn này
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: (string | number | null)[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const triggers = (db: DatabaseSync): string[] => rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => String(r.name));
const fails = (db: DatabaseSync, sql: string, re: RegExp, ...a: (string | number | null)[]) => assert.throws(() => db.prepare(sql).run(...a), re, sql);

function staff(db: DatabaseSync) {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  db.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
}
function order(db: DatabaseSync, id: string) {
  db.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', ?, ?)`)
    .run(id, `TD-${id}`, AT, AT);
}
interface Svc { id: string; order: string; date?: string | null; time?: string | null; place?: string | null; checkin?: string | null }
function service(db: DatabaseSync, s: Svc) {
  db.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date, pickup_time, pickup_place, checkin_place) VALUES (?, ?, 'Tour', 'perPax', 2, ?, ?, ?, ?)`)
    .run(s.id, s.order, s.date ?? null, s.time ?? null, s.place ?? null, s.checkin ?? null);
}
const setStatus = (db: DatabaseSync, id: string, status: string) => db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, AT, id);

/** Chèn một chặng thẳng bằng SQL. */
let n = 0;
function leg(db: DatabaseSync, o: { order: string; svc: string; id?: string; dir?: string; date?: string | null; time?: string | null; locId?: string | null; place?: string | null; dropLoc?: string | null; drop?: string | null }): string {
  const id = o.id ?? `leg-${++n}`;
  db.prepare(
    `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place,
       closed_at, close_reason_code, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, NULL)`,
  ).run(id, o.order, o.svc, o.dir ?? "OUT", o.date === undefined ? "2026-10-10" : o.date, o.time ?? null, o.locId ?? null, o.place === undefined ? (o.locId ? null : "Khách sạn A") : o.place, o.dropLoc ?? null, o.drop ?? null, AT, AT);
  return id;
}
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const LOC2 = "ec67ff94-bb00-4546-842a-aedb5f916b0a"; // Bến cảng Vinpearl (0010)

/** Đơn nháp `o` có dịch vụ `s` ngày 2026-10-10. */
function draftWithService(db: DatabaseSync, o = "o1", s = "s1") {
  order(db, o);
  service(db, { id: s, order: o, date: "2026-10-10" });
}

test("(a) đúng một tệp *_chang_dua_don.sql; không phải B5; trigger mới đúng tên; bảng ord_transfer_leg có tiền tố module orders", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_chang_dua_don.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  const db = before();
  const truoc = new Set(triggers(db));
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db).filter((t) => !truoc.has(t)), [
    "ord_transfer_leg_closed", "ord_transfer_leg_date_ins", "ord_transfer_leg_date_upd", "ord_transfer_leg_identity", "ord_transfer_leg_no_delete",
    "ord_transfer_leg_scope_ins", "ord_transfer_leg_scope_upd", "orders_confirm_requires_leg_date",
  ]);
  assert.deepEqual(rows(db, "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'ord_transfer_leg' AND name NOT LIKE 'sqlite_%' ORDER BY name").map((r) => r.name), [
    "ord_transfer_leg_date_ix", "ord_transfer_leg_order_ix", "ord_transfer_leg_service_ix",
  ]);
});

test("(b) CHÉP dữ liệu đón cũ: mỗi dịch vụ có giờ HOẶC nơi đón → đúng một chặng chiều đi; mọi trạng thái đơn; đúng giá trị từng cột", () => {
  const db = before();
  staff(db);
  order(db, "o_nd"); // nháp có ngày
  service(db, { id: "s_nd", order: "o_nd", date: "2026-10-10", time: "06:30", place: "Khách sạn A", checkin: "Bến tàu Cầu Đá" });
  service(db, { id: "s_rong", order: "o_nd", date: "2026-10-10", time: null, place: "" }); // chuỗi rỗng → không chép
  service(db, { id: "s_trang", order: "o_nd", date: "2026-10-10", time: null, place: "   " }); // chỉ khoảng trắng → không chép
  order(db, "o_nn"); // nháp không ngày
  service(db, { id: "s_nn", order: "o_nn", date: null, time: null, place: "Nhà riêng", checkin: "  " }); // nơi không giờ; nơi check-in trắng → nơi trả trống
  order(db, "o_c"); // xác nhận
  service(db, { id: "s_c", order: "o_c", date: "2026-10-11", time: "07:00", place: null }); // giờ không nơi → Q1 (a)
  service(db, { id: "s_c2", order: "o_c", date: "2026-10-11" }); // không dữ liệu đón → không chép
  setStatus(db, "o_c", "confirmed");
  order(db, "o_x"); // huỷ (chưa từng xác nhận, không ngày)
  service(db, { id: "s_x", order: "o_x", date: null, time: "05:15", place: "  Sân bay Cam Ranh  " });
  setStatus(db, "o_x", "cancelled");

  db.exec(sqlOf(FILE));
  const legs = rows(db, "SELECT * FROM ord_transfer_leg ORDER BY order_service_id");
  assert.equal(legs.length, 4, JSON.stringify(legs.map((l) => l.order_service_id)));
  const strip = (l: Row) => ({
    order_id: l.order_id, order_service_id: l.order_service_id, direction: l.direction, pickup_date: l.pickup_date, pickup_time: l.pickup_time,
    pickup_location_id: l.pickup_location_id, pickup_place: l.pickup_place, dropoff_location_id: l.dropoff_location_id, dropoff_place: l.dropoff_place,
    closed_at: l.closed_at, close_reason_code: l.close_reason_code, created_by: l.created_by, updated_by: l.updated_by,
  });
  const none = { pickup_location_id: null, dropoff_location_id: null, closed_at: null, close_reason_code: null, created_by: null, updated_by: null, direction: "OUT" };
  assert.deepEqual(legs.map(strip), [
    { ...none, order_id: "o_c", order_service_id: "s_c", pickup_date: "2026-10-11", pickup_time: "07:00", pickup_place: "(chưa ghi nơi đón)", dropoff_place: null },
    { ...none, order_id: "o_nd", order_service_id: "s_nd", pickup_date: "2026-10-10", pickup_time: "06:30", pickup_place: "Khách sạn A", dropoff_place: "Bến tàu Cầu Đá" },
    { ...none, order_id: "o_nn", order_service_id: "s_nn", pickup_date: null, pickup_time: null, pickup_place: "Nhà riêng", dropoff_place: null },
    { ...none, order_id: "o_x", order_service_id: "s_x", pickup_date: null, pickup_time: "05:15", pickup_place: "Sân bay Cam Ranh", dropoff_place: null },
  ]);
  const ids = legs.map((l) => String(l.id));
  for (const id of ids) assert.match(id, UUID_RE, `id chặng chép phải khớp UUID_RE (route :legId): ${id}`);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "khuôn 8-4-4-4-12");
  assert.equal(new Set(ids).size, ids.length, "id không trùng");
  assert.equal(new Set(legs.map((l) => l.created_at)).size, 1, "một mốc migration cố định");
  assert.equal(legs[0]!.created_at, legs[0]!.updated_at);
  assert.match(String(legs[0]!.created_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  // hai cột cũ KHÔNG bị đụng
  assert.deepEqual(rows(db, "SELECT pickup_time, pickup_place FROM order_service WHERE id = 's_x'"), [{ pickup_time: "05:15", pickup_place: "  Sân bay Cam Ranh  " }]);
});

test("(c) ba loại điểm mới: HOTEL Khách sạn (5), AIRPORT Sân bay (6), CABLE_CAR Ga cáp treo (7) — chỉ thêm, loại cũ giữ nguyên", () => {
  const db = all();
  assert.deepEqual(rows(db, "SELECT code, name, sort_order, active FROM loc_location_type ORDER BY sort_order"), [
    { code: "OFFICE", name: "Văn phòng", sort_order: 1, active: 1 },
    { code: "TICKET_COUNTER", name: "Quầy vé", sort_order: 2, active: 1 },
    { code: "PIER", name: "Bến tàu", sort_order: 3, active: 1 },
    { code: "PORT", name: "Bến cảng", sort_order: 4, active: 1 },
    { code: "HOTEL", name: "Khách sạn", sort_order: 5, active: 1 },
    { code: "AIRPORT", name: "Sân bay", sort_order: 6, active: 1 },
    { code: "CABLE_CAR", name: "Ga cáp treo", sort_order: 7, active: 1 },
  ]);
});

test("(d) không có dữ liệu đón nào → không chặng nào được chép", () => {
  const db = before();
  staff(db);
  order(db, "o1");
  service(db, { id: "s1", order: "o1", date: "2026-10-10" });
  db.exec(sqlOf(FILE));
  assert.equal(rows(db, "SELECT count(*) AS n FROM ord_transfer_leg")[0]!.n, 0);
});

test("(e) xác nhận đơn còn chặng MỞ thiếu ngày đón → incomplete_trip; có ngày (hoặc chặng đã đóng) → xác nhận được", () => {
  const db = all();
  staff(db);
  draftWithService(db);
  const id = leg(db, { order: "o1", svc: "s1", date: null });
  fails(db, "UPDATE orders SET status = 'confirmed' WHERE id = 'o1'", /incomplete_trip: chặng đưa đón thiếu ngày đón/);
  db.prepare("UPDATE ord_transfer_leg SET pickup_date = '2026-10-10' WHERE id = ?").run(id);
  setStatus(db, "o1", "confirmed");
  assert.equal(rows(db, "SELECT status FROM orders WHERE id = 'o1'")[0]!.status, "confirmed");
  // chặng ĐÃ ĐÓNG thiếu ngày không chặn xác nhận
  draftWithService(db, "o2", "s2");
  const closed = leg(db, { order: "o2", svc: "s2", date: null });
  db.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'WRONG_ENTRY' WHERE id = ?").run(AT, closed);
  setStatus(db, "o2", "confirmed");
});

test("(f) phạm vi: chặng trỏ dịch vụ của ĐƠN KHÁC → leg_scope (chèn và sửa)", () => {
  const db = all();
  staff(db);
  draftWithService(db, "o1", "s1");
  draftWithService(db, "o2", "s2");
  fails(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_place, created_at, updated_at) VALUES ('x', 'o1', 's2', 'OUT', 'A', '${AT}', '${AT}')`, /leg_scope: dịch vụ thuộc đơn khác/);
  const id = leg(db, { order: "o1", svc: "s1" });
  fails(db, "UPDATE ord_transfer_leg SET order_service_id = 's2' WHERE id = ?", /leg_scope: dịch vụ thuộc đơn khác/, id);
});

test("(g) CHECK: nơi đón ĐÚNG MỘT; nơi trả TỐI ĐA MỘT; chiều lạ; giờ/ngày sai khuôn; chữ rỗng; đóng thiếu lý do", () => {
  const db = all();
  staff(db);
  draftWithService(db);
  assert.throws(() => leg(db, { order: "o1", svc: "s1", locId: LOC, place: "Khách sạn A" }), /CHECK constraint failed/, "có cả hai nơi đón");
  assert.throws(() => leg(db, { order: "o1", svc: "s1", place: null }), /CHECK constraint failed/, "không có nơi đón");
  assert.throws(() => leg(db, { order: "o1", svc: "s1", dropLoc: LOC2, drop: "Nhà" }), /CHECK constraint failed/, "có cả hai nơi trả");
  leg(db, { order: "o1", svc: "s1", locId: LOC }); // không nơi trả → được
  leg(db, { order: "o1", svc: "s1", dropLoc: LOC2 });
  assert.throws(() => leg(db, { order: "o1", svc: "s1", dir: "BOTH" }), /CHECK constraint failed/);
  assert.throws(() => leg(db, { order: "o1", svc: "s1", time: "24:00" }), /CHECK constraint failed/);
  assert.throws(() => leg(db, { order: "o1", svc: "s1", time: "7:00" }), /CHECK constraint failed/);
  assert.throws(() => leg(db, { order: "o1", svc: "s1", date: "2026-02-30" }), /CHECK constraint failed/);
  assert.throws(() => leg(db, { order: "o1", svc: "s1", place: "   " }), /CHECK constraint failed/);
  assert.throws(() => leg(db, { order: "o1", svc: "s1", place: "x".repeat(201) }), /CHECK constraint failed/);
  const id = leg(db, { order: "o1", svc: "s1" });
  assert.throws(() => db.prepare("UPDATE ord_transfer_leg SET closed_at = ? WHERE id = ?").run(AT, id), /CHECK constraint failed/, "đóng thiếu lý do");
  assert.throws(() => db.prepare("UPDATE ord_transfer_leg SET close_reason_code = 'NOT_NEEDED' WHERE id = ?").run(id), /CHECK constraint failed/, "lý do mà không đóng");
  assert.throws(() => leg(db, { order: "o1", svc: "s1", locId: "khong-co-diem" }), /FOREIGN KEY constraint failed/);
});

test("(h) xoá: đơn NHÁP được; đơn đã xác nhận / đã huỷ → leg_frozen", () => {
  const db = all();
  staff(db);
  draftWithService(db, "o1", "s1");
  const a = leg(db, { order: "o1", svc: "s1" });
  db.prepare("DELETE FROM ord_transfer_leg WHERE id = ?").run(a);
  const b = leg(db, { order: "o1", svc: "s1" });
  setStatus(db, "o1", "confirmed");
  fails(db, "DELETE FROM ord_transfer_leg WHERE id = ?", /leg_frozen: đơn không còn nháp — bỏ chặng thì đóng dòng/, b);
  draftWithService(db, "o2", "s2");
  const c = leg(db, { order: "o2", svc: "s2" });
  setStatus(db, "o2", "cancelled");
  fails(db, "DELETE FROM ord_transfer_leg WHERE id = ?", /leg_frozen/, c);
});

test("(i) đơn đã xác nhận: đổi chiều / dịch vụ / đơn / mốc tạo → leg_identity; sửa ngày, giờ, nơi của chặng MỞ → được; đơn nháp đổi chiều được", () => {
  const db = all();
  staff(db);
  order(db, "o1");
  service(db, { id: "s1", order: "o1", date: "2026-10-10" });
  service(db, { id: "s1b", order: "o1", date: "2026-10-10" });
  const id = leg(db, { order: "o1", svc: "s1" });
  db.prepare("UPDATE ord_transfer_leg SET direction = 'RETURN' WHERE id = ?").run(id); // nháp: được
  setStatus(db, "o1", "confirmed");
  fails(db, "UPDATE ord_transfer_leg SET direction = 'OUT' WHERE id = ?", /leg_identity: không đổi đơn, dịch vụ, chiều của chặng/, id);
  fails(db, "UPDATE ord_transfer_leg SET order_service_id = 's1b' WHERE id = ?", /leg_identity/, id);
  fails(db, "UPDATE ord_transfer_leg SET created_at = '2026-01-01T00:00:00.000Z' WHERE id = ?", /leg_identity/, id);
  fails(db, "UPDATE ord_transfer_leg SET created_by = 's1' WHERE id = ?", /leg_identity/, id);
  db.prepare("UPDATE ord_transfer_leg SET pickup_date = '2026-10-09', pickup_time = '22:30', pickup_place = NULL, pickup_location_id = ?, dropoff_place = 'Nhà', updated_at = ? WHERE id = ?").run(LOC, AT, id);
  assert.deepEqual(rows(db, "SELECT pickup_date, pickup_time, pickup_location_id, dropoff_place FROM ord_transfer_leg WHERE id = ?", id), [
    { pickup_date: "2026-10-09", pickup_time: "22:30", pickup_location_id: LOC, dropoff_place: "Nhà" },
  ]);
});

test("(j) đóng chặng (closed_at + lý do) được; chặng đã đóng không sửa, không mở lại → leg_closed (kể cả đơn nháp)", () => {
  const db = all();
  staff(db);
  draftWithService(db);
  const id = leg(db, { order: "o1", svc: "s1" });
  db.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'NOT_NEEDED' WHERE id = ?").run(AT, id);
  fails(db, "UPDATE ord_transfer_leg SET closed_at = NULL, close_reason_code = NULL WHERE id = ?", /leg_closed: chặng đã đóng — không sửa, không mở lại/, id);
  fails(db, "UPDATE ord_transfer_leg SET pickup_time = '08:00' WHERE id = ?", /leg_closed/, id);
});

test("(k) ngày đón bắt buộc sau xác nhận: chèn chặng thiếu ngày vào đơn đã xác nhận → leg_date; xoá ngày của chặng mở → leg_date; đơn nháp để trống được", () => {
  const db = all();
  staff(db);
  draftWithService(db);
  leg(db, { order: "o1", svc: "s1", date: null }); // nháp: được
  db.prepare("UPDATE ord_transfer_leg SET pickup_date = '2026-10-10' WHERE order_id = 'o1'").run();
  setStatus(db, "o1", "confirmed");
  assert.throws(() => leg(db, { order: "o1", svc: "s1", date: null }), /leg_date: chặng của đơn đã xác nhận phải có ngày đón/);
  const id = leg(db, { order: "o1", svc: "s1", dir: "RETURN", date: "2026-10-12" }); // thêm chiều về sau xác nhận: được
  fails(db, "UPDATE ord_transfer_leg SET pickup_date = NULL WHERE id = ?", /leg_date/, id);
  // đóng chặng thì không cần ngày
  db.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'REPLACED' WHERE id = ?").run(AT, id);
});
