// Kiểm migration *_xe_dang_chay.sql (ADR-0052 D5.1–D5.3a, lượt A-1 thu gọn; kế hoạch Đợt 5 Task 1) — LỚP CSDL: chèn / sửa THẲNG SQL trên schema thật dựng từ
// MỌI migrations/*.sql bằng node:sqlite. LC-15 mới (ba đường có tên), câu chốt D5.3a, báo huỷ một lần, gieo nhóm lý do BAO_HUY_DIEM. Lớp máy chủ: bài route.
// P16: biến môi trường XE_DANG_CHAY_SQL trỏ bản sao đã sửa cố ý của migration này.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { gieoMocXep } from "../../../tests/audit/gieo-vc.mjs";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_xe_dang_chay.sql"));
const SQL_SUA = process.env.XE_DANG_CHAY_SQL ? readFileSync(process.env.XE_DANG_CHAY_SQL, "utf8") : null;
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));

const AT = "2026-09-29T03:00:00.000Z";
const POLICY = "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0"; // dòng chính sách gieo của 0041
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const LOC2 = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
const HEX = "a".repeat(64);
const DAY = "2026-10-05";
const ms = (hhmm: string) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`);
const iso = (m: number) => new Date(m).toISOString();
const SAU = iso(ms("07:30")); // mốc lệnh sau xuất bến (07:00)
type Db = DatabaseSync;
let n = 0;
const nid = (p: string) => `${p}-${++n}`;
function openDb(): Db {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
}
const loi = (fn: () => unknown, re: RegExp, msg?: string) => assert.throws(fn, re, msg);
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

// ---- dữ liệu nền (khuôn src/migrations-chuyen-xe.test.ts) -------------------------------------------------------------------------------------------
function hoSo(db: Db, ten: string): string {
  const id = nid("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)", id, ten, AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)", id, ten, AT, AT);
  return id;
}
function don(db: Db, soKhach = 3): { legs: string[]; khach: string[] } {
  const sid = nid("s");
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)", sid, `09${String(n).padStart(8, "0")}`, AT, hoSo(db, "NV"));
  const id = nid("o");
  run(db, "INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'K', '0900000009', ?, ?)", id, `TD-${id}`, sid, AT, AT);
  const svc = nid("sv");
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'ZH1', 'Tour', 'perPax', 4, ?)", svc, id, DAY);
  const leg = nid("leg");
  run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, created_at, updated_at)
     VALUES (?, ?, ?, 'OUT', ?, '07:00', NULL, 'Khách sạn A', ?, ?, ?)`, leg, id, svc, DAY, LOC, AT, AT);
  const khach: string[] = [];
  for (let i = 0; i < soKhach; i++) {
    const k = nid("pax");
    run(db, "INSERT INTO ord_passenger (id, order_id, full_name, birth_year, person_key, created_at, updated_at) VALUES (?, ?, 'Khách Thử', 1990, ?, ?, ?)", k, id, k, AT, AT);
    khach.push(k);
  }
  run(db, "UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?", AT, id);
  gieoMocXep(db, leg);
  return { legs: [leg], khach };
}
interface Chuyen { id: string; di: string; tra: string }
function chuyen(db: Db, cho = 15): Chuyen {
  const chu = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
  const xe = nid("xe");
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`, xe, `79B${String(n).padStart(5, "0")}`, `79B${String(n).padStart(5, "0")}`, `KHUNG${n}`, `KHUNG${n}`, cho, chu, AT, AT);
  const id = nid("tr");
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, xe, chu, DAY, ms("07:00"), ms("09:00"), ms("07:00"), randomUUID(), AT, AT);
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), id, hoSo(db, "Tài xế"), AT, AT, AT);
  return { id, di: diem(db, id, "PICKUP", { text: "Khách sạn A" }), tra: diem(db, id, "DROPOFF") };
}
function diem(db: Db, trip: string, kind: "PICKUP" | "DROPOFF", o: { loc?: string; text?: string; seq?: number; chay?: 0 | 1 } = {}): string {
  const id = nid("st");
  const loc = o.text !== undefined ? null : (o.loc ?? LOC);
  run(db, `INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_text, place_key, added_while_running, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, trip, o.seq ?? 1, kind, loc, o.text ?? null, loc ? `L:${loc}` : `T:${HEX}`, o.chay ?? 0, AT, AT);
  return id;
}
function suat(db: Db, trip: string, board: string, leg: string, o: { key?: string | null; sau?: 0 | 1; cmd?: string | null; luc?: string } = {}): string {
  const id = nid("al");
  run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, board_stop_id, alight_stop_id, status, valid_from_at, added_after_departure, opened_cmd_id,
     created_at, updated_at) VALUES (?, ?, 'PASSENGER', ?, ?, ?, NULL, 'WAITING', ?, ?, ?, ?, ?)`, id, trip, leg, o.key ?? null, board, o.luc ?? AT, o.sau ?? 0, o.cmd ?? null, AT, AT);
  return id;
}
function suKien(db: Db, trip: string, kind: string, id: string, o: { luc?: string; alloc?: string } = {}): void {
  const luc = o.luc ?? SAU;
  run(db, `INSERT INTO vc_trip_event (id, trip_id, kind, allocation_id, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'NGUOI', ?, ?, 'MAY_CHU', ?, ?)`, id, trip, kind, o.alloc ?? null, randomUUID(), luc, Date.parse(luc), luc, luc);
}
function cong(db: Db, trip: string): string {
  const cmd = randomUUID();
  run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?, updated_at = ? WHERE id = ?", cmd, AT, trip);
  return cmd;
}
const chot = (db: Db, trip: string, cmd: string) => run(db, "UPDATE vc_trip SET version = version WHERE id = ? AND last_cmd_id = ?", trip, cmd);
function xuatBen(db: Db, trip: string): void {
  lo(db, () => {
    const cmd = cong(db, trip);
    const luc = iso(ms("07:00"));
    suKien(db, trip, "DEPARTED", cmd, { luc });
    const t = one<{ vehicle_id: string; carrier_party_id: string }>(db, "SELECT vehicle_id, carrier_party_id FROM vc_trip WHERE id = ?", trip);
    run(db, `INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
       rest_minutes_used, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'DAT', ?, '79B-000.00', 15, ?, ?, 30, ?, ?, ?)`,
      nid("ck"), trip, cmd, POLICY, t.vehicle_id, t.carrier_party_id, t.carrier_party_id, AT, AT, AT);
    run(db, "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?, departed_ms = ? WHERE id = ? AND last_cmd_id = ?", luc, Date.parse(luc), trip, cmd);
  });
}
/** Chuyến đang chạy có MỘT suất khách WAITING (có tên) ở điểm đón PENDING. */
function dangChay(db: Db): { c: Chuyen; d: { legs: string[]; khach: string[] }; a: string } {
  const c = chuyen(db);
  const d = don(db);
  const a = suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[0]! });
  xuatBen(db, c.id);
  return { c, d, a };
}
/** Lô D5.3a đúng thứ tự: cổng → sự kiện ALLOCATION_STOP_CHANGED → điểm mới → đóng STOP_CHANGED → mở lại → (câu chốt). */
function capNhatDiem(db: Db, x: { c: Chuyen; d: { legs: string[] }; a: string }, o: { mo?: "cung" | "khong" | "chuyen-khac" | "co-ten"; chot?: boolean; key?: string | null } = {}) {
  return lo(db, () => {
    const cmd = cong(db, x.c.id);
    suKien(db, x.c.id, "ALLOCATION_STOP_CHANGED", cmd);
    const moi = diem(db, x.c.id, "PICKUP", { loc: LOC2, seq: 3, chay: 1 });
    run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'STOP_CHANGED', closed_by = 's', closed_cmd_id = ? WHERE id = ?", SAU, cmd, x.a);
    const key = o.key === undefined ? (one<{ k: string | null }>(db, "SELECT passenger_key k FROM vc_trip_allocation WHERE id = ?", x.a).k) : o.key;
    if ((o.mo ?? "cung") === "cung") suat(db, x.c.id, moi, x.d.legs[0]!, { key, sau: 1, cmd, luc: SAU });
    if (o.chot !== false) chot(db, x.c.id, cmd);
    return cmd;
  });
}

test("đúng MỘT tệp 0076_xe_dang_chay.sql; chỉ thêm cột / dựng lại trigger (không DROP TABLE, không dựng lại bảng)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.equal(MATCHES[0], "0076_xe_dang_chay.sql");
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /DROP\s+TABLE|CREATE\s+TABLE/i);
});

test("gieo: nhóm BAO_HUY_DIEM có đúng 4 lý do đang dùng, ba lý do đúng chữ bản vẽ V11 + «Khác» cuối (luật gieo G4 mỗi nhóm một «Khác»)", () => {
  const db = openDb();
  const r = db.prepare("SELECT code, label FROM vc_reason WHERE reason_group = 'BAO_HUY_DIEM' AND active = 1 ORDER BY sort_order").all() as { code: string; label: string }[];
  assert.deepEqual(r.map((x) => x.label), ["Khách báo không đi", "Khách đổi lịch", "Khách không liên lạc được", "Khác"]);
});

test("LC-15 mới: xe đang chạy — mở suất không cờ / cờ đúng mà sự kiện không phải lệnh thêm điểm → RAISE; thêm điểm không cờ → RAISE; rút REMOVED → RAISE", () => {
  const db = openDb();
  const { c, d, a } = dangChay(db);
  loi(() => suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[1]! }), /lc15_running/, "mở suất không cờ");
  loi(() => lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "ALLOCATED", cmd);
    suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[1]!, sau: 1, cmd, luc: SAU });
  }), /lc15_running/, "cờ đúng nhưng sự kiện của lô là lệnh khác");
  loi(() => lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "STOP_ADDED_RUNNING", cmd);
    suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[1]!, sau: 1, cmd: randomUUID(), luc: SAU });
  }), /lc15_running/, "dấu lệnh mở suất không phải dấu lệnh hiện hành");
  loi(() => diem(db, c.id, "DROPOFF", { loc: LOC2 }), /lc15_running/, "thêm điểm không cờ");
  loi(() => lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "STOPS_REORDERED", cmd);
    diem(db, c.id, "DROPOFF", { loc: LOC2, chay: 1 });
  }), /lc15_running/, "điểm có cờ nhưng sự kiện của lô là lệnh khác");
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED' WHERE id = ?", SAU, a), /lc15_running/, "rút suất");
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'MOVED' WHERE id = ?", SAU, a), /lc15_running/, "dời suất");
});

test("LC-15 mới đường (1) D5.1: lô cổng → sự kiện STOP_ADDED_RUNNING → điểm cờ added_while_running → suất cờ added_after_departure → được; chuyến chưa chạy mang cờ → RAISE", () => {
  const db = openDb();
  const { c, d } = dangChay(db);
  lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "STOP_ADDED_RUNNING", cmd);
    const st = diem(db, c.id, "PICKUP", { loc: LOC2, seq: 3, chay: 1 });
    suat(db, c.id, st, d.legs[0]!, { key: d.khach[1]!, sau: 1, cmd, luc: SAU });
  });
  assert.equal(one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND added_after_departure = 1 AND valid_to_at IS NULL", c.id).n, 1);
  const p = chuyen(db);
  const d2 = don(db);
  loi(() => diem(db, p.id, "PICKUP", { loc: LOC2, chay: 1 }), /lc15_running/, "điểm cờ trên chuyến chưa chạy");
  loi(() => suat(db, p.id, p.di, d2.legs[0]!, { sau: 1 }), /lc15_running/, "suất cờ trên chuyến chưa chạy");
});

test("LC-15 mới đường (2) Kết thúc gián đoạn (lô cũ ADR-0049) → vẫn được; đổi xe / tài xế khi chạy → vẫn RAISE", () => {
  const db = openDb();
  const { c } = dangChay(db);
  loi(() => run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED' WHERE trip_id = ?", SAU, c.id), /lc15_running/);
  lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "ENDED_INTERRUPTED", cmd);
    run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRIP_INTERRUPTED', closed_cmd_id = ? WHERE trip_id = ? AND valid_to_at IS NULL", SAU, cmd, c.id);
    run(db, "UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = 'GIAN_DOAN_KHAC' WHERE trip_id = ? AND status IN ('PENDING', 'ARRIVED')", c.id);
    run(db, "UPDATE vc_trip SET status = 'ENDED_INTERRUPTED', end_reason_code = 'GIAN_DOAN_KHAC', ended_at = ?, ended_ms = ? WHERE id = ? AND last_cmd_id = ?", SAU, Date.parse(SAU), c.id, cmd);
  });
  assert.equal(one<{ s: string }>(db, "SELECT status s FROM vc_trip WHERE id = ?", c.id).s, "ENDED_INTERRUPTED");
});

test("LC-15 mới đường (3) + câu chốt D5.3a: lô đóng → mở → chốt được; số chỗ không đổi; bỏ câu mở → RAISE ở câu chốt", () => {
  const db = openDb();
  const x = dangChay(db);
  const truoc = one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL", x.c.id).n;
  capNhatDiem(db, x);
  assert.equal(one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL", x.c.id).n, truoc, "số chỗ không đổi");
  const y = dangChay(db);
  loi(() => capNhatDiem(db, y, { mo: "khong" }), /d53a_balance/, "đóng không mở lại");
  assert.equal(one<{ v: string | null }>(db, "SELECT valid_to_at v FROM vc_trip_allocation WHERE id = ?", y.a).v, null, "cả lô huỷ");
});

test("câu chốt D5.3a: đóng ở chuyến A, mở ở chuyến B cùng dấu → RAISE; đóng suất chưa tên, mở suất có tên → RAISE; mở trước đóng cùng người → UNIQUE LC-01", () => {
  const db = openDb();
  const x = dangChay(db);
  const b = chuyen(db);
  xuatBen(db, b.id);
  loi(() => lo(db, () => {
    const cmd = cong(db, x.c.id);
    suKien(db, x.c.id, "ALLOCATION_STOP_CHANGED", cmd);
    run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'STOP_CHANGED', closed_cmd_id = ? WHERE id = ?", SAU, cmd, x.a);
    // chuyến B mang CHÍNH dấu lệnh (giả lập lô xấu): mở suất cùng người ở B
    run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ? WHERE id = ?", cmd, b.id);
    suKien(db, b.id, "STOP_ADDED_RUNNING", randomUUID()); // sự kiện khác id — không làm đường (1) hợp lệ
    suat(db, b.id, b.di, x.d.legs[0]!, { key: x.d.khach[0]!, sau: 1, cmd, luc: SAU });
    chot(db, x.c.id, cmd);
  }), /lc15_running|d53a_balance/, "mở ở chuyến khác");
  // Suất chưa tên đóng, mở lại suất CÓ tên của người khác.
  const c = chuyen(db);
  const d = don(db);
  const a = suat(db, c.id, c.di, d.legs[0]!, { key: null });
  xuatBen(db, c.id);
  loi(() => capNhatDiem(db, { c, d, a }, { key: d.khach[2]! }), /lc15_running|d53a_balance/, "đóng chưa tên, mở có tên");
  // Mở trước đóng cùng người → UNIQUE (chỉ mục LC-01 không gồm điểm — thứ tự lô phải là đóng → mở).
  const z = dangChay(db);
  loi(() => lo(db, () => {
    const cmd = cong(db, z.c.id);
    suKien(db, z.c.id, "ALLOCATION_STOP_CHANGED", cmd);
    const moi = diem(db, z.c.id, "PICKUP", { loc: LOC2, seq: 3, chay: 1 });
    suat(db, z.c.id, moi, z.d.legs[0]!, { key: z.d.khach[0]!, sau: 1, cmd, luc: SAU });
  }), /UNIQUE constraint failed|lc15_running/, "mở trước đóng");
});

test("câu chốt KHÔNG bắt nhầm câu cổng của lệnh khác (version + 1): lô xếp trên chuyến chưa chạy + lô tiến độ chạy lại → được", () => {
  const db = openDb();
  const c = chuyen(db);
  const d = don(db);
  lo(db, () => {
    const cmd = cong(db, c.id);
    suKien(db, c.id, "ALLOCATED", cmd, { luc: AT });
    suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[0]!, cmd });
    suat(db, c.id, c.di, d.legs[0]!, { key: d.khach[1]!, cmd });
  });
  cong(db, c.id); // cổng lệnh kế (version + 1) — không câu chốt
  xuatBen(db, c.id);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", SAU, c.di);
  lo(db, () => {
    run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE trip_id = ? AND valid_to_at IS NULL", c.id);
    cong(db, c.id);
  });
  assert.equal(one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND status = 'BOARDED'", c.id).n, 2);
});

test("LC-15 mới: STOP_CHANGED cho suất ĐÃ ĐÓN / điểm đã tới → RAISE; STOP_CHANGED không có sự kiện mang dấu lệnh → RAISE", () => {
  const db = openDb();
  const x = dangChay(db);
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'STOP_CHANGED', closed_cmd_id = (SELECT last_cmd_id FROM vc_trip WHERE id = ?) WHERE id = ?", SAU, x.c.id, x.a),
    /lc15_running/, "không sự kiện");
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", SAU, x.c.di);
  loi(() => capNhatDiem(db, x), /lc15_running/, "điểm đã tới");
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", x.a);
  loi(() => capNhatDiem(db, x), /lc15_running/, "suất đã đón");
});

test("báo huỷ (D5.2): đặt một lần trong lô có sự kiện báo huỷ → được, suất vẫn mở và chiếm chỗ; đặt lần hai / suất đã đón / thiếu cột / sai nhóm / không sự kiện → chặn", () => {
  const db = openDb();
  const x = dangChay(db);
  const datCo = (a: string, lyDo = "BAO_HUY_KHONG_DI", kind = "ALLOCATION_OFFICE_CANCELLED") =>
    lo(db, () => {
      const cmd = cong(db, x.c.id);
      suKien(db, x.c.id, kind, cmd, { alloc: a });
      run(db, "UPDATE vc_trip_allocation SET office_cancel_at = ?, office_cancel_by = 's', office_cancel_reason_code = ? WHERE id = ?", SAU, lyDo, a);
    });
  loi(() => datCo(x.a, "PHA_LE_KHAC"), /d52_office_cancel/, "lý do sai nhóm");
  loi(() => datCo(x.a, "BAO_HUY_KHONG_DI", "STOPS_REORDERED"), /d52_office_cancel/, "lô không phải báo huỷ");
  loi(() => run(db, "UPDATE vc_trip_allocation SET office_cancel_at = ? WHERE id = ?", SAU, x.a), /CHECK constraint failed|d52_office_cancel/, "thiếu cột");
  datCo(x.a);
  const r = one<{ v: string | null; s: string; c: string }>(db, "SELECT valid_to_at v, status s, office_cancel_reason_code c FROM vc_trip_allocation WHERE id = ?", x.a);
  assert.deepEqual([r.v, r.s, r.c], [null, "WAITING", "BAO_HUY_KHONG_DI"], "chỉ đặt cờ — suất vẫn mở, vẫn chiếm chỗ");
  loi(() => datCo(x.a, "BAO_HUY_KHAC"), /d52_office_cancel/, "đặt lần hai");
  // Tài xế ghi "Đã đón" sau báo huỷ (báo huỷ nhầm — D5.2) → được.
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", SAU, x.c.di);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", x.a);
  // Suất đã đón → không đặt được cờ.
  const y = dangChay(db);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", SAU, y.c.di);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", y.a);
  loi(() => lo(db, () => {
    const cmd = cong(db, y.c.id);
    suKien(db, y.c.id, "ALLOCATION_OFFICE_CANCELLED", cmd, { alloc: y.a });
    run(db, "UPDATE vc_trip_allocation SET office_cancel_at = ?, office_cancel_by = 's', office_cancel_reason_code = 'BAO_HUY_KHONG_DI' WHERE id = ?", SAU, y.a);
  }), /d52_office_cancel/, "suất đã đón");
});

test("LC-04 dựng lại: cờ added_while_running, opened_cmd_id bất biến; closed_cmd_id chỉ trên suất đã đóng", () => {
  const db = openDb();
  const c = chuyen(db);
  const d = don(db);
  const a = suat(db, c.id, c.di, d.legs[0]!, { cmd: "cmd-1" });
  loi(() => run(db, "UPDATE vc_trip_stop SET added_while_running = 1 WHERE id = ?", c.di), /lc04_identity/);
  loi(() => run(db, "UPDATE vc_trip_allocation SET opened_cmd_id = 'khac' WHERE id = ?", a), /lc04_identity/);
  loi(() => run(db, "UPDATE vc_trip_allocation SET closed_cmd_id = 'x' WHERE id = ?", a), /CHECK constraint failed/);
});
