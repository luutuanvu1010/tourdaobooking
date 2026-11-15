// Kiểm migration 0165 (ADR-0147 Đ2, ADR-0203 ĐB1; kế hoạch Phí đưa đón, Đợt B, Task 5): bảng phí đưa đón theo khoá–giá trị, chỉ-thêm,
// chặn trùng bộ điều kiện cùng khoảng ngày, ngày bắt đầu áp chỉ thêm. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const T0 = "2026-11-14T00:00:00.000Z";

function build(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
let n = 0;
function muc(db: DatabaseSync, o: { kind?: string; amount?: number; tu?: string; den?: string | null; sig?: string; id?: string }): string {
  const id = o.id ?? `r${++n}`;
  db.prepare(
    "INSERT INTO prc_transfer_fee_rule (id, kind, amount, valid_from_date, valid_to_date, condition_sig, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, NULL)",
  ).run(id, o.kind ?? "PER_PAX", o.amount ?? 30000, o.tu ?? "2026-12-01", o.den ?? null, o.sig ?? "ZONE=CR", T0, T0);
  return id;
}
const dk = (db: DatabaseSync, rule: string, key: string, value: string) =>
  db.prepare("INSERT INTO prc_transfer_fee_condition (rule_id, key_code, value, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, NULL, ?, NULL)").run(rule, key, value, T0, T0);

test("0165: sáu khoá điều kiện", () => {
  const db = build();
  const rows = db.prepare("SELECT code FROM prc_transfer_fee_key ORDER BY code").all() as { code: string }[];
  assert.deepEqual(rows.map((r) => r.code), ["DIRECTION", "EXCLUSIVE", "SERVICE", "SERVICE_GROUP", "TIER", "ZONE"]);
  assert.ok(files.includes("0165_phi_don_bang.sql"));
});

test("0165: tiền âm, kiểu lạ bị từ chối; chưa gieo dòng mức, chưa gieo ngày bắt đầu áp", () => {
  const db = build();
  assert.throws(() => muc(db, { amount: -1 }), /CHECK/);
  assert.throws(() => muc(db, { kind: "PER_KM" }), /CHECK/);
  assert.equal((db.prepare("SELECT count(*) AS n FROM prc_transfer_fee_rule").get() as { n: number }).n, 0);
  assert.equal((db.prepare("SELECT count(*) AS n FROM prc_transfer_fee_start").get() as { n: number }).n, 0);
});

test("0165: trùng bộ điều kiện trùng ngày bị chặn, khác ngày thì được, khác kiểu thì được", () => {
  const db = build();
  muc(db, {});
  assert.throws(() => muc(db, {}), /prc_overlap/);
  const d2 = build();
  muc(d2, { tu: "2026-12-01", den: "2026-12-31" });
  muc(d2, { tu: "2027-01-01" });
  const d3 = build();
  muc(d3, {});
  muc(d3, { kind: "PER_TRIP" });
  muc(d3, { sig: "ZONE=TT" }); // cùng kiểu, cùng ngày, KHÁC chữ ký điều kiện → được
});

test("0165: chỉ đóng, không sửa tiền, không xoá", () => {
  const db = build();
  const id = muc(db, {});
  dk(db, id, "ZONE", "CR");
  assert.throws(() => db.prepare("UPDATE prc_transfer_fee_rule SET amount = 1 WHERE id = ?").run(id), /prc_append_only/);
  db.prepare("UPDATE prc_transfer_fee_rule SET valid_to_date = '2027-03-31', updated_at = ?, updated_by = 'x' WHERE id = ?").run(T0, id);
  assert.throws(() => db.prepare("UPDATE prc_transfer_fee_rule SET valid_to_date = '2027-06-30' WHERE id = ?").run(id), /prc_append_only/);
  assert.throws(() => db.prepare("UPDATE prc_transfer_fee_rule SET valid_to_date = NULL WHERE id = ?").run(id), /prc_append_only/);
  db.prepare("UPDATE prc_transfer_fee_rule SET valid_to_date = '2027-02-28' WHERE id = ?").run(id);
  assert.throws(() => db.prepare("DELETE FROM prc_transfer_fee_rule WHERE id = ?").run(id), /prc_append_only/);
  assert.throws(() => db.prepare("UPDATE prc_transfer_fee_condition SET value = 'TT' WHERE rule_id = ?").run(id), /prc_append_only/);
  assert.throws(() => db.prepare("DELETE FROM prc_transfer_fee_condition WHERE rule_id = ?").run(id), /prc_append_only/);
});

test("0165: khoá điều kiện lạ bị khoá ngoại chặn; khoá đã tắt không thêm được", () => {
  const db = build();
  const id = muc(db, {});
  assert.throws(() => dk(db, id, "LẠ", "x"), /FOREIGN KEY|prc_key_inactive/); // trigger khoá-bật chạy trước khoá ngoại; cả hai đều chặn
  db.prepare("UPDATE prc_transfer_fee_key SET active = 0 WHERE code = 'TIER'").run();
  assert.throws(() => dk(db, id, "TIER", "C1"), /prc_key_inactive/);
});

test("0165: ngày bắt đầu áp chỉ thêm", () => {
  const db = build();
  const ins = (id: string, d: string | null, at: string) =>
    db.prepare("INSERT INTO prc_transfer_fee_start (id, start_date, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, NULL, ?, NULL)").run(id, d, at, T0, T0);
  ins("s1", "2026-12-01", "2026-11-14T01:00:00.000Z");
  ins("s2", null, "2026-11-14T02:00:00.000Z");
  assert.throws(() => ins("s3", "2026-12-02", "2026-11-14T02:00:00.000Z"), /UNIQUE/);
  assert.throws(() => db.prepare("UPDATE prc_transfer_fee_start SET start_date = '2027-01-01' WHERE id = 's1'").run(), /prc_append_only/);
  assert.throws(() => db.prepare("DELETE FROM prc_transfer_fee_start WHERE id = 's1'").run(), /prc_append_only/);
});
