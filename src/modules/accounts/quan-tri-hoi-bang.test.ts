// ADR-0019 điều 2 (Task B3): route quản trị tài khoản `/api/staff*` hỏi bảng quyền (`admin.manage`, `admin.manage.superadmin`) trong thân handler,
// KHÔNG chỉ dựa cổng thô của router. Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs (cùng khuôn ho-so-co-tai-khoan.test.ts).
// Các ca dưới đây là ca HÀNH VI GIỮ NGUYÊN (không đổi kết quả với tài khoản hiện có): bản gói không cho đột biến bảng từ test, nên việc "ô có
// được hỏi thật" do hàng rào 1 (src/permission-enforcement.test.ts) canh — xem docs/SO-HANG-RAO.md.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const HR = "44444444-4444-4444-8444-444444444444";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000006", name: "Quản trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000004", name: "Nhân sự", perms: ["HR"] });
  return w;
}
const logCount = (w: any, action: string) => w.q("SELECT count(*) n FROM audit_log WHERE action = ?", action)[0].n;

test("bán hàng gọi /api/staff → 403 (cổng); quản trị → 200; toàn quyền → 200", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/staff", { as: SALES })).status, 403);
  assert.equal((await w.call("GET", "/api/staff", { as: PARTNER })).status, 403);
  assert.equal((await w.call("GET", "/api/staff", { as: ADM })).status, 200);
  assert.equal((await w.call("GET", "/api/staff", { as: SUP })).status, 200);
});

test("bán hàng không tạo được tài khoản, không ghi gì (403 trước khi đọc thân)", async () => {
  const w = setup();
  const before = logCount(w, "staff_created");
  const res = await w.call("POST", "/api/staff", { as: SALES, body: { fullName: "Người Lạ", phone: "0911000111", permissions: ["SALES"] } });
  assert.equal(res.status, 403);
  assert.equal(logCount(w, "staff_created"), before);
  assert.equal(w.q("SELECT count(*) n FROM staff WHERE phone = '0911000111'")[0].n, 0);
});

test("luật cấp bậc giữ nguyên: quản trị sửa được cấp dưới và chính mình, KHÔNG sửa được quản trị khác (403); toàn quyền sửa được quản trị", async () => {
  const w = setup();
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: ADM, body: { fullName: "An Mới" } })).status, 200);
  assert.equal((await w.call("PATCH", `/api/staff/${ADM2}`, { as: ADM, body: { fullName: "Giả" } })).status, 403);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE target_id = ? AND action = 'staff_updated'", ADM2)[0].n, 0, "403 không ghi nhật ký");
  assert.equal((await w.call("PATCH", `/api/staff/${ADM2}`, { as: SUP, body: { fullName: "Hai Mới" } })).status, 200);
});

test("LC-4 qua bảng quyền: Hành chính nhân sự cấp Quản trị cho tài khoản tạo mới → 403 (Quản trị không tạo tài khoản — ADR-0071); toàn quyền → 201", async () => {
  const w = setup();
  const body = { fullName: "Người Mới", phone: "0911000222", permissions: ["SALES", "ADMIN"] };
  assert.equal((await w.call("POST", "/api/staff", { as: ADM, body })).status, 403);
  assert.equal((await w.call("POST", "/api/staff", { as: HR, body })).status, 403);
  assert.equal(w.q("SELECT count(*) n FROM staff WHERE phone = '0911000222'")[0].n, 0);
  assert.equal((await w.call("POST", "/api/staff", { as: SUP, body })).status, 201);
});

test("LC-4 qua bảng quyền: quản trị cấp Quản trị cho cấp dưới bằng route cũ PUT …/permissions → 403; toàn quyền → 200", async () => {
  const w = setup();
  const body = { permissions: ["SALES", "ADMIN"] };
  // Từ ADR-0083 điều 1a, 403 này đến SỚM hơn (đường kiểu cũ chỉ Toàn quyền) — LC-4 của Quản trị ở đường này không còn tới được; LC-4 vẫn khoá ở PUT …/roles.
  assert.equal((await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: ADM, body })).status, 403);
  assert.deepEqual(w.q("SELECT permission_type_code p FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY 1", SALES).map((r: any) => r.p), ["SALES"]);
  assert.equal((await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: SUP, body })).status, 200);
});

test("LC-4 qua bảng quyền: quản trị gán vai Điều hành cho cấp dưới bằng PUT …/roles → 403, không đổi quyền; toàn quyền → 200", async () => {
  const w = setup();
  const perms = () => w.q("SELECT permission_type_code p FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY 1", SALES).map((r: any) => r.p);
  const body = { roles: ["OPERATIONS_MANAGER"] };
  assert.equal((await w.call("PUT", `/api/staff/${SALES}/roles`, { as: ADM, body })).status, 403);
  assert.deepEqual(perms(), ["SALES"], "403 không đổi quyền");
  const ok = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.deepEqual(perms(), ["ADMIN"], "Toàn quyền gán được: Điều hành sinh quyền Quản trị");
});
