// Kiểm migration CHỐT GIỜ VÀ ẨN THÔNG TIN KHÁCH (ADR-0154 Đ1.2, Đ2.1, Đ3.1; kế hoạch 2026-11-02-dat-ve-doi-tac-luot-2 Task 1.1): cột `ord_confirm_request.pickup_time_required`,
// cột `orders.manifest_exempt` (cả hai chụp một lần, không đổi sau khi chèn), bảng `ord_partner_customer_policy` (chỉ-thêm, gieo TẮT). SQLite thật (node:sqlite).
// Tệp tìm theo ĐUÔI tên — đổi số migration lúc gộp chỉ phải đổi tên tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_chot_gio_va_an_thong_tin_khach.sql"));
const FILE = MATCHES[0] ?? "";
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const AT = "2026-11-02T03:00:00.000Z";

function open(list: string[] = files): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of list) d.exec(sqlOf(f));
  return d;
}
const truoc = () => files.filter((f) => f < FILE);
function gieoDon(d: DatabaseSync, id: string) {
  d.exec(`INSERT OR IGNORE INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  d.exec(`INSERT OR IGNORE INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  d.exec(`INSERT OR IGNORE INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('${id}', 'TD-${id}', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
}
const yeuCau = (d: DatabaseSync, id: string, orderId: string) =>
  d.prepare(`INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at) VALUES (?, ?, ?, 's1', ?, ?, ?)`).run(id, orderId, AT, AT, AT, AT);
type Row = Record<string, unknown>;
const rows = (d: DatabaseSync, sql: string): Row[] => d.prepare(sql).all().map((r) => ({ ...(r as Row) }));

test("đúng MỘT tệp `*_chot_gio_va_an_thong_tin_khach.sql`, sau 0132; chỉ-thêm (không dựng lại bảng; trigger cũ chỉ tạo lại khoá Đã giao)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${JSON.stringify(MATCHES)}`);
  assert.ok(FILE > "0132", FILE);
  const khongChuThich = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(khongChuThich, /DROP TABLE|_new\b/i);
  // Trigger cũ: chỉ MỘT cái được tạo lại — khoá «Đã giao» của orders (bài NT-R6 bắt buộc mọi cột của orders có mặt ở đó).
  assert.deepEqual([...khongChuThich.matchAll(/DROP TRIGGER\s+(\w+)/gi)].map((m) => m[1]), ["orders_delivered_lock"]);
});

test("(a) đơn và yêu cầu có TRƯỚC khi áp migration mang giá trị 0 sau khi áp", () => {
  const d = open(truoc());
  gieoDon(d, "o1");
  yeuCau(d, "yc1", "o1");
  d.exec(sqlOf(FILE));
  assert.deepEqual(rows(d, "SELECT manifest_exempt FROM orders WHERE id = 'o1'"), [{ manifest_exempt: 0 }]);
  assert.deepEqual(rows(d, "SELECT pickup_time_required FROM ord_confirm_request WHERE id = 'yc1'"), [{ pickup_time_required: 0 }]);
});

test("(a2) hai cột mới chỉ nhận 0 hoặc 1 (CHECK), không nhận NULL (NOT NULL)", () => {
  const d = open();
  gieoDon(d, "o1");
  const donVoi = (v: string) => `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at, manifest_exempt) VALUES ('ox', 'TD-ox', 's1', 'draft', 'K', '0900000009', 'a', 'a', ${v})`;
  assert.throws(() => d.exec(donVoi("2")), /CHECK/);
  assert.throws(() => d.exec(donVoi("NULL")), /NOT NULL/);
  yeuCau(d, "yc1", "o1");
  assert.throws(() => d.exec("INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at, pickup_time_required) VALUES ('yc2', 'o1', 'a', 's1', 'a', 'a', 'a', 7)"), /CHECK/);
});

test("(b) hai cột không đổi được sau khi chèn; UPDATE cột khác của cùng dòng vẫn được", () => {
  const d = open();
  gieoDon(d, "o1");
  d.exec("INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at, pickup_time_required) VALUES ('yc1', 'o1', 'a', 's1', 'a', 'a', 'a', 1)");
  assert.throws(() => d.exec("UPDATE ord_confirm_request SET pickup_time_required = 0 WHERE id = 'yc1'"), /ord_confirm_request_immutable/);
  // cột khác của cùng dòng: khép yêu cầu như hôm nay vẫn chạy, cờ giữ nguyên
  d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1', outcome = 'XAC_NHAN', ticket = 'CON_VE', updated_at = '${AT}' WHERE id = 'yc1'`);
  assert.deepEqual(rows(d, "SELECT pickup_time_required FROM ord_confirm_request WHERE id = 'yc1'"), [{ pickup_time_required: 1 }]);

  d.exec("UPDATE orders SET manifest_exempt = 0 WHERE id = 'o1'"); // ghi lại đúng giá trị cũ không phải là đổi
  d.exec("INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at, manifest_exempt) VALUES ('o2', 'TD-o2', 's1', 'draft', 'K', '0900000009', 'a', 'a', 1)");
  assert.throws(() => d.exec("UPDATE orders SET manifest_exempt = 0 WHERE id = 'o2'"), /orders_manifest_exempt_immutable/);
  assert.throws(() => d.exec("UPDATE orders SET manifest_exempt = 1 WHERE id = 'o1'"), /orders_manifest_exempt_immutable/);
  d.exec("UPDATE orders SET customer_note = 'ghi chú', updated_at = 'b' WHERE id = 'o2'");
  assert.deepEqual(rows(d, "SELECT manifest_exempt FROM orders WHERE id = 'o2'"), [{ manifest_exempt: 1 }]);
});

test("(c) bảng chính sách chỉ thêm, gieo TẮT: đúng một dòng hide_customer_info = 0; UPDATE, DELETE ném ord_policy_append_only", () => {
  const d = open();
  const r = rows(d, "SELECT hide_customer_info, valid_from_at FROM ord_partner_customer_policy");
  assert.equal(r.length, 1);
  assert.equal(r[0]!.hide_customer_info, 0);
  assert.match(String(r[0]!.valid_from_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "dấu thời gian ISO UTC");
  assert.throws(() => d.exec("UPDATE ord_partner_customer_policy SET hide_customer_info = 1"), /ord_policy_append_only/);
  assert.throws(() => d.exec("DELETE FROM ord_partner_customer_policy"), /ord_policy_append_only/);
});

test("(c2) bảng chính sách: chèn dòng mới được; giá trị chỉ 0/1; valid_from_at duy nhất", () => {
  const d = open();
  const ins = (v: number, at: string, id: string) =>
    d.prepare(`INSERT INTO ord_partner_customer_policy (id, hide_customer_info, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(id, v, at, AT, AT);
  assert.throws(() => ins(2, "2999-01-01T00:00:00.000Z", "p-x"), /CHECK/);
  ins(1, "2999-01-01T00:00:00.000Z", "p-1");
  assert.throws(() => ins(0, "2999-01-01T00:00:00.000Z", "p-2"), /UNIQUE/);
  assert.equal(rows(d, "SELECT 1 FROM ord_partner_customer_policy").length, 2);
});

test("hai trigger cũ của yêu cầu xác nhận (không xoá, khép rồi đóng băng) còn nguyên sau migration (không đổi hợp đồng đã có)", () => {
  const d = open();
  gieoDon(d, "o1");
  yeuCau(d, "yc1", "o1");
  assert.throws(() => d.exec("DELETE FROM ord_confirm_request WHERE id = 'yc1'"), /ord_confirm_request_no_delete/);
  d.exec(`UPDATE ord_confirm_request SET decided_at = '${AT}', decided_by = 's1', outcome = 'XAC_NHAN', ticket = 'CON_VE', updated_at = '${AT}' WHERE id = 'yc1'`);
  assert.throws(() => d.exec("UPDATE ord_confirm_request SET outcome = 'HUY' WHERE id = 'yc1'"), /ord_confirm_request_closed/);
});
