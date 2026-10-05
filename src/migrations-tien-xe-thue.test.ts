// Kiểm migration TIỀN XE THUÊ (ADR-0057 T1 B1/B4 — 0072_vc_bang_gia_thue.sql; T2 C2a/C2/C3/C5/C8 — 0073_vc_chi_phi_chuyen.sql) ở LỚP CSDL. Dựng schema THẬT
// từ MỌI migrations/*.sql bằng node:sqlite, chèn / sửa thẳng SQL (khuôn src/migrations-chuyen-xe.test.ts — chép phần đầu, không import chéo tệp test).
// Lớp máy chủ (luật thuần + route) kiểm ở src/modules/van-chuyen/tien-xe*.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
/** P16 (sửa cố ý): biến môi trường trỏ bản sao đã sửa của migration giá / chi phí. */
const SQL_GIA = process.env.TIEN_XE_GIA_SQL ? readFileSync(process.env.TIEN_XE_GIA_SQL, "utf8") : null;
const SQL_CHI_PHI = process.env.TIEN_XE_CHI_PHI_SQL ? readFileSync(process.env.TIEN_XE_CHI_PHI_SQL, "utf8") : null;
const sqlOf = (f: string) =>
  /_vc_bang_gia_thue\.sql$/.test(f) && SQL_GIA !== null ? SQL_GIA : /_vc_chi_phi_chuyen\.sql$/.test(f) && SQL_CHI_PHI !== null ? SQL_CHI_PHI : readFileSync(new URL(f, DIR), "utf8");

const AT = "2026-10-02T03:00:00.000Z";
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
const thoiVai = (db: Db, party: string) => run(db, "UPDATE pty_party_role SET valid_to_date = '2026-10-02' WHERE party_id = ? AND role_type_code = 'CARRIER'", party);
function xe(db: Db, chu: string, cho = 16): string {
  const id = nid("xe");
  const bien = `79B${String(n).padStart(5, "0")}`;
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`, id, bien, bien, `KHUNG${n}`, `KHUNG${n}`, cho, chu, AT, AT);
  return id;
}

// ---- T1: tuyến, cỡ xe, dòng giá -------------------------------------------------------------------------------------------------------------------------
const tuyen = (db: Db, code: string) => run(db, "INSERT INTO vc_route (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)", code, `Tuyến ${code}`, AT, AT);
const co = (db: Db, code: string, min: number, max: number, active = 1) =>
  run(db, "INSERT INTO vc_vehicle_size (code, label, min_passengers, max_passengers, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", code, code, min, max, active, AT, AT);
const gia = (db: Db, o: { nx: string; tuyen?: string | null; co?: string | null; tien?: number; tu?: string; den?: string | null; id?: string }) => {
  const id = o.id ?? nid("rate");
  run(db, `INSERT INTO vc_rental_rate (id, carrier_party_id, route_code, vehicle_size_code, amount, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, o.nx, o.tuyen === undefined ? "NT-CR" : o.tuyen, o.co === undefined ? "C16" : o.co, o.tien ?? 1_000_000, o.tu ?? "2026-10-01", o.den ?? null, AT, AT);
  return id;
};

test("vc_route / vc_vehicle_size: không xoá, không đổi mã; cỡ đang dùng không chồng khoảng; bật lại cỡ chồng → chặn; khoảng bất biến", () => {
  const db = openDb();
  tuyen(db, "NT-CR");
  loi(() => run(db, "DELETE FROM vc_route WHERE code = 'NT-CR'"), /vc_route_no_delete/);
  loi(() => run(db, "UPDATE vc_route SET code = 'XX' WHERE code = 'NT-CR'"), /vc_route_identity/);
  run(db, "UPDATE vc_route SET name = 'NT – Cam Ranh', active = 0 WHERE code = 'NT-CR'"); // nhãn, ngưng dùng: được
  co(db, "C16", 10, 16);
  loi(() => co(db, "C20", 15, 20), /vc_size_overlap/);
  co(db, "C20CU", 15, 20, 0); // cỡ ngưng dùng không tính chồng
  loi(() => run(db, "UPDATE vc_vehicle_size SET active = 1 WHERE code = 'C20CU'"), /vc_size_overlap/);
  loi(() => run(db, "UPDATE vc_vehicle_size SET max_passengers = 18 WHERE code = 'C16'"), /vc_size_identity/);
  loi(() => run(db, "DELETE FROM vc_vehicle_size WHERE code = 'C16'"), /vc_size_no_delete/);
  loi(() => co(db, "CSAI", 20, 19), /CHECK constraint failed/);
});

/** Danh mục chung của các bài dòng giá: tuyến NT-CR, NT-DL; cỡ C16 (10–16), C29 (17–29). */
const danhMuc = (db: Db) => { tuyen(db, "NT-CR"); tuyen(db, "NT-DL"); co(db, "C16", 10, 16); co(db, "C29", 17, 29); };

test("vc_rental_rate (vòng sửa 2 — B): tiền nguyên dương; BẮT BUỘC cả tuyến LẪN cỡ xe; unit chỉ PER_TRIP; ngày hợp lệ", () => {
  const db = openDb();
  const nx = nhaXe(db);
  danhMuc(db);
  loi(() => gia(db, { nx, tien: 0 }), /CHECK constraint failed|NOT NULL constraint failed/);
  loi(() => gia(db, { nx, tien: 1.5 }), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tuyen: null, co: null }), /CHECK constraint failed|NOT NULL constraint failed/, "thiếu cả tuyến lẫn cỡ");
  loi(() => gia(db, { nx, co: null }), /CHECK constraint failed|NOT NULL constraint failed/, "chỉ tuyến — không còn cho phép");
  loi(() => gia(db, { nx, tuyen: null }), /CHECK constraint failed|NOT NULL constraint failed/, "chỉ cỡ — không còn cho phép");
  loi(() => run(db, `INSERT INTO vc_rental_rate (id, carrier_party_id, route_code, vehicle_size_code, unit, amount, valid_from_date, created_at, updated_at)
     VALUES ('u', ?, 'NT-CR', 'C16', 'PER_KM', 1000, '2026-10-01', ?, ?)`, nx, AT, AT), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tu: "2026-10-05", den: "2026-10-04" }), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tu: "2026-10-5" }), /CHECK constraint failed/, "ngày sai khuôn");
  gia(db, { nx, tuyen: "NT-CR", co: "C16" });
});

test("chồng hiệu lực cùng khoá (nhà xe, tuyến, cỡ; ngày mở = 9999-12-31) → trigger; khác khoá → được", () => {
  const db = openDb();
  const nx = nhaXe(db);
  danhMuc(db);
  gia(db, { nx, tuyen: "NT-CR", co: "C29", tu: "2026-10-01", den: "2026-10-31" });
  loi(() => gia(db, { nx, tuyen: "NT-CR", co: "C29", tu: "2026-10-31" }), /vc_rate_overlap/, "chạm đúng ngày cuối");
  gia(db, { nx, tuyen: "NT-CR", co: "C29", tu: "2026-11-01" });
  gia(db, { nx, tuyen: "NT-CR", co: "C16", tu: "2026-10-01" }); // khoá khác (cỡ khác)
  gia(db, { nx, tuyen: "NT-DL", co: "C16", tu: "2026-10-01" }); // khoá khác (tuyến khác)
  loi(() => gia(db, { nx, tuyen: "NT-DL", co: "C16", tu: "2027-01-01" }), /vc_rate_overlap/, "dòng mở chồng mọi ngày sau");
});

test("chỉ-thêm: không xoá, không đổi tiền/khoá/ngày bắt đầu; valid_to_date đặt MỘT lần", () => {
  const db = openDb();
  const nx = nhaXe(db);
  danhMuc(db);
  const id = gia(db, { nx });
  loi(() => run(db, "DELETE FROM vc_rental_rate WHERE id = ?", id), /vc_rate_append_only/);
  loi(() => run(db, "UPDATE vc_rental_rate SET amount = 2 WHERE id = ?", id), /vc_rate_append_only/);
  loi(() => run(db, "UPDATE vc_rental_rate SET route_code = 'NT-DL' WHERE id = ?", id), /vc_rate_append_only/);
  run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-10-31', updated_at = ? WHERE id = ?", AT, id);
  loi(() => run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-11-30' WHERE id = ?", id), /vc_rate_append_only/);
});

test("vai CARRIER chỉ khi THÊM; ĐÓNG giá của nhà xe đã thôi vai vẫn được (người kiểm soi)", () => {
  const db = openDb();
  danhMuc(db);
  const caNhan = hoSo(db, "ORGANIZATION", "Không phải nhà xe");
  loi(() => gia(db, { nx: caNhan }), /vc_rate_carrier/);
  const nx = nhaXe(db);
  const id = gia(db, { nx });
  thoiVai(db, nx);
  loi(() => gia(db, { nx, tuyen: "NT-DL", tu: "2027-01-01" }), /vc_rate_carrier/);
  run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-10-31', updated_at = ? WHERE id = ?", AT, id); // đóng: được
});

// ==== T2 (0073): cờ xe thuê, tuyến trên chuyến, dòng chi phí, cổng thiếu giá ===========================================================================
const POLICY = "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0"; // dòng chính sách gieo của 0041
const DAY = "2026-10-15";
const H = 3_600_000;
const ms = (hhmm: string) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`);
function taiXeCua(db: Db, carrier: string): string {
  const t = hoSo(db, "PERSON", "Tài xế nhà xe");
  run(db, "INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-20', ?, ?)",
    nid("q"), t, carrier, AT, AT);
  return t;
}
/** Chèn chuyến THẲNG (lớp CSDL). `rented` mặc định = phân loại đúng theo chủ xe (khuôn hàm chuyen() của migrations-chuyen-xe.test.ts sau 0073). */
function chuyen(db: Db, o: { xe: string; rented?: number; status?: string; tu?: number; route?: string | null }): string {
  const id = nid("tr");
  const tu = o.tu ?? ms("07:00");
  const chu = one<{ c: string }>(db, "SELECT owner_party_id c FROM vc_vehicle WHERE id = ?", o.xe).c;
  const dung = one<{ r: number }>(db, "SELECT CASE WHEN ? IN (SELECT party_id FROM v_pty_carrier) AND ? NOT IN (SELECT party_id FROM v_pty_owner_company) THEN 1 ELSE 0 END r", chu, chu).r;
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, status,
     rented, route_code, last_cmd_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?, ?, ?)`,
    id, `CX-${id}`, o.xe, chu, new Date(tu + 7 * H).toISOString().slice(0, 10), tu, tu + 2 * H, tu, o.status ?? "PLANNED", o.rented ?? dung, o.route ?? null, randomUUID(), AT, AT);
  return id;
}
const laiXe = (db: Db, trip: string, taiXe: string) =>
  run(db, "INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", nid("dr"), trip, taiXe, AT, AT, AT);
function cong(db: Db, trip: string): string {
  const cmd = randomUUID();
  run(db, "UPDATE vc_trip SET version = version + 1, last_cmd_id = ?, updated_at = ? WHERE id = ?", cmd, AT, trip);
  return cmd;
}
/** Xuất bến lớp CSDL: câu cổng → bản kiểm ĐẠT mang dấu lệnh → status RUNNING (khuôn xuatBenTrongLo của migrations-chuyen-xe.test.ts, không sự kiện). */
function xuatBen(db: Db, trip: string): void {
  const cmd = cong(db, trip);
  const t = one<{ vehicle_id: string; carrier_party_id: string }>(db, "SELECT vehicle_id, carrier_party_id FROM vc_trip WHERE id = ?", trip);
  run(db, `INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
     rest_minutes_used, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'DAT', ?, '79B-000.00', 16, ?, ?, 30, ?, ?, ?)`,
    nid("ck"), trip, cmd, POLICY, t.vehicle_id, t.carrier_party_id, t.carrier_party_id, AT, AT, AT);
  const luc = new Date(ms("07:00")).toISOString();
  run(db, "UPDATE vc_trip SET status = 'RUNNING', departed_at = ?, departed_ms = ?, updated_at = ? WHERE id = ?", luc, ms("07:00"), luc, trip);
}
const ketThuc = (db: Db, trip: string, gianDoan = false) =>
  run(db, `UPDATE vc_trip SET status = ?, ended_at = ?, ended_ms = ?, end_reason_code = ? WHERE id = ?`,
    gianDoan ? "ENDED_INTERRUPTED" : "ENDED", new Date(ms("08:00")).toISOString(), ms("08:00"), gianDoan ? "GIAN_DOAN_XE_HONG" : null, trip);
const huy = (db: Db, trip: string) => run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", trip);
interface Cp { trip: string; kind: string; amount: number; carrier?: string; rate?: string | null; reason?: string | null; reverses?: string | null; cap?: number | null; ngay?: string }
function cp(db: Db, o: Cp): string {
  const id = nid("cl");
  const carrier = o.carrier ?? one<{ c: string }>(db, "SELECT carrier_party_id c FROM vc_trip WHERE id = ?", o.trip).c;
  const snap = o.kind === "SNAPSHOT";
  run(db, `INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, rate_id, passenger_capacity_snapshot, unit_amount_snapshot, reason_code, reverses_id,
     occurred_date, cmd_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, o.trip, carrier, o.kind, o.amount, o.rate === undefined ? null : o.rate, o.cap === undefined ? (snap ? 16 : null) : o.cap, snap ? o.amount : null,
    o.reason === undefined ? (snap ? null : o.kind === "AGREED" ? "CPX_GIA_THOA_THUAN" : "CPX_KHAC") : o.reason, o.reverses ?? null, o.ngay ?? DAY, randomUUID(), AT, AT);
  return id;
}
const carrierOf = (db: Db, trip: string) => one<{ c: string }>(db, "SELECT carrier_party_id c FROM vc_trip WHERE id = ?", trip).c;
/** Nhà xe + tài xế + xe 16 chỗ + tuyến NT-CR + giá 1.200.000 + chuyến xe thuê có tài xế. */
function nen(db: Db) {
  const nx = nhaXe(db);
  const tx = taiXeCua(db, nx);
  const x = xe(db, nx, 16);
  tuyen(db, "NT-CR");
  co(db, "C16", 10, 16);
  const g = gia(db, { nx, tuyen: "NT-CR", co: "C16", tien: 1_200_000 });
  const t = chuyen(db, { xe: x, route: "NT-CR" });
  laiXe(db, t, tx);
  return { nx, tx, x, g, t };
}

test("T2 ca 1: chèn chuyến thẳng ở trạng thái khác PLANNED → vc_trip_insert_planned", () => {
  const db = openDb();
  const x = xe(db, congTyChu(db));
  loi(() => chuyen(db, { xe: x, status: "RUNNING" }), /vc_trip_insert_planned/);
  loi(() => chuyen(db, { xe: x, status: "CANCELLED" }), /vc_trip_insert_planned/);
});

test("T2 ca 2: cờ xe thuê lúc chèn phải khớp chủ xe (nhà xe đang mở ⇒ 1, công ty ⇒ 0); chủ chụp = công ty chủ trên xe nhà xe vẫn báo lc13_carrier", () => {
  const db = openDb();
  const nx = nhaXe(db);
  const xeNx = xe(db, nx);
  const xeCty = xe(db, congTyChu(db));
  loi(() => chuyen(db, { xe: xeNx, rented: 0 }), /vc_rented_mismatch/);
  loi(() => chuyen(db, { xe: xeCty, rented: 1 }), /vc_rented_mismatch/);
  assert.equal(one<{ r: number }>(db, "SELECT rented r FROM vc_trip WHERE id = ?", chuyen(db, { xe: xeNx })).r, 1);
  assert.equal(one<{ r: number }>(db, "SELECT rented r FROM vc_trip WHERE id = ?", chuyen(db, { xe: xeCty, tu: ms("12:00") })).r, 0);
  loi(() => run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES ('t-sai', 'CX-SAI', ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, xeNx, congTyChu(db), DAY, ms("15:00"), ms("16:00"), ms("15:00"), randomUUID(), AT, AT), /lc13_carrier/);
});

test("T2 ca 3: đổi xe sang xe nhà xe khác mà để rented = 0 → chặn; sang xe công ty để rented = 1 → vc_rented_change; đúng cờ → được", () => {
  const db = openDb();
  const { t } = nen(db);
  const nx2 = nhaXe(db);
  const x2 = xe(db, nx2);
  const boTaiXe = (trip: string) => run(db, "UPDATE vc_trip_driver SET valid_to_at = ?, close_reason = 'REASSIGNED' WHERE trip_id = ? AND valid_to_at IS NULL", AT, trip);
  boTaiXe(t); // đổi xe trước, gắn tài xế mới sau (LC-13)
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ?, rented = 0 WHERE id = ?", x2, nx2, t), /vc_rented_change|vc_rented_lower/);
  run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ?, rented = 1 WHERE id = ?", x2, nx2, t);
  const xeCty = xe(db, congTyChu(db));
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ?, rented = 1 WHERE id = ?", xeCty, congTyChu(db), t), /vc_rented_change/);
  run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ?, rented = 0 WHERE id = ?", xeCty, congTyChu(db), t);
  laiXe(db, t, hoSo(db, "PERSON", "Tài xế công ty"));
  // Chuyến không thuê đổi sang xe nhà xe để rented = 0 → vc_rented_change.
  const t2 = chuyen(db, { xe: xe(db, congTyChu(db)), tu: ms("12:00") }); // chưa có tài xế (LC-13 không vướng)
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ? WHERE id = ?", xe(db, nx2), nx2, t2), /vc_rented_change/);
  run(db, "UPDATE vc_trip SET vehicle_id = ?, carrier_party_id = ?, rented = 1 WHERE id = ?", xe(db, nx2), nx2, t2);
});

test("T2 ca 4: nhà xe thôi vai; đổi chuyến rented = 1 sang xe khác của CHÍNH nhà xe đó với rented = 0 → vc_rented_lower; giữ 1 → được", () => {
  const db = openDb();
  const { nx, t } = nen(db);
  const x2 = xe(db, nx);
  thoiVai(db, nx);
  loi(() => run(db, "UPDATE vc_trip SET vehicle_id = ?, rented = 0 WHERE id = ?", x2, t), /vc_rented_lower/);
  run(db, "UPDATE vc_trip SET vehicle_id = ?, rented = 1 WHERE id = ?", x2, t);
  assert.equal(one<{ r: number }>(db, "SELECT rented r FROM vc_trip WHERE id = ?", t).r, 1);
});

test("T2 ca 5: đổi RIÊNG cờ xe thuê → vc_rented_alone (cả nâng lẫn hạ)", () => {
  const db = openDb();
  const t = chuyen(db, { xe: xe(db, congTyChu(db)) });
  loi(() => run(db, "UPDATE vc_trip SET rented = 1 WHERE id = ?", t), /vc_rented_alone/);
  const t2 = nen(db).t;
  loi(() => run(db, "UPDATE vc_trip SET rented = 0 WHERE id = ?", t2), /vc_rented_lower|vc_rented_alone/);
});

test("T2 ca 6: đổi route_code khi RUNNING → vc_route_locked; khi PLANNED → được", () => {
  const db = openDb();
  const { t, g } = nen(db);
  tuyen(db, "NT-DL");
  run(db, "UPDATE vc_trip SET route_code = 'NT-DL' WHERE id = ?", t);
  run(db, "UPDATE vc_trip SET route_code = 'NT-CR' WHERE id = ?", t);
  cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g });
  xuatBen(db, t);
  loi(() => run(db, "UPDATE vc_trip SET route_code = 'NT-DL' WHERE id = ?", t), /vc_route_locked/);
});

test("T2 ca 7: chuyến xe thuê không nguồn giá → xuất bến thieu_gia; có SNAPSHOT / AGREED → được; SNAPSHOT đã đảo → thieu_gia; chuyến không thuê → được", () => {
  const db = openDb();
  const a = nen(db);
  loi(() => xuatBen(db, a.t), /thieu_gia/);
  const s = cp(db, { trip: a.t, kind: "SNAPSHOT", amount: 1_200_000, rate: a.g });
  cp(db, { trip: a.t, kind: "REVERSAL", amount: -1_200_000, reverses: s, reason: "CPX_DOI_CHUYEN" });
  loi(() => xuatBen(db, a.t), /thieu_gia/, "SNAPSHOT đã đảo");
  cp(db, { trip: a.t, kind: "AGREED", amount: 1_350_000 });
  xuatBen(db, a.t);
  ketThuc(db, a.t);
  const t2 = chuyen(db, { xe: a.x, tu: ms("12:00"), route: "NT-CR" });
  laiXe(db, t2, a.tx);
  cp(db, { trip: t2, kind: "SNAPSHOT", amount: 1_200_000, rate: a.g });
  xuatBen(db, t2);
  const tCty = chuyen(db, { xe: xe(db, congTyChu(db)), tu: ms("15:00") });
  xuatBen(db, tCty);
});

test("T2 ca 8: dòng chi phí chỉ-thêm; CHECK theo loại; lý do phải thuộc nhóm CHI_PHI_XE", () => {
  const db = openDb();
  const { t, g } = nen(db);
  const s = cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g });
  loi(() => run(db, "UPDATE vc_trip_cost_line SET amount = 1 WHERE id = ?", s), /vc_cost_append_only/);
  loi(() => run(db, "DELETE FROM vc_trip_cost_line WHERE id = ?", s), /vc_cost_append_only/);
  loi(() => cp(db, { trip: t, kind: "ADJUSTMENT", amount: 0 }), /CHECK constraint failed/);
  loi(() => cp(db, { trip: t, kind: "ADJUSTMENT", amount: 1.5 }), /CHECK constraint failed/);
  const t2 = chuyen(db, { xe: xe(db, carrierOf(db, t)), tu: ms("12:00") });
  loi(() => cp(db, { trip: t2, kind: "SNAPSHOT", amount: 0, rate: g }), /CHECK constraint failed|vc_cost_snapshot_rate/);
  loi(() => cp(db, { trip: t2, kind: "SNAPSHOT", amount: 1_200_000, rate: null }), /CHECK constraint failed|vc_cost_snapshot_rate/, "SNAPSHOT thiếu rate_id");
  loi(() => cp(db, { trip: t2, kind: "AGREED", amount: -5 }), /CHECK constraint failed|vc_cost_total_negative/);
  loi(() => cp(db, { trip: t, kind: "ADJUSTMENT", amount: 100, reason: null }), /CHECK constraint failed/, "điều chỉnh thiếu lý do");
  loi(() => cp(db, { trip: t2, kind: "AGREED", amount: 1_000, reason: null }), /CHECK constraint failed/, "thoả thuận thiếu lý do");
  loi(() => cp(db, { trip: t, kind: "ADJUSTMENT", amount: 100, reason: "HUY_KHAC" }), /vc_cost_reason/);
  loi(() => cp(db, { trip: t, kind: "ADJUSTMENT", amount: 100, rate: g }), /CHECK constraint failed/, "rate_id chỉ cho SNAPSHOT");
});

test("T2 ca 9: dòng đảo sai số / sai chuyến / đảo dòng đảo → vc_cost_reversal; đảo cùng gốc hai lần → UNIQUE reverses_id", () => {
  const db = openDb();
  const { t, g } = nen(db);
  cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g });
  const a = cp(db, { trip: t, kind: "ADJUSTMENT", amount: 150_000 });
  loi(() => cp(db, { trip: t, kind: "REVERSAL", amount: -150_001, reverses: a }), /vc_cost_reversal/);
  const t2 = chuyen(db, { xe: xe(db, carrierOf(db, t)), tu: ms("12:00") });
  loi(() => cp(db, { trip: t2, kind: "REVERSAL", amount: -150_000, reverses: a }), /vc_cost_reversal|vc_cost_total_negative/);
  const ra = cp(db, { trip: t, kind: "REVERSAL", amount: -150_000, reverses: a });
  loi(() => cp(db, { trip: t, kind: "REVERSAL", amount: 150_000, reverses: ra }), /vc_cost_reversal/, "đảo dòng đảo");
  loi(() => cp(db, { trip: t, kind: "REVERSAL", amount: -150_000, reverses: a }), /UNIQUE constraint failed: vc_trip_cost_line\.reverses_id/);
});

test("T2 ca 10: hai nguồn giá chưa đảo (SNAPSHOT rồi AGREED / SNAPSHOT) → vc_cost_one_source", () => {
  const db = openDb();
  const { t, g } = nen(db);
  cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g });
  loi(() => cp(db, { trip: t, kind: "AGREED", amount: 1_350_000 }), /vc_cost_one_source/);
  loi(() => cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g }), /vc_cost_one_source/);
});

test("T2 ca 11: SNAPSHOT / AGREED khi chuyến RUNNING / ENDED / CANCELLED → vc_cost_planned_only; đảo SNAPSHOT khi RUNNING → chặn; đảo ADJUSTMENT khi ENDED → được", () => {
  const db = openDb();
  const { t, g, x, tx } = nen(db);
  const s = cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g });
  const a = cp(db, { trip: t, kind: "ADJUSTMENT", amount: 100_000 });
  xuatBen(db, t);
  loi(() => cp(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s, reason: "CPX_NHAP_SAI" }), /vc_cost_planned_only/);
  loi(() => cp(db, { trip: t, kind: "AGREED", amount: 1_000 }), /vc_cost_planned_only|vc_cost_one_source/);
  ketThuc(db, t);
  loi(() => cp(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s, reason: "CPX_NHAP_SAI" }), /vc_cost_planned_only/);
  cp(db, { trip: t, kind: "REVERSAL", amount: -100_000, reverses: a, reason: "CPX_NHAP_SAI" });
  const t2 = chuyen(db, { xe: x, tu: ms("12:00") });
  laiXe(db, t2, tx);
  huy(db, t2);
  loi(() => cp(db, { trip: t2, kind: "SNAPSHOT", amount: 1_200_000, rate: g }), /vc_cost_planned_only/);
  loi(() => cp(db, { trip: t2, kind: "AGREED", amount: 1_000 }), /vc_cost_planned_only/);
});

test("T2 ca 12: tổng âm — SNAPSHOT 1.200.000 + ADJUSTMENT −200.000, đảo SNAPSHOT → vc_cost_total_negative (V9); đảo âm trước rồi dương → tổng 0 (V8); đảo điều chỉnh dương làm tổng âm → chặn", () => {
  const db = openDb();
  const { t, g } = nen(db);
  const s = cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g });
  const a = cp(db, { trip: t, kind: "ADJUSTMENT", amount: -200_000 });
  loi(() => cp(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s, reason: "CPX_NHAP_SAI" }), /vc_cost_total_negative/);
  cp(db, { trip: t, kind: "REVERSAL", amount: 200_000, reverses: a, reason: "CPX_HUY_CHUYEN" });
  cp(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s, reason: "CPX_HUY_CHUYEN" });
  assert.equal(one<{ n: number }>(db, "SELECT total(amount) n FROM vc_trip_cost_line WHERE trip_id = ?", t).n, 0);
  huy(db, t);
  const p = cp(db, { trip: t, kind: "ADJUSTMENT", amount: 300_000, reason: "CPX_HUY_MUON" });
  cp(db, { trip: t, kind: "ADJUSTMENT", amount: -300_000, reason: "CPX_NHAP_SAI" });
  loi(() => cp(db, { trip: t, kind: "REVERSAL", amount: -300_000, reverses: p, reason: "CPX_NHAP_SAI" }), /vc_cost_total_negative/, "đảo điều chỉnh dương làm tổng âm");
});

test("T2 ca 13: SNAPSHOT cho chuyến rented = 0 / sai nhà xe → vc_cost_source_carrier; SNAPSHOT sai dòng giá / sai số → vc_cost_snapshot_rate; nhà xe thôi vai: ADJUSTMENT + REVERSAL vẫn được, AGREED mới bị chặn (người kiểm soi)", () => {
  const db = openDb();
  const { nx, t, g } = nen(db);
  const tCty = chuyen(db, { xe: xe(db, congTyChu(db)), tu: ms("12:00") });
  loi(() => cp(db, { trip: tCty, kind: "SNAPSHOT", amount: 1_200_000, rate: g, carrier: nx }), /vc_cost_source_carrier/);
  loi(() => cp(db, { trip: tCty, kind: "AGREED", amount: 1_000 }), /vc_cost_source_carrier/);
  const nx2 = nhaXe(db);
  loi(() => cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g, carrier: nx2 }), /vc_cost_source_carrier|vc_cost_snapshot_rate/);
  loi(() => cp(db, { trip: t, kind: "AGREED", amount: 1_000, carrier: nx2 }), /vc_cost_source_carrier/, "AGREED sai nhà xe của chuyến");
  const g2 = gia(db, { nx: nx2, co: "C16", tuyen: "NT-CR", tien: 1_200_000 });
  loi(() => cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g2 }), /vc_cost_snapshot_rate/, "dòng giá của nhà xe khác");
  loi(() => cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_100_000, rate: g }), /vc_cost_snapshot_rate|CHECK constraint failed/, "số khác giá dòng");
  const s = cp(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, rate: g });
  thoiVai(db, nx);
  const a = cp(db, { trip: t, kind: "ADJUSTMENT", amount: 50_000 });
  cp(db, { trip: t, kind: "REVERSAL", amount: -50_000, reverses: a });
  cp(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s, reason: "CPX_DOI_CHUYEN" });
  loi(() => cp(db, { trip: t, kind: "AGREED", amount: 1_000 }), /vc_cost_source_carrier/, "nhà xe đã thôi: không đặt giá mới");
});
