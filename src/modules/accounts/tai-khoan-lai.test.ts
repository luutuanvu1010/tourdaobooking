// LC-1b ở lớp MÁY CHỦ (ADR-0048 B2.2, Q4 = (a)): tài khoản giữ "Tài xế đối tác" (DRIVER_PARTNER) không giữ quyền nào khác — chặn 400 `invalid_input`
// TRƯỚC khi chạm CSDL trên CẢ NĂM đường ghi quyền (kế hoạch mục 1.3):
//   #1 POST /api/staff có `roles`            → roleAssignmentProblem
//   #2 POST /api/staff đường cũ (permissions) → taiKhoanLaiProblem sau cleanPermissions
//   #3 POST /api/staff/sheet/apply            → vai cố định SALES_STAFF, không bao giờ sinh DRIVER_PARTNER (roles.test.ts khẳng định)
//   #4 PUT /api/staff/:id/permissions        → taiKhoanLaiProblem sau cleanPermissions
//   #5 PUT /api/staff/:id/roles              → roleAssignmentProblem
// và ca 5b: đổi vai HỢP LỆ (Tài xế taxi ↔ Tài xế đối tác; Điều hành chung → Tài xế đối tác qua lô gỡ Quản trị) không bị LC-1b chặn nhầm.
// Chạy CẢ ứng dụng trên SQLite thật (có trigger LC-1, LC-1b) qua khung tests/audit/harness.mjs.
// Lưới "lỗi trigger → 409, không 500" KHÔNG viết bằng bài gọi thẳng câu lệnh + db.batch (đi vòng qua route = bài kiểm giả); bằng chứng là phép đột biến ở
// nhật ký thi công (Task A2 bước 6 a): bỏ lời kiểm máy chủ ở đường #2 → route thật trả 409 `account_rule`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const CU = "99999999-9999-4999-8999-999999999999"; // tài khoản đường cũ, chưa gán vai, đang giữ Đối tác

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000006", name: "Quản trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: CU, phone: "0900000009", name: "Đối tác cũ", perms: ["PARTNER"] });
  return w;
}
const LAI = "Tài khoản Tài xế đối tác không giữ thêm quyền nào khác.";
const openPerms = (w: any, id: string): string[] =>
  w.q("SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", id).map((r: { c: string }) => r.c);
const permRows = (w: any): number => w.q("SELECT count(*) AS n FROM stf_permission")[0].n;
const logRows = (w: any): number => w.q("SELECT count(*) AS n FROM audit_log")[0].n;
const staffByPhone = (w: any, phone: string): number => w.q("SELECT count(*) AS n FROM staff WHERE phone = ?", phone)[0].n;

/** Tạo tài khoản theo vai qua route thật (Quản trị hoặc Toàn quyền), trả id. */
async function taoTheoVai(w: any, as: string, phone: string, roles: string[]): Promise<string> {
  const r = await w.call("POST", "/api/staff", { as, body: { fullName: `Người ${phone.slice(-3)}`, phone, roles } });
  assert.equal(r.status, 201, `tạo ${roles.join("+")}: ${r.text}`);
  return r.json.staff.id;
}

test("#1 POST /api/staff có vai: 'Tài xế taxi' + 'Tài xế đối tác' → 400 câu dễ hiểu, không tạo tài khoản, không quyền, không nhật ký", async () => {
  const w = setup();
  const [perms, logs] = [permRows(w), logRows(w)];
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Người Lai", phone: "0911000301", roles: ["TAXI_DRIVER", "DRIVER_EXTERNAL"] } });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal(r.json.error.message, "Vai Tài xế đối tác không đi cùng vai bên ngoài khác — một người chọn một: đối tác đặt đơn hoặc tài xế đối tác.");
  assert.equal(staffByPhone(w, "0911000301"), 0);
  assert.equal(permRows(w), perms);
  assert.equal(logRows(w), logs);
});

test("#2 POST /api/staff đường cũ: permissions Tài xế đối tác + Bán hàng → 400 (lời kiểm máy chủ, không phải lỗi trigger), không ghi gì", async () => {
  const w = setup();
  const [perms, logs] = [permRows(w), logRows(w)];
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Người Lai Hai", phone: "0911000302", permissions: ["DRIVER_PARTNER", "SALES"] } });
  assert.equal(r.status, 400, r.text);
  assert.deepEqual(r.json.error, { code: "invalid_input", message: LAI });
  assert.equal(staffByPhone(w, "0911000302"), 0);
  assert.equal(permRows(w), perms);
  assert.equal(logRows(w), logs);
  // Đường cũ vẫn tạo được tài khoản chỉ-Tài xế đối tác (đứng một mình).
  const ok = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Tài Xế Đường Cũ", phone: "0911000303", permissions: ["DRIVER_PARTNER"] } });
  assert.equal(ok.status, 201, ok.text);
  assert.deepEqual(openPerms(w, ok.json.staff.id), ["DRIVER_PARTNER"]);
});

test("#4 PUT /api/staff/:id/permissions (tài khoản chưa gán vai): Đối tác + Tài xế đối tác → 400, quyền giữ nguyên, không nhật ký", async () => {
  const w = setup();
  const [perms, logs] = [permRows(w), logRows(w)];
  const r = await w.call("PUT", `/api/staff/${CU}/permissions`, { as: ADM, body: { permissions: ["PARTNER", "DRIVER_PARTNER"] } });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal(r.json.error.message, LAI);
  assert.deepEqual(openPerms(w, CU), ["PARTNER"]);
  assert.equal(permRows(w), perms);
  assert.equal(logRows(w), logs);
  // Đổi HẲN sang chỉ Tài xế đối tác qua đường cũ được: setPermissionStatements đóng PARTNER TRƯỚC rồi mới chèn DRIVER_PARTNER (LC-1b chỉ đếm dòng mở).
  const ok = await w.call("PUT", `/api/staff/${CU}/permissions`, { as: ADM, body: { permissions: ["DRIVER_PARTNER"] } });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual(openPerms(w, CU), ["DRIVER_PARTNER"]);
});

test("#5 PUT /api/staff/:id/roles: 'Tài xế đối tác' + cộng tay Đối tác → 400, vai và quyền giữ nguyên, không nhật ký đổi vai", async () => {
  const w = setup();
  const id = await taoTheoVai(w, ADM, "0911000304", ["DRIVER_EXTERNAL"]);
  assert.deepEqual(openPerms(w, id), ["DRIVER_PARTNER"]);
  const [perms, logs] = [permRows(w), logRows(w)];
  const r = await w.call("PUT", `/api/staff/${id}/roles`, { as: ADM, body: { roles: ["DRIVER_EXTERNAL"], adds: ["PARTNER"], reason: "thử lai" } });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal(r.json.error.message, LAI);
  assert.deepEqual(openPerms(w, id), ["DRIVER_PARTNER"]);
  assert.equal(permRows(w), perms);
  assert.equal(logRows(w), logs);
});

test("#5 PUT /api/staff/:id/roles: gán cùng lúc 'Tài xế taxi' + 'Tài xế đối tác' → 400 câu 'một người chọn một'", async () => {
  const w = setup();
  const id = await taoTheoVai(w, ADM, "0911000305", ["TAXI_DRIVER"]);
  const r = await w.call("PUT", `/api/staff/${id}/roles`, { as: ADM, body: { roles: ["TAXI_DRIVER", "DRIVER_EXTERNAL"] } });
  assert.equal(r.status, 400, r.text);
  assert.match(r.json.error.message, /một người chọn một/);
  assert.deepEqual(openPerms(w, id), ["PARTNER"]);
});

test("5b (i): 'Tài xế taxi' → 'Tài xế đối tác' → 200, đúng MỘT quyền mở DRIVER_PARTNER; đổi ngược lại → 200, đúng PARTNER (lô một: đóng trước, mở sau)", async () => {
  const w = setup();
  const id = await taoTheoVai(w, ADM, "0911000306", ["TAXI_DRIVER"]);
  assert.deepEqual(openPerms(w, id), ["PARTNER"]);
  const sang = await w.call("PUT", `/api/staff/${id}/roles`, { as: ADM, body: { roles: ["DRIVER_EXTERNAL"] } });
  assert.equal(sang.status, 200, sang.text);
  assert.deepEqual(openPerms(w, id), ["DRIVER_PARTNER"]);
  assert.deepEqual((await w.call("GET", `/api/staff/${id}/roles`, { as: ADM })).json.roles, ["DRIVER_EXTERNAL"]);
  const ve = await w.call("PUT", `/api/staff/${id}/roles`, { as: ADM, body: { roles: ["TAXI_DRIVER"] } });
  assert.equal(ve.status, 200, ve.text);
  assert.deepEqual(openPerms(w, id), ["PARTNER"]);
  assert.deepEqual((await w.call("GET", `/api/staff/${id}/roles`, { as: ADM })).json.roles, ["TAXI_DRIVER"]);
});

test("5b (ii): Toàn quyền đổi 'Điều hành chung' (Quản trị; còn Quản trị khác) → 'Tài xế đối tác' → 200 qua lô gỡ Quản trị; quyền mở đúng DRIVER_PARTNER, vai nội bộ đã đóng", async () => {
  const w = setup();
  const id = await taoTheoVai(w, SUP, "0911000307", ["OPERATIONS_MANAGER"]);
  assert.deepEqual(openPerms(w, id), ["ADMIN"]);
  const r = await w.call("PUT", `/api/staff/${id}/roles`, { as: SUP, body: { roles: ["DRIVER_EXTERNAL"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(openPerms(w, id), ["DRIVER_PARTNER"]);
  assert.deepEqual((await w.call("GET", `/api/staff/${id}/roles`, { as: SUP })).json.roles, ["DRIVER_EXTERNAL"], "vai Điều hành chung đã đóng, chỉ còn Tài xế đối tác");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'account_roles_changed' AND target_id = ?", id)[0].n, 1);
});

test("không đường ghi quyền nào ra 500 với tổ hợp lai (năm đường, mỗi đường một ca)", async () => {
  const w = setup();
  const id = await taoTheoVai(w, ADM, "0911000308", ["DRIVER_EXTERNAL"]);
  const ca = [
    await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Lai Một", phone: "0911000309", roles: ["COLLABORATOR", "DRIVER_EXTERNAL"] } }),
    await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Lai Hai", phone: "0911000310", permissions: ["DRIVER", "DRIVER_PARTNER"] } }),
    await w.call("PUT", `/api/staff/${CU}/permissions`, { as: ADM, body: { permissions: ["DRIVER_PARTNER", "SALES"] } }),
    await w.call("PUT", `/api/staff/${id}/roles`, { as: ADM, body: { roles: ["DRIVER_EXTERNAL"], adds: ["PARTNER"], reason: "lai" } }),
  ];
  for (const r of ca) assert.equal(r.status, 400, r.text);
});
