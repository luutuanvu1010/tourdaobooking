// Kiểm migration CAM KẾT CỦA CHẶNG (kế hoạch Đợt 7 Task 1; ADR-0056 VK3-A A1, A3): hai cột trên `ord_transfer_leg` (orders) —
// `exclusive_vehicle` (xe riêng) và `min_vehicle_seats` (xe tối thiểu N chỗ) — và hai cột phá lệ trên `vc_trip` (van-chuyen) —
// `commitment_override_reason_code` + `commitment_override_key`. Chèn / sửa THẲNG bằng SQL (không qua mã ứng dụng): chứng minh chặn nằm ở CSDL.
// Tệp tìm theo ĐUÔI tên (CHANGE-GUIDE công thức d) — đổi số migration lúc gộp chỉ phải đổi tên tệp. Khuôn: src/migrations-chang-o-moi.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_cam_ket_chang.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-05T03:00:00.000Z";
const H = 3_600_000;
const T0 = Date.parse("2026-10-10T07:00:00.000+07:00");

/** Dựng schema từ MỌI migration TRƯỚC tệp cam kết, gieo chặng + chuyến "cũ", rồi áp tệp cam kết (chứng minh dòng cũ nhận giá trị mặc định). */
function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  // Chỉ các migration ĐỨNG TRƯỚC tệp cam kết; các tệp sau áp SAU tệp cam kết (đúng thứ tự thật). Áp tệp sau trước tệp cam kết để lại view nhắc cột chưa có
  // (v_ord_leg_commit của 0089) — lệnh ALTER TABLE … RENAME của 0097 kiểm lại cả lược đồ nên báo lỗi «no such column».
  for (const f of files.filter((x) => x < MATCHES[0]!)) d.exec(sqlOf(f));
  d.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  d.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o1', 'Tour', 'perPax', 4, '2026-10-10')`);
  d.exec(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at)
          VALUES ('leg-cu', 'o1', 'sv1', 'OUT', '2026-10-10', 'Khách sạn A', '${AT}', '${AT}')`);
  const chu = (d.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string }).party_id;
  d.exec(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
          VALUES ('xe-1', '79B00001', '79B00001', 'KHUNG1', 'KHUNG1', 'Xe thử', 2020, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, rented, last_cmd_id, created_at, updated_at)
          VALUES ('tr-cu', 'CX-1010-01', 'xe-1', '${chu}', '2026-10-10', ${T0}, ${T0 + 2 * H}, ${T0}, 30, 0, '${randomUUID()}', '${AT}', '${AT}')`);
  for (const f of MATCHES) d.exec(sqlOf(f));
  for (const f of files.filter((x) => x > MATCHES[MATCHES.length - 1]!)) d.exec(sqlOf(f));
  return d;
}
let n = 0;
const leg = (d: DatabaseSync, xeRieng: number, soCho: number | null) =>
  d.prepare(
    `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at, exclusive_vehicle, min_vehicle_seats)
     VALUES (?, 'o1', 'sv1', 'OUT', '2026-10-10', 'Khách sạn A', ?, ?, ?, ?)`,
  ).run(`leg-${++n}`, AT, AT, xeRieng, soCho);
const suaChuyen = (d: DatabaseSync, id: string, ma: string | null, khoa: string | null) =>
  d.prepare("UPDATE vc_trip SET commitment_override_reason_code = ?, commitment_override_key = ? WHERE id = ?").run(ma, khoa, id);

test("migration cam kết chặng: đúng MỘT tệp `*_cam_ket_chang.sql`, số sau 0076, chỉ-thêm (không dựng lại bảng, không xoá trigger cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.ok(MATCHES[0]! > "0076", MATCHES[0]);
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /DROP TABLE|DROP TRIGGER|ord_transfer_leg_new|vc_trip_new/i, "chỉ-thêm");
});

test("TC-1: chặng và chuyến CŨ sau migration: không xe riêng, không số chỗ tối thiểu, không dấu phá lệ cam kết", () => {
  const d = db();
  const c = d.prepare("SELECT exclusive_vehicle e, min_vehicle_seats m FROM ord_transfer_leg WHERE id = 'leg-cu'").get() as { e: number; m: number | null };
  assert.equal(c.e, 0);
  assert.equal(c.m, null);
  const t = d.prepare("SELECT commitment_override_reason_code r, commitment_override_key k FROM vc_trip WHERE id = 'tr-cu'").get() as { r: string | null; k: string | null };
  assert.equal(t.r, null);
  assert.equal(t.k, null);
});

test("TC-2: exclusive_vehicle chỉ 0 / 1; min_vehicle_seats NULL hoặc 1..100 (INSERT lẫn UPDATE)", () => {
  const d = db();
  assert.throws(() => leg(d, 2, null), /CHECK constraint failed/);
  assert.throws(() => leg(d, -1, null), /CHECK constraint failed/);
  assert.throws(() => leg(d, 0, 0), /CHECK constraint failed/);
  assert.throws(() => leg(d, 0, 101), /CHECK constraint failed/);
  for (const [e, c] of [[0, null], [1, null], [0, 1], [1, 100], [1, 15]] as const) assert.doesNotThrow(() => leg(d, e, c), `${e}/${c}`);
  assert.throws(() => d.prepare("UPDATE ord_transfer_leg SET exclusive_vehicle = 2 WHERE id = 'leg-cu'").run(), /CHECK constraint failed/);
  assert.throws(() => d.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 101 WHERE id = 'leg-cu'").run(), /CHECK constraint failed/);
  assert.doesNotThrow(() => d.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 100, exclusive_vehicle = 1 WHERE id = 'leg-cu'").run());
});

test("TC-3: vc_trip — khoá phá lệ cam kết và mã lý do đi CẶP (có cả hai hoặc không có cả hai); mã phải có trong vc_reason; khoá dài 3..4000", () => {
  const d = db();
  assert.throws(() => suaChuyen(d, "tr-cu", "PHA_LE_SU_CO", null), /constraint|commitment/i, "có lý do thiếu khoá");
  assert.throws(() => suaChuyen(d, "tr-cu", null, "xe:xe-1|leg-a:XR:1:-"), /constraint|commitment/i, "có khoá thiếu lý do");
  assert.throws(() => suaChuyen(d, "tr-cu", "KHONG_CO_MA_NAY", "xe:xe-1"), /FOREIGN KEY|constraint/i, "mã lạ");
  assert.throws(() => suaChuyen(d, "tr-cu", "PHA_LE_SU_CO", "ab"), /constraint|commitment/i, "khoá ngắn quá");
  assert.throws(() => suaChuyen(d, "tr-cu", "PHA_LE_SU_CO", "x".repeat(4001)), /constraint|commitment/i, "khoá dài quá");
  assert.doesNotThrow(() => suaChuyen(d, "tr-cu", "PHA_LE_SU_CO", "xe:xe-1|leg-a:XR:1:-"));
  assert.doesNotThrow(() => suaChuyen(d, "tr-cu", "PHA_LE_SU_CO", "x".repeat(4000)));
  assert.doesNotThrow(() => suaChuyen(d, "tr-cu", null, null), "xoá cả hai cùng lúc (rút bớt tới hết vi phạm)");
});

test("TC-4: chuyến đã kết thúc / huỷ không sửa được khoá phá lệ cam kết (trigger có sẵn lc06_final — bài chỉ ghim)", () => {
  const d = db();
  suaChuyen(d, "tr-cu", "PHA_LE_SU_CO", "xe:xe-1|leg-a:XR:1:-");
  d.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = 'tr-cu'").run();
  assert.throws(() => d.prepare("UPDATE vc_trip SET commitment_override_key = 'xe:xe-1|leg-b:XR:1:-' WHERE id = 'tr-cu'").run(), /lc06_final/);
  assert.throws(() => suaChuyen(d, "tr-cu", null, null), /lc06_final/);
});
