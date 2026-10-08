// Kiểm migration *_cua_so_xuat_ben_va_thu_tu_diem.sql (ADR-0096 Đ1 + Đ2, gói A1) — LỚP CSDL: sửa THẲNG SQL trên schema thật dựng từ MỌI migrations/*.sql
// bằng node:sqlite. LC-19 (trigger vc_trip_departure_stop_order), LC-20 (trigger vc_trip_departure_window, kể cả nhánh KHÔNG CÓ chính sách), cột
// departure_window_minutes (mặc định 720 trong BẢNG, CHECK 60–2880). Lớp máy chủ: dieu-phoi-kiem.test.ts + bài route.
// P16 hai cách: (1) mỗi bài chặn có vế "DROP TRIGGER → cùng câu ghi QUA" (chứng minh chính trigger chặn, chạy mọi lần); (2) biến môi trường
// CUA_SO_THU_TU_SQL trỏ bản sao đã sửa cố ý của migration (bỏ trigger) → bài đỏ (quan sát một lần, ghi ở báo cáo A1 + đề xuất dòng sổ hàng rào).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_cua_so_xuat_ben_va_thu_tu_diem.sql"));
const SQL_SUA = process.env.CUA_SO_THU_TU_SQL ? readFileSync(process.env.CUA_SO_THU_TU_SQL, "utf8") : null;
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));

const AT = "2026-08-01T03:00:00.000Z";
const POLICY = "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0"; // dòng chính sách gieo của 0041 (valid_from 2026-09-01)
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const LOC2 = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
type Db = DatabaseSync;
let n = 0;
const nid = (p: string) => `${p}-${++n}`;
const msVn = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00.000+07:00`);
const iso = (m: number) => new Date(m).toISOString();
function openDb(): Db {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
}
const run = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const one = <T>(db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).get(...a) as T;
function lo<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
function hoSo(db: Db, ten: string): string {
  const id = nid("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)", id, ten, AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)", id, ten, AT, AT);
  return id;
}
/** Chuyến kế hoạch ngày `day` 07:00–09:00 (xe công ty 15 chỗ, một tài xế). */
function chuyen(db: Db, day: string): string {
  const chu = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
  const xe = nid("xe");
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, 15, ?, 'active', '2026-07-01', ?, ?)`, xe, `79B${String(n).padStart(5, "0")}`, `79B${String(n).padStart(5, "0")}`, `KHUNG${n}`, `KHUNG${n}`, chu, AT, AT);
  const id = nid("tr");
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, xe, chu, day, msVn(day, "07:00"), msVn(day, "09:00"), msVn(day, "07:00"), randomUUID(), AT, AT);
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), id, hoSo(db, "Tài xế"), AT, AT, AT);
  return id;
}
function diem(db: Db, trip: string, kind: "PICKUP" | "DROPOFF", seq: number, loc = LOC): string {
  const id = nid("st");
  run(db, `INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_text, place_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    id, trip, seq, kind, loc, `L:${loc}`, AT, AT);
  return id;
}
/** Suất người đi kèm (không cần đơn — LC-19 xét MỌI suất mở WAITING có cả hai điểm). */
function suat(db: Db, trip: string, board: string, alight: string): string {
  const id = nid("al");
  run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, crew_party_id, board_stop_id, alight_stop_id, status, valid_from_at, created_at, updated_at)
     VALUES (?, ?, 'CREW', ?, ?, ?, 'WAITING', ?, ?, ?)`, id, trip, hoSo(db, "Người đi kèm"), board, alight, AT, AT, AT);
  return id;
}
/** Lô xuất bến đúng khuôn (cổng → sự kiện DEPARTED → dòng kiểm ĐẠT → trạng thái cuối) với giờ xuất bến `luc`. */
function xuatBen(db: Db, trip: string, luc: string): void {
  lo(db, () => {
    const cmd = randomUUID();
    run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?, updated_at = ? WHERE id = ?", cmd, luc, trip);
    run(db, `INSERT INTO vc_trip_event (id, trip_id, kind, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, created_at, updated_at)
       VALUES (?, ?, 'DEPARTED', ?, 'NGUOI', ?, ?, 'MAY_CHU', ?, ?)`, cmd, trip, randomUUID(), luc, Date.parse(luc), luc, luc);
    const t = one<{ vehicle_id: string; carrier_party_id: string }>(db, "SELECT vehicle_id, carrier_party_id FROM vc_trip WHERE id = ?", trip);
    run(db, `INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
       rest_minutes_used, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'DAT', ?, '79B-000.00', 15, ?, ?, 30, ?, ?, ?)`,
      nid("ck"), trip, cmd, POLICY, t.vehicle_id, t.carrier_party_id, t.carrier_party_id, luc, luc, luc);
    run(db, "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?, departed_ms = ? WHERE id = ? AND last_cmd_id = ?", luc, Date.parse(luc), trip, cmd);
  });
}
const trangThai = (db: Db, trip: string) => one<{ s: string }>(db, "SELECT status s FROM vc_trip WHERE id = ?", trip).s;
const DAY = "2026-10-05";
const DUNG_GIO = iso(msVn(DAY, "06:55"));

test("đúng MỘT tệp *_cua_so_xuat_ben_va_thu_tu_diem.sql (0084); chỉ thêm cột + trigger (không DROP / CREATE TABLE)", () => {
  assert.deepEqual(MATCHES, ["0084_cua_so_xuat_ben_va_thu_tu_diem.sql"]);
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /DROP\s+TABLE|CREATE\s+TABLE/i);
});

test("ADR-0096 Đ2.2 cột departure_window_minutes: dòng gieo nhận 720 (mặc định của BẢNG); chèn ngoài 60–2880 → CSDL chặn", () => {
  const db = openDb();
  assert.equal(one<{ w: number }>(db, "SELECT departure_window_minutes w FROM vc_dispatch_policy WHERE id = ?", POLICY).w, 720);
  const chen = (w: number, luc: string) => run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract,
     proxy_backdate_max_minutes, duty_day_max_minutes, trip_no_break_max_minutes, departure_window_minutes, valid_from_at, created_at, updated_at)
     VALUES (?, 360, 120, 30, 1, 0, 180, 480, 240, ?, ?, ?, ?)`, randomUUID(), w, luc, luc, luc);
  assert.throws(() => chen(59, "2026-10-01T00:00:00.000Z"), /CHECK/);
  assert.throws(() => chen(2881, "2026-10-01T00:00:00.000Z"), /CHECK/);
  chen(60, "2026-10-01T00:00:00.000Z");
  chen(2880, "2026-10-02T00:00:00.000Z");
});

test("LC-19 (trigger vc_trip_departure_stop_order): suất CHỜ LÊN có điểm trả đứng trước / BẰNG số điểm đón → xuất bến RAISE; bỏ trigger thì CÙNG lô qua", () => {
  const db = openDb();
  const c = chuyen(db, DAY);
  const tra = diem(db, c, "DROPOFF", 1, LOC2);
  const don = diem(db, c, "PICKUP", 2);
  suat(db, c, don, tra);
  assert.throws(() => xuatBen(db, c, DUNG_GIO), /lc19_tra_truoc_don/);
  assert.equal(trangThai(db, c), "PLANNED");
  // Bằng số cũng chặn.
  const c2 = chuyen(db, DAY);
  suat(db, c2, diem(db, c2, "PICKUP", 3), diem(db, c2, "DROPOFF", 3, LOC2));
  assert.throws(() => xuatBen(db, c2, DUNG_GIO), /lc19_tra_truoc_don/);
  // Đúng thứ tự → qua.
  const c3 = chuyen(db, DAY);
  suat(db, c3, diem(db, c3, "PICKUP", 1), diem(db, c3, "DROPOFF", 2, LOC2));
  xuatBen(db, c3, DUNG_GIO);
  assert.equal(trangThai(db, c3), "RUNNING");
  // P16: bỏ trigger → cùng lô của chuyến 1 qua (chính trigger này chặn, không phải luật khác).
  db.exec("DROP TRIGGER vc_trip_departure_stop_order");
  xuatBen(db, c, DUNG_GIO);
  assert.equal(trangThai(db, c), "RUNNING");
});

test("LC-19: suất đã ĐÓNG (rút) không xét — xuất bến qua", () => {
  const db = openDb();
  const c = chuyen(db, DAY);
  const a = suat(db, c, diem(db, c, "PICKUP", 2), diem(db, c, "DROPOFF", 1, LOC2));
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED', closed_by = 's' WHERE id = ?", AT, a);
  xuatBen(db, c, DUNG_GIO);
  assert.equal(trangThai(db, c), "RUNNING");
});

test("LC-20 (trigger vc_trip_departure_window): chuyến 07:00 — xuất bến 18:59 hôm trước (12 giờ 1 phút trước) → RAISE; 19:00 → qua; bỏ trigger thì CÙNG lô qua", () => {
  const db = openDb();
  const c = chuyen(db, DAY);
  assert.throws(() => xuatBen(db, c, iso(msVn("2026-10-04", "18:59"))), /lc20_ngoai_cua_so/);
  assert.equal(trangThai(db, c), "PLANNED");
  const c2 = chuyen(db, DAY);
  xuatBen(db, c2, iso(msVn("2026-10-04", "19:00")));
  assert.equal(trangThai(db, c2), "RUNNING");
  db.exec("DROP TRIGGER vc_trip_departure_window");
  xuatBen(db, c, iso(msVn("2026-10-04", "18:59")));
  assert.equal(trangThai(db, c), "RUNNING");
});

test("LC-20: dòng chính sách áp = dòng hiệu lực TẠI giờ xuất bến — cửa sổ 1440 từ 01/10 cho xuất bến 13 giờ trước; dòng có hiệu lực SAU giờ xuất bến không áp", () => {
  const db = openDb();
  run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes,
     duty_day_max_minutes, trip_no_break_max_minutes, departure_window_minutes, valid_from_at, created_at, updated_at)
     VALUES (?, 360, 120, 30, 1, 0, 180, 480, 240, 1440, '2026-10-01T00:00:00.000Z', ?, ?)`, randomUUID(), AT, AT);
  const c = chuyen(db, DAY);
  xuatBen(db, c, iso(msVn("2026-10-04", "18:00")));
  assert.equal(trangThai(db, c), "RUNNING");
  // Dòng 60 phút có hiệu lực từ 2026-10-10 — chuyến 06/10 xuất bến 05/10 20:00 vẫn theo dòng 1440 (hiệu lực tại giờ xuất bến).
  run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes,
     duty_day_max_minutes, trip_no_break_max_minutes, departure_window_minutes, valid_from_at, created_at, updated_at)
     VALUES (?, 360, 120, 30, 1, 0, 180, 480, 240, 60, '2026-10-10T00:00:00.000Z', ?, ?)`, randomUUID(), AT, AT);
  const c2 = chuyen(db, "2026-10-06");
  xuatBen(db, c2, iso(msVn("2026-10-05", "20:00")));
  assert.equal(trangThai(db, c2), "RUNNING");
});

test("LC-20 nhánh KHÔNG CÓ chính sách (giờ xuất bến trước dòng chính sách đầu tiên 2026-09-01) → RAISE dù trong 12 giờ; bỏ trigger thì qua (P16 riêng nhánh này)", () => {
  const db = openDb();
  const c = chuyen(db, "2026-08-20");
  assert.throws(() => xuatBen(db, c, iso(msVn("2026-08-20", "06:55"))), /lc20_ngoai_cua_so/);
  db.exec("DROP TRIGGER vc_trip_departure_window");
  xuatBen(db, c, iso(msVn("2026-08-20", "06:55")));
  assert.equal(trangThai(db, c), "RUNNING");
});
