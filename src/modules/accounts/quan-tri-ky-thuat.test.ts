// ADR-0038 điều 6 (chủ chọn phương án A, chat 2026-09-27): Quản trị giữ việc kinh doanh + nhân sự (tạo/sửa/ngưng tài khoản cấp dưới, gán vai
// thường), MẤT việc kỹ thuật: đặt lại PIN, gỡ Face ID, mở khoá đăng nhập (`account.access.manage`), đồng bộ nhân viên từ Sheet (`staff.sheet.sync`),
// xem trang Nhật ký (`audit.view`) — ba ô chỉ Toàn quyền. Chạy CẢ ứng dụng trên SQLite thật (khuôn quan-tri-hoi-bang.test.ts).
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

test("ADR-0038 điều 6: Quản trị bị chặn 403 ở sáu việc kỹ thuật, không ghi gì, PIN không đổi", async () => {
  const w = setup();
  const pinBefore = w.q("SELECT pin_hash FROM staff WHERE id = ?", SALES)[0].pin_hash;
  const calls: [string, string, unknown?][] = [
    ["POST", `/api/staff/${SALES}/reset-pin`],
    ["POST", `/api/staff/${SALES}/passkeys/remove-all`],
    ["POST", `/api/staff/${SALES}/unlock`],
    ["GET", "/api/staff/sheet"],
    ["POST", "/api/staff/sheet/apply", { phones: ["0900000001"] }],
    ["GET", "/api/audit"],
  ];
  for (const [method, path, body] of calls) {
    const r = await w.call(method, path, { as: ADM, body });
    assert.equal(r.status, 403, `${method} ${path}: ${r.text}`);
  }
  assert.equal(w.q("SELECT pin_hash FROM staff WHERE id = ?", SALES)[0].pin_hash, pinBefore);
  for (const a of ["pin_reset", "passkey_removed", "login_unlocked", "staff_synced"]) assert.equal(logCount(w, a), 0, a);
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
