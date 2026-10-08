// Kiểm migration *_so_dai_ly_dot_1.sql (ADR-0077, ADR-0078 B1, ADR-0080 D1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §3, §12 tiêu chí 4).
// Chèn THẲNG bằng SQL — mỗi trigger / CHECK có một ca đỏ và một ca xanh. Áp toàn bộ migration lên SQLite bộ nhớ (khuôn src/migrations-tai-khoan-nhan-tien.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_so_dai_ly_dot_1.sql"));
const AT = "2026-10-08T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as T;

interface The { db: DatabaseSync; ct: string; dl: string; ncc: string; txd: string }
let n = 0;
const id = (p: string) => `${p}${++n}`;
function party(db: DatabaseSync, kind: "PERSON" | "ORGANIZATION", ten: string, vai: string | null): string {
  const p = id("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)", p, kind, ten, AT, AT);
  if (vai) run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)", id("r"), p, vai, AT, AT);
  return p;
}
/**
 * Danh mục giả cho ca nhóm dịch vụ (migration 0055 chỉ gieo nhóm; mã dịch vụ nằm ở catalog_item, nạp từ Sheet nên CSDL mới KHÔNG có):
 * SB16D thuộc TXE; SB7D từng thuộc TXE rồi chuyển sang TDA (seq 2); TD1 từng thuộc TDA rồi về "Chưa phân loại" (seq 2, group_code NULL).
 */
function gieoNhom(db: DatabaseSync): void {
  for (const c of ["SB16D", "SB7D", "TD1"]) {
    run(db, "INSERT INTO catalog_item (code, name, unit, price_adult, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 100000, ?, ?)", c, `Mã ${c}`, AT, AT);
  }
  const g: [string, string, string | null, number][] = [["SB16D", "g1", "TXE", 1], ["SB7D", "g2", "TXE", 1], ["SB7D", "g3", "TDA", 2], ["TD1", "g4", "TDA", 1], ["TD1", "g5", null, 2]];
  for (const [ma, gid, nhom, seq] of g) {
    run(db, "INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", gid, ma, nhom, seq, AT, AT, AT);
  }
}
function moi(): The {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  // Một nhân viên giả để đơn có người lập (orders.staff_id → staff.id).
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  gieoNhom(db);
  const ct = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company LIMIT 1").party_id;
  return { db, ct, dl: party(db, "ORGANIZATION", "Đại lý A", "TRAVEL_AGENCY"), ncc: party(db, "ORGANIZATION", "i-resort", "SUPPLIER"), txd: party(db, "PERSON", "Tài xế B", "DRIVER_EXTERNAL") };
}
function muc(db: DatabaseSync, o: Partial<{ party: string | null; role: string | null; scope: string; code: string | null; group: string | null; kind: string; bp: number | null; pp: number | null; from: string; to: string | null }> = {}): string {
  const r = id("m");
  run(db, `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'kt', ?, 'kt')`,
    r, o.party ?? null, o.party ? null : (o.role ?? "TRAVEL_AGENCY"), o.scope ?? "ALL", o.code ?? null, o.group ?? null, o.kind ?? "RATE",
    (o.kind ?? "RATE") === "RATE" ? (o.bp ?? 1000) : null, (o.kind ?? "RATE") === "PER_PAX" ? (o.pp ?? 50000) : null, o.from ?? "2026-01-01", o.to ?? null, AT, AT);
  return r;
}
function dieuKhoan(db: DatabaseSync, o: { scope: string; code?: string | null; group?: string | null; seller: string; supplier?: string | null; bp?: number | null; from?: string }): string {
  const r = id("d");
  run(db, `INSERT INTO prc_supply_term (id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'kt', ?, 'kt')`, r, o.scope, o.code ?? null, o.group ?? null, o.seller, o.supplier ?? null, o.bp ?? null, o.from ?? "2026-01-01", AT, AT);
  return r;
}

test("có đúng một tệp migration sổ đại lý; vai SUPPLIER, năm vai được hưởng, dòng điều khoản ALL gieo sẵn trỏ công ty chủ", () => {
  assert.ok(FILE, "thiếu migrations/*_so_dai_ly_dot_1.sql");
  assert.equal(files.filter((f) => f.endsWith("_so_dai_ly_dot_1.sql")).length, 1, "chỉ được có MỘT tệp migration sổ đại lý đợt 1");
  const { db, ct } = moi();
  assert.equal(one<{ role_group: string }>(db, "SELECT role_group FROM pty_role_type WHERE code = 'SUPPLIER'").role_group, "OTHER");
  const vai = (db.prepare("SELECT role_type_code FROM v_prc_beneficiary_role ORDER BY 1").all() as { role_type_code: string }[]).map((r) => r.role_type_code);
  assert.deepEqual(vai, ["COLLABORATOR", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "TRAVEL_AGENCY"]);
  const g = one<{ seller_party_id: string; supplier_party_id: string | null; valid_from_date: string }>(db, "SELECT seller_party_id, supplier_party_id, valid_from_date FROM prc_supply_term WHERE scope = 'ALL'");
  assert.equal(g.seller_party_id, ct);
  assert.equal(g.supplier_party_id, null);
  assert.equal(g.valid_from_date, "2025-01-01");
  assert.ok(one<{ cutoff_at: string }>(db, "SELECT cutoff_at FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'").cutoff_at);
});

test("v_pty_open_role: chỉ vai đang mở, kèm nhóm vai; không tên, không SĐT", () => {
  const { db, dl, txd } = moi();
  const cot = (db.prepare("PRAGMA table_info(v_pty_open_role)").all() as { name: string }[]).map((c) => c.name);
  assert.deepEqual(cot, ["party_id", "role_type_code", "role_group"]);
  assert.equal(one<{ role_group: string }>(db, "SELECT role_group FROM v_pty_open_role WHERE party_id = ? AND role_type_code = 'TRAVEL_AGENCY'", dl).role_group, "EXTERNAL");
  assert.equal(one<{ role_group: string }>(db, "SELECT role_group FROM v_pty_open_role WHERE party_id = ? AND role_type_code = 'DRIVER_EXTERNAL'", txd).role_group, "EXTERNAL");
  run(db, "UPDATE pty_party_role SET valid_to_date = '2026-06-30', updated_at = ? WHERE party_id = ?", AT, dl);
  assert.equal((db.prepare("SELECT 1 FROM v_pty_open_role WHERE party_id = ?").all(dl) as unknown[]).length, 0, "vai đã đóng không còn trong view");
});

test("v_ctl_service_group: nhóm hiện hành = seq lớn nhất; SB16D thuộc TXE; mã chuyển nhóm lấy nhóm mới; mã về 'Chưa phân loại' có group_code NULL", () => {
  const { db } = moi();
  const r = one<{ group_code: string } | undefined>(db, "SELECT group_code FROM v_ctl_service_group WHERE catalog_code = 'SB16D'");
  assert.equal(r?.group_code, "TXE");
  assert.equal(one<{ group_code: string }>(db, "SELECT group_code FROM v_ctl_service_group WHERE catalog_code = 'SB7D'").group_code, "TDA", "seq 2 thắng seq 1");
  assert.equal((db.prepare("SELECT 1 FROM v_ctl_service_group WHERE catalog_code = 'SB7D'").all() as unknown[]).length, 1, "mỗi mã đúng một dòng");
  const cp = one<{ group_code: string | null }>(db, "SELECT group_code FROM v_ctl_service_group WHERE catalog_code = 'TD1'");
  assert.equal(cp.group_code, null, "Chưa phân loại = group_code NULL");
});

test("prc_commission_rule: không xoá; chỉ đóng một lần; không chồng; đối tượng phải được hưởng; CHECK kiểu / phạm vi", () => {
  const { db, dl, txd } = moi();
  const a = muc(db, { from: "2026-01-01" });
  assert.throws(() => run(db, "DELETE FROM prc_commission_rule WHERE id = ?", a), /prc_append_only:/);
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET rate_bp = 2000 WHERE id = ?", a), /prc_append_only:/);
  assert.throws(() => muc(db, { from: "2026-06-01" }), /prc_overlap:/, "cùng vai, cùng ALL, chồng khoảng");
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = '2025-12-31' WHERE id = ?", a), /prc_append_only:|CHECK constraint failed/);
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-05-31', updated_at = ?, updated_by = 'kt' WHERE id = ?", AT, a);
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = NULL WHERE id = ?", a), /prc_append_only:/, "không mở lại");
  muc(db, { from: "2026-06-01" });
  muc(db, { party: dl, scope: "SERVICE", code: "HONTAM" });
  assert.throws(() => muc(db, { party: txd }), /prc_target_not_beneficiary:/);
  assert.throws(() => muc(db, { role: "DRIVER_EXTERNAL" }), /prc_role_not_beneficiary:|FOREIGN KEY constraint failed/);
  assert.throws(() => muc(db, { scope: "SERVICE", code: null }), /CHECK constraint failed/);
  assert.throws(() => muc(db, { scope: "GROUP", group: "DTH", bp: 10001 }), /CHECK constraint failed/);
  run(db, "UPDATE prc_beneficiary_role SET active = 0, updated_at = ? WHERE role_type_code = 'COLLABORATOR'", AT);
  assert.throws(() => muc(db, { role: "COLLABORATOR" }), /prc_role_not_beneficiary:/);
});

test("prc_beneficiary_role: không xoá, chỉ tắt (active = 0); view chỉ trả vai đang bật", () => {
  const { db } = moi();
  assert.throws(() => run(db, "DELETE FROM prc_beneficiary_role WHERE role_type_code = 'TAXI_DRIVER'"), /prc_append_only:/);
  run(db, "UPDATE prc_beneficiary_role SET active = 0, updated_at = ? WHERE role_type_code = 'TAXI_DRIVER'", AT);
  const vai = (db.prepare("SELECT role_type_code FROM v_prc_beneficiary_role ORDER BY 1").all() as { role_type_code: string }[]).map((r) => r.role_type_code);
  assert.deepEqual(vai, ["COLLABORATOR", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TRAVEL_AGENCY"]);
});

test("prc_supply_term: người bán ≠ công ty phải là nhà cung cấp; a% ⇔ người bán ≠ công ty; ALL chỉ công ty; X3 chặn a% cho TXE", () => {
  const { db, ct, dl, ncc } = moi();
  dieuKhoan(db, { scope: "SERVICE", code: "IRESORT", seller: ncc, supplier: ncc, bp: 8000 });
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "HONTAM", seller: dl, supplier: dl, bp: 8000 }), /prc_seller_not_supplier:/);
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "HONTAM", seller: ct, supplier: ct, bp: 8000 }), /prc_supplier_mismatch:|CHECK constraint failed/);
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "HONTAM2", seller: ncc }), /prc_supplier_mismatch:/, "người bán là nhà cung cấp mà không a%");
  // Đóng dòng ALL gieo sẵn trước, để ca dưới chỉ chạm đúng trigger "ALL chỉ cho công ty" (không chạm trigger chồng khoảng).
  run(db, "UPDATE prc_supply_term SET valid_to_date = '2026-12-31', updated_at = ? WHERE scope = 'ALL'", AT);
  assert.throws(() => dieuKhoan(db, { scope: "ALL", seller: ncc, supplier: ncc, bp: 8000, from: "2027-01-01" }), /prc_all_owner_only:/);
  dieuKhoan(db, { scope: "ALL", seller: ct, from: "2027-01-01" });
  assert.throws(() => dieuKhoan(db, { scope: "GROUP", group: "TXE", seller: ncc, supplier: ncc, bp: 8000 }), /prc_transfer_no_supplier:/);
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "SB16D", seller: ncc, supplier: ncc, bp: 8000 }), /prc_transfer_no_supplier:/);
  dieuKhoan(db, { scope: "SERVICE", code: "SB7D", seller: ncc, supplier: ncc, bp: 8000 }); // SB7D đã chuyển sang TDA (seq 2) ⇒ X3 không chặn
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "IRESORT", seller: ncc, supplier: ncc, bp: 7000 }), /prc_overlap:/);
});

test("prc_supply_term: không xoá; chỉ đóng một lần, không mở lại", () => {
  const { db, ncc } = moi();
  const t = dieuKhoan(db, { scope: "SERVICE", code: "IRESORT", seller: ncc, supplier: ncc, bp: 8000 });
  assert.throws(() => run(db, "DELETE FROM prc_supply_term WHERE id = ?", t), /prc_append_only:/);
  assert.throws(() => run(db, "UPDATE prc_supply_term SET cost_rate_bp = 7000 WHERE id = ?", t), /prc_append_only:/);
  run(db, "UPDATE prc_supply_term SET valid_to_date = '2026-09-30', updated_at = ? WHERE id = ?", AT, t);
  assert.throws(() => run(db, "UPDATE prc_supply_term SET valid_to_date = NULL WHERE id = ?", t), /prc_append_only:/);
  dieuKhoan(db, { scope: "SERVICE", code: "IRESORT", seller: ncc, supplier: ncc, bp: 7000, from: "2026-10-01" });
});

/** Đơn một dịch vụ (mã HONTAM, 1.000.000 đ). Dựng ở nháp rồi UPDATE sang đã xác nhận — khuôn seedOrder của src/migrations-orders-da-giao.test.ts. */
function don(db: DatabaseSync, trangThai: "draft" | "confirmed"): { o: string; s: string } {
  const o = id("o"), s = id("s");
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 0, 1000000, 1000000, ?, ?)`, o, `TD-${o}`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'HONTAM', 'Vé Hòn Tằm', 'perPax', 1, '2026-10-10')", s, o);
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)", id("i"), o, s);
  run(db, "INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, ?, ?, 'OUT', '2026-10-10', 'Khách sạn A', ?, ?)", id("l"), o, s, AT, AT);
  if (trangThai === "confirmed") run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, o);
  return { o, s };
}
function chup(db: DatabaseSync, o: string, s: string, x: Partial<{ sup: string | null; src: string; reason: string | null; rule: string | null; bp: number | null; date: string }> = {}): string {
  const r = id("t");
  const ct = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company LIMIT 1").party_id;
  const term = one<{ id: string }>(db, "SELECT id FROM prc_supply_term WHERE scope = 'ALL'").id;
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax,
      commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, NULL, 'NONE', NULL, NULL, NULL, NULL, ?, 'SET', ?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'sa', ?, 'sa')`,
    r, o, s, x.rule ?? null, ct, term, x.src ?? "AUTO", x.reason ?? null, x.sup ?? null, x.date ?? "2026-10-08", AT, AT);
  return r;
}

test("ord_service_terms: chỉ đơn đã xác nhận; chỉ-thêm; đúng dịch vụ của đơn; một bản hiện hành; chặn khi đã giao; MANUAL cần lý do ≥ 10 ký tự", () => {
  const { db } = moi();
  const nhap = don(db, "draft");
  assert.throws(() => chup(db, nhap.o, nhap.s), /terms_order_not_confirmed:/);
  const { o, s } = don(db, "confirmed");
  const khac = don(db, "confirmed");
  assert.throws(() => chup(db, o, khac.s), /terms_service_mismatch:/);
  const a = chup(db, o, s);
  assert.throws(() => run(db, "UPDATE ord_service_terms SET source = 'MANUAL' WHERE id = ?", a), /terms_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ord_service_terms WHERE id = ?", a), /terms_append_only:/);
  assert.throws(() => chup(db, o, s), /terms_one_current:/, "bản thứ hai không trỏ supersedes");
  assert.throws(() => chup(db, o, s, { src: "MANUAL", sup: a, reason: "ngắn" }), /CHECK constraint failed/);
  const b = chup(db, o, s, { src: "MANUAL", sup: a, reason: "thoả thuận riêng với đại lý" });
  assert.throws(() => chup(db, o, s, { src: "MANUAL", sup: a, reason: "thoả thuận riêng lần hai" }), /UNIQUE constraint failed: ord_service_terms\.supersedes_id/);
  assert.throws(() => chup(db, khac.o, khac.s, { src: "MANUAL", sup: b, reason: "trỏ sang dịch vụ khác" }), /terms_supersede_mismatch:/);
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 'sa', updated_at = ? WHERE id = ?", AT, AT, o);
  assert.throws(() => chup(db, o, s, { src: "MANUAL", sup: b, reason: "sau khi đã giao đơn" }), /terms_order_delivered:/);
  assert.equal((db.prepare("SELECT order_id FROM v_ord_terms_missing").all() as unknown[]).length, 0);
});

test("ord_service_terms AUTO: dòng mức phải còn hiệu lực ở ngày chụp và khớp số (bảng mức vừa đổi ⇒ cả lô rơi)", () => {
  const { db, dl } = moi();
  const m = muc(db, { from: "2026-01-01" });
  const { o, s } = don(db, "confirmed");
  const chen = (rate: number, ngay: string) => run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, commission_kind, commission_rate_bp,
      commission_rule_id, supply_status, seller_party_id, supply_term_id, source, captured_date, created_at, updated_at)
    SELECT ?, ?, ?, ?, 'SET', 'RATE', ?, ?, 'SET', party_id, (SELECT id FROM prc_supply_term WHERE scope = 'ALL'), 'AUTO', ?, ?, ? FROM v_pty_owner_company`,
    id("t"), o, s, dl, rate, m, ngay, AT, AT);
  assert.throws(() => chen(1500, "2026-10-08"), /terms_rule_stale:/, "số chép lệch dòng mức");
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-10-07', updated_at = ? WHERE id = ?", AT, m);
  assert.throws(() => chen(1000, "2026-10-08"), /terms_rule_stale:/, "dòng mức đã đóng trước ngày chụp");
  chen(1000, "2026-10-07");
});

test("ord_service_terms AUTO: điều khoản người bán phải còn hiệu lực ở ngày chụp và khớp người bán / nhà cung cấp / a%", () => {
  const { db, ct, ncc } = moi();
  const { o, s } = don(db, "confirmed");
  const goc = one<{ id: string }>(db, "SELECT id FROM prc_supply_term WHERE scope = 'ALL'").id;
  const chen = (ngay: string, seller: string, termId: string) => run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, supply_status,
      seller_party_id, supply_term_id, source, captured_date, created_at, updated_at) VALUES (?, ?, ?, NULL, 'NONE', 'SET', ?, ?, 'AUTO', ?, ?, ?)`, id("t"), o, s, seller, termId, ngay, AT, AT);
  assert.throws(() => chen("2026-10-08", ncc, goc), /terms_term_stale:/, "người bán chép lệch dòng điều khoản");
  assert.throws(() => chen("2024-12-31", ct, goc), /terms_term_stale:/, "điều khoản chưa hiệu lực ở ngày chụp (từ 2025-01-01)");
  chen("2026-10-08", ct, goc);
});

test("v_ord_terms_missing: đơn có bản HIỆN HÀNH thiếu hoa hồng hoặc thiếu người bán thì có mặt; bản mới thay thế (đủ) thì biến mất", () => {
  const { db, ct, dl } = moi();
  const goc = one<{ id: string }>(db, "SELECT id FROM prc_supply_term WHERE scope = 'ALL'").id;
  const thieu = () => (db.prepare("SELECT order_id FROM v_ord_terms_missing ORDER BY order_id").all() as { order_id: string }[]).map((r) => r.order_id);
  // Đơn 1: hoa hồng MISSING (không có mức) nhưng đã có người bán.
  const d1 = don(db, "confirmed");
  const t1 = id("t");
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, supply_status, seller_party_id, supply_term_id, source, captured_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'MISSING', 'NO_RULE', 'SET', ?, ?, 'AUTO', '2026-10-08', ?, ?)`, t1, d1.o, d1.s, dl, ct, goc, AT, AT);
  // Đơn 2: người bán MISSING (không có điều khoản) nhưng hoa hồng NONE.
  const d2 = don(db, "confirmed");
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, supply_status, seller_party_id, supply_term_id, source, captured_date, created_at, updated_at)
    VALUES (?, ?, ?, NULL, 'NONE', 'MISSING', NULL, NULL, 'AUTO', '2026-10-08', ?, ?)`, id("t"), d2.o, d2.s, AT, AT);
  // Đơn 3: đủ cả hai ⇒ không có mặt.
  const d3 = don(db, "confirmed");
  chup(db, d3.o, d3.s);
  assert.deepEqual(thieu(), [d1.o, d2.o].sort());
  // Bản MANUAL thay bản hiện hành của đơn 1 bằng hoa hồng SET ⇒ bản MISSING cũ không còn là hiện hành ⇒ đơn 1 biến mất; đơn 2 vẫn còn.
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, commission_kind, commission_rate_bp, supply_status, seller_party_id, supply_term_id,
      source, reason, supersedes_id, captured_date, created_at, updated_at) VALUES (?, ?, ?, ?, 'SET', 'RATE', 1500, 'SET', ?, ?, 'MANUAL', 'Kế toán ghi mức tay cho đơn này', ?, '2026-10-08', ?, ?)`,
    id("t"), d1.o, d1.s, dl, ct, goc, t1, AT, AT);
  assert.deepEqual(thieu(), [d2.o]);
});

test("ord_audit_cutoff: chỉ-thêm (không sửa, không xoá)", () => {
  const { db } = moi();
  assert.throws(() => run(db, "UPDATE ord_audit_cutoff SET cutoff_at = '2020-01-01T00:00:00.000Z' WHERE code = 'R-ORD-T1'"), /terms_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'"), /terms_append_only:/);
});

test("ky_period_close: tháng nào cũng được khi rỗng; sau đó phải liền kề; không trùng, không sửa, không xoá", () => {
  const { db } = moi();
  const khoa = (p: string) => run(db, "INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'kt', NULL, ?, 'kt', ?, 'kt')", p, AT, AT, AT);
  khoa("2026-08");
  assert.throws(() => khoa("2026-10"), /period_not_adjacent:/);
  assert.throws(() => khoa("2026-08"), /UNIQUE constraint failed|PRIMARY KEY|period_not_adjacent:/);
  khoa("2026-09");
  assert.throws(() => run(db, "UPDATE ky_period_close SET note = 'x' WHERE period = '2026-09'"), /ky_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ky_period_close WHERE period = '2026-09'"), /ky_append_only:/);
  // Tháng 12 → tháng 1 năm sau; CHECK dạng tháng thử trên bảng RỖNG (bảng có dòng thì trigger liền kề bắn trước CHECK).
  const db2 = moi().db;
  assert.throws(() => run(db2, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2026-13', ?, 'kt', ?, ?)", AT, AT, AT), /CHECK constraint failed/);
  run(db2, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2025-12', ?, 'kt', ?, ?)", AT, AT, AT);
  run(db2, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2026-01', ?, 'kt', ?, ?)", AT, AT, AT);
});

test("khoá tháng ở CSDL: bốn bảng tiền từ chối dòng có ngày thuộc tháng đã khoá", () => {
  const { db } = moi();
  run(db, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2026-09', ?, 'kt', ?, ?)", AT, AT, AT);
  const trig = (db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'trigger' AND name LIKE '%period_closed'").all() as { name: string; tbl_name: string }[]).map((t) => t.tbl_name).sort();
  assert.deepEqual(trig, ["bil_outside_refund", "bil_payment_receipt", "bil_posting", "vc_trip_cost_line"]);
  // Một ca chèn thật mỗi bảng: dựng dòng tối thiểu bằng cột NOT NULL của bảng (đọc PRAGMA table_info), occurred_date = '2026-09-30' ⇒ period_closed; '2026-10-01' ⇒ qua trigger này.
  for (const t of trig) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all() as { name: string; notnull: number; dflt_value: string | null; pk: number }[];
    const can = cols.filter((c) => (c.notnull === 1 || c.pk === 1) && c.dflt_value === null).map((c) => c.name);
    const sqlNgay = (ngay: string) => `INSERT INTO ${t} (${can.join(", ")}) VALUES (${can.map((c) => (c === "occurred_date" ? `'${ngay}'` : "'x'")).join(", ")})`;
    assert.throws(() => db.exec("PRAGMA foreign_keys = OFF; " + sqlNgay("2026-09-30")), /period_closed:/, `${t}: phải chặn tháng đã khoá`);
    // Ca đối chứng: tháng 10 chưa khoá ⇒ trigger này KHÔNG bắn (dòng 'x' có thể rơi vì CHECK / khoá ngoại khác — chỉ cần lỗi không phải period_closed).
    try {
      db.exec("PRAGMA foreign_keys = OFF; " + sqlNgay("2026-10-01"));
    } catch (e) {
      assert.doesNotMatch(String((e as Error).message), /period_closed:/, `${t}: tháng chưa khoá không được bị chặn bởi trigger khoá tháng`);
    }
  }
});
