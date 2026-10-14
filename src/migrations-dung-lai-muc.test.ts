// Kiểm migration *_dung_lai_muc_hoa_hong.sql (ADR-0117 lần 2, Task 2; kế hoạch docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md, N-15, N-20).
// Dựng lại `prc_commission_rule` thêm đích thứ ba `target_tier_code` (mức TA). Bài này:
//   N-20 — so TOÀN BỘ sqlite_master trước/sau tệp (dựng từ dữ liệu, không chép danh sách tên): thiếu hay thừa một đối tượng là đỏ; chỉ đúng bốn đối tượng được đổi
//          (bảng, trigger chồng ngày, close_only, view) và đúng hai đối tượng được thêm (trigger target_tier, chỉ mục đích mức).
//   N-15 — dữ liệu gieo sạch (gồm nhân viên s1 để foreign_key_check đòi đúng 0) còn nguyên từng dòng; hai đích cũ giữ nghĩa cũ (mỗi trigger một ca đỏ, một ca xanh);
//          đích mức có ca đỏ riêng; hai mức khác nhau cùng có dòng «mọi dịch vụ» là hợp lệ.
// node:sqlite chạy tệp TỪNG CÂU MỘT (không gói như db.batch của wrangler): không bọc giao dịch thì `DROP TABLE` bảng cha đang có bản chụp trỏ tới báo
// «FOREIGN KEY constraint failed» và để lại lược đồ nửa vời (Bước 0 bậc a). Nên bài TỰ bọc BEGIN … COMMIT quanh tệp; tệp thật không có BEGIN/COMMIT (D1 local từ chối BEGIN trơn).
// Biến DUNG_LAI_SQL_THAY (đường dẫn tệp): dùng tệp đó thay cho 0097 ở MỌI ca — chỉ để quan sát «gỡ trigger / chỉ mục thì bài đỏ» trên bản sao.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_dung_lai_muc_hoa_hong.sql"));
const AT = "2026-10-14T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as T;
const all = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).all(...a) as T[];

const sqlDungLai = (): string => readFileSync(process.env.DUNG_LAI_SQL_THAY ?? new URL(FILE!, DIR), "utf8");
const COT_CU = "id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by";

/** CSDL dựng từ mọi migration ĐỨNG TRƯỚC 0097 (gồm 0096), bật khoá ngoại, gieo dữ liệu sạch. */
function dungTruoc(): DatabaseSync {
  assert.ok(FILE, "thiếu migrations/*_dung_lai_muc_hoa_hong.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files.filter((x) => x < FILE!)) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  gieo(db);
  return db;
}
/** Áp 0097 trong MỘT giao dịch (thay cho db.batch của wrangler). Lỗi ⇒ hoàn tác cả tệp rồi ném lại. */
function apDungLai(db: DatabaseSync, sql = sqlDungLai()): void {
  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.exec("COMMIT");
  } catch (e) {
    if (db.isTransaction) db.exec("ROLLBACK");
    throw e;
  }
}
function moi(): DatabaseSync {
  const db = dungTruoc();
  apDungLai(db);
  return db;
}

/** Hồ sơ: đại lý `pty-dl` (TRAVEL_AGENCY), HDV tự do `pty-hdv` (GUIDE_FREELANCE), khách lẻ `pty-kh` (CUSTOMER — không được hưởng). Nhân viên s1 có hồ sơ. */
function gieo(db: DatabaseSync): void {
  const party = (id: string, kind: string, ten: string, vai: string) => {
    run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)", id, kind, ten, AT, AT);
    if (kind === "PERSON") run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)", id, ten, AT, AT);
    else run(db, "INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)", id, AT, AT);
    run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)", `r-${id}`, id, vai, AT, AT);
  };
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, ?, ?)", AT, AT);
  run(db, "INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', ?, ?)", AT, AT);
  run(db, "INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, ?, 'pty-s1')", AT);
  run(db, "INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('stp-s1', 's1', 'ADMIN', ?, ?, ?)", AT, AT, AT); // R-N1-5: còn một quản trị
  party("pty-dl", "ORGANIZATION", "Đại lý A", "TRAVEL_AGENCY");
  party("pty-hdv", "PERSON", "HDV B", "GUIDE_FREELANCE");
  party("pty-kh", "PERSON", "Khách C", "CUSTOMER");
  run(db, "INSERT INTO catalog_item (code, name, unit, price_adult, first_seen_at, updated_at) VALUES ('HONTAM', 'Vé Hòn Tằm', 'perPax', 1000000, ?, ?)", AT, AT);
  // Bốn dòng mức đủ kiểu: hồ sơ/vai, tỷ lệ/đ khách, ALL/GROUP/SERVICE, một dòng đã đóng, một dòng có ghi chú và người tạo.
  const muc = (id: string, party: string | null, role: string | null, scope: string, cat: string | null, grp: string | null, kind: string, bp: number | null, pp: number | null, from: string, to: string | null, note: string | null) =>
    run(db, `INSERT INTO prc_commission_rule (${COT_CU}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'kt', ?, 'kt')`, id, party, role, scope, cat, grp, kind, bp, pp, from, to, note, AT, AT);
  muc("m-hs", "pty-dl", null, "ALL", null, null, "RATE", 1000, null, "2026-01-01", null, null);
  muc("m-vai", null, "TRAVEL_AGENCY", "ALL", null, null, "RATE", 500, null, "2026-01-01", null, "mức chung đại lý");
  muc("m-dv", null, "GUIDE_FREELANCE", "SERVICE", "HONTAM", null, "PER_PAX", null, 20000, "2025-01-01", "2025-12-31", null);
  muc("m-nhom", "pty-dl", null, "GROUP", null, "TDA", "RATE", 1200, null, "2026-02-01", null, null);
  // Đơn đã xác nhận + bản chụp AUTO trỏ dòng mức m-hs (rule_valid phải cho qua).
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES ('o1', 'TD-1', 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 0, 1000000, 1000000, ?, ?)`, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('sv1', 'o1', 0, 'HONTAM', 'Vé Hòn Tằm', 'perPax', 1, '2026-10-10')");
  run(db, "INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i1', 'o1', 'sv1', 'Người lớn', 1, 1000000, 1000000)");
  run(db, "INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES ('l1', 'o1', 'sv1', 'OUT', '2026-10-10', 'Khách sạn A', ?, ?)", AT, AT);
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = 'o1'", AT, AT);
  chup(db, { id: "t1", rule: "m-hs", bp: 1000 });
  run(db, "UPDATE prc_beneficiary_role SET active = 0, updated_at = ? WHERE role_type_code = 'COLLABORATOR'", AT);
}
/** Bản chụp AUTO cho dòng sv1 của đơn o1; `sup` = bản hiện hành bị thay. */
function chup(db: DatabaseSync, o: { id: string; rule: string; bp: number; sup?: string; date?: string }): void {
  const term = one<{ id: string; seller_party_id: string }>(db, "SELECT id, seller_party_id FROM prc_supply_term WHERE scope = 'ALL' AND valid_to_date IS NULL");
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, commission_kind, commission_rate_bp, commission_rule_id,
      supply_status, seller_party_id, supply_term_id, source, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'o1', 'sv1', 'pty-dl', 'SET', 'RATE', ?, ?, 'SET', ?, ?, 'AUTO', ?, ?, ?, 'sa', ?, 'sa')`,
    o.id, o.bp, o.rule, term.seller_party_id, term.id, o.sup ?? null, o.date ?? "2026-10-10", AT, AT);
}

interface Obj { type: string; tbl_name: string; sql: string | null }
const master = (db: DatabaseSync): Map<string, Obj> =>
  new Map(all<Obj & { name: string }>(db, "SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY name").map((r) => [r.name, { type: r.type, tbl_name: r.tbl_name, sql: r.sql }]));
const bang = (m: Map<string, Obj>): string[] => [...m].filter(([n, o]) => o.type === "table" && !n.startsWith("sqlite_")).map(([n]) => n);
const demMoiBang = (db: DatabaseSync, ten: readonly string[]): Record<string, number> =>
  Object.fromEntries(ten.map((t) => [t, one<{ n: number }>(db, `SELECT count(*) AS n FROM "${t}"`).n]));
const fkCheck = (db: DatabaseSync) => all(db, "PRAGMA foreign_key_check");
interface Check { code: string; sql: string; level: string; mode?: "rows" }
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
/** Kiểm định kỳ mức «fail» khác 0 — đúng cách scripts/audit-invariants.mjs đọc kết quả. */
const auditDo = (db: DatabaseSync, boQua: RegExp | null = null): string[] => CHECKS.filter((c) => c.level === "fail" && !(boQua && boQua.test(c.sql))).flatMap((c) => {
  const rows = all<Record<string, unknown>>(db, c.sql.replace(/\s+/g, " ").trim());
  const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
  return n > 0 ? [`${c.code}=${n}`] : [];
});
function loi(f: () => unknown, ma: string | RegExp): void {
  assert.throws(f, (e: Error) => (typeof ma === "string" ? e.message.startsWith(ma) : ma.test(e.message)), `phải báo lỗi ${ma}`);
}
let n = 0;
const ruleMoi = (db: DatabaseSync, o: Partial<{ party: string | null; role: string | null; tier: string | null; scope: string; cat: string | null; grp: string | null; bp: number; from: string; to: string | null }>): string => {
  const id = `x${++n}`;
  const scope = o.scope ?? "ALL";
  run(db, `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, target_tier_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date,
      note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'RATE', ?, NULL, ?, ?, NULL, ?, 'kt', ?, 'kt')`,
    id, o.party ?? null, o.role ?? null, o.tier ?? null, scope, scope === "SERVICE" ? (o.cat ?? "HONTAM") : null, scope === "GROUP" ? (o.grp ?? "TDA") : null,
    o.bp ?? 300, o.from ?? "2027-01-01", o.to ?? null, AT, AT);
  return id;
};
const tier = (db: DatabaseSync, code: string, active = 1) =>
  run(db, "INSERT INTO prc_rate_tier (code, name, name_key, active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'kt', ?, 'kt')", code, code, code.toLowerCase(), active, AT, AT);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
test("đúng một tệp dựng lại; không BEGIN/COMMIT (D1 local từ chối BEGIN trơn — wrangler tự gói cả tệp); không CASE…END; tên trigger không stf_/staff_", () => {
  assert.ok(FILE, "thiếu migrations/*_dung_lai_muc_hoa_hong.sql");
  assert.equal(files.filter((f) => f.endsWith("_dung_lai_muc_hoa_hong.sql")).length, 1);
  const sql = sqlDungLai().replace(/--[^\n]*/g, "");
  assert.ok(!/^\s*(BEGIN(\s+TRANSACTION)?|COMMIT|END\s+TRANSACTION|SAVEPOINT|RELEASE|ROLLBACK)\s*;/im.test(sql), "tệp không được tự mở/đóng giao dịch");
  assert.ok(!/\bCASE\b/i.test(sql), "trigger viết WHEN EXISTS, không CASE … END (bộ tách câu của wrangler nuốt ;)");
  const ten = [...sql.matchAll(/CREATE\s+TRIGGER\s+(\w+)/gi)].map((m) => m[1]!);
  assert.ok(ten.length > 0);
  for (const t of ten) assert.ok(!/^(stf_|staff_)/.test(t), `${t}: tên trigger không được bắt đầu stf_/staff_`);
  assert.match(sql, /^\s*PRAGMA defer_foreign_keys = ON;/, "câu đầu: hoãn kiểm khoá ngoại tới cuối giao dịch");
});

test("N-20: sqlite_master trước/sau — không mất gì; chỉ đổi đúng bảng, trigger chồng ngày, close_only, view; chỉ thêm đúng trigger đích mức và chỉ mục đích mức", () => {
  const db = dungTruoc();
  const truoc = master(db);
  apDungLai(db);
  const sau = master(db);
  const mat = [...truoc.keys()].filter((k) => !sau.has(k));
  const them = [...sau.keys()].filter((k) => !truoc.has(k)).sort();
  const doi = [...truoc.keys()].filter((k) => sau.has(k) && JSON.stringify(sau.get(k)) !== JSON.stringify(truoc.get(k))).sort();
  assert.deepEqual(mat, [], "mất đối tượng sau khi dựng lại");
  assert.deepEqual(them, ["prc_commission_rule_target_tier", "prc_commission_rule_tier_ix"], "thêm thừa hoặc thiếu");
  assert.deepEqual(doi, ["prc_commission_rule", "prc_commission_rule_close_only", "prc_commission_rule_overlap", "v_prc_commission_rule"], "đổi ngoài bốn chỗ cố ý");
  assert.deepEqual(all(db, "SELECT name FROM sqlite_master WHERE name LIKE '%\\_copy%' ESCAPE '\\' OR name LIKE '%\\_new%' ESCAPE '\\' OR sql LIKE '%prc_commission_rule_copy%' OR sql LIKE '%prc_commission_rule_new%'"), [],
    "không còn bản sao / bảng tạm, không đối tượng nào nhắc tên tạm");
  // Bốn chỗ đổi đúng nghĩa: cột mới ở CUỐI bảng và view; hai trigger viết lại có nhắc target_tier_code; mọi chỉ mục / trigger trên bảng đều nằm trên bảng thật.
  const cot = (t: string) => all<{ name: string }>(db, `PRAGMA table_info(${t})`).map((c) => c.name);
  assert.deepEqual(cot("prc_commission_rule"), [...COT_CU.split(", "), "target_tier_code"]);
  assert.deepEqual(cot("v_prc_commission_rule"), ["id", "target_party_id", "target_role_code", "scope", "catalog_code", "group_code", "kind", "rate_bp", "per_pax_amount", "valid_from_date", "valid_to_date", "target_tier_code"]);
  for (const t of ["prc_commission_rule_close_only", "prc_commission_rule_overlap", "prc_commission_rule_target_tier"]) assert.match(sau.get(t)!.sql!, /target_tier_code/, t);
  assert.deepEqual(all(db, "PRAGMA foreign_key_list(prc_commission_rule)").map((f) => (f as { table: string; from: string }).table + "." + (f as { from: string }).from).sort(),
    ["ctl_group.group_code", "prc_beneficiary_role.target_role_code", "prc_rate_tier.target_tier_code", "pty_party.target_party_id"]);
  assert.deepEqual(all<{ name: string }>(db, "PRAGMA index_list(prc_commission_rule)").map((i) => i.name).sort(),
    ["prc_commission_rule_party_ix", "prc_commission_rule_role_ix", "prc_commission_rule_tier_ix", "sqlite_autoindex_prc_commission_rule_1"]);
});

test("N-15: dữ liệu còn nguyên từng dòng, số dòng MỌI bảng trước = sau, foreign_key_check đúng 0 trước và sau, integrity_check ok, hết giao dịch", () => {
  const db = dungTruoc();
  const ten = bang(master(db));
  const dem0 = demMoiBang(db, ten);
  const muc0 = all(db, `SELECT ${COT_CU} FROM prc_commission_rule ORDER BY id`);
  const chup0 = all(db, "SELECT * FROM ord_service_terms ORDER BY id");
  assert.equal(muc0.length, 4);
  assert.equal(chup0.length, 1);
  assert.deepEqual(fkCheck(db), [], "dữ liệu gieo phải sạch khoá ngoại TRƯỚC khi dựng");
  // TRƯỚC 0097 bỏ qua hai kiểm cần cột mới (R-PRC-1/2 nhắc target_tier_code — chưa có cột thì câu lỗi); mọi kiểm mức fail còn lại phải sạch.
  assert.deepEqual(auditDo(db, /target_tier_code/), [], "audit-invariants (mức fail) sạch trên dữ liệu gieo TRƯỚC khi dựng");
  apDungLai(db);
  assert.deepEqual(auditDo(db), [], "audit-invariants (mức fail) sạch sau khi dựng — gồm R-PRC-1, R-PRC-2 mới");
  assert.equal(db.isTransaction, false);
  assert.deepEqual(demMoiBang(db, ten), dem0, "số dòng mọi bảng trước = sau");
  assert.deepEqual(all(db, `SELECT ${COT_CU} FROM prc_commission_rule ORDER BY id`), muc0, "từng dòng mức giữ nguyên mọi cột cũ");
  assert.deepEqual(all<{ t: string | null }>(db, "SELECT DISTINCT target_tier_code AS t FROM prc_commission_rule").map((r) => r.t), [null], "dòng cũ không mang đích mức");
  assert.deepEqual(all(db, "SELECT * FROM ord_service_terms ORDER BY id"), chup0, "bản chụp nguyên vẹn");
  assert.equal(one<{ n: number }>(db, "SELECT count(*) AS n FROM ord_service_terms t WHERE NOT EXISTS (SELECT 1 FROM prc_commission_rule r WHERE r.id = t.commission_rule_id)").n, 0,
    "mọi commission_rule_id còn trỏ dòng tồn tại");
  assert.deepEqual(fkCheck(db), [], "foreign_key_check sau khi dựng");
  assert.equal(one<{ integrity_check: string }>(db, "PRAGMA integrity_check").integrity_check, "ok");
  assert.equal(one<{ foreign_keys: number }>(db, "PRAGMA foreign_keys").foreign_keys, 1);
  assert.equal(one<{ defer_foreign_keys: number }>(db, "PRAGMA defer_foreign_keys").defer_foreign_keys, 0, "hoãn kiểm khoá ngoại tự hết sau COMMIT");
});

test("N-15 hoàn tác: câu cuối hỏng ⇒ cả tệp hoàn tác — lược đồ, dữ liệu, khoá ngoại y như trước (SQLite; bằng chứng D1 local ở Bước 0 bậc b)", () => {
  const db = dungTruoc();
  const truoc = master(db);
  const ten = bang(truoc);
  const dem0 = demMoiBang(db, ten);
  const muc0 = all(db, `SELECT ${COT_CU} FROM prc_commission_rule ORDER BY id`);
  loi(() => apDungLai(db, sqlDungLai() + "\nINSERT INTO bang_khong_ton_tai VALUES (1);\n"), /no such table: bang_khong_ton_tai/);
  assert.equal(db.isTransaction, false);
  assert.deepEqual([...master(db)], [...truoc], "sqlite_master giống hệt trước");
  assert.deepEqual(demMoiBang(db, ten), dem0);
  assert.deepEqual(all(db, `SELECT ${COT_CU} FROM prc_commission_rule ORDER BY id`), muc0);
  assert.deepEqual(fkCheck(db), []);
  // Bảng cũ vẫn đủ trigger: thử xoá và chồng ngày vẫn bị chặn.
  loi(() => run(db, "DELETE FROM prc_commission_rule WHERE id = 'm-hs'"), "prc_append_only:");
  loi(() => run(db, `INSERT INTO prc_commission_rule (${COT_CU}) VALUES ('z', 'pty-dl', NULL, 'ALL', NULL, NULL, 'RATE', 1, NULL, '2026-05-01', NULL, NULL, ?, NULL, ?, NULL)`, AT, AT), "prc_overlap:");
});

test("N-15 hai đích cũ giữ nghĩa cũ: chặn xoá; close_only; chồng ngày theo hồ sơ / theo vai; đối tượng phải được hưởng; bản chụp AUTO khớp dòng mức — mỗi trigger một ca đỏ, một ca xanh", () => {
  const db = moi();
  // no_delete
  loi(() => run(db, "DELETE FROM prc_commission_rule WHERE id = 'm-vai'"), "prc_append_only:");
  // close_only: sửa số / đích ⇒ đỏ; đóng thường ⇒ xanh; đóng lần hai, mở lại ⇒ đỏ
  loi(() => run(db, "UPDATE prc_commission_rule SET rate_bp = 2000 WHERE id = 'm-vai'"), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-12-31', target_party_id = 'pty-dl', target_role_code = NULL WHERE id = 'm-vai'"), "prc_append_only:");
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-12-31', updated_at = ?, updated_by = 'kt2' WHERE id = 'm-vai'", AT);
  loi(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-11-30' WHERE id = 'm-vai'"), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = NULL WHERE id = 'm-vai'"), "prc_append_only:");
  // overlap theo hồ sơ
  loi(() => ruleMoi(db, { party: "pty-dl", from: "2026-06-01" }), "prc_overlap:");
  ruleMoi(db, { party: "pty-dl", scope: "SERVICE", from: "2026-06-01" }); // khác phạm vi: xanh
  // overlap theo vai
  loi(() => ruleMoi(db, { role: "TRAVEL_AGENCY", from: "2026-12-31" }), "prc_overlap:"); // chạm đúng ngày cuối của dòng đã đóng
  ruleMoi(db, { role: "TRAVEL_AGENCY", from: "2027-01-01" }); // nối tiếp: xanh
  ruleMoi(db, { role: "GUIDE_FREELANCE", scope: "SERVICE", from: "2026-01-01" }); // m-dv đã hết hạn 2025-12-31: xanh
  // target_party
  loi(() => ruleMoi(db, { party: "pty-kh" }), "prc_target_not_beneficiary:");
  ruleMoi(db, { party: "pty-hdv" });
  // target_role
  loi(() => ruleMoi(db, { role: "CUSTOMER" }), "prc_role_not_beneficiary:");
  loi(() => ruleMoi(db, { role: "COLLABORATOR" }), "prc_role_not_beneficiary:"); // vai đã tắt
  ruleMoi(db, { role: "HOTEL_RECEPTION" });
  // CHECK: đúng một trong ba đích
  loi(() => ruleMoi(db, { party: "pty-hdv", role: "TAXI_DRIVER" }), /CHECK constraint failed/);
  loi(() => ruleMoi(db, {}), /CHECK constraint failed/);
  // ord_service_terms_rule_valid (đọc view dựng lại)
  loi(() => chup(db, { id: "t2", rule: "m-hs", bp: 999, sup: "t1" }), "terms_rule_stale:");
  loi(() => chup(db, { id: "t2", rule: "m-hs", bp: 1000, sup: "t1", date: "2025-06-01" }), "terms_rule_stale:"); // trước ngày hiệu lực
  chup(db, { id: "t2", rule: "m-hs", bp: 1000, sup: "t1" });
  // Bản chụp vẫn chỉ-thêm.
  loi(() => run(db, "UPDATE ord_service_terms SET reason = 'x' WHERE id = 't1'"), "terms_append_only:");
  assert.deepEqual(fkCheck(db), []);
});

test("N-15 đích mức: chèn được; HAI mức khác nhau cùng có dòng «mọi dịch vụ» được; cùng mức cùng phạm vi chồng ngày ⇒ prc_overlap; mức với vai cùng ALL không đụng nhau", () => {
  const db = moi();
  tier(db, "TA1");
  tier(db, "TA2");
  const a = ruleMoi(db, { tier: "TA1", from: "2026-01-01" });
  ruleMoi(db, { tier: "TA2", from: "2026-01-01" }); // trigger chồng ngày cũ (khoá chỉ hồ sơ + vai) chặn nhầm ca này
  ruleMoi(db, { tier: "TA1", scope: "SERVICE", from: "2026-01-01" }); // cùng mức, khác phạm vi
  ruleMoi(db, { tier: "TA1", scope: "GROUP", from: "2026-01-01" });
  loi(() => ruleMoi(db, { tier: "TA1", from: "2026-05-01" }), "prc_overlap:");
  loi(() => ruleMoi(db, { tier: "TA1", scope: "SERVICE", from: "2026-05-01" }), "prc_overlap:");
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-06-30', updated_at = ? WHERE id = ?", AT, a);
  ruleMoi(db, { tier: "TA1", from: "2026-07-01" }); // nối tiếp sau khi đóng
  // m-vai (TRAVEL_AGENCY ALL từ 2026-01-01, mở) không chặn dòng mức ALL và ngược lại.
  assert.equal(one<{ n: number }>(db, "SELECT count(*) AS n FROM prc_commission_rule WHERE target_tier_code IS NOT NULL").n, 5);
  // Bản chụp AUTO trỏ dòng đích mức: rule_valid đọc view mới, cho qua khi khớp số, chặn khi lệch.
  loi(() => chup(db, { id: "t3", rule: a, bp: 301, sup: "t1", date: "2026-03-01" }), "terms_rule_stale:");
  chup(db, { id: "t3", rule: a, bp: 300, sup: "t1", date: "2026-03-01" });
  assert.deepEqual(fkCheck(db), []);
});

test("N-15 đích mức: close_only chặn sửa số / đích, KỂ CẢ khi chỉ đổi target_tier_code; chặn xoá; đóng thường thì xanh", () => {
  const db = moi();
  tier(db, "TA1");
  tier(db, "TA2");
  const a = ruleMoi(db, { tier: "TA1", from: "2026-01-01" });
  loi(() => run(db, "UPDATE prc_commission_rule SET target_tier_code = 'TA2' WHERE id = ?", a), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-12-31', target_tier_code = 'TA2' WHERE id = ?", a), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-12-31', target_tier_code = NULL, target_role_code = 'TRAVEL_AGENCY' WHERE id = ?", a), "prc_append_only:");
  loi(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-12-31', rate_bp = 1 WHERE id = ?", a), "prc_append_only:");
  loi(() => run(db, "DELETE FROM prc_commission_rule WHERE id = ?", a), "prc_append_only:");
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-12-31', updated_at = ?, updated_by = 'kt2' WHERE id = ?", AT, a);
  assert.equal(one<{ target_tier_code: string }>(db, "SELECT target_tier_code FROM prc_commission_rule WHERE id = ?", a).target_tier_code, "TA1");
});

test("N-15 đích mức: mức không tồn tại hoặc đã tắt ⇒ prc_tier_inactive; bật lại thì xanh; tắt mức không làm hỏng dòng đang có; CHECK đúng một đích", () => {
  const db = moi();
  tier(db, "TA1");
  tier(db, "TA3", 0);
  loi(() => ruleMoi(db, { tier: "KHONG_CO" }), "prc_tier_inactive:");
  loi(() => ruleMoi(db, { tier: "TA3" }), "prc_tier_inactive:");
  run(db, "UPDATE prc_rate_tier SET active = 1 WHERE code = 'TA3'");
  const b = ruleMoi(db, { tier: "TA3" });
  run(db, "UPDATE prc_rate_tier SET active = 0 WHERE code = 'TA3'");
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2027-12-31', updated_at = ? WHERE id = ?", AT, b); // vẫn đóng được
  loi(() => ruleMoi(db, { tier: "TA1", party: "pty-dl" }), /CHECK constraint failed/);
  loi(() => ruleMoi(db, { tier: "TA1", role: "TRAVEL_AGENCY" }), /CHECK constraint failed/);
  loi(() => run(db, `INSERT INTO prc_commission_rule (id, target_tier_code, scope, kind, rate_bp, valid_from_date, created_at, updated_at) VALUES ('c1', 'TA1', 'SERVICE', 'RATE', 1, '2030-01-01', ?, ?)`, AT, AT), /CHECK constraint failed/);
  loi(() => run(db, `INSERT INTO prc_commission_rule (id, target_tier_code, scope, kind, rate_bp, per_pax_amount, valid_from_date, created_at, updated_at) VALUES ('c2', 'TA1', 'ALL', 'RATE', 1, 1, '2030-01-01', ?, ?)`, AT, AT), /CHECK constraint failed/);
});
