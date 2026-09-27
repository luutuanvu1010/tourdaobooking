// ADR-0038 điều 6 (chủ chọn phương án A, chat 2026-09-27) + ADR-0042 (sửa điều 6 cùng ngày): Quản trị giữ việc kinh doanh + nhân sự — tạo/sửa/ngưng
// tài khoản cấp dưới, gán vai thường, đặt lại PIN / mở khoá / gỡ Face ID cho cấp dưới (`account.access.manage`); đồng bộ nhân viên từ Sheet
// (`staff.sheet.sync`) và trang Nhật ký (`audit.view`) chỉ Toàn quyền; Toàn quyền là vai ẩn. Chạy CẢ ứng dụng trên SQLite thật (khuôn quan-tri-hoi-bang.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const logCount = (w: any, action: string) => w.q("SELECT count(*) n FROM audit_log WHERE action = ?", action)[0].n;

test("ADR-0042: Quản trị bị chặn 403 ở ba việc kỹ thuật còn lại (đồng bộ Sheet, trang Nhật ký), không ghi gì", async () => {
  const w = setup();
  const calls: [string, string, unknown?][] = [
    ["GET", "/api/staff/sheet"],
    ["POST", "/api/staff/sheet/apply", { phones: ["0900000001"] }],
    ["GET", "/api/audit"],
  ];
  for (const [method, path, body] of calls) {
    const r = await w.call(method, path, { as: ADM, body });
    assert.equal(r.status, 403, `${method} ${path}: ${r.text}`);
    assert.doesNotMatch(r.text, /Toàn quyền|Super Admin/i, "câu báo lỗi không nhắc vai ẩn");
  }
  assert.equal(logCount(w, "staff_synced"), 0);
});

test("ADR-0042: Quản trị đặt lại PIN, mở khoá, gỡ Face ID cho cấp dưới được; với tài khoản Toàn quyền thì 403 và không lộ vai", async () => {
  const w = setup();
  assert.equal((await w.call("POST", `/api/staff/${SALES}/reset-pin`, { as: ADM })).status, 200);
  assert.equal((await w.call("POST", `/api/staff/${SALES}/unlock`, { as: ADM })).status, 200);
  const rm = await w.call("POST", `/api/staff/${SALES}/passkeys/remove-all`, { as: ADM });
  assert.notEqual(rm.status, 403, rm.text); // khung thử tắt Face ID → 503, nhưng KHÔNG bị chặn quyền
  const pinSup = w.q("SELECT pin_hash FROM staff WHERE id = ?", SUP)[0].pin_hash;
  for (const path of [`/api/staff/${SUP}/reset-pin`, `/api/staff/${SUP}/unlock`, `/api/staff/${SUP}/passkeys/remove-all`]) {
    const r = await w.call("POST", path, { as: ADM });
    assert.ok(r.status === 403 || r.status === 503, `${path}: ${r.status}`);
    assert.doesNotMatch(r.text, /Toàn quyền|Super Admin/i);
  }
  assert.equal((await w.call("POST", `/api/staff/${SUP}/reset-pin`, { as: ADM })).status, 403);
  assert.equal(w.q("SELECT pin_hash FROM staff WHERE id = ?", SUP)[0].pin_hash, pinSup, "PIN của Toàn quyền không đổi");
  const patch = await w.call("PATCH", `/api/staff/${SUP}`, { as: ADM, body: { active: false } });
  assert.equal(patch.status, 403);
  assert.doesNotMatch(patch.text, /Toàn quyền|Super Admin/i);
});

test("ADR-0042: danh sách tài khoản — Quản trị thấy tài khoản Toàn quyền như Quản trị thường (không có SUPER_ADMIN); Toàn quyền thấy đúng", async () => {
  const w = setup();
  const asAdm = await w.call("GET", "/api/staff", { as: ADM });
  assert.equal(asAdm.status, 200);
  const supRow = asAdm.json.staff.find((s: any) => s.id === SUP);
  assert.deepEqual(supRow.permissions, ["ADMIN"]);
  assert.ok(!asAdm.text.includes("SUPER_ADMIN"));
  const asSup = await w.call("GET", "/api/staff", { as: SUP });
  assert.deepEqual(asSup.json.staff.find((s: any) => s.id === SUP).permissions, ["SUPER_ADMIN"]);
});

test("ADR-0038 điều 6: Toàn quyền vẫn đặt lại PIN, mở khoá, xem Nhật ký", async () => {
  const w = setup();
  assert.equal((await w.call("POST", `/api/staff/${SALES}/reset-pin`, { as: SUP })).status, 200);
  assert.equal((await w.call("POST", `/api/staff/${SALES}/unlock`, { as: SUP })).status, 200);
  assert.equal((await w.call("GET", "/api/audit", { as: SUP })).status, 200);
});

test("ADR-0038 điều 6: Quản trị GIỮ việc nhân sự — tạo, sửa tên, ngưng, kích hoạt lại tài khoản cấp dưới; xem danh sách tài khoản", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/staff", { as: ADM })).status, 200);
  const created = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Người Mới", phone: "0911000111", roles: ["SALES_STAFF"] } });
  assert.equal(created.status, 201, created.text);
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: ADM, body: { fullName: "An Đổi Tên" } })).status, 200);
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: ADM, body: { active: false } })).status, 200);
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: ADM, body: { active: true } })).status, 200);
});

test("ADR-0042: Quản trị xem vai + chỉnh riêng của tài khoản Toàn quyền (GET /api/staff/:id/roles) → 403, không lộ mã; của cấp dưới → 200", async () => {
  const w = setup();
  const r = await w.call("GET", `/api/staff/${SUP}/roles`, { as: ADM });
  assert.equal(r.status, 403, r.text);
  assert.ok(!r.text.includes("SUPER_ADMIN"));
  assert.doesNotMatch(r.text, /Toàn quyền|Super Admin/i);
  assert.equal((await w.call("GET", `/api/staff/${SALES}/roles`, { as: ADM })).status, 200);
  assert.equal((await w.call("GET", `/api/staff/${ADM}/roles`, { as: ADM })).status, 200, "tự xem của mình được");
  assert.equal((await w.call("GET", `/api/staff/${SUP}/roles`, { as: SUP })).status, 200);
});
