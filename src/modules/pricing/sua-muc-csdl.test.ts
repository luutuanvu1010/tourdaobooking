// ADR-0148 Đ1 lượt 1, Task 1 (kế hoạch docs/superpowers/plans/2026-10-29-sua-muc-luot-1-ke-hoach.md): migration *_sua_muc_huy_thay.sql trên SQLite bộ nhớ (khuôn
// src/migrations-chiet-khau-theo-loai.test.ts). Ba bảng có ngày — mức (prc_commission_rule), gắn loại ↔ chính sách (prc_role_tier), gắn đối tác ↔ chính sách (prc_party_tier) —
// nhận dấu huỷ + dòng thay thế. Chèn / cập nhật THẲNG bằng SQL: mỗi trigger mới có ca đỏ và ca xanh. «Hôm nay» không có trong trigger (luật máy chủ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_sua_muc_huy_thay.sql"));
const AT = "2026-10-29T03:00:00.000Z";
const LY_DO = "Nhập sai số tiền người lớn";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as T;
let n = 0;
const id = (p: string) => `${p}${++n}`;

function moi(): DatabaseSync {
  assert.ok(FILE, "thiếu migrations/*_sua_muc_huy_thay.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  for (const code of ["MT_AAAAAAAA", "MT_BBBBBBBB"]) {
    run(db, "INSERT INTO prc_rate_tier (code, name, name_key, active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, 'kt', ?, 'kt')", code, `Chính sách ${code}`, code.toLowerCase(), AT, AT);
  }
  return db;
}
function dlA(db: DatabaseSync): string {
  const p = id("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại lý A', 1, ?, ?)", p, AT, AT);
  run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)", id("r"), p, AT, AT);
  return p;
}
/** Dòng mức đích mức TA `MT_AAAAAAAA`, một dịch vụ `ma`, đ/khách 100.000. */
function muc(db: DatabaseSync, v: { ma?: string; tu?: string; den?: string | null; thay?: string | null; lyDo?: string | null; tier?: string } = {}): string {
  const r = id("m");
  run(db, `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, target_tier_code, scope, catalog_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date,
      created_at, created_by, updated_at, updated_by, replaces_id, change_reason)
    VALUES (?, NULL, NULL, ?, 'SERVICE', ?, 'PER_PAX', NULL, 100000, ?, ?, ?, 'kt', ?, 'kt', ?, ?)`,
    r, v.tier ?? "MT_AAAAAAAA", v.ma ?? "VTC", v.tu ?? "2027-01-01", v.den === undefined ? "2028-01-01" : v.den, AT, AT, v.thay ?? null, v.lyDo ?? null);
  return r;
}
const huy = (db: DatabaseSync, bang: string, r: string, by: string | null = "kt") => run(db, `UPDATE ${bang} SET voided_at = ?, voided_by = ?, updated_at = ?, updated_by = ? WHERE id = ?`, AT, by, AT, by, r);
const dong = (db: DatabaseSync, bang: string, r: string, den: string) => run(db, `UPDATE ${bang} SET valid_to_date = ?, updated_at = ?, updated_by = 'kt' WHERE id = ?`, den, AT, r);
function ganLoai(db: DatabaseSync, v: { tu?: string; den?: string | null; tier?: string; thay?: string | null; lyDo?: string | null } = {}): string {
  const r = id("g");
  run(db, `INSERT INTO prc_role_tier (id, role_type_code, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by, replaces_id, change_reason)
    VALUES (?, 'TRAVEL_AGENCY', ?, ?, ?, ?, 'kt', ?, 'kt', ?, ?)`, r, v.tier ?? "MT_AAAAAAAA", v.tu ?? "2027-01-01", v.den === undefined ? null : v.den, AT, AT, v.thay ?? null, v.lyDo ?? null);
  return r;
}
function ganRieng(db: DatabaseSync, p: string, v: { tu?: string; den?: string | null; tier?: string; thay?: string | null; lyDo?: string | null } = {}): string {
  const r = id("gr");
  run(db, `INSERT INTO prc_party_tier (id, party_id, tier_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by, replaces_id, change_reason)
    VALUES (?, ?, ?, ?, ?, ?, 'kt', ?, 'kt', ?, ?)`, r, p, v.tier ?? "MT_AAAAAAAA", v.tu ?? "2027-01-01", v.den === undefined ? null : v.den, AT, AT, v.thay ?? null, v.lyDo ?? null);
  return r;
}
function don(db: DatabaseSync): { o: string; s: string } {
  const o = id("o"), s = id("s");
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 0, 1000000, 1000000, ?, ?)`, o, `TD-${o}`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'VTC', 'Vé Vinwonders', 'perPax', 1, '2027-02-10')", s, o);
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)", id("i"), o, s);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, o);
  return { o, s };
}
/** Bản chụp AUTO hoa hồng SET đ/khách 100.000 trỏ dòng mức `rule`, ngày chụp `ngay`. */
function chup(db: DatabaseSync, rule: string, ngay: string): void {
  const { o, s } = don(db);
  const ben = dlA(db);
  const ct = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company LIMIT 1").party_id;
  const term = one<{ id: string }>(db, "SELECT id FROM prc_supply_term WHERE scope = 'ALL'").id;
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax,
      commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, 'SET', NULL, 'PER_PAX', NULL, 100000, ?, 'SET', ?, NULL, NULL, ?, 'AUTO', NULL, NULL, ?, ?, 'sa', ?, 'sa')`, id("t"), o, s, ben, rule, ct, term, ngay, AT, AT);
}
const BA_BANG = ["prc_commission_rule", "prc_role_tier", "prc_party_tier"] as const;

test("có đúng một tệp migration; ba bảng có bốn cột mới; view mức giữ nguyên thứ tự cột", () => {
  assert.equal(files.filter((f) => f.endsWith("_sua_muc_huy_thay.sql")).length, 1);
  const db = moi();
  for (const bang of BA_BANG) {
    const cot = (db.prepare(`PRAGMA table_info(${bang})`).all() as { name: string }[]).map((c) => c.name);
    for (const c of ["voided_at", "voided_by", "replaces_id", "change_reason"]) assert.ok(cot.includes(c), `${bang}.${c}`);
  }
  const view = (db.prepare("PRAGMA table_info(v_prc_commission_rule)").all() as { name: string }[]).map((c) => c.name);
  assert.deepEqual(view, ["id", "target_party_id", "target_role_code", "scope", "catalog_code", "group_code", "kind", "rate_bp", "per_pax_amount", "valid_from_date", "valid_to_date", "target_tier_code"]);
});

test("huỷ: được đúng một lần, phải có người huỷ, không kèm đổi cột khác; dòng đã huỷ không đổi gì nữa (cả ba bảng)", () => {
  const db = moi();
  const p = dlA(db);
  const dongCua = { prc_commission_rule: muc(db), prc_role_tier: ganLoai(db), prc_party_tier: ganRieng(db, p) };
  for (const bang of BA_BANG) {
    const r = dongCua[bang];
    assert.throws(() => huy(db, bang, r, null), /prc_append_only:/, `${bang}: huỷ thiếu người huỷ`);
    assert.throws(() => run(db, `UPDATE ${bang} SET voided_at = ?, voided_by = 'kt', valid_to_date = '2027-06-30' WHERE id = ?`, AT, r), /prc_append_only:/, `${bang}: huỷ kèm đổi ngày`);
    huy(db, bang, r);
    assert.throws(() => huy(db, bang, r), /prc_append_only:/, `${bang}: huỷ lần hai`);
    assert.throws(() => run(db, `UPDATE ${bang} SET voided_at = NULL, voided_by = NULL WHERE id = ?`, r), /prc_append_only:/, `${bang}: gỡ dấu huỷ`);
    assert.throws(() => dong(db, bang, r, "2027-03-01"), /prc_append_only:/, `${bang}: đóng dòng đã huỷ`);
    assert.throws(() => run(db, `DELETE FROM ${bang} WHERE id = ?`, r), /prc_append_only:/, `${bang}: xoá`);
  }
});

test("ngày kết thúc: đặt từ trống được, rút ngắn được; kéo dài, xoá ngày kết thúc, trước ngày bắt đầu bị chặn (cả ba bảng)", () => {
  const db = moi();
  const p = dlA(db);
  const dongCua = { prc_commission_rule: muc(db, { den: null }), prc_role_tier: ganLoai(db), prc_party_tier: ganRieng(db, p) };
  for (const bang of BA_BANG) {
    const r = dongCua[bang];
    dong(db, bang, r, "2027-12-31");
    dong(db, bang, r, "2027-06-30");
    assert.throws(() => dong(db, bang, r, "2027-07-01"), /prc_append_only:/, `${bang}: kéo dài`);
    assert.throws(() => dong(db, bang, r, "2027-06-30"), /prc_append_only:/, `${bang}: đặt lại cùng ngày (không đổi gì)`);
    assert.throws(() => run(db, `UPDATE ${bang} SET valid_to_date = NULL WHERE id = ?`, r), /prc_append_only:/, `${bang}: xoá ngày kết thúc`);
    assert.throws(() => dong(db, bang, r, "2026-12-31"), /CHECK constraint failed|prc_append_only:/, `${bang}: trước ngày bắt đầu`);
    assert.equal(one<{ d: string }>(db, `SELECT valid_to_date AS d FROM ${bang} WHERE id = ?`, r).d, "2027-06-30");
  }
  const r = dongCua.prc_commission_rule;
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET per_pax_amount = 90000 WHERE id = ?", r), /prc_append_only:/, "sửa số");
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET change_reason = ? WHERE id = ?", LY_DO, r), /prc_append_only:/, "thêm lý do sau");
  assert.throws(() => run(db, "UPDATE prc_role_tier SET tier_code = 'MT_BBBBBBBB' WHERE id = ?", dongCua.prc_role_tier), /prc_append_only:/, "đổi chính sách của gắn loại");
});

test("chồng ngày: dòng đã huỷ không tính; dòng chưa huỷ vẫn chặn (cả ba bảng); dòng mới không mang dấu huỷ", () => {
  const db = moi();
  const p = dlA(db);
  const cu = muc(db);
  assert.throws(() => muc(db), /prc_overlap:/, "mức chưa huỷ chặn chồng ngày");
  huy(db, "prc_commission_rule", cu);
  muc(db, { thay: cu, lyDo: LY_DO });
  const gl = ganLoai(db);
  assert.throws(() => ganLoai(db, { tier: "MT_BBBBBBBB" }), /prc_tier_overlap:/);
  huy(db, "prc_role_tier", gl);
  ganLoai(db, { tier: "MT_BBBBBBBB", thay: gl, lyDo: LY_DO });
  const gr = ganRieng(db, p);
  assert.throws(() => ganRieng(db, p, { tier: "MT_BBBBBBBB" }), /prc_party_tier_overlap:/);
  huy(db, "prc_party_tier", gr);
  ganRieng(db, p, { tier: "MT_BBBBBBBB", thay: gr, lyDo: LY_DO });
  assert.throws(() => run(db, `INSERT INTO prc_commission_rule (id, target_tier_code, scope, kind, per_pax_amount, valid_from_date, created_at, updated_at, voided_at, voided_by)
    VALUES ('m-ban', 'MT_BBBBBBBB', 'ALL', 'PER_PAX', 1, '2030-01-01', ?, ?, ?, 'kt')`, AT, AT, AT), /prc_born_voided:/);
  assert.throws(() => run(db, `INSERT INTO prc_role_tier (id, role_type_code, tier_code, valid_from_date, created_at, updated_at, voided_at, voided_by)
    VALUES ('g-ban', 'TRAVEL_AGENCY', 'MT_AAAAAAAA', '2030-01-01', ?, ?, ?, 'kt')`, AT, AT, AT), /prc_born_voided:/);
  assert.throws(() => run(db, `INSERT INTO prc_party_tier (id, party_id, tier_code, valid_from_date, created_at, updated_at, voided_at, voided_by)
    VALUES ('gr-ban', ?, 'MT_AAAAAAAA', '2030-01-01', ?, ?, ?, 'kt')`, p, AT, AT, AT), /prc_born_voided:/);
});

test("dòng thay thế (mức): cùng đích + cùng phạm vi, dòng cũ đã huỷ hoặc kết thúc trước ngày mới; có dòng cũ ⇔ có lý do 10–500 ký tự", () => {
  const db = moi();
  const cu = muc(db, { ma: "VTC" }); // 2027-01-01 → 2028-01-01, chưa huỷ
  assert.throws(() => muc(db, { ma: "VTE", tu: "2027-01-01", thay: cu, lyDo: LY_DO }), /prc_replaces_mismatch:/, "khác dịch vụ");
  assert.throws(() => muc(db, { ma: "VTC", tier: "MT_BBBBBBBB", thay: cu, lyDo: LY_DO }), /prc_replaces_mismatch:/, "khác đích");
  assert.throws(() => muc(db, { ma: "VTC", tu: "2028-01-02", thay: cu }), /prc_replaces_mismatch:/, "có dòng cũ mà thiếu lý do");
  assert.throws(() => muc(db, { ma: "VTC", tu: "2028-01-02", lyDo: LY_DO }), /prc_replaces_mismatch:/, "có lý do mà không trỏ dòng cũ");
  assert.throws(() => muc(db, { ma: "VTC", tu: "2028-01-02", thay: cu, lyDo: "ngắn quá" }), /CHECK constraint failed/, "lý do dưới 10 ký tự");
  assert.throws(() => muc(db, { ma: "VTC", tu: "2028-01-02", thay: "khong-co", lyDo: LY_DO }), /prc_replaces_mismatch:|FOREIGN KEY/, "dòng cũ không có");
  muc(db, { ma: "VTC", tu: "2028-01-02", den: null, thay: cu, lyDo: LY_DO }); // dòng cũ kết thúc 2028-01-01, trước ngày mới ⇒ hợp lệ (đường «sửa từ ngày»)
  const cu2 = muc(db, { ma: "VTD" });
  huy(db, "prc_commission_rule", cu2);
  muc(db, { ma: "VTD", tu: "2027-03-01", thay: cu2, lyDo: LY_DO }); // dòng cũ đã huỷ ⇒ ngày nào cũng được (đường «huỷ và thay»)
});

test("dòng thay thế (gắn loại, gắn đối tác): cùng loại / cùng hồ sơ, chính sách đổi được; dòng cũ phải huỷ hoặc kết thúc trước", () => {
  const db = moi();
  const p = dlA(db), q = dlA(db);
  const gl = ganLoai(db, { den: "2027-05-31" });
  assert.throws(() => ganLoai(db, { tu: "2027-06-01", tier: "MT_BBBBBBBB", thay: gl }), /prc_replaces_mismatch:/, "thiếu lý do");
  ganLoai(db, { tu: "2027-06-01", tier: "MT_BBBBBBBB", thay: gl, lyDo: LY_DO });
  const gr = ganRieng(db, p);
  assert.throws(() => ganRieng(db, q, { thay: gr, lyDo: LY_DO }), /prc_replaces_mismatch:/, "khác hồ sơ");
  assert.throws(() => ganRieng(db, p, { tu: "2028-01-01", thay: gr, lyDo: LY_DO }), /prc_party_tier_overlap:|prc_replaces_mismatch:/, "dòng cũ còn mở");
  huy(db, "prc_party_tier", gr);
  ganRieng(db, p, { tier: "MT_BBBBBBBB", thay: gr, lyDo: LY_DO });
});

test("view mức loại dòng đã huỷ; bản chụp AUTO mới trỏ dòng đã huỷ bị CSDL chặn (terms_rule_stale)", () => {
  const db = moi();
  const r = muc(db, { tu: "2027-01-01" });
  assert.equal(one<{ n: number }>(db, "SELECT count(*) AS n FROM v_prc_commission_rule WHERE id = ?", r).n, 1);
  chup(db, r, "2027-01-05"); // trước khi huỷ: chụp được
  const r2 = muc(db, { ma: "VTE", tu: "2027-01-01" });
  huy(db, "prc_commission_rule", r2);
  assert.equal(one<{ n: number }>(db, "SELECT count(*) AS n FROM v_prc_commission_rule WHERE id = ?", r2).n, 0);
  assert.throws(() => chup(db, r2, "2027-01-05"), /terms_rule_stale:/);
});
