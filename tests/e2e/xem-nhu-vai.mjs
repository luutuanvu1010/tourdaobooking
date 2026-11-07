// E2E "Toàn quyền xem như vai khác" (ADR-0180). Tài khoản Toàn quyền DÙNG MỘT LẦN (không đụng `ACCOUNTS.superAdmin` dùng chung: đóng vai làm quyền hiệu lực của phiên đổi).
// Kịch bản: Bán hàng gọi bật → 403; Toàn quyền bật ACCOUNTING → việc của Kế toán qua (GET /api/ledger/ky 200), việc của Bán hàng bị chặn (lập đơn 403) →
// DELETE → quyền thật (lập đơn 201); nhật ký có dòng bật / thoát và dòng nhật ký ghi lúc đang đóng vai mang dấu `acting_role`; phiên khác của cùng tài khoản không bị ảnh hưởng
// (chỉ kiểm được khi luật một máy cho hai phiên cùng sống). Không đổi dữ liệu dùng chung ngoài một đơn nháp của tài khoản dùng một lần.
import assert from "node:assert/strict";
import { ACCOUNTS, call, gieoTaiKhoanLai, login, orderInput, ensureFakeCatalog, session, sqlRows } from "./lib.mjs";

await ensureFakeCatalog();
const DUONG = "/api/auth/xem-nhu-vai";
const SA = await gieoTaiKhoanLai("Toàn quyền thử xem như vai", ["SUPER_ADMIN"]);
const BAN = await session(ACCOUNTS.salesA);
const CU = SA.cookie;

// 1. Người không phải Toàn quyền → 403 cả hai route.
assert.equal((await call(BAN, "POST", DUONG, { role: "ACCOUNTING" })).status, 403, "Bán hàng không bật được");
assert.equal((await call(BAN, "DELETE", DUONG)).status, 403, "Bán hàng không thoát được");

// 2. Toàn quyền bật mã lạ / SUPER_ADMIN → 400, phiên không đổi.
for (const role of ["SUPER_ADMIN", "XYZ"]) assert.equal((await call(CU, "POST", DUONG, { role })).status, 400, role);
assert.equal((await call(CU, "GET", "/api/auth/me")).body.actingRole, undefined);

// 3. Bật ACCOUNTING: quyền hiệu lực chỉ còn Kế toán.
let r = await call(CU, "POST", DUONG, { role: "ACCOUNTING" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ACCOUNTING"]);
r = await call(CU, "GET", "/api/auth/me");
assert.equal(r.body.actingRole, "ACCOUNTING");
assert.ok(!r.body.staff.permissions.includes("SUPER_ADMIN"));
assert.equal((await call(CU, "GET", "/api/ledger/ky")).status, 200, "việc của Kế toán qua");
assert.equal((await call(CU, "POST", "/api/orders", orderInput())).status, 403, "việc của Bán hàng (lập đơn) bị chặn khi đang xem như Kế toán");

// 4. Phiên khác của cùng tài khoản không bị ảnh hưởng (nếu luật một máy cho hai phiên cùng sống).
const may2 = await login(SA.phone, SA.pin);
assert.equal(may2.status, 200, JSON.stringify(may2.body));
if ((await call(CU, "GET", "/api/auth/me")).status === 200) {
  assert.deepEqual((await call(may2.cookie, "GET", "/api/auth/me")).body.staff.permissions, ["SUPER_ADMIN"], "phiên khác vẫn là Toàn quyền thật");
  console.log("✓ phiên thứ hai của cùng tài khoản không bị ảnh hưởng");
} else console.log("• bỏ qua kiểm phiên thứ hai: luật một máy đã đá phiên đầu (đã có bài đơn vị src/modules/auth/xem-nhu-vai-route.test.ts)");
const CK = may2.cookie; // từ đây dùng phiên mới nhất (còn sống chắc chắn); phiên đầu có thể đã bị đá
if ((await call(CU, "GET", "/api/auth/me")).status === 200) {
  // phiên đầu còn sống: đang đóng vai ⇒ quay lại dùng nó cho phần còn lại
  assert.equal((await call(CU, "GET", "/api/auth/me")).body.actingRole, "ACCOUNTING");
}
const DUNG = (await call(CU, "GET", "/api/auth/me")).status === 200 ? CU : CK;
if (DUNG === CK) {
  r = await call(CK, "POST", DUONG, { role: "ACCOUNTING" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
}

// 5. Thoát: về Toàn quyền thật, lập đơn được.
r = await call(DUNG, "DELETE", DUONG);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["SUPER_ADMIN"]);
assert.equal((await call(DUNG, "GET", "/api/auth/me")).body.actingRole, undefined);
assert.equal((await call(DUNG, "POST", "/api/orders", orderInput())).status, 201, "Toàn quyền thật lập đơn được");

// 6. Nhật ký: dòng bật + thoát, tên vai tiếng Việt ở detail, không dữ liệu cá nhân; dòng ghi lúc đang đóng vai có dấu (đọc SQL — API nhật ký không trả cột dấu).
const dong = await sqlRows(`SELECT action, detail, acting_role FROM audit_log WHERE staff_id = '${SA.id}' AND action IN ('acting_role_set','acting_role_cleared') ORDER BY rowid`);
assert.ok(dong.filter((d) => d.action === "acting_role_set").length >= 1 && dong.filter((d) => d.action === "acting_role_cleared").length >= 1, JSON.stringify(dong));
assert.ok(dong.every((d) => d.detail === "Kế toán"), JSON.stringify(dong));
assert.doesNotMatch(JSON.stringify(dong), new RegExp(SA.phone));
const daDanh = await sqlRows(`SELECT COUNT(*) AS n FROM audit_log WHERE staff_id = '${SA.id}' AND acting_role = 'ACCOUNTING'`);
assert.ok(Number(daDanh[0].n) >= 1, "có dòng nhật ký mang dấu vai");
console.log("✓ xem như vai khác: 403 người thường, 400 mã lạ, Kế toán qua / Bán hàng chặn, thoát về quyền thật, nhật ký có dấu");
