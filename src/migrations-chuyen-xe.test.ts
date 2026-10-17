// Kiểm migration *_chuyen_xe.sql (ADR-0049 D1, D2 + ADR-0050 VK1-A, VK1-B; kế hoạch Task A12, TC-5 … TC-15, TC-44 (CSDL), TC-45, TC-49 (khuôn place_key),
// bản soi K-03): LÕI CHUYẾN XE — luật lõi LC-01…LC-16 ở LỚP CSDL. Dựng schema THẬT từ MỌI migrations/*.sql bằng node:sqlite, chèn / sửa thẳng SQL (khuôn
// src/migrations-chu-xe-nha-xe.test.ts, src/audit-invariants.test.ts). Mỗi ý một test(...). Lớp máy chủ (luật thuần + route) kiểm ở bài của Task A13 / A15.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts — hàm gieo DÙNG CHUNG mốc giờ hẹn (ADR-0051, 0043: suất khách đòi chặng có mốc)
import { gieoMocXep } from "../tests/audit/gieo-vc.mjs";
import { gieoLyDoHuy } from "../tests/audit/huy-don.mjs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.filter((f) => /^\d{4}_chuyen_xe\.sql$/.test(f))[0]!; // KHÔNG khớp 0033_van_chuyen_xe.sql
/** Cho kịch bản P16 (sửa cố ý): biến môi trường trỏ bản sao đã sửa của migration lõi chuyến. */
const SQL_CHUYEN_XE = process.env.CHUYEN_XE_SQL ? readFileSync(process.env.CHUYEN_XE_SQL, "utf8") : null;
/** P16 cho 0043 (ADR-0051): bản sao đã sửa của migration mốc giờ hẹn. */
const SQL_GOI_BAO = process.env.NHAC_GOI_BAO_SQL ? readFileSync(process.env.NHAC_GOI_BAO_SQL, "utf8") : null;
const sqlOf = (f: string) =>
  f === FILE && SQL_CHUYEN_XE !== null ? SQL_CHUYEN_XE : /^0043_/.test(f) && SQL_GOI_BAO !== null ? SQL_GOI_BAO : readFileSync(new URL(f, DIR), "utf8");

const AT = "2026-09-29T03:00:00.000Z";
const POLICY = "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0"; // dòng chính sách gieo của 0041
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // "Bến tàu du lịch Nha Trang" (0010)
const LOC2 = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
const HEX = "a".repeat(64);
const DAY = "2026-10-05";
/** Mili-giây của giờ VN `hh:mm` ngày DAY (+ `d` ngày). */
const ms = (hhmm: string, d = 0) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`) + d * 86_400_000;
const iso = (m: number) => new Date(m).toISOString();
const H = 3_600_000;

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
const run = (db: Db, sql: string, ...args: (string | number | null)[]) => db.prepare(sql).run(...args);
const one = <T>(db: Db, sql: string, ...args: (string | number | null)[]) => db.prepare(sql).get(...args) as T;

// ---- hồ sơ, xe, tài xế ------------------------------------------------------------------------------------------------------------------------------
function hoSo(db: Db, kind: "PERSON" | "ORGANIZATION", ten: string): string {
  const id = nid("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)", id, kind, ten, AT, AT);
  if (kind === "PERSON") run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)", id, ten, AT, AT);
  return id;
}
const moVai = (db: Db, party: string, code: string) =>
  run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)", nid("r"), party, code, AT, AT);
const congTyChu = (db: Db) => one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
function nhaXe(db: Db): string {
  const x = hoSo(db, "ORGANIZATION", "Nhà xe");
  moVai(db, x, "CARRIER");
  return x;
}
function taiXeCua(db: Db, carrier: string): string {
  const t = hoSo(db, "PERSON", "Tài xế nhà xe");
  run(db, "INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-20', ?, ?)",
    nid("q"), t, carrier, AT, AT);
  return t;
}
function xe(db: Db, chu: string, cho = 15): string {
  const id = nid("xe");
  const bien = `79B${String(n).padStart(5, "0")}`;
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`, id, bien, bien, `KHUNG${n}`, `KHUNG${n}`, cho, chu, AT, AT);
  return id;
}

// ---- đơn, chặng, hành khách (chèn thẳng — khuôn src/audit-invariants.test.ts) -------------------------------------------------------------------------
function nhanVien(db: Db): string {
  const id = nid("s");
  const p = hoSo(db, "PERSON", "Nhân viên");
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)", id, `09${String(n).padStart(8, "0")}`, AT, p);
  return id;
}
interface Don { id: string; svc: string; legs: string[]; khach: string[] }
function don(db: Db, o: { soChang?: number; soKhach?: number; xacNhan?: boolean } = {}): Don {
  const sid = nhanVien(db);
  const id = nid("o");
  run(db, "INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'K', '0900000009', ?, ?)",
    id, `TD-${id}`, sid, AT, AT);
  const svc = nid("sv");
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'ZH1', 'Tour', 'perPax', 4, ?)", svc, id, DAY);
  const legs: string[] = [];
  for (let i = 0; i < (o.soChang ?? 1); i++) {
    const l = nid("leg");
    run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '07:00', NULL, 'Khách sạn A', ?, ?, ?)`, l, id, svc, i === 0 ? "OUT" : "RETURN", DAY, LOC, AT, AT);
    legs.push(l);
  }
  const khach: string[] = [];
  for (let i = 0; i < (o.soKhach ?? 3); i++) {
    const k = nid("pax");
    run(db, "INSERT INTO ord_passenger (id, order_id, full_name, birth_year, person_key, created_at, updated_at) VALUES (?, ?, 'Khách Thử', 1990, ?, ?, ?)", k, id, k, AT, AT);
    khach.push(k);
  }
  if (o.xacNhan !== false) run(db, "UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?", AT, id);
  return { id, svc, legs, khach };
}

// ---- chuyến, tài xế, điểm, suất, sự kiện --------------------------------------------------------------------------------------------------------------
interface Chuyen { id: string; xe: string; chu: string; di: string; tra: string }
function chuyen(db: Db, o: { xe: string; tu?: number; den?: number; som?: number; code?: string }): string {
  const id = nid("tr");
  const tu = o.tu ?? ms("07:00");
  const chu = one<{ c: string }>(db, "SELECT owner_party_id c FROM vc_vehicle WHERE id = ?", o.xe).c;
  const ngay = new Date(tu + 7 * H).toISOString().slice(0, 10);
  // ADR-0057 C2a (0073): cờ xe thuê chụp lúc xếp — phải khớp phân loại chủ chụp (trigger vc_trip_rented_ins).
  const rented = one<{ r: number }>(db, `SELECT CASE WHEN ? IN (SELECT party_id FROM v_pty_carrier) AND ? NOT IN (SELECT party_id FROM v_pty_owner_company) THEN 1 ELSE 0 END r`, chu, chu).r;
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, rented, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?)`, id, o.code ?? `CX-${id}`, o.xe, chu, ngay, tu, o.den ?? tu + 2 * H, o.som ?? tu, rented, randomUUID(), AT, AT);
  return id;
}
const laiXe = (db: Db, trip: string, taiXe: string) =>
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), trip, taiXe, AT, AT, AT);
function diem(db: Db, trip: string, kind: "PICKUP" | "DROPOFF", o: { loc?: string; text?: string; key?: string; seq?: number } = {}): string {
  const id = nid("st");
  const loc = o.text !== undefined ? null : (o.loc ?? LOC);
  run(db, `INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_text, place_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, trip, o.seq ?? 1, kind, loc, o.text ?? null, o.key ?? (loc ? `L:${loc}` : `T:${HEX}`), AT, AT);
  return id;
}
/** Chuyến chuẩn: xe công ty `cho` chỗ, tài xế công ty, điểm đón (chữ tự do) + điểm trả (bến). */
function chuyenChuan(db: Db, o: { cho?: number; tu?: number; den?: number } = {}): Chuyen {
  const chu = congTyChu(db);
  const x = xe(db, chu, o.cho ?? 15);
  const id = chuyen(db, { xe: x, tu: o.tu, den: o.den });
  laiXe(db, id, hoSo(db, "PERSON", "Tài xế công ty"));
  return { id, xe: x, chu, di: diem(db, id, "PICKUP", { text: "Khách sạn A" }), tra: diem(db, id, "DROPOFF", { seq: 2 }) }; // ADR-0096 Đ1 (0084, LC-19): điểm trả đứng SAU điểm đón — cũ để cả hai seq 1
}
function suat(db: Db, c: { id: string; di: string; tra?: string | null }, leg: string, o: { key?: string | null; status?: string; id?: string } = {}): string {
  const id = o.id ?? nid("al");
  gieoMocXep(db, leg);
  run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, board_stop_id, alight_stop_id, status, valid_from_at, created_at, updated_at)
     VALUES (?, ?, 'PASSENGER', ?, ?, ?, ?, ?, ?, ?, ?)`, id, c.id, leg, o.key ?? null, c.di, c.tra === undefined ? null : c.tra, o.status ?? "WAITING", AT, AT, AT);
  return id;
}
function suKien(db: Db, trip: string, kind: string, o: { id?: string; luc?: string; xayRa?: string; nguon?: string; policy?: string | null; related?: string } = {}): string {
  const id = o.id ?? randomUUID();
  const luc = o.luc ?? AT;
  const xayRa = o.xayRa ?? luc;
  run(db, `INSERT INTO vc_trip_event (id, trip_id, related_trip_id, kind, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, policy_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'NGUOI', ?, ?, ?, ?, ?, ?)`, id, trip, o.related ?? null, kind, randomUUID(), xayRa, Date.parse(xayRa), o.nguon ?? "MAY_CHU",
    o.policy === undefined ? (o.nguon === "VAN_PHONG_KHAI" ? POLICY : null) : o.policy, luc, luc);
  return id;
}
/** Một LÔ (như `env.DB.batch` của D1): mọi câu trong một giao dịch; một câu hỏng → cả lô huỷ. */
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
/** Câu cổng: dấu lệnh mới + tăng version (khuôn ADR-0049 D1 "Thứ tự lô"). */
function cong(db: Db, trip: string, cmd = randomUUID()): string {
  run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?, updated_at = ? WHERE id = ?", cmd, AT, trip);
  return cmd;
}
function dongKiem(db: Db, trip: string, cmd: string, ketQua = "DAT"): void {
  const t = one<{ vehicle_id: string; carrier_party_id: string }>(db, "SELECT vehicle_id, carrier_party_id FROM vc_trip WHERE id = ?", trip);
  const lai = one<{ d: string } | undefined>(db, "SELECT driver_party_id d FROM vc_trip_driver WHERE trip_id = ? AND valid_to_at IS NULL", trip);
  run(db, `INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
     rest_minutes_used, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '79B-000.00', 15, ?, ?, 30, ?, ?, ?)`,
    nid("ck"), trip, cmd, POLICY, ketQua, t.vehicle_id, t.carrier_party_id, lai?.d ?? t.carrier_party_id, AT, AT, AT);
}
/** Lô xuất bến đúng thứ tự (kế hoạch mục 1.5): cổng → sự kiện DEPARTED (id = dấu lệnh) → bản chụp ĐẠT → đổi trạng thái (chép cặp giờ xảy ra). */
function xuatBen(db: Db, trip: string, o: { xayRa?: string; luc?: string; nguon?: string } = {}): string {
  return lo(db, () => xuatBenTrongLo(db, trip, o));
}
function xuatBenTrongLo(db: Db, trip: string, o: { xayRa?: string; luc?: string; nguon?: string }): string {
  const cmd = cong(db, trip);
  const luc = o.luc ?? iso(ms("07:00"));
  const xayRa = o.xayRa ?? luc;
  suKien(db, trip, "DEPARTED", { id: cmd, luc, xayRa, nguon: o.nguon ?? (xayRa === luc ? "MAY_CHU" : "VAN_PHONG_KHAI") });
  dongKiem(db, trip, cmd);
  run(db, "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?, departed_ms = ?, updated_at = ? WHERE id = ? AND last_cmd_id = ?", xayRa, Date.parse(xayRa), luc, trip, cmd);
  return cmd;
}
/** Xong hết điểm + suất rồi kết thúc thường. */
function ketThuc(db: Db, trip: string, luc = iso(ms("08:00"))): void {
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE trip_id = ? AND valid_to_at IS NULL AND status = 'WAITING'", trip);
  run(db, "UPDATE vc_trip_allocation SET status = 'DROPPED' WHERE trip_id = ? AND valid_to_at IS NULL AND status = 'BOARDED'", trip);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE trip_id = ? AND status = 'PENDING'", luc, trip);
  run(db, "UPDATE vc_trip_stop SET status = 'DONE', done_at = ? WHERE trip_id = ? AND status = 'ARRIVED'", luc, trip);
  const cmd = cong(db, trip);
  suKien(db, trip, "ENDED", { id: cmd, luc });
  run(db, "UPDATE vc_trip SET status = 'ENDED', ended_at = ?, ended_ms = ? WHERE id = ?", luc, Date.parse(luc), trip);
}
const trangThai = (db: Db, bang: string, id: string) => one<{ s: string }>(db, `SELECT status s FROM ${bang} WHERE id = ?`, id).s;

// =================================================================================================================================================
test("(a) đúng một tệp *_chuyen_xe.sql, số 0042; tám bảng vc_trip*; mọi trigger mới tên vc_ (không staff_ / stf_); văn bản không dãy ≥ 8 chữ số, không '@'", () => {
  assert.equal(files.filter((f) => /^\d{4}_chuyen_xe\.sql$/.test(f)).length, 1);
  assert.match(FILE, /^0042_/);
  const db = openDb();
  const bang = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'vc\\_trip%' ESCAPE '\\' ORDER BY name").all() as { name: string }[]).map((r) => r.name);
  // + vc_trip_cost_line của migration *_vc_chi_phi_chuyen (ADR-0057 T2 — không thuộc tệp 0042; tên trigger vẫn vc_).
  assert.deepEqual(bang, ["vc_trip", "vc_trip_allocation", "vc_trip_cost_line", "vc_trip_departure_check", "vc_trip_departure_check_item", "vc_trip_driver", "vc_trip_event", "vc_trip_manifest", "vc_trip_stop"]);
  const text = sqlOf(FILE);
  const tenTrigger = [...text.matchAll(/CREATE TRIGGER (\w+)/g)].map((m) => m[1]!);
  assert.ok(tenTrigger.length >= 50, `chống bài rỗng: ${tenTrigger.length}`);
  for (const t of tenTrigger) assert.match(t, /^vc_/, t);
  const code = text.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n").replace(/\b86400000\b/g, "");
  assert.doesNotMatch(code, /\d{8,}/, "không dãy ≥ 8 chữ số (ngoài 86400000 = 24 giờ)");
  assert.doesNotMatch(code, /@/);
});

// ---- TC-5 LC-02 -----------------------------------------------------------------------------------------------------------------------------------
test("TC-5 LC-02: mở suất thứ (số chỗ + 1) ở WAITING → RAISE; bốn câu chèn trong một lô, xe 3 chỗ → câu thứ tư RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db, { cho: 3 });
  const d = don(db, { soKhach: 4 });
  for (let i = 0; i < 3; i++) suat(db, c, d.legs[0]!, { key: d.khach[i]! });
  loi(() => suat(db, c, d.legs[0]!, { key: d.khach[3]! }), /lc02_capacity/);
  const db2 = openDb();
  const c2 = chuyenChuan(db2, { cho: 3 });
  const d2 = don(db2, { soKhach: 4 });
  db2.exec("BEGIN");
  for (let i = 0; i < 3; i++) suat(db2, c2, d2.legs[0]!);
  loi(() => suat(db2, c2, d2.legs[0]!), /lc02_capacity/, "trigger theo dòng thấy suất vừa chèn trong cùng lô");
  db2.exec("ROLLBACK");
});
test("TC-5 LC-02: NO_SHOW → BOARDED làm vượt chỗ → RAISE; không vượt → được", () => {
  const db = openDb();
  const c = chuyenChuan(db, { cho: 2 });
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  suat(db, c, d.legs[0]!);
  run(db, "UPDATE vc_trip_allocation SET status = 'NO_SHOW' WHERE id = ?", a);
  const b3 = suat(db, c, d.legs[0]!);
  loi(() => run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", a), /lc02_capacity/);
  run(db, "UPDATE vc_trip_allocation SET status = 'CANCELLED_AT_STOP' WHERE id = ?", b3);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", a);
  assert.equal(trangThai(db, "vc_trip_allocation", a), "BOARDED");
});
test("TC-5 LC-02: đổi xe sang xe ít chỗ hơn tải → RAISE; đủ chỗ → được", () => {
  const db = openDb();
  const c = chuyenChuan(db, { cho: 3 });
  const d = don(db);
  for (let i = 0; i < 3; i++) suat(db, c, d.legs[0]!);
  const nho = xe(db, c.chu, 2);
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ? WHERE id = ?", nho, c.id), /lc02_capacity/);
  run(db, "UPDATE vc_trip SET vehicle_id = ? WHERE id = ?", xe(db, c.chu, 3), c.id);
});
test("TC-5 LC-02: giảm passenger_capacity dưới tải của chuyến chưa kết thúc → RAISE; chuyến đã kết thúc không chặn", () => {
  const db = openDb();
  const c = chuyenChuan(db, { cho: 4 });
  const d = don(db);
  for (let i = 0; i < 3; i++) suat(db, c, d.legs[0]!);
  loi(() => run(db, "UPDATE vc_vehicle SET passenger_capacity = 2 WHERE id = ?", c.xe), /lc02_capacity/);
  run(db, "UPDATE vc_vehicle SET passenger_capacity = 3 WHERE id = ?", c.xe);
  xuatBen(db, c.id);
  ketThuc(db, c.id);
  run(db, "UPDATE vc_vehicle SET passenger_capacity = 1 WHERE id = ?", c.xe);
});
test("TC-5 LC-02: ngừng dùng (retired) xe còn chuyến PLANNED / RUNNING → RAISE; bảo dưỡng (maintenance) → ĐƯỢC (chuyến bị giữ ở cổng xuất bến)", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  loi(() => run(db, "UPDATE vc_vehicle SET status = 'retired', valid_to_date = '2026-10-01' WHERE id = ?", c.xe), /lc02_capacity/);
  run(db, "UPDATE vc_vehicle SET status = 'maintenance' WHERE id = ?", c.xe);
  assert.equal(trangThai(db, "vc_vehicle", c.xe), "maintenance");
});

// ---- TC-6 LC-01 -----------------------------------------------------------------------------------------------------------------------------------
test("TC-6 LC-01: hai suất MỞ cùng (chặng, người) — kể cả ở hai chuyến khác nhau → UNIQUE; suất đã đóng không tính", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const c2 = chuyenChuan(db, { tu: ms("10:00") });
  const d = don(db);
  const a = suat(db, c, d.legs[0]!, { key: d.khach[0]! });
  loi(() => suat(db, c2, d.legs[0]!, { key: d.khach[0]! }), /UNIQUE constraint failed/);
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'MOVED' WHERE id = ?", AT, a);
  suat(db, c2, d.legs[0]!, { key: d.khach[0]! });
});
test("TC-6 LC-04: đặt passenger_key lần hai (đổi người) → RAISE; lần đầu từ NULL → được", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", d.khach[0]!, a);
  loi(() => run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", d.khach[1]!, a), /lc04_name_once/);
  loi(() => run(db, "UPDATE vc_trip_allocation SET passenger_key = NULL WHERE id = ?", a), /lc04_name_once/);
});

// ---- TC-7 LC-09, LC-10 ------------------------------------------------------------------------------------------------------------------------------
test("TC-7 LC-09: mở suất cho chặng của đơn NHÁP / đơn ĐÃ HUỶ / chặng ĐÃ ĐÓNG → RAISE; đơn đã xác nhận, chặng mở → được", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const nhap = don(db, { xacNhan: false });
  loi(() => suat(db, c, nhap.legs[0]!), /lc09_leg/, "đơn nháp");
  const huy = don(db);
  gieoLyDoHuy(db, huy.id);
  run(db, "UPDATE orders SET status = 'cancelled' WHERE id = ?", huy.id);
  loi(() => suat(db, c, huy.legs[0]!), /lc09_leg/, "đơn đã huỷ");
  const dong = don(db, { soChang: 2 });
  run(db, "UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'NOT_NEEDED' WHERE id = ?", AT, dong.legs[1]!);
  loi(() => suat(db, c, dong.legs[1]!), /lc09_leg/, "chặng đã đóng");
  loi(() => suat(db, c, "khong-co-chang"), /lc09_leg/, "chặng không tồn tại");
  suat(db, c, dong.legs[0]!);
});
test("TC-7 LC-10: gắn người của ĐƠN KHÁC (lúc mở suất / lúc đặt tên) → RAISE; người KHÔNG còn dòng hiện hành → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const khac = don(db);
  loi(() => suat(db, c, d.legs[0]!, { key: khac.khach[0]! }), /lc10_person/);
  const a = suat(db, c, d.legs[0]!);
  loi(() => run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", khac.khach[0]!, a), /lc10_person/);
  run(db, "UPDATE ord_passenger SET voided_at = ? WHERE id = ?", AT, d.khach[2]!);
  loi(() => run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", d.khach[2]!, a), /lc10_person/, "người đã huỷ dòng");
  run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", d.khach[0]!, a);
});

// ---- TC-8 LC-03 -----------------------------------------------------------------------------------------------------------------------------------
test("TC-8 LC-03: hai chuyến CHƯA HUỶ cùng xe chồng giờ → RAISE; nối đuôi → được; chuyến đã huỷ không tính", () => {
  const db = openDb();
  const c = chuyenChuan(db); // 07:00–09:00
  loi(() => chuyen(db, { xe: c.xe, tu: ms("08:00"), den: ms("10:00") }), /lc03_overlap/);
  chuyen(db, { xe: c.xe, tu: ms("09:00"), den: ms("10:00") });
  const huy = chuyen(db, { xe: c.xe, tu: ms("11:00"), den: ms("12:00") });
  const cmd = cong(db, huy);
  suKien(db, huy, "CANCELLED", { id: cmd });
  run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", huy);
  chuyen(db, { xe: c.xe, tu: ms("11:00"), den: ms("12:00") });
});
test("TC-8 LC-03: cùng TÀI XẾ chồng giờ (hai xe) lúc gán → RAISE; nối đuôi → được", () => {
  const db = openDb();
  const tx = hoSo(db, "PERSON", "Tài xế công ty");
  const t1 = chuyen(db, { xe: xe(db, congTyChu(db)) });
  laiXe(db, t1, tx);
  const t2 = chuyen(db, { xe: xe(db, congTyChu(db)), tu: ms("08:00"), den: ms("10:00") });
  loi(() => laiXe(db, t2, tx), /lc03_overlap/);
  const t3 = chuyen(db, { xe: xe(db, congTyChu(db)), tu: ms("09:00"), den: ms("10:00") });
  laiXe(db, t3, tx);
});
test("TC-8 LC-03 (I22): chuyến đã KẾT THÚC sớm không chặn khoảng sau ended_ms", () => {
  const db = openDb();
  const c = chuyenChuan(db); // 07:00–09:00
  xuatBen(db, c.id);
  ketThuc(db, c.id, iso(ms("08:00")));
  chuyen(db, { xe: c.xe, tu: ms("08:00"), den: ms("09:30") });
  loi(() => chuyen(db, { xe: c.xe, tu: ms("07:30"), den: ms("07:50") }), /lc03_overlap/, "khoảng TRƯỚC giờ kết thúc thật vẫn chặn");
});
test("TC-8 LC-03: hai chuyến RUNNING cùng xe → UNIQUE (chỉ mục vc_trip_one_running_vehicle); cùng tài xế → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db); // 07–09
  const sau = chuyen(db, { xe: c.xe, tu: ms("10:00"), den: ms("11:00") });
  laiXe(db, sau, hoSo(db, "PERSON", "Tài xế công ty 2"));
  xuatBen(db, c.id);
  loi(() => xuatBen(db, sau, { luc: iso(ms("07:10")) }), /UNIQUE constraint failed: vc_trip.vehicle_id/);
  const db2 = openDb();
  const tx = hoSo(db2, "PERSON", "Tài xế công ty");
  const a = chuyen(db2, { xe: xe(db2, congTyChu(db2)) });
  laiXe(db2, a, tx);
  const b = chuyen(db2, { xe: xe(db2, congTyChu(db2)), tu: ms("10:00"), den: ms("11:00") });
  laiXe(db2, b, tx);
  xuatBen(db2, a);
  loi(() => xuatBen(db2, b, { luc: iso(ms("07:10")) }), /lc03_overlap/);
});
test("TC-8 [SOI] K-03 (a): ĐỔI GIỜ chuyến T2 (không đổi tài xế) làm chồng giờ T1 CÙNG tài xế → RAISE ở vc_trip_overlap_upd; đổi xa ra → được", () => {
  const db = openDb();
  const tx = hoSo(db, "PERSON", "Tài xế công ty");
  const t1 = chuyen(db, { xe: xe(db, congTyChu(db)) }); // 07–09
  laiXe(db, t1, tx);
  const t2 = chuyen(db, { xe: xe(db, congTyChu(db)), tu: ms("10:00"), den: ms("12:00") });
  laiXe(db, t2, tx);
  loi(() => run(db, "UPDATE vc_trip SET planned_start_ms = ?, earliest_start_ms = ? WHERE id = ?", ms("08:00"), ms("08:00"), t2), /lc03_overlap/);
  run(db, "UPDATE vc_trip SET planned_start_ms = ?, earliest_start_ms = ? WHERE id = ?", ms("09:00"), ms("09:00"), t2);
});

// ---- TC-9 LC-05 -----------------------------------------------------------------------------------------------------------------------------------
test("TC-9 LC-05: PLANNED → RUNNING không có dòng kiểm ĐẠT mang dấu lệnh HIỆN HÀNH → RAISE; dòng kiểm của lô TRƯỚC (dấu cũ) → vẫn RAISE; KHONG_DAT → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const lenh = (cmd: string) => run(db, "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?, departed_ms = ? WHERE id = ? AND last_cmd_id = ?", iso(ms("06:55")), ms("06:55"), c.id, cmd); // ADR-0096 Đ2: trong cửa sổ
  const cmd1 = cong(db, c.id);
  loi(() => lenh(cmd1), /lc05_departure_check/, "không dòng kiểm");
  dongKiem(db, c.id, cmd1, "KHONG_DAT");
  loi(() => lenh(cmd1), /lc05_departure_check/, "dòng kiểm KHÔNG ĐẠT");
  dongKiem(db, c.id, cmd1);
  const cmd2 = cong(db, c.id);
  loi(() => lenh(cmd2), /lc05_departure_check/, "dòng kiểm ĐẠT của lô trước");
  dongKiem(db, c.id, cmd2);
  lenh(cmd2);
  assert.equal(trangThai(db, "vc_trip", c.id), "RUNNING");
});

// ---- TC-10 LC-04, LC-06, LC-07, danh tính ------------------------------------------------------------------------------------------------------------
test("TC-10 LC-06/07: ENDED → PLANNED → RAISE; sửa điểm / suất / tài xế / thêm sự kiện của chuyến ENDED hoặc CANCELLED → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  xuatBen(db, c.id);
  ketThuc(db, c.id);
  loi(() => run(db, "UPDATE vc_trip SET status = 'PLANNED' WHERE id = ?", c.id), /lc06_final|lc07_forward/);
  loi(() => run(db, "UPDATE vc_trip_stop SET seq = 9 WHERE id = ?", c.di), /lc06_final/);
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED' WHERE id = ?", AT, a), /lc06_final/);
  loi(() => run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED' WHERE trip_id = ?", AT, c.id), /lc06_final/);
  loi(() => diem(db, c.id, "PICKUP"), /lc06_final/);
  loi(() => suat(db, c, d.legs[0]!), /lc06_final/);
  loi(() => laiXe(db, c.id, hoSo(db, "PERSON", "Khác")), /lc06_final/);
  loi(() => suKien(db, c.id, "UPDATED", { luc: iso(ms("09:00")) }), /lc06_final/);
  const h = chuyenChuan(db, { tu: ms("12:00") });
  const cmd = cong(db, h.id);
  suKien(db, h.id, "CANCELLED", { id: cmd });
  run(db, "UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = 'BO_QUA_KHAC' WHERE trip_id = ?", h.id);
  run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", h.id);
  loi(() => run(db, "UPDATE vc_trip SET planned_end_ms = planned_end_ms + 60000 WHERE id = ?", h.id), /lc06_final/);
  loi(() => diem(db, h.id, "DROPOFF"), /lc06_final/);
});
test("TC-10 LC-04: DELETE mọi bảng vc_trip* → RAISE; sự kiện, bản chụp, dòng con, bản chốt: UPDATE → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  suat(db, c, d.legs[0]!, { key: d.khach[0]! });
  const cmd = xuatBen(db, c.id);
  const ck = one<{ id: string }>(db, "SELECT id FROM vc_trip_departure_check WHERE cmd_id = ?", cmd).id;
  run(db, `INSERT INTO vc_trip_departure_check_item (id, check_id, item_kind, rule_id, created_at, updated_at) VALUES ('ci-1', ?, 'DIEU_KIEN', '1a6f3c52-4d0e-4b8a-9c21-7e5d0b3a9f11', ?, ?)`, ck, AT, AT);
  const al = one<{ id: string }>(db, "SELECT id FROM vc_trip_allocation WHERE trip_id = ?", c.id).id;
  run(db, `INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id, created_at, updated_at) VALUES ('mf-1', ?, ?, ?, ?, ?, ?)`, c.id, ck, al, d.khach[0]!, AT, AT);
  for (const bang of ["vc_trip", "vc_trip_driver", "vc_trip_stop", "vc_trip_allocation", "vc_trip_event", "vc_trip_departure_check", "vc_trip_departure_check_item", "vc_trip_manifest"]) {
    loi(() => db.exec(`DELETE FROM ${bang}`), /lc04_no_delete|vc_trip_append_only/, bang);
  }
  loi(() => run(db, "UPDATE vc_trip_event SET count = 1 WHERE id = ?", cmd), /vc_trip_append_only/);
  loi(() => run(db, "UPDATE vc_trip_departure_check SET ket_qua = 'KHONG_DAT' WHERE id = ?", ck), /vc_trip_append_only/);
  loi(() => run(db, "UPDATE vc_trip_departure_check_item SET expiry_date = '2030-01-01' WHERE id = 'ci-1'"), /vc_trip_append_only/);
  loi(() => run(db, "UPDATE vc_trip_manifest SET added_after_departure = 0 WHERE id = 'mf-1'"), /vc_trip_append_only/);
});
test("TC-10 LC-07: suất BOARDED → WAITING → RAISE; NO_SHOW → BOARDED → được; DROPPED → BOARDED → RAISE; điểm DONE → PENDING → RAISE; chuyến RUNNING → PLANNED → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  const b = suat(db, c, d.legs[0]!);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", a);
  loi(() => run(db, "UPDATE vc_trip_allocation SET status = 'WAITING' WHERE id = ?", a), /lc07_forward/);
  run(db, "UPDATE vc_trip_allocation SET status = 'NO_SHOW' WHERE id = ?", b);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", b);
  run(db, "UPDATE vc_trip_allocation SET status = 'DROPPED' WHERE id = ?", b);
  loi(() => run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", b), /lc07_forward/);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", AT, c.di);
  loi(() => run(db, "UPDATE vc_trip_stop SET status = 'PENDING' WHERE id = ?", c.di), /lc07_forward/);
  run(db, "UPDATE vc_trip_stop SET status = 'DONE', done_at = ? WHERE id = ?", AT, c.di);
  loi(() => run(db, "UPDATE vc_trip_stop SET status = 'PENDING' WHERE id = ?", c.di), /lc07_forward/);
  loi(() => run(db, "UPDATE vc_trip_stop SET status = 'DONE', done_at = ? WHERE id = ?", AT, c.tra), /lc07_forward/, "PENDING → DONE (chưa tới)");
  xuatBen(db, c.id);
  loi(() => run(db, "UPDATE vc_trip SET status = 'PLANNED', departed_at = NULL, departed_ms = NULL WHERE id = ?", c.id), /lc07_forward/);
});
test("TC-10 [SOI] K-03 (b) / I41: đổi board_stop_id của suất đang mở → RAISE; đặt alight_stop_id KỂ CẢ TỪ NULL → RAISE (cấm hẳn); điểm lên / xuống phải thuộc chính chuyến, đúng loại", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const diemKhac = diem(db, c.id, "PICKUP", { text: "Khách sạn B", key: `T:${"b".repeat(64)}` });
  const a = suat(db, c, d.legs[0]!, { key: d.khach[0]! });
  loi(() => run(db, "UPDATE vc_trip_allocation SET board_stop_id = ? WHERE id = ?", diemKhac, a), /lc04_identity/);
  const khongTra = suat(db, { id: c.id, di: c.di, tra: null }, d.legs[0]!);
  loi(() => run(db, "UPDATE vc_trip_allocation SET alight_stop_id = ? WHERE id = ?", c.tra, khongTra), /lc04_identity/, "cấm hẳn — kể cả từ NULL");
  const c2 = chuyenChuan(db, { tu: ms("12:00") });
  loi(() => suat(db, { id: c.id, di: c2.di, tra: c.tra }, d.legs[0]!), /lc04_stop_scope/, "điểm lên của chuyến khác");
  loi(() => suat(db, { id: c.id, di: c.di, tra: c.di }, d.legs[0]!), /lc04_stop_scope/, "điểm xuống là điểm ĐÓN");
});
test("TC-10 [0050] VK1-B: đổi place_key / location_id / place_text / kind của điểm → RAISE (vc_trip_stop_identity); khuôn place_key sai → CHECK; đóng suất STOP_CHANGED / PASSENGER_CHANGED (R-P29, chủ lần 16) → được, mã lạ → CHECK", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  loi(() => run(db, "UPDATE vc_trip_stop SET place_key = ? WHERE id = ?", `T:${"c".repeat(64)}`, c.di), /lc04_identity/, "đổi khoá nơi");
  loi(() => run(db, "UPDATE vc_trip_stop SET place_text = 'Khách sạn Z' WHERE id = ?", c.di), /lc04_identity/, "đổi chữ nơi");
  loi(() => run(db, "UPDATE vc_trip_stop SET location_id = ?, place_key = ? WHERE id = ?", LOC2, `L:${LOC2}`, c.tra), /lc04_identity/, "đổi điểm danh mục");
  loi(() => run(db, "UPDATE vc_trip_stop SET kind = 'PICKUP' WHERE id = ?", c.tra), /lc04_identity/, "đổi loại");
  loi(() => diem(db, c.id, "DROPOFF", { loc: LOC, key: `L:${LOC2}` }), /CHECK constraint failed/, "điểm danh mục mà khoá khác 'L:' || id");
  loi(() => diem(db, c.id, "PICKUP", { text: "Khách sạn C", key: `L:${LOC}` }), /CHECK constraint failed/, "chữ tự do mà khoá không bắt đầu T:");
  loi(() => diem(db, c.id, "PICKUP", { text: "Khách sạn C", key: "T:ABC" }), /CHECK constraint failed/, "khoá T: không đủ 64 hex thường");
  loi(() => diem(db, c.id, "PICKUP", { text: "Khách sạn C", key: `T:${"A".repeat(64)}` }), /CHECK constraint failed/, "hex HOA");
  const a = suat(db, c, d.legs[0]!);
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'LA_LUNG' WHERE id = ?", AT, a), /CHECK constraint failed/);
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'STOP_CHANGED' WHERE id = ?", AT, a);
  loi(() => run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", a), /lc04_close_once/, "suất đã đóng không sửa");
  const a2 = suat(db, c, d.legs[0]!);
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'PASSENGER_CHANGED' WHERE id = ?", AT, a2); // R-P29: "cập nhật khách theo đơn"
});
test("TC-10 LC-04: dòng tài xế chỉ ĐÓNG một lần, không đổi người / chuyến; chuyến không đổi mã", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  loi(() => run(db, "UPDATE vc_trip_driver SET driver_party_id = ? WHERE trip_id = ?", hoSo(db, "PERSON", "X"), c.id), /lc04_close_once/);
  run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED' WHERE trip_id = ?", AT, c.id);
  loi(() => run(db, "UPDATE vc_trip_driver SET close_reason = 'REFUSED' WHERE trip_id = ?", c.id), /lc04_close_once/, "đóng lần hai");
  loi(() => run(db, "UPDATE vc_trip SET code = 'CX-KHAC' WHERE id = ?", c.id), /lc04_identity/);
});

// ---- TC-11 LC-16 + thứ tự lô gián đoạn / huỷ --------------------------------------------------------------------------------------------------------
test("TC-11 LC-16: kết thúc thường khi còn suất WAITING / BOARDED mở hoặc điểm PENDING / ARRIVED → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  suat(db, c, d.legs[0]!);
  xuatBen(db, c.id);
  const ket = () => run(db, "UPDATE vc_trip SET status = 'ENDED', ended_at = ?, ended_ms = ? WHERE id = ?", iso(ms("08:00")), ms("08:00"), c.id);
  loi(ket, /lc16_unsettled/, "còn suất WAITING");
  run(db, "UPDATE vc_trip_allocation SET status = 'NO_SHOW' WHERE trip_id = ?", c.id);
  loi(ket, /lc16_unsettled/, "còn điểm PENDING");
  run(db, "UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = 'BO_QUA_KHAC' WHERE trip_id = ?", c.id);
  ket();
});
test("TC-11 lô 'Kết thúc gián đoạn' ĐÚNG THỨ TỰ (cổng → sự kiện ENDED_INTERRUPTED → đóng suất TRIP_INTERRUPTED → điểm SKIPPED → trạng thái) → được; sau đó mọi sửa → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  suat(db, c, d.legs[0]!, { status: "WAITING" });
  xuatBen(db, c.id);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", iso(ms("07:20")), c.di);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", a);
  db.exec("BEGIN");
  const cmd = cong(db, c.id);
  suKien(db, c.id, "ENDED_INTERRUPTED", { id: cmd, luc: iso(ms("07:30")) });
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRIP_INTERRUPTED' WHERE trip_id = ? AND valid_to_at IS NULL AND status IN ('WAITING', 'BOARDED')", AT, c.id);
  run(db, "UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = 'GIAN_DOAN_XE_HONG' WHERE trip_id = ? AND status IN ('PENDING', 'ARRIVED')", c.id);
  run(db, "UPDATE vc_trip SET status = 'ENDED_INTERRUPTED', end_reason_code = 'GIAN_DOAN_XE_HONG', ended_at = ?, ended_ms = ? WHERE id = ? AND last_cmd_id = ?", iso(ms("07:30")), ms("07:30"), c.id, cmd);
  db.exec("COMMIT");
  assert.equal(trangThai(db, "vc_trip", c.id), "ENDED_INTERRUPTED");
  loi(() => run(db, "UPDATE vc_trip_stop SET seq = 5 WHERE id = ?", c.di), /lc06_final/);
});
test("TC-11: sang ENDED_INTERRUPTED khi còn suất WAITING / BOARDED mở → RAISE; đóng suất TRIP_INTERRUPTED KHÔNG có sự kiện ENDED_INTERRUPTED mang dấu lệnh hiện hành → RAISE (kể cả lô khác sau sự kiện gián đoạn)", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  suat(db, c, d.legs[0]!);
  xuatBen(db, c.id);
  const cmd = cong(db, c.id);
  suKien(db, c.id, "ENDED_INTERRUPTED", { id: cmd, luc: iso(ms("07:30")) });
  loi(() => run(db, "UPDATE vc_trip SET status = 'ENDED_INTERRUPTED', end_reason_code = 'GIAN_DOAN_KHAC', ended_at = ?, ended_ms = ? WHERE id = ?", iso(ms("07:30")), ms("07:30"), c.id),
    /lc16_unsettled/);
  const cmd2 = cong(db, c.id); // lô KHÁC (vd một lệnh tiến độ) sau sự kiện gián đoạn
  suKien(db, c.id, "STOP_ARRIVED", { id: cmd2, luc: iso(ms("07:35")) });
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRIP_INTERRUPTED' WHERE trip_id = ?", AT, c.id), /lc15_running/);
  const c2 = chuyenChuan(db, { tu: ms("12:00") });
  suat(db, c2, d.legs[0]!, { key: null }) && null;
  xuatBen(db, c2.id, { luc: iso(ms("12:00")) });
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRIP_INTERRUPTED' WHERE trip_id = ?", AT, c2.id), /lc15_running/, "không sự kiện gián đoạn nào");
});
test("TC-11: huỷ chuyến PLANNED ĐÚNG THỨ TỰ (đóng suất, tài xế, bỏ điểm, rồi trạng thái cuối) → được; ĐẢO (trạng thái cuối trước) → câu sau RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  suat(db, c, d.legs[0]!);
  const cmd = cong(db, c.id);
  suKien(db, c.id, "CANCELLED", { id: cmd });
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRIP_CANCELLED' WHERE trip_id = ?", AT, c.id);
  run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'TRIP_CANCELLED' WHERE trip_id = ?", AT, c.id);
  run(db, "UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = 'HUY_KHAC' WHERE trip_id = ?", c.id);
  run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", c.id);
  const c2 = chuyenChuan(db, { tu: ms("12:00") });
  suat(db, c2, d.legs[0]!);
  const cmd2 = cong(db, c2.id);
  suKien(db, c2.id, "CANCELLED", { id: cmd2 });
  run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", c2.id);
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRIP_CANCELLED' WHERE trip_id = ?", AT, c2.id), /lc06_final/);
  assert.equal(one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL", c2.id).n, 1);
});

// ---- TC-12 LC-15 --------------------------------------------------------------------------------------------------------------------------------
test("TC-12 LC-15: chuyến RUNNING — mở suất, rút suất, thêm điểm, đổi xe, đổi / thêm tài xế, đổi thứ tự / giờ xe tới của điểm ĐÃ TỚI → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  xuatBen(db, c.id);
  loi(() => suat(db, c, d.legs[0]!), /lc15_running/, "mở suất");
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED' WHERE id = ?", AT, a), /lc15_running/, "rút suất");
  loi(() => diem(db, c.id, "DROPOFF", { loc: LOC2 }), /lc15_running/, "thêm điểm");
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ? WHERE id = ?", xe(db, c.chu), c.id), /lc15_running/, "đổi xe");
  loi(() => run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED' WHERE trip_id = ?", AT, c.id), /lc15_running/, "đổi tài xế");
  loi(() => laiXe(db, c.id, hoSo(db, "PERSON", "Khác")), /lc15_running/, "thêm tài xế");
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", AT, c.di);
  loi(() => run(db, "UPDATE vc_trip_stop SET seq = 7 WHERE id = ?", c.di), /lc15_running/, "đổi thứ tự điểm đã tới");
  loi(() => run(db, "UPDATE vc_trip_stop SET planned_date = ?, planned_time = '07:40' WHERE id = ?", DAY, c.di), /lc15_running/, "giờ xe tới của điểm đã tới");
});
test("TC-12 LC-15: chuyến RUNNING — đổi seq / giờ xe tới của điểm PENDING, đổi trạng thái tiến độ, gắn passenger_key LẦN ĐẦU → được", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  xuatBen(db, c.id);
  run(db, "UPDATE vc_trip_stop SET seq = 3, planned_date = ?, planned_time = '08:15' WHERE id = ?", DAY, c.tra);
  run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", d.khach[0]!, a);
  run(db, "UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?", AT, c.di);
  run(db, "UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?", a);
  assert.equal(trangThai(db, "vc_trip_allocation", a), "BOARDED");
});

// ---- TC-13 LC-13 --------------------------------------------------------------------------------------------------------------------------------
test("TC-13 LC-13: tài xế nhà xe X lái xe công ty → RAISE; tài xế công ty lái xe nhà xe X → RAISE; tài xế nhà xe Y lái xe nhà xe X → RAISE; đúng cặp → được", () => {
  const db = openDb();
  const x = nhaXe(db);
  const y = nhaXe(db);
  const txX = taiXeCua(db, x);
  const txY = taiXeCua(db, y);
  const txCty = hoSo(db, "PERSON", "Tài xế công ty");
  const tCty = chuyen(db, { xe: xe(db, congTyChu(db)) });
  loi(() => laiXe(db, tCty, txX), /lc13_cross/, "tài xế nhà xe → xe công ty");
  laiXe(db, tCty, txCty);
  const tX = chuyen(db, { xe: xe(db, x), tu: ms("10:00") });
  // ADR-0129 Q4 (a) — migration 0109: tài xế CÔNG TY (không thuộc nhà xe nào) lái được xe nhà xe thuê; chiều ngược vẫn RAISE.
  laiXe(db, chuyen(db, { xe: xe(db, x), tu: ms("18:00") }), txCty);
  loi(() => laiXe(db, tX, txY), /lc13_cross/, "tài xế nhà xe Y → xe nhà xe X");
  laiXe(db, tX, txX);
  // nhà xe CÁ NHÂN tự lái (T = X): hồ sơ người mở vai Nhà xe
  const caNhan = hoSo(db, "PERSON", "Nhà xe cá nhân");
  moVai(db, caNhan, "CARRIER");
  laiXe(db, chuyen(db, { xe: xe(db, caNhan), tu: ms("13:00") }), caNhan);
});
test("TC-13 LC-13: chủ xe chụp của chuyến khác chủ hiện tại của xe → RAISE; đổi xe sang xe nhà xe: tài xế công ty được (ADR-0129 Q4), đổi chủ xe khi còn chuyến chưa kết thúc → RAISE", () => {
  const db = openDb();
  const x = nhaXe(db);
  const xeX = xe(db, x);
  loi(() => run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES ('t-sai', 'CX-SAI', ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, xeX, congTyChu(db), DAY, ms("07:00"), ms("08:00"), ms("07:00"), randomUUID(), AT, AT), /lc13_carrier/);
  const c = chuyenChuan(db);
  // rented = 1: cờ xe thuê đúng (ADR-0057 C2a, 0073) để chỉ còn LC-13 chặn.
  // ADR-0129 Q4 (a) — migration 0109: tài xế công ty đổi sang xe nhà xe thuê → được; tài xế NHÀ XE Y đổi sang xe nhà xe X vẫn RAISE (xem TC-13 trên).
  run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ?, rented = 1 WHERE id = ?", xeX, x, c.id);
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ? WHERE id = ?", c.xe, c.id), /lc13_cross|lc13_carrier/, "chủ chụp không theo xe mới");
  // Phản chứng: tài xế của nhà xe Y đổi sang xe nhà xe X → vẫn RAISE (chiều bị cấm không được mở theo).
  const y = nhaXe(db);
  const tY = chuyen(db, { xe: xe(db, y), tu: ms("20:00") });
  laiXe(db, tY, taiXeCua(db, y));
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ?, rented = 1 WHERE id = ?", xeX, x, tY), /lc13_cross/, "tài xế nhà xe Y → xe nhà xe X");
  loi(() => run(db, "UPDATE vc_vehicle SET owner_party_id = ? WHERE id = ?", congTyChu(db), xeX), /lc13_owner/); // xeX nay có chuyến chưa kết thúc (c)
});

// ---- TC-14 LC-11, cổng lô --------------------------------------------------------------------------------------------------------------------------
test("TC-14 LC-11: request_id trùng → UNIQUE; request_id không đủ 36 ký tự → CHECK", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const rid = randomUUID();
  const chen = (id: string, r: string) => run(db, `INSERT INTO vc_trip_event (id, trip_id, kind, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, created_at, updated_at)
     VALUES (?, ?, 'UPDATED', ?, 'NGUOI', ?, ?, 'MAY_CHU', ?, ?)`, id, c.id, r, AT, Date.parse(AT), AT, AT);
  chen(randomUUID(), rid);
  loi(() => chen(randomUUID(), rid), /UNIQUE constraint failed: vc_trip_event.request_id/);
  loi(() => chen(randomUUID(), "ngan"), /CHECK constraint failed/);
});
test("TC-14 cổng lô: lô có câu cổng THUA (version cũ) → không dòng audit_log, vc_trip_event, suất nào; hai lô cùng đọc một version → đúng một chuyến mang dấu lệnh của lô thắng", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const lo = (version: number) => {
    const cmd = randomUUID();
    db.exec("BEGIN");
    run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?, updated_at = ? WHERE id = ? AND version = ? AND status = 'PLANNED'", cmd, AT, c.id, version);
    run(db, "INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) SELECT ?, NULL, NULL, 'trip_allocated', 'trip', ?, 'x', ? WHERE changes() > 0", cmd, c.id, AT);
    run(db, `INSERT INTO vc_trip_event (id, trip_id, kind, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, created_at, updated_at)
       SELECT ?, ?, 'ALLOCATED', ?, 'NGUOI', ?, ?, 'MAY_CHU', ?, ? WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ? AND last_cmd_id = ?)`, cmd, c.id, randomUUID(), AT, Date.parse(AT), AT, AT, c.id, cmd);
    gieoMocXep(db, d.legs[0]!); // chụp mốc cùng lô (lô xếp thật: câu MOC_XEP_INSERT)
    run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, board_stop_id, alight_stop_id, status, valid_from_at, created_at, updated_at)
       SELECT ?, ?, 'PASSENGER', ?, ?, ?, 'WAITING', ?, ?, ? WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ? AND last_cmd_id = ?)`, nid("al"), c.id, d.legs[0]!, c.di, c.tra, AT, AT, AT, c.id, cmd);
    db.exec("COMMIT");
    return cmd;
  };
  const thang = lo(1);
  const thua = lo(1);
  assert.equal(one<{ c: string }>(db, "SELECT last_cmd_id c FROM vc_trip WHERE id = ?", c.id).c, thang);
  for (const [bang, cot] of [["audit_log", "id"], ["vc_trip_event", "id"]] as const) {
    assert.equal(one<{ n: number }>(db, `SELECT count(*) n FROM ${bang} WHERE ${cot} = ?`, thua).n, 0, `${bang} của lô thua`);
    assert.equal(one<{ n: number }>(db, `SELECT count(*) n FROM ${bang} WHERE ${cot} = ?`, thang).n, 1, `${bang} của lô thắng`);
  }
  assert.equal(one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ?", c.id).n, 1, "chỉ suất của lô thắng");
});

// ---- TC-44 (CSDL) khoá dính ---------------------------------------------------------------------------------------------------------------------------
test("TC-44 (CSDL, R-P6/R-P7): earliest_start_ms > planned_start_ms → CHECK; dời giờ RA XA mà giữ earliest cũ (khoá dính) → được; dời từ xa đặt earliest = giờ mới → được", () => {
  const db = openDb();
  const c = chuyenChuan(db, { tu: ms("06:00"), den: ms("07:00") });
  loi(() => run(db, "UPDATE vc_trip SET earliest_start_ms = ? WHERE id = ?", ms("06:30"), c.id), /CHECK constraint failed/);
  run(db, "UPDATE vc_trip SET planned_start_ms = ?, planned_end_ms = ? WHERE id = ?", ms("10:00"), ms("11:00"), c.id);
  assert.equal(one<{ e: number }>(db, "SELECT earliest_start_ms e FROM vc_trip WHERE id = ?", c.id).e, ms("06:00"), "khoá dính: cột giữ giờ cũ");
  run(db, "UPDATE vc_trip SET planned_start_ms = ?, planned_end_ms = ?, earliest_start_ms = ? WHERE id = ?", ms("12:00"), ms("13:00"), ms("12:00"), c.id);
  loi(() => run(db, "UPDATE vc_trip SET planned_start_ms = ?, planned_end_ms = ? WHERE id = ?", ms("11:00"), ms("12:00"), c.id), /CHECK constraint failed/, "dời SỚM hơn mà không hạ earliest");
});
test("I10 + kế hoạch mục 1.3: service_date = ngày VN của giờ bắt đầu; kết thúc ≤ bắt đầu hoặc > 24 giờ → CHECK; chuyến 23:00 → 01:00 hợp lệ", () => {
  const db = openDb();
  const x = xe(db, congTyChu(db));
  const chen = (ngay: string, tu: number, den: number) => run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms,
     earliest_start_ms, rest_minutes_snapshot, last_cmd_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, nid("tr"), nid("CX"), x, congTyChu(db), ngay, tu, den, tu, randomUUID(), AT, AT);
  loi(() => chen("2026-10-04", ms("07:00"), ms("08:00")), /CHECK constraint failed/, "ngày chạy lệch ngày VN của giờ bắt đầu");
  loi(() => chen(DAY, ms("07:00"), ms("07:00")), /CHECK constraint failed/);
  loi(() => chen(DAY, ms("07:00"), ms("07:00") + 24 * H + 1), /CHECK constraint failed/);
  chen(DAY, ms("23:00"), ms("01:00", 1));
  chen(DAY, ms("00:30"), ms("01:30")); // 00:30 VN = 17:30 UTC hôm trước — vẫn là ngày DAY
});

// ---- TC-45 VK1-A ------------------------------------------------------------------------------------------------------------------------------------
test("TC-45 VK1-A: sự kiện occurred_at > created_at → CHECK; MAY_CHU mà occurred_at ≠ created_at → CHECK; nguồn lạ → CHECK; VAN_PHONG_KHAI thiếu policy_id → CHECK", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  loi(() => suKien(db, c.id, "UPDATED", { luc: iso(ms("07:00")), xayRa: iso(ms("07:01")), nguon: "VAN_PHONG_KHAI" }), /CHECK constraint failed/, "xảy ra sau ghi nhận");
  loi(() => suKien(db, c.id, "UPDATED", { luc: iso(ms("07:00")), xayRa: iso(ms("06:59")), nguon: "MAY_CHU" }), /CHECK constraint failed/, "MAY_CHU phải bằng nhau");
  loi(() => suKien(db, c.id, "UPDATED", { nguon: "TAI_XE" }), /CHECK constraint failed/, "nguồn lạ");
  loi(() => suKien(db, c.id, "UPDATED", { luc: iso(ms("07:00")), xayRa: iso(ms("06:50")), nguon: "VAN_PHONG_KHAI", policy: null }), /CHECK constraint failed/, "khai lùi không ghi chính sách");
  suKien(db, c.id, "UPDATED", { luc: iso(ms("07:00")), xayRa: iso(ms("06:50")), nguon: "VAN_PHONG_KHAI" });
});
test("TC-45 VK1-A: ended_ms < departed_ms → CHECK", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  xuatBen(db, c.id, { luc: iso(ms("07:00")) });
  run(db, "UPDATE vc_trip_stop SET status = 'SKIPPED', skip_reason_code = 'BO_QUA_KHAC' WHERE trip_id = ?", c.id);
  loi(() => run(db, "UPDATE vc_trip SET status = 'ENDED', ended_at = ?, ended_ms = ? WHERE id = ?", iso(ms("06:59")), ms("06:59"), c.id), /CHECK constraint failed/);
  run(db, "UPDATE vc_trip SET status = 'ENDED', ended_at = ?, ended_ms = ? WHERE id = ?", iso(ms("07:00")), ms("07:00"), c.id);
});
test("TC-45 VK1-A (I36): sau xuất bến, sự kiện occurred_ms < departed_ms → RAISE; sự kiện DEPARTED của chính lô xuất bến (chưa có departed_ms) → ĐƯỢC", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  xuatBen(db, c.id, { luc: iso(ms("07:15")), xayRa: iso(ms("07:05")) });
  assert.equal(one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = 'DEPARTED'", c.id).n, 1);
  loi(() => suKien(db, c.id, "STOP_ARRIVED", { luc: iso(ms("07:30")), xayRa: iso(ms("07:04")), nguon: "VAN_PHONG_KHAI" }), /vk1a_before_departure/);
  suKien(db, c.id, "STOP_ARRIVED", { luc: iso(ms("07:30")), xayRa: iso(ms("07:05")), nguon: "VAN_PHONG_KHAI" });
});
test("TC-45 R-P10 (T-11): (i) xuất bến MAY_CHU rồi 'đã tới' ở request kế → được; (ii) lô xuất bến gắn tên còn thiếu → được, không thêm sự kiện; (iii) đặt passenger_key trực tiếp trên chuyến RUNNING → được, số sự kiện không đổi", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!);
  const b = suat(db, c, d.legs[0]!);
  // (ii) lô xuất bến: cổng → DEPARTED → GẮN TÊN còn thiếu (I19b) → bản chụp → trạng thái
  const cmd = cong(db, c.id);
  const luc = iso(ms("07:00"));
  suKien(db, c.id, "DEPARTED", { id: cmd, luc });
  run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", d.khach[0]!, a);
  dongKiem(db, c.id, cmd);
  run(db, "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?, departed_ms = ? WHERE id = ? AND last_cmd_id = ?", luc, Date.parse(luc), c.id, cmd);
  const soSk = () => one<{ n: number }>(db, "SELECT count(*) n FROM vc_trip_event WHERE trip_id = ?", c.id).n;
  assert.equal(soSk(), 1, "chỉ DEPARTED");
  // (iii) đường LC-15 chừa sẵn — lượt 1 KHÔNG route nào đi đường này
  run(db, "UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?", d.khach[1]!, b);
  assert.equal(soSk(), 1);
  // (i) request kế: giờ máy chủ tăng
  suKien(db, c.id, "STOP_ARRIVED", { luc: iso(ms("07:20")) });
  assert.equal(soSk(), 2);
});
test("TC-45 [0050] vế 5 (vc_trip_departed_after_plan): 7:10 ghi sự kiện đổi tài xế; lô xuất bến khai departed_at 7:00 → RAISE; khai 7:10 → được; DEPARTED mang id = last_cmd_id (ghi lúc 7:45) không tự chặn mình", () => {
  const db = openDb();
  const c = chuyenChuan(db, { tu: ms("07:00"), den: ms("09:00") });
  suKien(db, c.id, "UPDATED", { luc: iso(ms("07:10")) });
  loi(() => xuatBen(db, c.id, { luc: iso(ms("07:45")), xayRa: iso(ms("07:00")) }), /vk1a_departed_before_plan/);
  xuatBen(db, c.id, { luc: iso(ms("07:45")), xayRa: iso(ms("07:10")) });
  assert.equal(one<{ d: string }>(db, "SELECT departed_at d FROM vc_trip WHERE id = ?", c.id).d, iso(ms("07:10")));
  // sự kiện DỜI khách VÀO chuyến (related_trip_id) cũng là "sửa kế hoạch" của chuyến đích
  const db2 = openDb();
  const dich = chuyenChuan(db2, { tu: ms("07:00"), den: ms("09:00") });
  const nguon = chuyenChuan(db2, { tu: ms("10:00"), den: ms("11:00") });
  suKien(db2, nguon.id, "ALLOCATION_MOVED", { luc: iso(ms("07:20")), related: dich.id });
  loi(() => xuatBen(db2, dich.id, { luc: iso(ms("07:45")), xayRa: iso(ms("07:15")) }), /vk1a_departed_before_plan/);
});

// ---- ràng buộc phụ ---------------------------------------------------------------------------------------------------------------------------------
test("ràng buộc hình dạng: suất PASSENGER thiếu chặng / thiếu điểm lên, CREW có chặng; dòng đóng thiếu lý do; chuyến RUNNING thiếu departed_at; CANCELLED thiếu lý do; ENDED_INTERRUPTED thiếu lý do; điểm SKIPPED thiếu lý do → CHECK", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  gieoMocXep(db, d.legs[0]!);
  const chen = (kind: string, leg: string | null, crew: string | null, board: string | null) => run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, crew_party_id,
     board_stop_id, status, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'WAITING', ?, ?, ?)`, nid("al"), c.id, kind, leg, crew, board, AT, AT, AT);
  loi(() => chen("PASSENGER", null, null, c.di), /CHECK constraint failed|lc09_leg/);
  loi(() => chen("PASSENGER", d.legs[0]!, null, null), /CHECK constraint failed/);
  loi(() => chen("CREW", d.legs[0]!, hoSo(db, "PERSON", "HDV"), null), /CHECK constraint failed/);
  chen("CREW", null, hoSo(db, "PERSON", "HDV"), null);
  const a = suat(db, c, d.legs[0]!);
  loi(() => run(db, "UPDATE vc_trip_allocation SET valid_to_at = ? WHERE id = ?", AT, a), /CHECK constraint failed/, "đóng thiếu lý do");
  loi(() => run(db, "UPDATE vc_trip_stop SET status = 'SKIPPED' WHERE id = ?", c.di), /CHECK constraint failed/);
  loi(() => run(db, "UPDATE vc_trip SET status = 'CANCELLED' WHERE id = ?", c.id), /CHECK constraint failed/);
});

// ---- R-P19 (chủ chốt 29/9, Trả lời lần 13 — "Bỏ móc nối cứng"): toàn vẹn thay khoá ngoại sang ord_* -------------------------------------------------------
test("R-P19: bản chốt trỏ dòng hành khách — dòng hiện hành của ĐÚNG người của suất, đúng đơn → được; người khác / đơn khác / dòng đã thay / id không có / khác chuyến / người đi kèm lệch → RAISE", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const khac = don(db);
  const a = suat(db, c, d.legs[0]!, { key: d.khach[0]! });
  const cmd = xuatBen(db, c.id);
  const ck = one<{ id: string }>(db, "SELECT id FROM vc_trip_departure_check WHERE cmd_id = ?", cmd).id;
  const chot = (row: string | null, o: { trip?: string; alloc?: string; crew?: string } = {}) => run(db, `INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id,
     crew_party_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, nid("mf"), o.trip ?? c.id, ck, o.alloc ?? a, row, o.crew ?? null, AT, AT);
  loi(() => chot(d.khach[1]!), /lc10_manifest/, "dòng của người khác trong đơn");
  loi(() => chot(khac.khach[0]!), /lc10_manifest/, "dòng của đơn khác");
  loi(() => chot("khong-co-dong"), /lc10_manifest/, "id dòng không tồn tại");
  const c2 = chuyenChuan(db, { tu: ms("12:00") });
  loi(() => chot(d.khach[0]!, { trip: c2.id }), /lc10_manifest/, "khác chuyến của suất");
  // sửa tên sau xác nhận = dòng MỚI; dòng cũ không còn hiện hành
  const moi = nid("pax");
  run(db, "INSERT INTO ord_passenger (id, order_id, full_name, birth_year, previous_id, person_key, created_at, updated_at) VALUES (?, ?, 'Khách Thử Sửa', 1990, ?, ?, ?, ?)",
    moi, d.id, d.khach[0]!, d.khach[0]!, AT, AT);
  loi(() => chot(d.khach[0]!), /lc10_manifest/, "dòng đã có dòng thay thế");
  chot(moi);
  loi(() => chot(null, { crew: hoSo(db, "PERSON", "HDV") }), /lc10_manifest/, "người đi kèm không phải suất CREW đó");
});
test("R-P19: chặng / hành khách của đơn ĐÃ XÁC NHẬN không xoá được (trigger ord_*_no_delete có sẵn — vế thay khoá ngoại)", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  suat(db, c, d.legs[0]!, { key: d.khach[0]! });
  loi(() => run(db, "DELETE FROM ord_transfer_leg WHERE id = ?", d.legs[0]!), /leg_frozen/);
  loi(() => run(db, "DELETE FROM ord_passenger WHERE id = ?", d.khach[0]!), /passenger_frozen/);
});

// =========================================================================================================================================================
// 0043 — MỐC "GIỜ HẸN ĐÃ BIẾT" (ADR-0051 GB1; TC-GB-1). P16: biến môi trường NHAC_GOI_BAO_SQL trỏ bản sao đã sửa của 0043.
// =========================================================================================================================================================
const RID = () => randomUUID();
/** Chèn một dòng mốc (kind, seq, giờ mới, giờ trước). */
/** `chup` = bản chụp kết quả lần đầu (GA-59) — mặc định JSON null ở BO_DANH_DAU, NULL ở loại khác. */
function moc(
  db: Db, leg: string,
  o: { seq: number; kind: string; ngay?: string; gio?: string | null; truocNgay?: string | null; truocGio?: string | null; rid?: string | null; chup?: string | null },
) {
  run(db, `INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, request_id, created_at, updated_at, bo_gio_hen_doi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, randomUUID(), leg, o.seq, o.kind, o.ngay ?? DAY, o.gio === undefined ? "07:00" : o.gio,
    o.truocNgay === undefined ? DAY : o.truocNgay, o.truocGio === undefined ? "07:00" : o.truocGio, o.rid === undefined ? (o.kind === "XEP" ? null : RID()) : o.rid, AT, AT,
    o.chup === undefined ? (o.kind === "BO_DANH_DAU" ? "null" : null) : o.chup);
}
/** Chặng có khách chờ đón trên chuyến chưa chạy + mốc XEP 07:00. */
function changTrenXe(db: Db): { leg: string; c: Chuyen; a: string } {
  const c = chuyenChuan(db);
  const d = don(db);
  const a = suat(db, c, d.legs[0]!); // gieoMocXep: XEP seq 1 (DAY, 09:00)
  return { leg: d.legs[0]!, c, a };
}

test("TC-GB-1 (0043): chỉ-thêm — UPDATE / DELETE dòng mốc → gb_append_only", () => {
  const db = openDb();
  const { leg } = changTrenXe(db);
  loi(() => run(db, "UPDATE vc_leg_appt_ack SET appt_time = '08:00' WHERE leg_id = ?", leg), /gb_append_only/);
  loi(() => run(db, "DELETE FROM vc_leg_appt_ack WHERE leg_id = ?", leg), /gb_append_only/);
});

test("TC-GB-1: chuỗi — nhảy seq (3 khi mới có 1) → gb_chain; giờ 'trước' lệch dòng trước → gb_chain; nối đúng → được; hai dòng cùng seq → UNIQUE", () => {
  const db = openDb();
  const { leg } = changTrenXe(db); // XEP 09:00
  loi(() => moc(db, leg, { seq: 3, kind: "DA_GOI", gio: "09:15", truocGio: "09:00" }), /gb_chain/, "nhảy seq");
  loi(() => moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:15", truocGio: "08:00" }), /gb_chain/, "prev lệch appt của seq 1");
  moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:15", truocGio: "09:00" });
  loi(() => moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:30", truocGio: "09:00" }), /UNIQUE constraint failed: vc_leg_appt_ack\.leg_id, vc_leg_appt_ack\.seq|gb_chain/);
});

test("TC-GB-1: CHECK — dòng người bấm KHÔNG đổi giờ; XEP có giờ trước / request_id; DA_GOI ở seq 1; request_id sai độ dài → CHECK", () => {
  const db = openDb();
  const { leg } = changTrenXe(db);
  loi(() => moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:00", truocGio: "09:00" }), /CHECK constraint failed/, "không đổi giờ");
  const d = don(db);
  loi(() => moc(db, d.legs[0]!, { seq: 1, kind: "XEP", truocNgay: DAY, truocGio: null }), /CHECK constraint failed/, "XEP có giờ trước");
  loi(() => moc(db, d.legs[0]!, { seq: 1, kind: "XEP", truocNgay: null, truocGio: null, rid: RID() }), /CHECK constraint failed/, "XEP có request_id");
  // Dòng người bấm ở seq 1 — trigger "còn khách chờ" (BEFORE INSERT) chạy trước CHECK: bị chặn ở lớp nào cũng được, miễn không vào bảng.
  loi(() => moc(db, d.legs[0]!, { seq: 1, kind: "DA_GOI", truocNgay: null, truocGio: null }), /CHECK constraint failed|gb_active/, "seq 1 phải XEP");
  loi(() => moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:15", truocGio: "09:00", rid: "ngan" }), /CHECK constraint failed/);
});

test("TC-GB-1: BO_DANH_DAU — sau XEP → gb_chain; không khôi phục đúng giờ trước khi bấm → gb_chain; khôi phục đúng → được; so IS với giờ NULL ('chưa chốt giờ') đúng", () => {
  const db = openDb();
  const { leg } = changTrenXe(db); // XEP 09:00
  loi(() => moc(db, leg, { seq: 2, kind: "BO_DANH_DAU", gio: "08:00", truocGio: "09:00" }), /gb_chain/, "dòng trước là XEP");
  moc(db, leg, { seq: 2, kind: "DA_GOI", gio: null, truocGio: "09:00" }); // 09:00 → chưa chốt giờ
  loi(() => moc(db, leg, { seq: 3, kind: "BO_DANH_DAU", gio: "09:30", truocGio: null }), /gb_chain/, "khôi phục sai giờ");
  moc(db, leg, { seq: 3, kind: "BO_DANH_DAU", gio: "09:00", truocGio: null }); // khôi phục 09:00; giờ trước NULL IS NULL
  moc(db, leg, { seq: 4, kind: "DA_GOI", gio: null, truocGio: "09:00" });
  assert.equal(one<{ n: number }>(db, "SELECT count(*) n FROM vc_leg_appt_ack WHERE leg_id = ?", leg).n, 4);
});

test("TC-GB-1 GA-59 (chủ lần 16): bản chụp kết quả lần đầu `bo_gio_hen_doi` — CHỈ và BẮT BUỘC ở BO_DANH_DAU; hình đóng { moi: { ngay, gio }, maChuyen: [mã có thật] } hoặc JSON null; khoá thừa / chữ tự do / mã lạ → chặn", () => {
  const db = openDb();
  const { leg, c } = changTrenXe(db); // XEP 09:00
  const ma = one<{ code: string }>(db, "SELECT code FROM vc_trip WHERE id = ?", c.id).code;
  loi(() => moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:15", truocGio: "09:00", chup: "null" }), /CHECK constraint failed/, "DA_GOI không mang bản chụp");
  moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:15", truocGio: "09:00" });
  const bo = (chup: string | null) => moc(db, leg, { seq: 3, kind: "BO_DANH_DAU", gio: "09:00", truocGio: "09:15", chup });
  const tot = (gio: string | null, maChuyen: unknown[] = [ma]) => JSON.stringify({ moi: { ngay: DAY, gio }, maChuyen });
  loi(() => bo(null), /CHECK constraint failed/, "BO_DANH_DAU thiếu bản chụp");
  loi(() => bo("{khong-phai-json"), /CHECK constraint failed|malformed JSON/, "JSON hỏng");
  loi(() => bo('"Khách Dò Tìm"'), /CHECK constraint failed/, "chuỗi trần (chữ tự do)");
  loi(() => bo(JSON.stringify({ moi: { ngay: DAY, gio: "09:15" }, maChuyen: [ma], ten: "Khách Dò Tìm" })), /CHECK constraint failed/, "khoá thừa ở gốc");
  loi(() => bo(JSON.stringify({ moi: { ngay: DAY, gio: "09:15", sdt: "0900000001" }, maChuyen: [ma] })), /CHECK constraint failed/, "khoá thừa trong moi");
  loi(() => bo(JSON.stringify({ moi: { ngay: DAY }, maChuyen: [ma] })), /CHECK constraint failed/, "thiếu moi.gio");
  loi(() => bo(JSON.stringify({ moi: { gio: "09:15" }, maChuyen: [ma] })), /CHECK constraint failed/, "thiếu moi.ngay");
  loi(() => bo(JSON.stringify({ moi: { ngay: "2026-02-30", gio: "09:15" }, maChuyen: [ma] })), /CHECK constraint failed/, "ngày sai");
  loi(() => bo(tot("9h15")), /CHECK constraint failed/, "giờ sai khuôn");
  loi(() => bo(JSON.stringify({ moi: { ngay: DAY, gio: "09:15" } })), /CHECK constraint failed/, "thiếu maChuyen");
  loi(() => bo(tot("09:15", [])), /CHECK constraint failed/, "maChuyen rỗng (có mục ⇒ có chuyến chở khách chờ)");
  loi(() => bo(tot("09:15", ["Khách Dò Tìm 1990"])), /gb_snapshot/, "phần tử không phải mã chuyến có thật");
  loi(() => bo(tot("09:15", [ma, 1990])), /gb_snapshot/, "phần tử không phải chữ");
  bo(tot("09:15"));
  assert.deepEqual(JSON.parse(one<{ s: string }>(db, "SELECT bo_gio_hen_doi s FROM vc_leg_appt_ack WHERE leg_id = ? AND seq = 3", leg).s), { moi: { ngay: DAY, gio: "09:15" }, maChuyen: [ma] });
  moc(db, leg, { seq: 4, kind: "DA_GOI", gio: null, truocGio: "09:00" });
  moc(db, leg, { seq: 5, kind: "BO_DANH_DAU", gio: "09:00", truocGio: null, chup: tot(null) }); // giờ mới "chưa chốt giờ" → được
  moc(db, leg, { seq: 6, kind: "DA_GOI", gio: "09:40", truocGio: "09:00" });
  moc(db, leg, { seq: 7, kind: "BO_DANH_DAU", gio: "09:00", truocGio: "09:40", chup: "null" }); // lần đầu không còn mục
  const d = don(db);
  loi(() => moc(db, d.legs[0]!, { seq: 1, kind: "XEP", truocNgay: null, truocGio: null, chup: "null" }), /CHECK constraint failed/, "XEP không mang bản chụp");
  moc(db, d.legs[0]!, { seq: 1, kind: "XEP", truocNgay: null, truocGio: null }); // chống bài rỗng: đúng dòng đó, không bản chụp → được
});

test("TC-GB-1: dòng người bấm chỉ khi chặng còn khách CHỜ ĐÓN trên xe chưa kết thúc — suất đã đóng / đã lên / chuyến huỷ → gb_active; XEP không bị điều kiện này", () => {
  const db = openDb();
  const { leg, c, a } = changTrenXe(db);
  run(db, "UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED' WHERE id = ?", AT, a);
  loi(() => moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:15", truocGio: "09:00" }), /gb_active/, "suất đã đóng");
  const b = suat(db, c, leg);
  moc(db, leg, { seq: 2, kind: "DA_GOI", gio: "09:15", truocGio: "09:00" });
  run(db, "UPDATE vc_trip_allocation SET status = 'NO_SHOW' WHERE id = ?", b);
  loi(() => moc(db, leg, { seq: 3, kind: "BO_DANH_DAU", gio: "09:00", truocGio: "09:15" }), /gb_active/, "không còn ai chờ");
  const d = don(db);
  moc(db, d.legs[0]!, { seq: 1, kind: "XEP", truocNgay: null, truocGio: null }); // XEP: không đòi suất
});

test("TC-GB-1: mở suất KHÁCH cho chặng CHƯA có mốc → gb_needs_appt; có mốc → được; suất người đi kèm không cần mốc", () => {
  const db = openDb();
  const c = chuyenChuan(db);
  const d = don(db);
  const chen = () => run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, board_stop_id, alight_stop_id, status, valid_from_at, created_at, updated_at)
     VALUES (?, ?, 'PASSENGER', ?, ?, ?, 'WAITING', ?, ?, ?)`, nid("al"), c.id, d.legs[0]!, c.di, c.tra, AT, AT, AT);
  loi(chen, /gb_needs_appt/);
  gieoMocXep(db, d.legs[0]!);
  chen();
  run(db, `INSERT INTO vc_trip_allocation (id, trip_id, kind, crew_party_id, status, valid_from_at, created_at, updated_at) VALUES (?, ?, 'CREW', ?, 'WAITING', ?, ?, ?)`,
    nid("al"), c.id, hoSo(db, "PERSON", "HDV"), AT, AT, AT);
});

test("TC-GB-1: CHECK loại dòng TỰ ĐỨNG (khi trigger chuỗi / 'còn khách chờ' bị gỡ — SQL gõ tay): DA_GOI ở seq 1, XEP ở seq 2 → CHECK", () => {
  const db = openDb();
  db.exec("DROP TRIGGER vc_leg_appt_ack_active");
  db.exec("DROP TRIGGER vc_leg_appt_ack_chain");
  const d = don(db);
  loi(() => moc(db, d.legs[0]!, { seq: 1, kind: "DA_GOI", truocNgay: DAY, truocGio: "08:00" }), /CHECK constraint failed/, "DA_GOI ở seq 1");
  moc(db, d.legs[0]!, { seq: 1, kind: "XEP", truocNgay: null, truocGio: null });
  loi(() => moc(db, d.legs[0]!, { seq: 2, kind: "XEP", truocNgay: null, truocGio: null }), /CHECK constraint failed/, "XEP ở seq 2");
});
