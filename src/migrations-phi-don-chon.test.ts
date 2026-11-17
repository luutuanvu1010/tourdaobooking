// Kiểm migration 0173 (ADR-0214, Task 1): dòng phí đưa đón do văn phòng chọn (`fee_source = 'CHON'`, `fee_choice`), trigger hình dạng dòng tạo lại, khoá cột chụp thêm hai cột.
// SQL chạy THẲNG trên SQLite thật dựng từ mọi migration. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_phi_don_chon.sql"));
const AT = "2026-11-16T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const get = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as Record<string, V>;
const DANH_SACH = [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000];

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
/** Đơn nháp `o1`: một dịch vụ, một dòng dịch vụ, hai chặng (`o1-L1`, `o1-L2`), một mức phí `rule1` (cho dòng BANG_PHI). */
function don(db: DatabaseSync) {
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES ('o1', 'TD-o1', 's1', 'draft', 'Khách Giả', '0900000009', 600000, 0, 600000, 600000, ?, ?)`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('o1-s', 'o1', 'Tour', 'perPax', 2, '2026-12-10')");
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('o1-i1', 'o1', 'o1-s', 'Người lớn', 2, 300000, 600000)");
  for (const [k, dir] of [["L1", "OUT"], ["L2", "RETURN"]] as const)
    run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, 'o1', 'o1-s', ?, '2026-12-10', 'Khách sạn A', ?, ?)`, `o1-${k}`, dir, AT, AT);
  run(db, `INSERT INTO prc_transfer_fee_rule (id, kind, amount, valid_from_date, valid_to_date, condition_sig, note, created_at, created_by, updated_at, updated_by)
    VALUES ('rule1', 'PER_PAX', 70000, '2026-12-01', NULL, 'ZONE=CR', NULL, ?, NULL, ?, NULL)`, AT, AT);
}
const chen = (db: DatabaseSync, c: Record<string, V>) => {
  const cols = Object.keys(c);
  run(db, `INSERT INTO order_item (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, ...cols.map((k) => c[k]!));
};
/** Dòng phí CHỌN hợp lệ (mặc định DANH_SACH 10.000 × 2 khách); `over` ghi đè. */
const dongChon = (db: DatabaseSync, id: string, leg: string, over: Record<string, V> = {}) =>
  chen(db, { id, order_id: "o1", description: "Phí đưa đón", quantity: 2, unit_price: 10000, line_total: 20000, line_kind: "TRANSFER_FEE", transfer_leg_id: leg, fee_kind: "PER_PAX",
    fee_source: "CHON", fee_choice: "DANH_SACH", ...over });
/** Dòng phí BANG_PHI của Đợt C. */
const dongBang = (db: DatabaseSync, id: string, leg: string, over: Record<string, V> = {}) =>
  chen(db, { id, order_id: "o1", description: "Phí đưa đón", quantity: 2, unit_price: 70000, line_total: 140000, line_kind: "TRANSFER_FEE", transfer_leg_id: leg, fee_rule_id: "rule1", fee_kind: "PER_PAX", fee_zone_code: "CR", ...over });
const xacNhan = (db: DatabaseSync) => run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = 'o1'", AT, AT);
const re = /order_item_line_kind/;

test("0173: có đúng một tệp *_phi_don_chon.sql, sau 0172; không sửa dữ liệu cũ (không UPDATE/DELETE)", () => {
  assert.ok(FILE, "thiếu migrations/*_phi_don_chon.sql");
  assert.ok(FILE! > "0172", FILE);
  assert.doesNotMatch(readFileSync(new URL(FILE!, DIR), "utf8").replace(/^--.*$/gm, ""), /^\s*(UPDATE|DELETE)\b|DROP TABLE/im);
});

test("danh sách mức và trần trong trigger KHÓP src/shared/phi-don-chon.ts (khi tệp đã có)", async () => {
  const sql = readFileSync(new URL(FILE!, DIR), "utf8").replace(/^--.*$/gm, "");
  const m = sql.match(/NOT IN \(([^)]*)\)/);
  assert.ok(m, "không thấy danh sách trong trigger");
  assert.deepEqual(m![1]!.split(",").map((s) => Number(s.trim())), DANH_SACH);
  assert.match(sql, /unit_price > 5000000/);
  let mod: { DANH_SACH_PHI_DON?: readonly number[]; TRAN_PHI_DON?: number } | null = null;
  try { mod = await import("./shared/phi-don-chon.ts"); } catch { /* Task 2 chưa làm */ }
  if (mod?.DANH_SACH_PHI_DON) {
    assert.deepEqual([...mod.DANH_SACH_PHI_DON], DANH_SACH);
    assert.equal(mod.TRAN_PHI_DON, 5_000_000);
  }
});

test("dòng cũ: fee_source và fee_choice trống; giá trị lạ bị CHECK từ chối", () => {
  const db = moi();
  don(db);
  assert.deepEqual({ ...get(db, "SELECT fee_source, fee_choice FROM order_item WHERE id = 'o1-i1'") }, { fee_source: null, fee_choice: null });
  assert.throws(() => dongBang(db, "x", "o1-L1", { fee_source: "KHAC" }), /CHECK/);
  assert.throws(() => dongChon(db, "y", "o1-L1", { fee_choice: "KHAC" }), /CHECK/);
});

test("dòng CHON hợp lệ chèn được: mọi mức trong danh sách (kể cả 0 = miễn phí); số khác 12.000, 1 và 5.000.000", () => {
  const db = moi();
  don(db);
  dongChon(db, "f0", "o1-L1", { unit_price: 0, line_total: 0 });
  assert.equal(get(db, "SELECT count(*) AS n FROM order_item WHERE fee_source = 'CHON'").n, 1);
  for (const [i, v] of DANH_SACH.entries()) {
    const d = moi();
    don(d);
    dongChon(d, `f${i}`, "o1-L1", { unit_price: v, line_total: v * 2 });
  }
  dongChon(db, "f2", "o1-L2", { fee_choice: "SO_KHAC", unit_price: 12000, line_total: 24000 });
  for (const [i, v] of [1, 5_000_000].entries()) {
    const d = moi();
    don(d);
    dongChon(d, `s${i}`, "o1-L1", { fee_choice: "SO_KHAC", unit_price: v, line_total: v, fee_kind: "PER_TRIP", quantity: 1 }); // theo chuyến: số lượng 1
  }
});

test("dòng CHON thiếu fee_choice → chặn (chèn và sửa)", () => {
  const db = moi();
  don(db);
  assert.throws(() => dongChon(db, "a", "o1-L1", { fee_choice: null }), re);
  dongChon(db, "f1", "o1-L1");
  assert.throws(() => run(db, "UPDATE order_item SET fee_choice = NULL WHERE id = 'f1'"), re);
});

test("DANH_SACH với 12.000 → chặn; SO_KHAC 12.000 → qua; SO_KHAC 0 / âm / trên 5.000.000 → chặn (chèn và sửa)", () => {
  const db = moi();
  don(db);
  assert.throws(() => dongChon(db, "a", "o1-L1", { unit_price: 12000, line_total: 24000 }), re);
  dongChon(db, "b", "o1-L1", { fee_choice: "SO_KHAC", unit_price: 12000, line_total: 24000 });
  for (const [i, v] of [0, -1, 5_000_001].entries())
    assert.throws(() => dongChon(db, `c${i}`, "o1-L2", { fee_choice: "SO_KHAC", unit_price: v, line_total: v * 2 }), re, `số khác ${v}`);
  dongChon(db, "f1", "o1-L2");
  assert.throws(() => run(db, "UPDATE order_item SET unit_price = 12000, line_total = 24000 WHERE id = 'f1'"), re); // sửa giá ra ngoài danh sách
  run(db, "UPDATE order_item SET fee_choice = 'SO_KHAC', unit_price = 12000, line_total = 24000 WHERE id = 'f1'"); // đổi hẳn sang số khác: qua
});

test("dòng CHON mang mã mức / vùng / cấp → chặn; mang service_id / catalog_* / pax_code → chặn; thiếu chặng hoặc kiểu → chặn", () => {
  const db = moi();
  don(db);
  assert.throws(() => dongChon(db, "a", "o1-L1", { fee_rule_id: "rule1" }), re);
  assert.throws(() => dongChon(db, "b", "o1-L1", { fee_zone_code: "CR" }), re);
  assert.throws(() => dongChon(db, "c", "o1-L1", { fee_tier_code: "T1" }), re);
  assert.throws(() => dongChon(db, "d", "o1-L1", { service_id: "o1-s" }), re);
  assert.throws(() => dongChon(db, "e", "o1-L1", { catalog_code: "S1" }), re);
  assert.throws(() => dongChon(db, "g", "o1-L1", { transfer_leg_id: null }), re);
  assert.throws(() => dongChon(db, "h", "o1-L1", { fee_kind: null }), re);
  dongChon(db, "ok", "o1-L1", { fee_return_pax: 1 }); // số người chiều về vẫn được mang
});

test("dòng BANG_PHI của Đợt C vẫn chèn được (fee_source trống hoặc 'BANG_PHI'); thiếu mã mức / vùng vẫn chặn; mang fee_choice → chặn", () => {
  const db = moi();
  don(db);
  dongBang(db, "f1", "o1-L1"); // fee_source trống = dòng kiểu cũ
  dongBang(db, "f2", "o1-L2", { fee_source: "BANG_PHI" });
  assert.equal(get(db, "SELECT count(*) AS n FROM order_item WHERE line_kind = 'TRANSFER_FEE'").n, 2);
  for (const [i, cot] of (["fee_rule_id", "fee_zone_code"] as const).entries()) {
    const d = moi();
    don(d);
    assert.throws(() => dongBang(d, `x${i}`, "o1-L1", { [cot]: null }), re, `thiếu ${cot}`);
    assert.throws(() => dongBang(d, `y${i}`, "o1-L1", { fee_source: "BANG_PHI", [cot]: null }), re, `BANG_PHI thiếu ${cot}`);
  }
  assert.throws(() => dongBang(db, "z", "o1-L1", { fee_choice: "SO_KHAC" }), re);
});

test("dòng SERVICE mang fee_source hoặc fee_choice → chặn (chèn và sửa)", () => {
  const db = moi();
  don(db);
  const them = (cot: string, v: V) =>
    run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total, ${cot}) VALUES ('z', 'o1', 'o1-s', 'X', 1, 1, 1, ?)`, v);
  assert.throws(() => them("fee_source", "CHON"), re);
  assert.throws(() => them("fee_source", "BANG_PHI"), re);
  assert.throws(() => them("fee_choice", "SO_KHAC"), re);
  assert.throws(() => run(db, "UPDATE order_item SET fee_source = 'CHON' WHERE id = 'o1-i1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET fee_choice = 'DANH_SACH' WHERE id = 'o1-i1'"), re);
});

test("mỗi chặng tối đa một dòng phí, kể cả khi dòng thứ hai khác nguồn", () => {
  const db = moi();
  don(db);
  dongChon(db, "f1", "o1-L1");
  assert.throws(() => dongBang(db, "f2", "o1-L1"), /UNIQUE/);
});

test("đơn đã xác nhận: đổi fee_choice, fee_source (kể cả dòng cũ trống → BANG_PHI) → chặn; sửa mô tả vẫn được; đơn nháp đổi được", () => {
  const db = moi();
  don(db);
  dongChon(db, "f1", "o1-L1");
  dongBang(db, "f2", "o1-L2"); // dòng cũ, fee_source trống
  run(db, "UPDATE order_item SET fee_choice = 'SO_KHAC' WHERE id = 'f1'"); // còn nháp: được
  run(db, "UPDATE order_item SET fee_choice = 'DANH_SACH' WHERE id = 'f1'");
  run(db, "UPDATE orders SET subtotal = 760000, total = 760000, remaining_amount = 760000 WHERE id = 'o1'");
  xacNhan(db);
  const dong = /order_fee_frozen:/;
  assert.throws(() => run(db, "UPDATE order_item SET fee_choice = 'SO_KHAC' WHERE id = 'f1'"), dong);
  assert.throws(() => run(db, "UPDATE order_item SET fee_source = 'BANG_PHI', fee_rule_id = 'rule1', fee_zone_code = 'CR', fee_choice = NULL WHERE id = 'f1'"), dong);
  assert.throws(() => run(db, "UPDATE order_item SET fee_source = 'BANG_PHI' WHERE id = 'f2'"), dong);
  run(db, "UPDATE order_item SET description = 'Phí đưa đón (sửa chữ)' WHERE id = 'f1'");
  assert.equal(get(db, "SELECT fee_choice AS c FROM order_item WHERE id = 'f1'").c, "DANH_SACH");
});
