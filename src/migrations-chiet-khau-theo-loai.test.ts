// Kiểm migration *_chiet_khau_theo_loai_khach.sql (ADR-0133, Task 2; kế hoạch docs/superpowers/plans/2026-10-19-chiet-khau-theo-loai-khach.md).
// Hai bảng phụ chỉ-thêm: prc_commission_rule_pax (ba số tiền theo loại của một dòng mức) và ord_service_terms_pax (bản chụp ba số tiền cùng bản chụp điều khoản).
// Chèn THẲNG bằng SQL: mỗi trigger / CHECK có một ca đỏ và một ca xanh. Áp toàn bộ migration lên SQLite bộ nhớ (khuôn src/migrations-so-dai-ly.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_chiet_khau_theo_loai_khach.sql"));
const AT = "2026-10-19T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as T;
let n = 0;
const id = (p: string) => `${p}${++n}`;

function moi(): DatabaseSync {
  assert.ok(FILE, "thiếu migrations/*_chiet_khau_theo_loai_khach.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  return db;
}
function dlA(db: DatabaseSync): string {
  const p = id("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại lý A', 1, ?, ?)", p, AT, AT);
  run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)", id("r"), p, AT, AT);
  return p;
}
function muc(db: DatabaseSync, kind: "RATE" | "PER_PAX", pp = 50_000): string {
  const r = id("m");
  // Mỗi dòng một mã dịch vụ riêng để không đụng trigger chống chồng ngày (cùng đích + cùng phạm vi).
  run(db, `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, kind, rate_bp, per_pax_amount, valid_from_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, NULL, 'TRAVEL_AGENCY', 'SERVICE', ?, ?, ?, ?, '2026-01-01', ?, 'kt', ?, 'kt')`, r, `MA-${r}`, kind, kind === "RATE" ? 1000 : null, kind === "PER_PAX" ? pp : null, AT, AT);
  return r;
}
const phu = (db: DatabaseSync, r: string, a: number, c: number, s: number) =>
  run(db, "INSERT INTO prc_commission_rule_pax (rule_id, adult_amount, child_amount, senior_amount, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'kt', ?, 'kt')", r, a, c, s, AT, AT);

function don(db: DatabaseSync): { o: string; s: string } {
  const o = id("o"), s = id("s");
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 0, 1000000, 1000000, ?, ?)`, o, `TD-${o}`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'HONTAM', 'Vé Hòn Tằm', 'perPax', 1, '2026-10-10')", s, o);
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)", id("i"), o, s);
  run(db, "INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, ?, ?, 'OUT', '2026-10-10', 'Khách sạn A', ?, ?)", id("l"), o, s, AT, AT);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, o);
  return { o, s };
}
/** Bản chụp AUTO hoa hồng SET kiểu PER_PAX (hoặc RATE) trỏ dòng mức `rule`; `sup` = bản bị thay. */
function chup(db: DatabaseSync, o: string, s: string, x: { ben: string; rule: string; kind?: "RATE" | "PER_PAX"; pp?: number; sup?: string | null }): string {
  const r = id("t");
  const ct = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company LIMIT 1").party_id;
  const term = one<{ id: string }>(db, "SELECT id FROM prc_supply_term WHERE scope = 'ALL'").id;
  const kind = x.kind ?? "PER_PAX";
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax,
      commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, 'SET', NULL, ?, ?, ?, ?, 'SET', ?, NULL, NULL, ?, 'AUTO', NULL, ?, '2026-10-19', ?, 'sa', ?, 'sa')`,
    r, o, s, x.ben, kind, kind === "RATE" ? 1000 : null, kind === "PER_PAX" ? (x.pp ?? 50_000) : null, x.rule, ct, term, x.sup ?? null, AT, AT);
  return r;
}
const phuChup = (db: DatabaseSync, t: string, a: number, c: number, s: number) =>
  run(db, "INSERT INTO ord_service_terms_pax (terms_id, adult_amount, child_amount, senior_amount, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'sa', ?, 'sa')", t, a, c, s, AT, AT);

test("có đúng một tệp migration; hai bảng phụ và view công bố tồn tại", () => {
  assert.ok(FILE, "thiếu migrations/*_chiet_khau_theo_loai_khach.sql");
  assert.equal(files.filter((f) => f.endsWith("_chiet_khau_theo_loai_khach.sql")).length, 1);
  const db = moi();
  for (const t of ["prc_commission_rule_pax", "ord_service_terms_pax"]) assert.ok(one(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", t), t);
  assert.ok(one(db, "SELECT name FROM sqlite_master WHERE type = 'view' AND name = 'v_prc_commission_rule_pax'"));
});

test("prc_commission_rule_pax: chỉ cho dòng PER_PAX; người lớn phải bằng per_pax_amount; số tiền 0…100 triệu; một dòng phụ mỗi mức; chỉ-thêm", () => {
  const db = moi();
  const pp = muc(db, "PER_PAX", 50_000), rate = muc(db, "RATE");
  assert.throws(() => phu(db, rate, 50_000, 30_000, 40_000), /prc_pax_rule_mismatch:/, "dòng RATE không có số tiền theo loại");
  assert.throws(() => phu(db, pp, 60_000, 30_000, 40_000), /prc_pax_rule_mismatch:/, "người lớn khác per_pax_amount");
  assert.throws(() => phu(db, "khong-co", 50_000, 0, 0), /prc_pax_rule_mismatch:|FOREIGN KEY/);
  assert.throws(() => phu(db, pp, 50_000, -1, 0), /CHECK constraint failed/);
  assert.throws(() => phu(db, pp, 50_000, 100_000_001, 0), /CHECK constraint failed/);
  phu(db, pp, 50_000, 0, 40_000); // ô trẻ em = 0 là hợp lệ (ADR-0133 điều 2)
  assert.throws(() => phu(db, pp, 50_000, 30_000, 40_000), /UNIQUE constraint failed/);
  assert.throws(() => run(db, "UPDATE prc_commission_rule_pax SET child_amount = 1 WHERE rule_id = ?", pp), /prc_append_only:/);
  assert.throws(() => run(db, "DELETE FROM prc_commission_rule_pax WHERE rule_id = ?", pp), /prc_append_only:/);
  const v = one<{ child_amount: number }>(db, "SELECT child_amount FROM v_prc_commission_rule_pax WHERE rule_id = ?", pp);
  assert.equal(v.child_amount, 0);
});

test("ord_service_terms_pax: chỉ cho bản chụp SET kiểu PER_PAX, người lớn bằng commission_per_pax, khớp dòng phụ của mức nguồn, bản hiện hành, đơn chưa giao, chỉ-thêm", () => {
  const db = moi();
  const dl = dlA(db);
  const pp = muc(db, "PER_PAX", 50_000), rate = muc(db, "RATE"), ppTran = muc(db, "PER_PAX", 50_000);
  phu(db, pp, 50_000, 30_000, 40_000);
  const { o, s } = don(db);
  // dòng mức RATE: không gắn được
  const tRate = chup(db, o, s, { ben: dl, rule: rate, kind: "RATE" });
  assert.throws(() => phuChup(db, tRate, 50_000, 30_000, 40_000), /terms_pax_(mismatch|rule_stale):/);
  // bản thay: PER_PAX nhưng mức nguồn chưa có dòng phụ ⇒ chặn (không gắn số theo loại vào mức không khai)
  const tTran = chup(db, o, s, { ben: dl, rule: ppTran, sup: tRate });
  assert.throws(() => phuChup(db, tTran, 50_000, 30_000, 40_000), /terms_pax_rule_stale:/);
  // bản thay tiếp: mức có dòng phụ; số khác dòng phụ ⇒ chặn; người lớn khác commission_per_pax ⇒ chặn; đúng ⇒ qua
  const tOk = chup(db, o, s, { ben: dl, rule: pp, sup: tTran });
  assert.throws(() => phuChup(db, tOk, 50_000, 31_000, 40_000), /terms_pax_rule_stale:/, "số trẻ em lệch dòng phụ của mức");
  assert.throws(() => phuChup(db, tOk, 60_000, 30_000, 40_000), /terms_pax_(mismatch|rule_stale):/, "người lớn lệch commission_per_pax (hai trigger cùng chặn, thứ tự bắn không cố định)");
  phuChup(db, tOk, 50_000, 30_000, 40_000);
  assert.throws(() => phuChup(db, tOk, 50_000, 30_000, 40_000), /UNIQUE constraint failed/);
  assert.throws(() => run(db, "UPDATE ord_service_terms_pax SET child_amount = 1 WHERE terms_id = ?", tOk), /terms_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ord_service_terms_pax WHERE terms_id = ?", tOk), /terms_append_only:/);
  // bản đã bị thay không gắn thêm được
  const pp2 = muc(db, "PER_PAX", 50_000); // mức khai đủ số theo loại để chỉ còn trigger «đã bị thay» chặn
  phu(db, pp2, 50_000, 30_000, 40_000);
  const tCu = chup(db, o, s, { ben: dl, rule: pp2, sup: tOk });
  const tMoi = chup(db, o, s, { ben: dl, rule: pp2, sup: tCu });
  assert.throws(() => phuChup(db, tCu, 50_000, 30_000, 40_000), /terms_pax_superseded:/);
  // đơn đã giao: không gắn thêm
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 'sa', updated_at = ? WHERE id = ?", AT, AT, o);
  assert.throws(() => phuChup(db, tMoi, 50_000, 30_000, 40_000), /terms_order_delivered:/);
});
