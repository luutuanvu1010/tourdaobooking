// E2E ADR-0090 — tài khoản có quyền tiền chỉ Toàn quyền chạm (kịch bản gốc QT04 + biến thể + GD-P-01 của đánh giá UX 1/10, ngoài kho:
// ~/Documents/danh-gia-ux/2026-10-01/kich-ban/vai-qt.mjs:405). Trên API THẬT (wrangler dev + D1 tạm). Chạy qua tests/e2e/run.mjs.
// Không đổi tài khoản dùng chung: mọi ca bị chặn không ghi gì (khẳng định lại); ca gán vai dùng tài khoản Bán hàng tạo mới.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, randomPhone as rnd, session } from "./lib.mjs";

const TIEN = "Tài khoản giữ tiền — chỉ người phụ trách hệ thống (Toàn quyền) làm việc này."; // ADR-0090 đ1, nguyên văn
const ADMIN = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const HR = await session(ACCOUNTS.hr);
const KT_COOKIE = await session(ACCOUNTS.accountant);
const ktId = (await call(KT_COOKIE, "GET", "/api/auth/me")).body.staff.id;
const demPinReset = async () => (await call(SUPER, "GET", "/api/audit?action=pin_reset&limit=200")).body.entries.filter((e) => e.targetId === ktId).length;

// ---- QT04: Quản trị đặt lại PIN của Kế toán → 403; PIN cũ còn dùng được, phiên Kế toán còn sống, không có dòng pin_reset mới.
const truoc = await demPinReset();
let r = await call(ADMIN, "POST", `/api/staff/${ktId}/reset-pin`, {});
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.message, TIEN);
assert.equal(r.body.pin, undefined, "không trả PIN");
assert.equal((await call(KT_COOKIE, "GET", "/api/auth/me")).status, 200, "phiên Kế toán còn sống");
assert.equal(await demPinReset(), truoc, "không có nhật ký pin_reset mới");
// Cờ theo dòng: Quản trị không thấy nút ở dòng Kế toán; Toàn quyền thấy.
const coCua = async (cookie) => (await call(cookie, "GET", "/api/staff")).body.staff.find((s) => s.id === ktId).datLaiPinDuoc;
assert.equal(await coCua(ADMIN), false, "cờ datLaiPinDuoc của Quản trị ở dòng Kế toán");
assert.equal(await coCua(SUPER), true, "cờ datLaiPinDuoc của Toàn quyền ở dòng Kế toán");
console.log("✓ QT04: Quản trị đặt lại PIN Kế toán → 403 (câu đ1), không ghi gì; cờ theo dòng khớp");

// ---- QT04 biến thể: Quản trị (và Nhân sự) gán vai Kế toán / cộng tay Kế toán cho một Bán hàng → 403.
r = await call(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Bán Hàng Quyền Tiền", phone: rnd(), roles: ["SALES_STAFF"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const bh = r.body.staff;
for (const [ten, cookie] of [["Quản trị", ADMIN], ["Nhân sự", HR]]) {
  for (const body of [{ roles: ["SALES_STAFF", "ACCOUNTANT"] }, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "kiêm nhiệm" }]) {
    r = await call(cookie, "PUT", `/api/staff/${bh.id}/roles`, body);
    assert.equal(r.status, 403, `${ten} ${JSON.stringify(body)}: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.error.message, TIEN);
  }
}
assert.deepEqual((await call(SUPER, "GET", `/api/staff/${bh.id}/roles`)).body, { roles: ["SALES_STAFF"], adds: [], removes: [], reason: null }, "vai không đổi");
console.log("✓ QT04 biến thể: Quản trị / Nhân sự gán vai hoặc cộng tay Kế toán → 403");

// ---- GD-P-01: Nhân sự tạo tài khoản mang vai Kế toán / quyền Kế toán (cả hai đường) → 403, không tạo.
for (const body of [
  { taoHoSoMoi: true, fullName: "Kế Toán Nhân Sự Tạo", phone: rnd(), roles: ["ACCOUNTANT"] },
  { taoHoSoMoi: true, fullName: "Kế Toán Nhân Sự Tạo", phone: rnd(), permissions: ["ACCOUNTING"] },
]) {
  r = await call(HR, "POST", "/api/staff", body);
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(r.body.error.message, TIEN);
  const ds = (await call(SUPER, "GET", "/api/staff")).body.staff;
  assert.ok(!ds.some((s) => s.phone === body.phone), "không có tài khoản mới");
}
console.log("✓ GD-P-01: Nhân sự tạo tài khoản Kế toán (đường vai + đường cũ) → 403, không tạo");

// ---- đ3: Quản trị vẫn đổi tên + mở khoá tài khoản Kế toán (không đổi gì thật: đổi tên rồi đổi lại).
const tenCu = (await call(SUPER, "GET", "/api/staff")).body.staff.find((s) => s.id === ktId).fullName;
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${ktId}`, { fullName: "Kế Toán Đổi Tên Thử" })).status, 200);
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${ktId}`, { fullName: tenCu })).status, 200);
assert.equal((await call(ADMIN, "POST", `/api/staff/${ktId}/unlock`, {})).status, 200);
// Kế toán vẫn đăng nhập bằng PIN cũ (bằng chứng PIN không bị đổi ở trên).
assert.equal((await login(ACCOUNTS.accountant.phone, ACCOUNTS.accountant.pin)).status, 200);
console.log("✓ đ3: Quản trị vẫn đổi tên, mở khoá tài khoản Kế toán; PIN Kế toán không đổi");

// ---- Toàn quyền: gán vai Kế toán cho Bán hàng vừa tạo được.
r = await call(SUPER, "PUT", `/api/staff/${bh.id}/roles`, { roles: ["SALES_STAFF", "ACCOUNTANT"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["SALES", "ACCOUNTING"]);
console.log("✓ Toàn quyền gán vai Kế toán được");
