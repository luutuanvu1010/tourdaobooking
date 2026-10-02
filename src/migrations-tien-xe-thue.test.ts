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
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, o.nx, o.tuyen ?? null, o.co ?? null, o.tien ?? 1_000_000, o.tu ?? "2026-10-01", o.den ?? null, AT, AT);
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

test("vc_rental_rate: tiền nguyên dương; có tuyến hoặc cỡ; unit chỉ PER_TRIP; ngày hợp lệ", () => {
  const db = openDb();
  const nx = nhaXe(db);
  tuyen(db, "NT-CR");
  co(db, "C16", 10, 16);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tien: 0 }), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tien: 1.5 }), /CHECK constraint failed/);
  loi(() => gia(db, { nx }), /CHECK constraint failed/, "thiếu cả tuyến lẫn cỡ");
  loi(() => run(db, `INSERT INTO vc_rental_rate (id, carrier_party_id, route_code, unit, amount, valid_from_date, created_at, updated_at)
     VALUES ('u', ?, 'NT-CR', 'PER_KM', 1000, '2026-10-01', ?, ?)`, nx, AT, AT), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tu: "2026-10-05", den: "2026-10-04" }), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tu: "2026-10-5" }), /CHECK constraint failed/, "ngày sai khuôn");
  gia(db, { nx, tuyen: "NT-CR", co: "C16" });
});

test("chồng hiệu lực cùng khoá (so trống bằng IS, ngày mở = 9999-12-31) → trigger; khác khoá → được", () => {
  const db = openDb();
  const nx = nhaXe(db);
  tuyen(db, "NT-CR");
  co(db, "C16", 10, 16);
  gia(db, { nx, tuyen: "NT-CR", tu: "2026-10-01", den: "2026-10-31" });
  loi(() => gia(db, { nx, tuyen: "NT-CR", tu: "2026-10-31" }), /vc_rate_overlap/, "chạm đúng ngày cuối");
  gia(db, { nx, tuyen: "NT-CR", tu: "2026-11-01" });
  gia(db, { nx, tuyen: "NT-CR", co: "C16", tu: "2026-10-01" }); // khoá khác (cỡ không trống)
  gia(db, { nx, co: "C16", tu: "2026-10-01" });
  loi(() => gia(db, { nx, co: "C16", tu: "2027-01-01" }), /vc_rate_overlap/, "dòng mở chồng mọi ngày sau");
});

test("chỉ-thêm: không xoá, không đổi tiền/khoá/ngày bắt đầu; valid_to_date đặt MỘT lần", () => {
  const db = openDb();
  const nx = nhaXe(db);
  tuyen(db, "NT-CR");
  const id = gia(db, { nx, tuyen: "NT-CR" });
  loi(() => run(db, "DELETE FROM vc_rental_rate WHERE id = ?", id), /vc_rate_append_only/);
  loi(() => run(db, "UPDATE vc_rental_rate SET amount = 2 WHERE id = ?", id), /vc_rate_append_only/);
  loi(() => run(db, "UPDATE vc_rental_rate SET route_code = NULL WHERE id = ?", id), /vc_rate_append_only/);
  run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-10-31', updated_at = ? WHERE id = ?", AT, id);
  loi(() => run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-11-30' WHERE id = ?", id), /vc_rate_append_only/);
});

test("vai CARRIER chỉ khi THÊM; ĐÓNG giá của nhà xe đã thôi vai vẫn được (người kiểm soi)", () => {
  const db = openDb();
  tuyen(db, "NT-CR");
  const caNhan = hoSo(db, "ORGANIZATION", "Không phải nhà xe");
  loi(() => gia(db, { nx: caNhan, tuyen: "NT-CR" }), /vc_rate_carrier/);
  const nx = nhaXe(db);
  const id = gia(db, { nx, tuyen: "NT-CR" });
  thoiVai(db, nx);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tu: "2027-01-01", co: null }), /vc_rate_carrier|vc_rate_overlap/);
  loi(() => gia(db, { nx, tuyen: null, co: null, tu: "2027-01-01" }), /vc_rate_carrier|CHECK/);
  run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-10-31', updated_at = ? WHERE id = ?", AT, id); // đóng: được
});

