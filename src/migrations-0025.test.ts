// Kiểm migration 0025 — Thông báo hệ thống (ADR-0034): 4 bảng ntf_*, ntf_ack chỉ-thêm, 3 view công bố — trên SQLite thật (node:sqlite).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DIR = join(import.meta.dirname, "..", "migrations");
function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(DIR, f), "utf8"));
  return db;
}
const T = "2026-09-27T01:00:00.000Z";

// R3: node:sqlite bật foreign_keys — audit_log.order_id/staff_id trỏ orders/staff thật thì phải seed sẵn (khuôn seedOrder ở src/migrations-0021.test.ts:10-24).
let staffSeq = 0;
function seedOrder(db: DatabaseSync, id = "o1"): { staffId: string } {
  const staffId = `s${++staffSeq}`;
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('${staffId}', 'NV', '090000000${staffSeq}', 'x', 'sales', '${T}')`);
  db.exec(
    `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
     VALUES ('${id}', 'TD-${id}', '${staffId}', 'confirmed', 'K', '0900000009', '${T}', '${T}')`,
  );
  return { staffId };
}

// dsp_assignment.party_id NOT NULL REFERENCES pty_party(id) — cần một hồ sơ thật (không phải hồ sơ nhân viên).
function seedParty(db: DatabaseSync, id: string): void {
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('${id}', 'PERSON', 'HDV thử', '${T}', '${T}')`);
}

test("0025: có đủ bảng và view", () => {
  const db = moi();
  const ten = (type: string) => (db.prepare(`SELECT name FROM sqlite_master WHERE type = ? ORDER BY name`).all(type) as { name: string }[]).map((r) => r.name);
  for (const t of ["ntf_ack", "ntf_notice", "ntf_notice_target", "ntf_read_mark"]) assert.ok(ten("table").includes(t), t);
  for (const v of ["v_aud_order_event", "v_dsp_first_handler", "v_ord_order_owner"]) assert.ok(ten("view").includes(v), v);
});

test("0025: ntf_ack chỉ-thêm (không sửa, không xoá)", () => {
  const db = moi();
  db.prepare(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by) VALUES ('n1','A','B',1,'r1',?,'vu',?,'vu')`).run(T, T);
  db.prepare(`INSERT INTO ntf_ack (notice_id, staff_id, created_at, created_by, updated_at, updated_by) VALUES ('n1','lan',?,'lan',?,'lan')`).run(T, T);
  assert.throws(() => db.exec(`UPDATE ntf_ack SET staff_id = 'x'`), /append_only/);
  assert.throws(() => db.exec(`DELETE FROM ntf_ack`), /append_only/);
});

test("0025: một client_request_id của cùng người gửi chỉ một tin; người gửi KHÁC cùng client_request_id thì vẫn chèn được", () => {
  const db = moi();
  const insVu = db.prepare(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'A','B',0,'r1',?,'vu',?,'vu')`);
  insVu.run("n1", T, T);
  assert.throws(() => insVu.run("n2", T, T), /UNIQUE/);
  const insLan = db.prepare(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'A','B',0,'r1',?,'lan',?,'lan')`);
  insLan.run("n3", T, T); // khoá chống trùng là CẶP (created_by, client_request_id), không phải chỉ client_request_id
  const dem = (db.prepare(`SELECT COUNT(*) AS c FROM ntf_notice WHERE client_request_id = 'r1'`).get() as { c: number }).c;
  assert.equal(dem, 2);
});

// K7 (đặc tả §2): HDV bấm "Từ chối" CHƯA lên chuông ở lượt 1 — order_handler_refused CỐ Ý không thuộc view. Đổi danh sách hành động
// dưới đây (thêm/bớt) là đổi quyết định của chủ, không phải sửa lỗi kỹ thuật. Test kiểm ĐỦ + ĐÚNG (không chỉ kiểm dương một phần):
// còn dòng bị loại vì action lạ (order_handler_refused/updated/trip_updated), dòng bị loại vì không có đơn (order_id NULL),
// và một dòng hệ thống không người làm (staff_id NULL) vẫn phải giữ lại.
// ADR-0136 Đ10 (chủ duyệt 2026-10-25) + chủ dự án 27/10: view dựng lại ở migration *_tin_cho_xac_nhan.sql (0120) thêm `order_confirm_requested` (tin chờ xác
// nhận) và `order_confirm_withdrawn` (không thành tin — chỉ để biết yêu cầu đã khép). Bài so tập với hằng HANH_DONG_TIN_DON: src/migrations-tin-cho-xac-nhan.test.ts.
test("0025 + 0120: v_aud_order_event lọc ĐÚNG 8 hành động về đơn có order_id (K7: order_handler_refused chưa lên chuông)", () => {
  const db = moi();
  const { staffId } = seedOrder(db);
  const withOrder = db.prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, 'o1', ?, ?, ?)`);
  const withOrderNoStaff = db.prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, 'o1', NULL, ?, ?)`);
  const noOrder = db.prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, NULL, ?, ?, ?)`);

  // 8 hành động THUỘC view
  ["created", "order_claimed", "order_handler_changed", "confirmed", "order_cancelled_by_field", "order_confirm_requested", "order_confirm_withdrawn"].forEach((a, i) => withOrder.run("in" + i, staffId, a, T));
  withOrderNoStaff.run("in-cancel-system", "cancelled", T); // hệ thống tự huỷ, không người làm — view vẫn phải giữ dòng này

  // KHÔNG thuộc view
  ["updated", "trip_updated", "order_handler_refused"].forEach((a, i) => withOrder.run("out" + i, staffId, a, T));
  noOrder.run("out-no-order", staffId, "created", T); // action hợp lệ nhưng không gắn đơn nào (order_id NULL)

  const rows = db.prepare(`SELECT order_id, staff_id, action FROM v_aud_order_event ORDER BY action`).all() as { order_id: string; staff_id: string | null; action: string }[];
  assert.deepEqual(rows.map((r) => r.action), ["cancelled", "confirmed", "created", "order_cancelled_by_field", "order_claimed", "order_confirm_requested", "order_confirm_withdrawn", "order_handler_changed"]);
  assert.ok(rows.every((r) => r.order_id === "o1"), "mọi dòng phải có order_id (lọc order_id IS NOT NULL)");
  assert.ok(rows.some((r) => r.staff_id === null), "phải giữ dòng hệ thống không người làm (staff_id NULL)");
});

test("0025: v_dsp_first_handler lấy mốc SỚM NHẤT của loại việc HANDLE, bỏ qua loại việc khác dù sớm hơn; v_ord_order_owner trả đúng người lập", () => {
  const db = moi();
  const { staffId } = seedOrder(db);
  seedParty(db, "p1");
  const T0 = "2026-09-27T01:00:00.000Z"; // PICKUP, sớm hơn cả — KHÔNG được tính
  const T1 = "2026-09-27T02:00:00.000Z"; // HANDLE, đã đóng
  const T2 = "2026-09-27T03:00:00.000Z"; // HANDLE, đang mở

  const insAssign = (id: string, kind: string, from: string, to: string | null) =>
    db.exec(
      `INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, valid_to_at, created_at, updated_at)
       VALUES ('${id}', 'o1', '${kind}', 'p1', '${to ? "DONE" : "PENDING"}', '${from}', ${to ? `'${to}'` : "NULL"}, '${from}', '${from}')`,
    );
  insAssign("d0", "PICKUP", T0, null);
  insAssign("d1", "HANDLE", T1, T2); // đóng lúc T2 để dòng HANDLE thứ hai mở được (chỉ mục duy nhất chỉ ràng dòng đang mở)
  insAssign("d2", "HANDLE", T2, null);

  const first = db.prepare(`SELECT first_at FROM v_dsp_first_handler WHERE order_id = 'o1'`).get() as { first_at: string };
  assert.equal(first.first_at, T1, "phải lấy mốc HANDLE sớm nhất, bỏ qua PICKUP dù sớm hơn");

  const owner = db.prepare(`SELECT staff_id FROM v_ord_order_owner WHERE id = 'o1'`).get() as { staff_id: string };
  assert.equal(owner.staff_id, staffId);
});
