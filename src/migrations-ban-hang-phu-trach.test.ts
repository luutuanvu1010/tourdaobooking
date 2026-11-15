// Kiểm migration BÁN HÀNG PHỤ TRÁCH (ADR-0142; kế hoạch 2026-10-27-ban-hang-phu-trach-don Task 2): `dsp_sales_owner` (ô riêng, một dòng mở mỗi đơn, khép một lần),
// `dsp_sales_invite` (lời mời, tập kết quả đóng, khép một lần), `dsp_sales_policy` (chính sách giờ hành chính, chỉ thêm, gieo `gieo-ban-hang`),
// ba view `v_dsp_sales_*`, view `v_aud_order_ban_hang` (module audit) và cột `orders.sales_invitee_party_id`.
// Chèn/sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên — đổi số migration lúc gộp chỉ phải đổi tên tệp (CHANGE-GUIDE công thức d).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { HANH_DONG_GAC_BAN_HANG } from "./shared/ban-hang-phu-trach.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ban_hang_phu_trach.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-11-05T03:00:00.000Z";
const AT2 = "2026-11-05T04:00:00.000Z";

function db(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  for (const [p, s, ten] of [["pty-s1", "s1", "Nhân Viên Một"], ["pty-s2", "s2", "Nhân Viên Hai"]] as const) {
    d.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${p}', 'PERSON', '${ten}', 1, '${AT}', '${AT}')`);
    d.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${p}', '${ten}', '${AT}', '${AT}')`);
    d.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${s}', '', '09000000${s === "s1" ? "01" : "02"}', 'x', 'sales', 1, '${AT}', '${p}')`);
  }
  for (const id of ["o1", "o2", "o3"]) {
    d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('${id}', 'TD-${id}', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  }
  return d;
}
let n = 0;
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));
const cot = (d: DatabaseSync, view: string) => (d.prepare(`SELECT name FROM pragma_table_info('${view}')`).all() as { name: string }[]).map((r) => r.name);
const moChu = (d: DatabaseSync, orderId: string, party = "pty-s1") =>
  d.prepare(`INSERT INTO dsp_sales_owner (id, order_id, party_id, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 's1', ?, 's1')`)
    .run(`bo-${++n}`, orderId, party, AT, AT, AT);
const khepChu = (d: DatabaseSync, orderId: string) =>
  d.exec(`UPDATE dsp_sales_owner SET valid_to_at = '${AT2}', closed_by = 's2', updated_at = '${AT2}', updated_by = 's2' WHERE order_id = '${orderId}' AND valid_to_at IS NULL`);
const moi = (d: DatabaseSync, orderId: string, party = "pty-s2") =>
  d.prepare(`INSERT INTO dsp_sales_invite (id, order_id, invitee_party_id, invited_by, recorded_at, priority_until_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 's1', ?, ?, ?, 's1', ?, 's1')`)
    .run(`li-${++n}`, orderId, party, AT, AT2, AT, AT);
const khepMoi = (d: DatabaseSync, orderId: string, outcome: string) =>
  d.exec(`UPDATE dsp_sales_invite SET closed_at = '${AT2}', closed_by = 's2', outcome = '${outcome}', updated_at = '${AT2}', updated_by = 's2' WHERE order_id = '${orderId}' AND closed_at IS NULL`);

test("đúng MỘT tệp `*_ban_hang_phu_trach.sql`, sau 0137; không dựng lại bảng (chỉ DROP TRIGGER orders_delivered_lock để dựng lại đủ cột)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0137", FILE);
  const ma = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(ma, /DROP TABLE|_new\b|DROP VIEW|DROP INDEX/i);
  assert.deepEqual([...ma.matchAll(/DROP TRIGGER\s+(\w+)/gi)].map((m) => m[1]), ["orders_delivered_lock"]);
});

test("dsp_sales_owner: hai dòng MỞ cùng một đơn bị chỉ mục duy nhất chặn; đơn khác được; khép rồi mở dòng mới cho cùng đơn được", () => {
  const d = db();
  moChu(d, "o1");
  assert.throws(() => moChu(d, "o1", "pty-s2"), /UNIQUE constraint failed: dsp_sales_owner\.order_id/);
  moChu(d, "o2");
  khepChu(d, "o1");
  moChu(d, "o1", "pty-s2");
  assert.equal(rows(d, "SELECT 1 FROM dsp_sales_owner WHERE order_id = 'o1'").length, 2);
});

test("dsp_sales_owner: khép đúng một lần; DELETE bị chặn; không sửa trường gốc", () => {
  const d = db();
  moChu(d, "o1");
  assert.throws(() => d.exec(`UPDATE dsp_sales_owner SET party_id = 'pty-s2' WHERE order_id = 'o1'`), /dsp_sales_owner/);
  assert.throws(() => d.exec(`UPDATE dsp_sales_owner SET order_id = 'o2' WHERE order_id = 'o1'`), /dsp_sales_owner/);
  assert.throws(() => d.exec(`UPDATE dsp_sales_owner SET updated_at = '${AT2}' WHERE order_id = 'o1'`), /dsp_sales_owner/, "UPDATE không đặt valid_to_at không phải là khép");
  khepChu(d, "o1");
  assert.throws(() => d.exec(`UPDATE dsp_sales_owner SET valid_to_at = '2026-12-01T00:00:00.000Z' WHERE order_id = 'o1'`), /dsp_sales_owner/, "khép lần hai");
  assert.throws(() => d.exec(`UPDATE dsp_sales_owner SET closed_by = 's1' WHERE order_id = 'o1'`), /dsp_sales_owner/);
  assert.throws(() => d.exec("DELETE FROM dsp_sales_owner"), /dsp_sales_owner/);
});

test("dsp_sales_owner: valid_to_at không được sớm hơn valid_from_at", () => {
  const d = db();
  moChu(d, "o1");
  assert.throws(() => d.exec(`UPDATE dsp_sales_owner SET valid_to_at = '2026-01-01T00:00:00.000Z' WHERE order_id = 'o1'`));
});

test("dsp_sales_invite: một lời mời MỞ mỗi đơn; khép đúng một lần; DELETE bị chặn; rồi mời lại được", () => {
  const d = db();
  moi(d, "o1");
  assert.throws(() => moi(d, "o1", "pty-s1"), /UNIQUE constraint failed: dsp_sales_invite\.order_id/);
  moi(d, "o2");
  khepMoi(d, "o1", "TU_CHOI");
  assert.throws(() => d.exec(`UPDATE dsp_sales_invite SET outcome = 'NHAN' WHERE order_id = 'o1'`), /dsp_sales_invite/);
  assert.throws(() => d.exec(`UPDATE dsp_sales_invite SET closed_at = '2026-12-01T00:00:00.000Z' WHERE order_id = 'o1'`), /dsp_sales_invite/);
  assert.throws(() => d.exec("DELETE FROM dsp_sales_invite"), /dsp_sales_invite/);
  assert.throws(() => d.exec(`UPDATE dsp_sales_invite SET invitee_party_id = 'pty-s1' WHERE order_id = 'o2'`), /dsp_sales_invite/, "không sửa người được mời của lời mời mở");
  moi(d, "o1", "pty-s1");
  assert.equal(rows(d, "SELECT 1 FROM dsp_sales_invite WHERE order_id = 'o1'").length, 2);
});

test("dsp_sales_invite: outcome là tập đóng (CHECK); ba cột khép cùng NULL hoặc cùng có", () => {
  const d = db();
  moi(d, "o1");
  assert.throws(() => khepMoi(d, "o1", "LA"), /CHECK/);
  assert.throws(() => d.exec(`UPDATE dsp_sales_invite SET closed_at = '${AT2}' WHERE order_id = 'o1'`));
  assert.throws(() => d.exec(`UPDATE dsp_sales_invite SET closed_at = '${AT2}', closed_by = 's2' WHERE order_id = 'o1'`));
  assert.throws(() => d.exec(`UPDATE dsp_sales_invite SET closed_at = '${AT2}', outcome = 'NHAN' WHERE order_id = 'o1'`));
  for (const kq of ["NHAN", "TU_CHOI", "NGUOI_KHAC", "HUY_DON", "RUT_LAI"]) {
    const o = db();
    moi(o, "o1");
    khepMoi(o, "o1", kq);
    assert.equal(rows(o, "SELECT outcome FROM dsp_sales_invite")[0]!.outcome, kq);
  }
  // chèn thẳng dòng đã khép nửa vời cũng bị chặn
  assert.throws(() => d.exec(`INSERT INTO dsp_sales_invite (id, order_id, invitee_party_id, invited_by, recorded_at, priority_until_at, closed_at, created_at, updated_at) VALUES ('x', 'o3', 'pty-s2', 's1', '${AT}', '${AT2}', '${AT2}', '${AT}', '${AT}')`));
});

test("dsp_sales_policy: dòng gieo `gieo-ban-hang` đúng 15 / 420 / 1020; valid_from_at = created_at", () => {
  const r = rows(db(), "SELECT * FROM dsp_sales_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.id, "gieo-ban-hang");
  assert.deepEqual([r[0]!.priority_minutes, r[0]!.work_start_minute, r[0]!.work_end_minute], [15, 420, 1020]);
  assert.equal(r[0]!.valid_from_at, r[0]!.created_at);
  assert.match(String(r[0]!.created_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("dsp_sales_policy chỉ thêm: UPDATE / DELETE bị chặn; CHECK 1–120 và 0 ≤ bắt đầu < kết thúc ≤ 1440; valid_from_at duy nhất", () => {
  const d = db();
  assert.throws(() => d.exec("UPDATE dsp_sales_policy SET priority_minutes = 30"), /dsp_sales_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM dsp_sales_policy"), /dsp_sales_policy_append_only/);
  const ins = (pm: number, tu: number, den: number, at: string) =>
    d.prepare(`INSERT INTO dsp_sales_policy (id, valid_from_at, priority_minutes, work_start_minute, work_end_minute, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, 's1', ?, 's1')`).run(`cs-${++n}`, at, pm, tu, den, AT, AT);
  assert.throws(() => ins(0, 420, 1020, "2999-01-01T00:00:00.000Z"));
  assert.throws(() => ins(121, 420, 1020, "2999-01-01T00:00:00.000Z"));
  assert.throws(() => ins(15, -1, 1020, "2999-01-01T00:00:00.000Z"));
  assert.throws(() => ins(15, 600, 600, "2999-01-01T00:00:00.000Z"));
  assert.throws(() => ins(15, 420, 1441, "2999-01-01T00:00:00.000Z"));
  ins(120, 0, 1440, "2999-01-01T00:00:00.000Z");
  assert.throws(() => ins(15, 420, 1020, "2999-01-01T00:00:00.000Z"), /UNIQUE/);
});

test("v_dsp_sales_policy_current: lấy dòng valid_from_at lớn nhất; thêm dòng mới KHÔNG đổi release_cutoff_at", () => {
  const d = db();
  const truoc = rows(d, "SELECT * FROM v_dsp_sales_policy_current");
  assert.equal(truoc.length, 1);
  assert.deepEqual(cot(d, "v_dsp_sales_policy_current"), ["priority_minutes", "work_start_minute", "work_end_minute", "release_cutoff_at"]);
  assert.equal(truoc[0]!.release_cutoff_at, rows(d, "SELECT created_at FROM dsp_sales_policy WHERE id = 'gieo-ban-hang'")[0]!.created_at);
  d.exec(`INSERT INTO dsp_sales_policy (id, valid_from_at, priority_minutes, work_start_minute, work_end_minute, created_at, created_by, updated_at, updated_by) VALUES ('cs-moi', '2999-01-01T00:00:00.000Z', 30, 480, 1080, '2999-01-01T00:00:00.000Z', 's1', '2999-01-01T00:00:00.000Z', 's1')`);
  const sau = rows(d, "SELECT * FROM v_dsp_sales_policy_current");
  assert.equal(sau.length, 1);
  assert.deepEqual([sau[0]!.priority_minutes, sau[0]!.work_start_minute, sau[0]!.work_end_minute], [30, 480, 1080]);
  assert.equal(sau[0]!.release_cutoff_at, truoc[0]!.release_cutoff_at);
});

test("v_dsp_sales_owner / v_dsp_sales_invite_open: đúng cột; chỉ dòng mở; có tên hồ sơ và staff_id", () => {
  const d = db();
  assert.deepEqual(cot(d, "v_dsp_sales_owner"), ["order_id", "staff_id", "party_id", "name"]);
  assert.deepEqual(cot(d, "v_dsp_sales_invite_open"), ["order_id", "staff_id", "party_id", "name", "recorded_at", "priority_until_at"]);
  moChu(d, "o1");
  moChu(d, "o2");
  khepChu(d, "o2");
  assert.deepEqual(rows(d, "SELECT * FROM v_dsp_sales_owner"), [{ order_id: "o1", staff_id: "s1", party_id: "pty-s1", name: "Nhân Viên Một" }]);
  moi(d, "o1");
  moi(d, "o2");
  khepMoi(d, "o2", "NHAN");
  assert.deepEqual(rows(d, "SELECT * FROM v_dsp_sales_invite_open"), [{ order_id: "o1", staff_id: "s2", party_id: "pty-s2", name: "Nhân Viên Hai", recorded_at: AT, priority_until_at: AT2 }]);
});

test("v_aud_order_ban_hang: đúng 2 cột (id, order_id); IN (…) = ĐÚNG HANH_DONG_GAC_BAN_HANG (so tập); dòng không đơn / hành động ngoài tập không lọt", () => {
  const d = db();
  assert.deepEqual(cot(d, "v_aud_order_ban_hang"), ["id", "order_id"]);
  const sql = sqlOf(FILE).replace(/--.*$/gm, "");
  const m = /CREATE VIEW v_aud_order_ban_hang[\s\S]*?\baction\s+IN\s*\(([^)]*)\)/i.exec(sql);
  assert.ok(m, "không thấy CREATE VIEW v_aud_order_ban_hang … action IN (…)");
  assert.deepEqual([...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort(), [...HANH_DONG_GAC_BAN_HANG].sort());
  const ghi = (id: string, action: string, orderId: string | null) =>
    d.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 's1', ?, 'order', 'o1', 'x', ?)").run(id, orderId, action, AT);
  for (const [i, a] of HANH_DONG_GAC_BAN_HANG.entries()) ghi(`g${i}`, a, "o1");
  ghi("x1", "order_money_adjusted", "o1");
  ghi("x2", "confirmed", null);
  assert.deepEqual(rows(d, "SELECT id FROM v_aud_order_ban_hang ORDER BY id").map((r) => r.id), HANH_DONG_GAC_BAN_HANG.map((_, i) => `g${i}`));
});

test("orders.sales_invitee_party_id: cột TEXT NULL; ghi được lên đơn nháp", () => {
  const d = db();
  const c = rows(d, "SELECT type, \"notnull\" AS nn, dflt_value FROM pragma_table_info('orders') WHERE name = 'sales_invitee_party_id'");
  assert.equal(c.length, 1);
  assert.equal(c[0]!.type, "TEXT");
  assert.equal(c[0]!.nn, 0);
  d.exec(`UPDATE orders SET sales_invitee_party_id = 'pty-s2', updated_at = '${AT2}' WHERE id = 'o1'`);
  assert.equal(rows(d, "SELECT sales_invitee_party_id AS v FROM orders WHERE id = 'o1'")[0]!.v, "pty-s2");
});

test("khoá Đã giao: dsp_sales_owner không nhận dòng mới, không khép; orders.sales_invitee_party_id không đổi được sau Đã giao", () => {
  const d = db();
  moChu(d, "o1");
  for (const id of ["o1", "o3"]) d.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('${id}-svc', '${id}', 'Tour', 'perPax', 1, '2026-11-10')`);
  d.exec(`UPDATE orders SET status = 'confirmed', confirmed_at = '${AT}', updated_at = '${AT}' WHERE id IN ('o1', 'o3')`);
  d.exec(`UPDATE orders SET delivered_at = '${AT}', delivered_by = 's1', updated_at = '${AT}' WHERE id = 'o3'`);
  assert.throws(() => moChu(d, "o3"), /order_delivered/);
  d.exec(`UPDATE orders SET delivered_at = '${AT}', delivered_by = 's1', updated_at = '${AT}' WHERE id = 'o1'`);
  assert.throws(() => khepChu(d, "o1"), /order_delivered/);
  assert.throws(() => d.exec(`UPDATE orders SET sales_invitee_party_id = 'pty-s2' WHERE id = 'o3'`), /order_delivered/);
});
