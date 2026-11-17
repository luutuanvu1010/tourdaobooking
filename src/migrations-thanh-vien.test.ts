// Kiểm phần Task 16 của migration *_to_chuc_thanh_vien.sql (ADR-0213 Đ8 — mốc B2): chế độ thành viên pty_org_member_mode (chỉ thêm, chỉ hồ sơ tổ chức, tập đóng), nháp chờ người quản lý
// ord_member_submit (một dòng mở mỗi đơn, một chiều, đúng một lần, lý do chỉ khi trả lại, không xoá), view tin đích danh v_aud_order_notice_direct (đúng tập hành động, chỉ target 'staff').
// Dựng schema THẬT từ migrations/*.sql bằng node:sqlite, chèn thẳng SQL (chặn nằm ở CSDL). Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { HANH_DONG_TIN_DICH_DANH, HANH_DONG_TIN_DON } from "./shared/thong-bao.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));

const AT = "2026-11-17T01:00:00.000Z";
db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('org', 'ORGANIZATION', 'Tổ chức', 1, ?, ?)").run(AT, AT);
db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('nguoi', 'PERSON', 'Người', 1, ?, ?)").run(AT, AT);
const run = (sql: string, ...p: (string | null)[]) => db.prepare(sql).run(...p);

test("pty_org_member_mode: chỉ hồ sơ tổ chức; tập đóng; chỉ thêm dòng (sửa / xoá ⇒ RAISE)", () => {
  run("INSERT INTO pty_org_member_mode (id, org_party_id, mode, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('m1', 'org', 'CHI_SOAN', ?, ?, 'tk', ?, 'tk')", AT, AT, AT);
  assert.throws(() => run("INSERT INTO pty_org_member_mode (id, org_party_id, mode, valid_from_at, created_at, updated_at) VALUES ('m2', 'nguoi', 'CHI_SOAN', ?, ?, ?)", AT, AT, AT), /pty_org_member_mode_org/);
  assert.throws(() => run("INSERT INTO pty_org_member_mode (id, org_party_id, mode, valid_from_at, created_at, updated_at) VALUES ('m3', 'org', 'KHAC', '2026-11-17T02:00:00.000Z', ?, ?)", AT, AT), /CHECK constraint failed/);
  assert.throws(() => run("UPDATE pty_org_member_mode SET mode = 'SOAN_VA_GUI'"), /pty_org_member_mode_append_only/);
  assert.throws(() => run("DELETE FROM pty_org_member_mode"), /pty_org_member_mode_append_only/);
});

function don(id: string): void {
  db.exec("PRAGMA foreign_keys = OFF");
  run(`INSERT INTO orders (id, order_code, staff_id, customer_name, customer_phone, status, subtotal, total, created_at, updated_at) VALUES (?, ?, 'tv', 'K', '0912345678', 'draft', 0, 0, ?, ?)`, id, `TD-${id}`, AT, AT);
  db.exec("PRAGMA foreign_keys = ON");
}
const mo = (id: string, order: string) =>
  run("INSERT INTO ord_member_submit (id, order_id, member_staff_id, org_party_id, status, opened_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'tv', 'org', 'MO', ?, ?, 'tv', ?, 'tv')", id, order, AT, AT, AT);

test("ord_member_submit: sinh ra ở MỞ; một dòng MỞ mỗi đơn; đóng một chiều đúng một lần; lý do chỉ khi trả lại; cột gốc cố định; không xoá", () => {
  don("d1");
  assert.throws(() => run("INSERT INTO ord_member_submit (id, order_id, member_staff_id, org_party_id, status, opened_at, created_at, updated_at) VALUES ('x', 'd1', 'tv', 'org', 'DA_RUT', ?, ?, ?)", AT, AT, AT), /ord_member_submit_insert_open/);
  mo("s1", "d1");
  assert.throws(() => mo("s2", "d1"), /UNIQUE constraint failed: ord_member_submit\.order_id/);
  assert.throws(() => run("UPDATE ord_member_submit SET status = 'TRA_LAI', closed_at = ?, closed_by = 'ql' WHERE id = 's1'", AT), /ord_member_submit_shape/, "trả lại phải có lý do");
  assert.throws(() => run("UPDATE ord_member_submit SET status = 'DA_RUT', reason_code = 'KHAC', closed_at = ?, closed_by = 'tv' WHERE id = 's1'", AT), /ord_member_submit_shape/, "lý do chỉ khi trả lại");
  assert.throws(() => run("UPDATE ord_member_submit SET status = 'DA_RUT' WHERE id = 's1'"), /ord_member_submit_shape/, "đóng phải có giờ và người");
  assert.throws(() => run("UPDATE ord_member_submit SET member_staff_id = 'khac' WHERE id = 's1'"), /ord_member_submit_fixed/);
  run("UPDATE ord_member_submit SET status = 'TRA_LAI', reason_code = 'SAI_NGAY', closed_at = ?, closed_by = 'ql', updated_at = ?, updated_by = 'ql' WHERE id = 's1'", AT, AT);
  assert.throws(() => run("UPDATE ord_member_submit SET status = 'DA_GUI_LEN', reason_code = NULL WHERE id = 's1'"), /ord_member_submit_transition/, "đã đóng không đổi lại");
  assert.throws(() => run("UPDATE ord_member_submit SET status = 'MO', reason_code = NULL, closed_at = NULL, closed_by = NULL WHERE id = 's1'"), /ord_member_submit_transition|ord_member_submit_shape/);
  mo("s3", "d1"); // dòng cũ đã đóng ⇒ mở lại được
  assert.throws(() => run("DELETE FROM ord_member_submit WHERE id = 's3'"), /ord_member_submit_no_delete/);
  assert.throws(() => run("INSERT INTO ord_member_submit (id, order_id, member_staff_id, org_party_id, status, opened_at, created_at, updated_at) VALUES ('s4', 'khong-co', 'tv', 'org', 'MO', ?, ?, ?)", AT, AT, AT), /FOREIGN KEY/);
});

test("v_aud_order_notice_direct: đúng tập HANH_DONG_TIN_DICH_DANH, chỉ đích 'staff', có order_id; tách khỏi v_aud_order_event (không đổi view cũ)", () => {
  const sql = (db.prepare("SELECT sql FROM sqlite_master WHERE name = 'v_aud_order_notice_direct'").get() as { sql: string }).sql;
  const tap = [...sql.matchAll(/'(order_member_[a-z_]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(tap, [...HANH_DONG_TIN_DICH_DANH].sort());
  assert.match(sql, /target_type = 'staff'/);
  for (const a of HANH_DONG_TIN_DICH_DANH) assert.ok(!(HANH_DONG_TIN_DON as readonly string[]).includes(a), `${a} không vào v_aud_order_event`);
  for (const [id, loai, dich] of [["a1", "staff", "ql"], ["a2", "order", "d1"]] as const) {
    run("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, created_at) VALUES (?, 'd1', NULL, 'order_member_submitted', ?, ?, ?)", id, loai, dich, AT);
  }
  assert.deepEqual(db.prepare("SELECT id, target_id FROM v_aud_order_notice_direct").all().map((r) => ({ ...r })), [{ id: "a1", target_id: "ql" }]);
});
