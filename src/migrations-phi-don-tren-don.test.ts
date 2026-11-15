// Kiểm migration 0169 (Phí đưa đón Đợt C, Task 1; ADR-0147, ADR-0203): loại dòng phí trên `order_item`, khoá cột chụp khi đơn hết nháp,
// chốt lô xác nhận (bảng đổ + RAISE IGNORE), cờ `transfer_fee_missing`. SQL chạy THẲNG trên SQLite thật dựng từ mọi migration. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_phi_don_tren_don.sql"));
const AT = "2026-11-15T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const get = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as Record<string, V>;

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
/** Đơn nháp `id` có một dịch vụ `${id}-s`, một dòng dịch vụ, hai chặng (`${id}-L1` đi, `${id}-L2` về), một mức phí `rule`. */
function don(db: DatabaseSync, id = "o1") {
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?) ON CONFLICT DO NOTHING", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?) ON CONFLICT DO NOTHING", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1') ON CONFLICT DO NOTHING", AT);
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 600000, 0, 600000, 600000, ?, ?)`, id, `TD-${id}`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Tour', 'perPax', 2, '2026-12-10')", `${id}-s`, id);
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 2, 300000, 600000)", `${id}-i1`, id, `${id}-s`);
  for (const [k, dir] of [["L1", "OUT"], ["L2", "RETURN"]] as const)
    run(db, `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-12-10', 'Khách sạn A', ?, ?)`,
      `${id}-${k}`, id, `${id}-s`, dir, AT, AT);
  run(db, `INSERT INTO prc_transfer_fee_rule (id, kind, amount, valid_from_date, valid_to_date, condition_sig, note, created_at, created_by, updated_at, updated_by)
    SELECT 'rule1', 'PER_PAX', 70000, '2026-12-01', NULL, 'ZONE=CR', NULL, ?, NULL, ?, NULL WHERE NOT EXISTS (SELECT 1 FROM prc_transfer_fee_rule WHERE id = 'rule1')`, AT, AT);
}
/** Chèn một dòng phí cho chặng `leg` (mặc định hợp lệ; `over` ghi đè cột). */
function dongPhi(db: DatabaseSync, id: string, leg: string, over: Record<string, V> = {}, order = "o1") {
  const c: Record<string, V> = {
    id, order_id: order, description: "Phí đưa đón", quantity: 2, unit_price: 70000, line_total: 140000, line_kind: "TRANSFER_FEE",
    transfer_leg_id: leg, fee_rule_id: "rule1", fee_kind: "PER_PAX", fee_zone_code: "CR", ...over,
  };
  const cols = Object.keys(c);
  run(db, `INSERT INTO order_item (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, ...cols.map((k) => c[k]!));
}
const xacNhan = (db: DatabaseSync, id = "o1") => run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, id);

test("0169: đúng một tệp *_phi_don_tren_don.sql, sau 0166; chỉ thêm (không dựng lại bảng, không xoá trigger)", () => {
  assert.ok(FILE, "thiếu migrations/*_phi_don_tren_don.sql");
  assert.ok(FILE! > "0166", FILE);
  assert.doesNotMatch(readFileSync(new URL(FILE!, DIR), "utf8").replace(/^--.*$/gm, ""), /DROP TABLE|DROP TRIGGER|_new\b/i);
});

test("dòng cũ: mặc định line_kind = 'SERVICE', sáu cột phí trống; kiểu lạ bị từ chối", () => {
  const db = moi();
  don(db);
  const r = get(db, "SELECT line_kind, transfer_leg_id, fee_rule_id, fee_kind, fee_zone_code, fee_tier_code, fee_return_pax FROM order_item WHERE id = 'o1-i1'");
  assert.deepEqual({ ...r }, { line_kind: "SERVICE", transfer_leg_id: null, fee_rule_id: null, fee_kind: null, fee_zone_code: null, fee_tier_code: null, fee_return_pax: null });
  assert.throws(() => run(db, "UPDATE order_item SET line_kind = 'KHAC' WHERE id = 'o1-i1'"), /CHECK/);
  assert.throws(() => dongPhi(db, "f", "o1-L1", { fee_kind: "PER_KM" }), /CHECK/);
});

test("dòng phí hợp lệ chèn được (có và không có cấp / số người chiều về); thiếu cột bắt buộc bị chặn", () => {
  const db = moi();
  don(db);
  dongPhi(db, "f1", "o1-L1", { fee_tier_code: "T1", fee_return_pax: 1 });
  dongPhi(db, "f2", "o1-L2");
  assert.equal(get(db, "SELECT count(*) AS n FROM order_item WHERE line_kind = 'TRANSFER_FEE'").n, 2);
  for (const [i, cot] of (["transfer_leg_id", "fee_rule_id", "fee_kind", "fee_zone_code"] as const).entries()) {
    const db2 = moi();
    don(db2);
    assert.throws(() => dongPhi(db2, `x${i}`, "o1-L1", { [cot]: null }), /order_item_line_kind/, `thiếu ${cot}`);
  }
});

test("dòng TRANSFER_FEE có service_id / catalog_code / catalog_price / pax_code → chặn (chèn và sửa)", () => {
  const db = moi();
  don(db);
  assert.throws(() => dongPhi(db, "a", "o1-L1", { service_id: "o1-s" }), /order_item_line_kind/);
  assert.throws(() => dongPhi(db, "b", "o1-L1", { catalog_code: "S1" }), /order_item_line_kind/);
  assert.throws(() => dongPhi(db, "c", "o1-L1", { catalog_price: 1 }), /order_item_line_kind/);
  assert.throws(() => dongPhi(db, "d", "o1-L1", { pax_code: "adult" }), /order_item_line_kind/);
  dongPhi(db, "f1", "o1-L1");
  assert.throws(() => run(db, "UPDATE order_item SET service_id = 'o1-s' WHERE id = 'f1'"), /order_item_line_kind/);
  assert.throws(() => run(db, "UPDATE order_item SET fee_zone_code = NULL WHERE id = 'f1'"), /order_item_line_kind/);
});

test("dòng SERVICE có transfer_leg_id (hoặc bất kỳ cột phí nào) → chặn (chèn và sửa)", () => {
  const db = moi();
  don(db);
  const them = (cot: string, v: V) =>
    run(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total, ${cot}) VALUES ('z', 'o1', 'o1-s', 'X', 1, 1, 1, ?)`, v);
  assert.throws(() => them("transfer_leg_id", "o1-L1"), /order_item_line_kind/);
  assert.throws(() => them("fee_rule_id", "rule1"), /order_item_line_kind/);
  assert.throws(() => them("fee_kind", "PER_PAX"), /order_item_line_kind/);
  assert.throws(() => them("fee_zone_code", "CR"), /order_item_line_kind/);
  assert.throws(() => them("fee_tier_code", "T1"), /order_item_line_kind/);
  assert.throws(() => them("fee_return_pax", 1), /order_item_line_kind/);
  assert.throws(() => run(db, "UPDATE order_item SET transfer_leg_id = 'o1-L1' WHERE id = 'o1-i1'"), /order_item_line_kind/);
  assert.throws(() => run(db, "UPDATE order_item SET line_kind = 'TRANSFER_FEE' WHERE id = 'o1-i1'"), /order_item_line_kind/); // thiếu cột phí, còn service_id
});

test("hai dòng phí cùng một chặng → chặn; khác chặng thì được; chặng không có thật → khoá ngoại chặn", () => {
  const db = moi();
  don(db);
  dongPhi(db, "f1", "o1-L1");
  assert.throws(() => dongPhi(db, "f1b", "o1-L1"), /UNIQUE/);
  dongPhi(db, "f2", "o1-L2");
  assert.throws(() => dongPhi(db, "f3", "khong-co"), /FOREIGN KEY/);
});

test("đơn đã xác nhận: đổi fee_tier_code, fee_rule_id, fee_kind, fee_zone_code, fee_return_pax, transfer_leg_id, line_kind → chặn; sửa chữ mô tả vẫn được; đơn nháp sửa được", () => {
  const db = moi();
  don(db);
  dongPhi(db, "f1", "o1-L1", { fee_tier_code: "T1" });
  run(db, "UPDATE order_item SET fee_tier_code = 'T2', fee_return_pax = 1 WHERE id = 'f1'"); // còn nháp: được
  run(db, "UPDATE orders SET subtotal = 740000, total = 740000, remaining_amount = 740000 WHERE id = 'o1'");
  xacNhan(db);
  const re = /order_fee_frozen:/;
  run(db, "INSERT INTO prc_transfer_fee_rule (id, kind, amount, valid_from_date, valid_to_date, condition_sig, note, created_at, created_by, updated_at, updated_by) VALUES ('rule2', 'PER_PAX', 1, '2026-12-01', NULL, 'ZONE=TT', NULL, ?, NULL, ?, NULL)", AT, AT);
  assert.throws(() => run(db, "UPDATE order_item SET fee_tier_code = 'T3' WHERE id = 'f1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET fee_tier_code = NULL WHERE id = 'f1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET fee_rule_id = 'rule2' WHERE id = 'f1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET fee_kind = 'PER_TRIP' WHERE id = 'f1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET fee_zone_code = 'TT' WHERE id = 'f1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET fee_return_pax = 5 WHERE id = 'f1'"), re);
  assert.throws(() => run(db, "UPDATE order_item SET transfer_leg_id = 'o1-L2' WHERE id = 'f1'"), re);
  run(db, "UPDATE order_item SET description = 'Phí đưa đón (sửa chữ)', detail = 'ghi chú' WHERE id = 'f1'");
  assert.equal(get(db, "SELECT fee_tier_code AS t FROM order_item WHERE id = 'f1'").t, "T2");
});

test("chốt lô xác nhận: chèn vào bảng chốt khi đơn còn nháp → chặn; khi đã xác nhận → qua và không lưu dòng nào; đơn không có → chặn", () => {
  const db = moi();
  don(db);
  const chot = (id: string) => run(db, "INSERT INTO ord_xac_nhan_phi_gac (order_id) VALUES (?)", id);
  assert.throws(() => chot("o1"), /transfer_fee_confirm_lost/);
  assert.throws(() => chot("khong-co"), /transfer_fee_confirm_lost/);
  xacNhan(db);
  chot("o1");
  assert.equal(get(db, "SELECT count(*) AS n FROM ord_xac_nhan_phi_gac").n, 0, "không lưu dòng nào");
});

test("chốt lô xác nhận trong MỘT lô: câu chuyển trạng thái không khớp dòng nào (updated_at lệch) → cả lô hoàn tác, kể cả dòng phí đã chèn trước đó", () => {
  const db = moi();
  don(db);
  const lo = (guard: string) => {
    db.exec("BEGIN");
    try {
      dongPhi(db, "f1", "o1-L1"); // ghi trước câu chuyển trạng thái (đơn còn nháp)
      run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ?, subtotal = 740000, total = 740000, remaining_amount = 740000 WHERE id = 'o1' AND status = 'draft' AND updated_at = ?", AT, AT, guard);
      run(db, "INSERT INTO ord_xac_nhan_phi_gac (order_id) VALUES ('o1')");
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  assert.throws(() => lo("2000-01-01T00:00:00.000Z"), /transfer_fee_confirm_lost/); // UPDATE khớp 0 dòng
  assert.equal(get(db, "SELECT status AS s FROM orders WHERE id = 'o1'").s, "draft");
  assert.equal(get(db, "SELECT count(*) AS n FROM order_item WHERE id = 'f1'").n, 0, "dòng phí chèn trước đó đã hoàn tác");
  lo(AT); // guard đúng → cả lô qua
  assert.equal(get(db, "SELECT status AS s FROM orders WHERE id = 'o1'").s, "confirmed");
  assert.equal(get(db, "SELECT count(*) AS n FROM order_item WHERE id = 'f1'").n, 1);
});

test("cờ transfer_fee_missing: mặc định 0, chỉ nhận 0/1, không đổi sau khi chèn (cả 0→1 lẫn 1→0)", () => {
  const db = moi();
  don(db);
  run(db, "INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at) VALUES ('yc1', 'o1', ?, 's1', ?, ?, ?)", AT, AT, AT, AT);
  assert.equal(get(db, "SELECT transfer_fee_missing AS m FROM ord_confirm_request WHERE id = 'yc1'").m, 0);
  assert.throws(() => run(db, "UPDATE ord_confirm_request SET transfer_fee_missing = 1 WHERE id = 'yc1'"), /ord_confirm_request_immutable/);
  assert.throws(() => run(db, "UPDATE ord_confirm_request SET transfer_fee_missing = 2 WHERE id = 'yc1'"), /CHECK|immutable/);
  don(db, "o2");
  run(db, "INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, transfer_fee_missing, created_at, updated_at) VALUES ('yc2', 'o2', ?, 's1', ?, 1, ?, ?)", AT, AT, AT, AT);
  assert.equal(get(db, "SELECT transfer_fee_missing AS m FROM ord_confirm_request WHERE id = 'yc2'").m, 1);
  assert.throws(() => run(db, "UPDATE ord_confirm_request SET transfer_fee_missing = 0 WHERE id = 'yc2'"), /ord_confirm_request_immutable/);
});
