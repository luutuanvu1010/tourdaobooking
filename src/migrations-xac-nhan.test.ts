// Kiểm migration BƯỚC XÁC NHẬN ĐƠN (ADR-0136 Đ1, Đ2, Đ5; kế hoạch 2026-10-19-xac-nhan-don Task 3.2): `ord_confirm_request` (một yêu cầu mở mỗi đơn,
// khép đúng một lần, không xoá), `ord_service_confirm_flag` (cờ theo dịch vụ / nhóm, chỉ-thêm), `ord_confirm_policy` (công tắc tự xác nhận, chỉ-thêm, gieo 1).
// Chèn/sửa THẲNG bằng SQL: chứng minh chặn nằm ở CSDL. Tệp tìm theo ĐUÔI tên — đổi số migration lúc gộp chỉ phải đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_yeu_cau_xac_nhan.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-10-26T03:00:00.000Z";

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of files) d.exec(sqlOf(f));
  d.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  d.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  for (const id of ["o1", "o2"]) {
    d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('${id}', 'TD-${id}', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  }
  return d;
}
let n = 0;
const yeuCau = (d: DatabaseSync, orderId: string) =>
  d.prepare(
    `INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at) VALUES (?, ?, ?, 's1', ?, ?, ?)`,
  ).run(`yc-${++n}`, orderId, AT, AT, AT, AT);
const co = (d: DatabaseSync, scope: string, code: string, required: number, at: string) =>
  d.prepare(
    `INSERT INTO ord_service_confirm_flag (id, scope, code, required, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(`cf-${++n}`, scope, code, required, at, AT, AT);
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));

test("đúng MỘT tệp `*_yeu_cau_xac_nhan.sql`, sau 0118; chỉ-thêm (không dựng lại bảng, không xoá trigger)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0118", FILE);
  assert.doesNotMatch(sqlOf(FILE), /DROP TABLE|DROP TRIGGER|_new\b/i);
});

test("chính sách tự xác nhận được gieo = 1", () => {
  const r = rows(db(), "SELECT self_confirm_internal FROM ord_confirm_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.self_confirm_internal, 1);
});

test("ord_confirm_policy chỉ thêm: UPDATE / DELETE bị chặn; giá trị chỉ 0/1; valid_from_at duy nhất", () => {
  const d = db();
  assert.throws(() => d.exec("UPDATE ord_confirm_policy SET self_confirm_internal = 0"), /ord_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM ord_confirm_policy"), /ord_policy_append_only/);
  const ins = (v: number, at: string) =>
    d.prepare(`INSERT INTO ord_confirm_policy (id, self_confirm_internal, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(`cp-${++n}`, v, at, AT, AT);
  assert.throws(() => ins(2, "2999-01-01T00:00:00.000Z"));
  ins(0, "2999-01-01T00:00:00.000Z");
  assert.throws(() => ins(1, "2999-01-01T00:00:00.000Z"), /UNIQUE/);
});

test("hai yêu cầu MỞ cùng một đơn: chỉ mục duy nhất chặn; đơn khác thì được", () => {
  const d = db();
  yeuCau(d, "o1");
  assert.throws(() => yeuCau(d, "o1"), /UNIQUE/);
  yeuCau(d, "o2");
});

test("yêu cầu khép đúng một lần: khép được, khép lần hai bị chặn, rồi mở yêu cầu mới cho cùng đơn được", () => {
  const d = db();
  yeuCau(d, "o1");
  const khep = () => d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1', outcome = 'XAC_NHAN', ticket = 'CON_VE', updated_at = '${AT}' WHERE order_id = 'o1' AND decided_at IS NULL`);
  khep();
  // lần hai trên dòng đã khép: UPDATE bất kỳ bị trigger chặn
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET outcome = 'HUY' WHERE order_id = 'o1'`), /ord_confirm_request/);
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET decided_by = 's2' WHERE order_id = 'o1'`), /ord_confirm_request/);
  yeuCau(d, "o1"); // đã khép ⇒ chỉ mục duy nhất theo `decided_at IS NULL` cho phép yêu cầu mới
  assert.equal(rows(d, "SELECT 1 FROM ord_confirm_request WHERE order_id = 'o1'").length, 2);
});

test("khép phải đủ trường: thiếu decided_by / outcome, hoặc ticket sai ngữ nghĩa, bị chặn; RUT_LAI không có ticket", () => {
  const d = db();
  yeuCau(d, "o1");
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}' WHERE order_id = 'o1'`), /ord_confirm_request/);
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1' WHERE order_id = 'o1'`), /ord_confirm_request/);
  // XAC_NHAN thiếu ticket
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1', outcome = 'XAC_NHAN' WHERE order_id = 'o1'`), /ord_confirm_request/);
  // RUT_LAI mà có ticket
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1', outcome = 'RUT_LAI', ticket = 'CON_VE' WHERE order_id = 'o1'`), /ord_confirm_request/);
  d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1', outcome = 'RUT_LAI' WHERE order_id = 'o1'`);
});

test("không sửa trường gốc của yêu cầu mở (đơn, người gửi, hạn) và không xoá yêu cầu", () => {
  const d = db();
  yeuCau(d, "o1");
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET deadline_at = '2999-01-01T00:00:00.000Z' WHERE order_id = 'o1'`), /ord_confirm_request/);
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET order_id = 'o2' WHERE order_id = 'o1'`), /ord_confirm_request/);
  assert.throws(() => d.exec("DELETE FROM ord_confirm_request"), /ord_confirm_request/);
});

test("ghi chú tối đa 300 ký tự; yêu cầu phải trỏ đơn có thật", () => {
  const d = db();
  yeuCau(d, "o1");
  assert.throws(() => d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1', outcome = 'HUY', ticket = 'HUY', note = '${"x".repeat(301)}' WHERE order_id = 'o1'`));
  assert.throws(() => yeuCau(d, "khong-co"), /FOREIGN KEY/);
});

test("cờ: dòng dịch vụ «không cần» và dòng nhóm «cần» cùng tồn tại; chỉ-thêm; (phạm vi, mã, hiệu lực) duy nhất; giá trị 0/1", () => {
  const d = db();
  co(d, "GROUP", "TOUR", 1, "2026-10-26T00:00:00.000Z");
  co(d, "SERVICE", "DV-A", 0, "2026-10-26T00:00:00.000Z");
  assert.equal(rows(d, "SELECT 1 FROM ord_service_confirm_flag").length, 2);
  assert.throws(() => co(d, "SERVICE", "DV-A", 1, "2026-10-26T00:00:00.000Z"), /UNIQUE/);
  co(d, "SERVICE", "DV-A", 1, "2026-10-27T00:00:00.000Z"); // đổi = dòng mới
  assert.throws(() => co(d, "SERVICE", "DV-B", 2, "2026-10-26T00:00:00.000Z"));
  assert.throws(() => d.exec("UPDATE ord_service_confirm_flag SET required = 1"), /ord_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM ord_service_confirm_flag"), /ord_policy_append_only/);
});
