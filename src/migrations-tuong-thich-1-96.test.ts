// N-21 (ADR-0117 lần 2, Task 2; kế hoạch docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md): Worker bản 1.96 chạy trên lược đồ có 0096 + 0097 — giữa lúc áp
// migration và lúc deploy, và khi phải quay Worker về 1.96 SAU KHI đã có dòng đích mức.
// Các câu SQL dưới đây là bản GIỮ NGUYÊN VĂN của bản 1.96 (commit a05686df: src/modules/pricing/repository.ts — rules_all, rules_on, rule_by_id, rule_insert, rule_close;
// src/modules/orders/thuong-mai-repo.ts — terms_insert_chain, terms_current). KHÔNG import repository.ts: Task 3–4 sẽ sửa tệp đó, bài phải tiếp tục thử ĐÚNG bản 1.96.
// Cách bản 1.96 chọn mức (`chonMuc` sáu bậc ở src/modules/pricing/rules.ts @ a05686df) và dựng DTO quản trị (`dtoMuc` ở pricing/index.ts @ a05686df) được chép
// thu gọn đúng phần quyết định dòng nào được chọn / hiện gì — để chứng minh dòng đích mức không bao giờ bị bản 1.96 chọn (không sai tiền).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// ===== Bản 1.96, nguyên văn (đừng sửa cho khớp mã mới) ==================================================================================================
const COT_MUC = `r.id, r.target_party_id, r.target_role_code, r.scope, r.catalog_code, r.group_code, r.kind, r.rate_bp, r.per_pax_amount, r.valid_from_date, r.valid_to_date, r.note`;
const MUC_TAT_CA = `SELECT ${COT_MUC}, l.display_name AS target_name FROM prc_commission_rule r LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id
   ORDER BY (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`;
const MUC_NGAY = `SELECT ${COT_MUC}, NULL AS target_name FROM prc_commission_rule r WHERE r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)`;
const MUC_ID = `SELECT ${COT_MUC}, l.display_name AS target_name FROM prc_commission_rule r LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id WHERE r.id = ?1`;
const MUC_THEM = `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?13, ?14)`;
const MUC_DONG = `UPDATE prc_commission_rule SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL`;
const COT = `id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax, commission_rule_id,
  supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by`;
const CHUP_CHUOI = `INSERT INTO ord_service_terms (${COT}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?20, ?21 WHERE changes() > 0`;
const HIEN_HANH = `SELECT t.id, t.order_service_id, t.beneficiary_party_id, t.commission_status, t.missing_reason, t.commission_kind, t.commission_rate_bp, t.commission_per_pax, t.commission_rule_id,
     t.supply_status, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.supply_term_id, t.source, t.captured_date
   FROM ord_service_terms t WHERE t.order_id = ?1 AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`;

interface RuleRow {
  id: string; target_party_id: string | null; target_role_code: string | null; scope: "SERVICE" | "GROUP" | "ALL"; catalog_code: string | null; group_code: string | null;
  kind: "RATE" | "PER_PAX"; rate_bp: number | null; per_pax_amount: number | null; valid_from_date: string; valid_to_date: string | null; note: string | null; target_name: string | null;
}
type PhamVi = RuleRow["scope"];
const THU_TU: readonly PhamVi[] = ["SERVICE", "GROUP", "ALL"];
const hieuLuc = (r: RuleRow, ngay: string) => r.valid_from_date <= ngay && (r.valid_to_date === null || r.valid_to_date >= ngay);
function khop(d: RuleRow, pv: PhamVi, catalogCode: string, groupCode: string | null): boolean {
  if (d.scope !== pv) return false;
  if (pv === "SERVICE") return d.catalog_code === catalogCode;
  if (pv === "GROUP") return groupCode !== null && d.group_code === groupCode;
  return true;
}
const cungMuc = (a: RuleRow, b: RuleRow) => a.kind === b.kind && a.rate_bp === b.rate_bp && a.per_pax_amount === b.per_pax_amount;
const theoThuTu = (a: RuleRow, b: RuleRow) => (a.target_role_code ?? "").localeCompare(b.target_role_code ?? "") || a.id.localeCompare(b.id);
/** `chonMuc` bản 1.96 (người hưởng HUONG): bậc 1–3 theo hồ sơ, 4–6 theo vai, không khớp ⇒ NO_RULE. */
function chonMuc196(partyId: string, vai: readonly string[], catalogCode: string, groupCode: string | null, ngay: string, dong: readonly RuleRow[]): { id: string } | { lyDo: string } {
  const con = dong.filter((d) => hieuLuc(d, ngay)).sort(theoThuTu);
  for (const pv of THU_TU) {
    const d = con.find((x) => x.target_party_id === partyId && khop(x, pv, catalogCode, groupCode));
    if (d) return { id: d.id };
  }
  for (const pv of THU_TU) {
    const ds = con.filter((x) => x.target_role_code !== null && vai.includes(x.target_role_code) && khop(x, pv, catalogCode, groupCode));
    if (ds.length === 0) continue;
    if (ds.some((x) => !cungMuc(x, ds[0]!))) return { lyDo: "RULE_CONFLICT" };
    return { id: ds[0]!.id };
  }
  return { lyDo: "NO_RULE" };
}
/** Phần `doiTuong` của `dtoMuc` bản 1.96 — màn quản trị hiện gì cho một dòng. */
const doiTuong196 = (r: RuleRow) => r.target_role_code !== null ? { loai: "VAI", code: r.target_role_code } : { loai: "DOI_TAC", partyId: r.target_party_id ?? "", ten: r.target_name ?? "Hồ sơ không còn" };
// =========================================================================================================================================================

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-10-14T03:00:00.000Z";
const NGAY = "2026-10-10";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const all = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).all(...a) as T[];

/** Chuỗi migration ĐẦY ĐỦ (gồm 0096 + 0097), khoá ngoại bật, nhân viên + đại lý + đơn đã xác nhận. */
function moi(): DatabaseSync {
  assert.ok(files.some((f) => f.endsWith("_dung_lai_muc_hoa_hong.sql")), "chuỗi migration phải có 0097");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dl', 'ORGANIZATION', 'Đại lý A', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dl', 'pty-dl', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)", AT, AT);
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES ('o1', 'TD-1', 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 0, 1000000, 1000000, ?, ?)`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o1', 0, 'HONTAM', 'Vé Hòn Tằm', 'perPax', 1, ?)", NGAY);
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i1', 'o1', 'sv1', 'Người lớn', 1, 1000000, 1000000)");
  run(db, "INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES ('l1', 'o1', 'sv1', 'OUT', ?, 'Khách sạn A', ?, ?)", NGAY, AT, AT);
  return db;
}
/** Đường xác nhận của bản 1.96: câu UPDATE đơn (changes() = 1) rồi câu chụp nối chuỗi `WHERE changes() > 0`. */
function xacNhanVaChup196(db: DatabaseSync, rule: RuleRow | null, lyDo: string | null): number {
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = 'o1' AND status = 'draft'", AT, AT);
  const term = all<{ id: string; seller_party_id: string }>(db, "SELECT id, seller_party_id FROM prc_supply_term WHERE scope = 'ALL' AND valid_to_date IS NULL")[0]!;
  return Number(db.prepare(CHUP_CHUOI).run("t1", "o1", "sv1", "pty-dl", rule ? "SET" : "MISSING", rule ? null : lyDo, rule?.kind ?? null, rule?.rate_bp ?? null, rule?.per_pax_amount ?? null,
    rule?.id ?? null, "SET", term.seller_party_id, null, null, term.id, "AUTO", null, null, NGAY, AT, "s1").changes);
}
const tier = (db: DatabaseSync, code: string) =>
  run(db, "INSERT INTO prc_rate_tier (code, name, name_key, active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, 'kt', ?, 'kt')", code, code, code.toLowerCase(), AT, AT);
const dongMuc = (db: DatabaseSync, id: string, tierCode: string, bp: number, scope: "ALL" | "SERVICE" = "ALL") =>
  run(db, `INSERT INTO prc_commission_rule (id, target_tier_code, scope, catalog_code, kind, rate_bp, valid_from_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, 'RATE', ?, '2026-01-01', ?, 'kt', ?, 'kt')`, id, tierCode, scope, scope === "SERVICE" ? "HONTAM" : null, bp, AT, AT);

test("N-21: mọi câu SQL bảng mức + bản chụp của bản 1.96 chạy nguyên văn trên lược đồ có 0096 + 0097 (đọc, chèn đích hồ sơ / vai, đóng, chụp khi xác nhận, đọc bản chụp)", () => {
  const db = moi();
  const them = db.prepare(MUC_THEM);
  them.run("m-vai", null, "TRAVEL_AGENCY", "ALL", null, null, "RATE", 500, null, "2026-01-01", null, "mức chung", AT, "kt");
  them.run("m-hs", "pty-dl", null, "SERVICE", "HONTAM", null, "PER_PAX", null, 20000, "2026-01-01", null, null, AT, "kt");
  them.run("m-dong", null, "GUIDE_FREELANCE", "ALL", null, null, "RATE", 100, null, "2026-01-01", null, null, AT, "kt");
  assert.equal(Number(db.prepare(MUC_DONG).run("m-dong", "2026-06-30", AT, "kt").changes), 1);
  assert.equal(Number(db.prepare(MUC_DONG).run("m-dong", "2026-07-31", AT, "kt").changes), 0, "dòng đã đóng: câu đóng 1.96 không làm gì");
  const tatCa = all<RuleRow>(db, MUC_TAT_CA);
  assert.deepEqual(tatCa.map((r) => r.id), ["m-hs", "m-vai", "m-dong"]);
  assert.equal(all<RuleRow>(db, MUC_ID, "m-hs")[0]!.target_name, "Đại lý A");
  const ngay = all<RuleRow>(db, MUC_NGAY, NGAY);
  assert.deepEqual(ngay.map((r) => r.id).sort(), ["m-hs", "m-vai"]);
  const chon = chonMuc196("pty-dl", ["TRAVEL_AGENCY"], "HONTAM", null, NGAY, ngay);
  assert.deepEqual(chon, { id: "m-hs" }, "bậc 1 (hồ sơ, đúng mã dịch vụ) thắng");
  assert.equal(xacNhanVaChup196(db, ngay.find((r) => r.id === "m-hs")!, null), 1, "bản chụp 1.96 qua trigger rule_valid (đọc view dựng lại)");
  const hh = all<{ commission_rule_id: string; commission_per_pax: number }>(db, HIEN_HANH, "o1");
  assert.deepEqual(hh.map((r) => [r.commission_rule_id, r.commission_per_pax]), [["m-hs", 20000]]);
  assert.deepEqual(all(db, "PRAGMA foreign_key_check"), []);
  // Câu chèn 1.96 không nhắc target_tier_code ⇒ cột mới NULL, CHECK «đúng một đích» vẫn đạt.
  assert.deepEqual(all<{ t: string | null }>(db, "SELECT DISTINCT target_tier_code AS t FROM prc_commission_rule").map((r) => r.t), [null]);
});

test("N-21 quay Worker về 1.96 SAU KHI đã có dòng đích mức: câu đọc trả cả dòng đó; chọn mức 1.96 bỏ qua nó (không sai tiền); màn quản trị 1.96 hiện «Hồ sơ không còn»", () => {
  const db = moi();
  tier(db, "TA1");
  tier(db, "TA2");
  dongMuc(db, "u-ta1-all", "TA1", 9000); // số lạ, cao: lọt vào là sai tiền thấy ngay
  dongMuc(db, "u-ta2-all", "TA2", 8000);
  dongMuc(db, "u-ta1-dv", "TA1", 7000, "SERVICE");
  const ngay = all<RuleRow>(db, MUC_NGAY, NGAY);
  assert.deepEqual(ngay.map((r) => r.id).sort(), ["u-ta1-all", "u-ta1-dv", "u-ta2-all"], "câu rules_on 1.96 trả cả dòng đích mức");
  for (const r of ngay) assert.ok(r.target_party_id === null && r.target_role_code === null, "dòng đích mức: hai đích cũ đều NULL");
  // Chưa có dòng theo hồ sơ / vai ⇒ 1.96 báo thiếu mức (đơn bị giữ), KHÔNG lấy 9000 / 8000 / 7000 của mức TA.
  assert.deepEqual(chonMuc196("pty-dl", ["TRAVEL_AGENCY"], "HONTAM", null, NGAY, ngay), { lyDo: "NO_RULE" });
  assert.equal(xacNhanVaChup196(db, null, "NO_RULE"), 1);
  assert.deepEqual(all<{ commission_status: string; commission_rule_id: string | null }>(db, HIEN_HANH, "o1").map((r) => [r.commission_status, r.commission_rule_id]), [["MISSING", null]]);
  // Có dòng theo vai: 1.96 chọn đúng dòng vai (500), không bị dòng mức ALL cùng ngày làm xung đột.
  db.prepare(MUC_THEM).run("m-vai", null, "TRAVEL_AGENCY", "ALL", null, null, "RATE", 500, null, "2026-01-01", null, null, AT, "kt");
  const ngay2 = all<RuleRow>(db, MUC_NGAY, NGAY);
  assert.deepEqual(chonMuc196("pty-dl", ["TRAVEL_AGENCY"], "HONTAM", null, NGAY, ngay2), { id: "m-vai" });
  // Màn quản trị 1.96 (rules_all + dtoMuc): dòng đích mức hiện như dòng theo hồ sơ đã mất — «Hồ sơ không còn». Hiển thị sai nhãn, KHÔNG sai tiền (lo ngại ghi ở báo cáo Task 2).
  const tatCa = all<RuleRow>(db, MUC_TAT_CA);
  assert.equal(tatCa.length, 4);
  for (const r of tatCa.filter((x) => x.id.startsWith("u-"))) assert.deepEqual(doiTuong196(r), { loai: "DOI_TAC", partyId: "", ten: "Hồ sơ không còn" });
  assert.equal(all<RuleRow>(db, MUC_ID, "u-ta1-all")[0]!.rate_bp, 9000);
  // Quản trị 1.96 bấm «Đóng» trên dòng đó: câu đóng 1.96 chạy được (close_only cho qua vì chỉ đổi ngày kết thúc + người/giờ cập nhật), đích mức giữ nguyên.
  assert.equal(Number(db.prepare(MUC_DONG).run("u-ta2-all", "2026-12-31", AT, "kt").changes), 1);
  assert.deepEqual(all<{ t: string }>(db, "SELECT target_tier_code AS t FROM prc_commission_rule WHERE id = 'u-ta2-all'").map((r) => r.t), ["TA2"]);
  assert.deepEqual(all(db, "PRAGMA foreign_key_check"), []);
});
