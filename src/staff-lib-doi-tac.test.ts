// ADR-0185 Đ2 mục 1 (chủ duyệt 2026-11-08): cửa khẩn cấp `insertStaffSql` (scripts/staff-lib.mjs — create-staff.mjs, gieo của bộ thử toàn luồng) không còn tạo được
// tài khoản Đối tác thiếu vai trò: có quyền Đối tác mà không kèm `vai` ⇒ ném; `vai` phải là vai trò nhóm bên ngoài và chỉ đi với quyền bên ngoài; có `vai` thì hồ sơ
// mang đúng vai đó THAY vai STAFF cũ. Câu SQL chạy thật trên CSDL dựng từ migrations (trigger lc1c, LC-1 canh thêm). Hàng rào H2: bỏ câu ném ⇒ ca đầu ĐỎ.
// Tài xế đối tác không kèm vai giữ nguyên như hôm nay (ADR-0185 Đ2 mục 4: chiều «giữ Tài xế đối tác thì phải có vai Tài xế đối tác» ngoài phạm vi).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { insertStaffSql } from "../scripts/staff-lib.mjs";
import { world } from "../tests/audit/harness.mjs";

const PIN = "246810";
let so = 600;
const sdt = () => `0911000${++so}`;
const vaiCua = (w: any, phone: string): string[] =>
  w.q("SELECT r.role_type_code AS c FROM pty_party_role r JOIN staff s ON s.party_id = r.party_id WHERE s.phone = ? AND r.valid_to_date IS NULL ORDER BY c", phone).map((r: any) => r.c);
const quyenCua = (w: any, phone: string): string[] =>
  w.q("SELECT p.permission_type_code AS c FROM stf_permission p JOIN staff s ON s.id = p.staff_id WHERE s.phone = ? AND p.valid_to_at IS NULL ORDER BY c", phone).map((r: any) => r.c);

test("insertStaffSql: quyền Đối tác không kèm vai trò ⇒ ném, câu nói phải kèm vai trò đối tác", async () => {
  await assert.rejects(insertStaffSql({ name: "Đối Tác Khẩn", phone: sdt(), pin: PIN, permissions: ["PARTNER"] }), /vai trò/);
});

test("insertStaffSql: `vai` không phải vai trò nhóm bên ngoài, hoặc đi cùng quyền nội bộ ⇒ ném", async () => {
  for (const vai of ["SALES_STAFF", "STAFF", "KHONG_CO_MA_NAY"]) {
    await assert.rejects(insertStaffSql({ name: "Đối Tác Khẩn", phone: sdt(), pin: PIN, permissions: ["PARTNER"], vai }), /nhóm bên ngoài/, vai);
  }
  await assert.rejects(insertStaffSql({ name: "Lai Khẩn", phone: sdt(), pin: PIN, permissions: ["SALES"], vai: "TRAVEL_AGENCY" }), /chỉ đi với quyền bên ngoài/);
  // vai bên ngoài nhưng không mang quyền được xin: hồ sơ chỉ Tài xế đối tác mà giữ Đối tác (ca lọt K5) — không dựng
  await assert.rejects(insertStaffSql({ name: "Tài Xế Đối Tác", phone: sdt(), pin: PIN, permissions: ["PARTNER"], vai: "DRIVER_EXTERNAL" }), /không mang quyền PARTNER/);
});

test("insertStaffSql: Đối tác kèm vai Công ty lữ hành ⇒ câu chạy được trên CSDL thật; giữ Đối tác, hồ sơ mở đúng vai đó, KHÔNG có vai STAFF", async () => {
  const w = world();
  const phone = sdt();
  w.sqlite.exec(await insertStaffSql({ name: "Đối Tác Khẩn", phone, pin: PIN, permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" }));
  assert.deepEqual(quyenCua(w, phone), ["PARTNER"]);
  assert.deepEqual(vaiCua(w, phone), ["TRAVEL_AGENCY"]);
});

test("insertStaffSql: tài khoản nội bộ không kèm vai, và Tài xế đối tác không kèm vai ⇒ như hôm nay (vai STAFF)", async () => {
  const w = world();
  const [a, b] = [sdt(), sdt()];
  w.sqlite.exec(await insertStaffSql({ name: "Bán Hàng Khẩn", phone: a, pin: PIN, permissions: ["SALES"] }));
  w.sqlite.exec(await insertStaffSql({ name: "Tài Xế Khẩn", phone: b, pin: PIN, permissions: ["DRIVER_PARTNER"] }));
  assert.deepEqual([quyenCua(w, a), vaiCua(w, a)], [["SALES"], ["STAFF"]]);
  assert.deepEqual([quyenCua(w, b), vaiCua(w, b)], [["DRIVER_PARTNER"], ["STAFF"]]);
});
