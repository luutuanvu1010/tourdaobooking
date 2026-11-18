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

// ---- Migration 0179 (ADR-0218 Đợt 2, Task 6): dòng phí nguồn mới do máy tính. Dòng CHON / BANG_PHI cũ vẫn qua y như trước (các bài ở trên). ----
const FILE2 = files.find((f) => f.endsWith("_phi_don_nguon_tinh.sql"));
const dongMay = (db: DatabaseSync, id: string, leg: string, over: Record<string, V>) =>
  chen(db, { id, order_id: "o1", description: "Phí đưa đón", quantity: 2, line_kind: "TRANSFER_FEE", transfer_leg_id: leg, fee_kind: "PER_PAX", unit_price: 30000, line_total: 60000, ...over });
let nLeg = 0;
/** Chặng mới (mỗi chặng chỉ một dòng phí). */
const chang = (db: DatabaseSync): string => {
  const id = `o1-M${++nLeg}`;
  run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, 'o1', 'o1-s', 'OUT', '2026-12-10', 'Khách sạn A', ?, ?)`, id, AT, AT);
  return id;
};
const GOC = { fee_calc_source: "GIA_GOC", fee_base_price: 50000, fee_tier_discount: 20000, fee_tier_code: "C3" };
const throwsRe = (f: () => void, r: RegExp) => assert.throws(f, r);

test("0179: tệp *_phi_don_nguon_tinh.sql sau 0178, không UPDATE/DELETE dữ liệu cũ", () => {
  assert.ok(FILE2, "thiếu migrations/*_phi_don_nguon_tinh.sql");
  assert.ok(FILE2! > "0178", FILE2);
  assert.doesNotMatch(readFileSync(new URL(FILE2!, DIR), "utf8").replace(/^--.*$/gm, ""), /^\s*(UPDATE|DELETE)\b|DROP TABLE/im);
});
test("0179 GIA_GOC: đơn giá đúng công thức qua; sai đơn giá, thiếu giá gốc, lẫn cột cũ bị chặn; xe riêng = giá gốc; giảm quá giá gốc ⇒ 0", () => {
  const db = moi(); don(db);
  dongMay(db, "g1", chang(db), GOC);
  dongMay(db, "g2", chang(db), { ...GOC, fee_tier_discount: 70000, unit_price: 0, line_total: 0 });
  throwsRe(() => dongMay(db, "g3", "o1-L1", { ...GOC, unit_price: 40000 }), re);
  throwsRe(() => dongMay(db, "g4", "o1-L1", { fee_calc_source: "GIA_GOC", unit_price: 30000 }), re);
  throwsRe(() => dongMay(db, "g5", "o1-L1", { ...GOC, fee_source: "CHON", fee_choice: "SO_KHAC" }), re);
  throwsRe(() => dongMay(db, "g6", "o1-L1", { ...GOC, fee_zone_code: "CR" }), re);
  dongMay(db, "g7", chang(db), { fee_calc_source: "GIA_GOC", fee_kind: "PER_TRIP", fee_base_price: 300000, quantity: 1, unit_price: 300000, line_total: 300000 });
  throwsRe(() => dongMay(db, "g8", "o1-L1", { fee_calc_source: "GIA_GOC", fee_kind: "PER_TRIP", fee_base_price: 300000, fee_tier_discount: 20000, quantity: 1, unit_price: 280000, line_total: 280000 }), re);
});
test("0179 DOI_TAY: cần lý do không rỗng ≤ 300 ký tự, người đổi, đơn giá 0–5.000.000 (0 được nhận)", () => {
  const db = moi(); don(db);
  const ok = { fee_calc_source: "DOI_TAY", fee_override_reason: "Khách ở xa", fee_override_by: "s1", unit_price: 80000, line_total: 160000 };
  dongMay(db, "d1", chang(db), ok);
  dongMay(db, "d2", chang(db), { ...ok, unit_price: 0, line_total: 0 });
  dongMay(db, "d3", chang(db), { ...ok, unit_price: 5000000, line_total: 10000000 });
  throwsRe(() => dongMay(db, "d4", "o1-L1", { ...ok, unit_price: 5000001 }), re);
  throwsRe(() => dongMay(db, "d5", "o1-L1", { ...ok, unit_price: -1 }), re);
  throwsRe(() => dongMay(db, "d6", "o1-L1", { ...ok, fee_override_reason: "  " }), re);
  throwsRe(() => dongMay(db, "d7", "o1-L1", { ...ok, fee_override_reason: "x".repeat(301) }), re);
  throwsRe(() => dongMay(db, "d8", "o1-L1", { ...ok, fee_override_by: null }), re);
  dongMay(db, "d9", chang(db), { ...ok, fee_override_reason: "x".repeat(300) });
});
test("0179 CHUONG_TRINH: cần mã chương trình và đơn giá 0", () => {
  const db = moi(); don(db);
  dongMay(db, "c1", chang(db), { fee_calc_source: "CHUONG_TRINH", fee_program_id: "p1", fee_program_name: "Miễn phí", unit_price: 0, line_total: 0 });
  throwsRe(() => dongMay(db, "c2", "o1-L1", { fee_calc_source: "CHUONG_TRINH", unit_price: 0, line_total: 0 }), re);
  throwsRe(() => dongMay(db, "c3", "o1-L1", { fee_calc_source: "CHUONG_TRINH", fee_program_id: "p1", unit_price: 1000 }), re);
});
test("0179: cột chụp mới không lọt vào dòng cũ hay dòng dịch vụ; CHON cũ (danh sách và Số khác) vẫn chèn được", () => {
  const db = moi(); don(db);
  dongChon(db, "k1", chang(db)); dongChon(db, "k2", "o1-L2", { fee_choice: "SO_KHAC", unit_price: 12345, line_total: 24690 });
  dongBang(db, "b1", chang(db));
  throwsRe(() => dongChon(db, "k3", "o1-L1", { fee_base_price: 1 }), re);
  throwsRe(() => dongBang(db, "b2", "o1-L2", { fee_program_id: "p" }), re);
  throwsRe(() => chen(db, { id: "s9", order_id: "o1", service_id: "o1-s", description: "x", quantity: 1, unit_price: 1, line_total: 1, fee_override_by: "s1" }), re);
});
test("0179: đơn không còn nháp ⇒ không đổi được các cột chụp mới (order_fee_frozen)", () => {
  const db = moi(); don(db);
  dongMay(db, "d1", chang(db), { fee_calc_source: "DOI_TAY", fee_override_reason: "Khách ở xa", fee_override_by: "s1", unit_price: 80000, line_total: 160000 });
  dongMay(db, "g1", chang(db), GOC);
  run(db, "UPDATE order_item SET fee_override_reason = 'Lý do khác' WHERE id = 'd1'"); // còn nháp: sửa được
  const tong = get(db, "SELECT sum(line_total) AS t FROM order_item WHERE order_id = 'o1'").t;
  run(db, "UPDATE orders SET subtotal = ?, total = ?, remaining_amount = ? WHERE id = 'o1'", tong, tong, tong);
  xacNhan(db);
  const f = /order_fee_frozen/;
  throwsRe(() => run(db, "UPDATE order_item SET fee_override_reason = 'Sửa sau xác nhận' WHERE id = 'd1'"), f);
  throwsRe(() => run(db, "UPDATE order_item SET fee_base_price = 99000 WHERE id = 'g1'"), f);
  throwsRe(() => run(db, "UPDATE order_item SET fee_tier_discount = 0 WHERE id = 'g1'"), f);
  throwsRe(() => run(db, "UPDATE order_item SET fee_calc_source = 'DOI_TAY' WHERE id = 'g1'"), f);
  throwsRe(() => run(db, "UPDATE order_item SET fee_program_name = 'x' WHERE id = 'g1'"), f);
});
