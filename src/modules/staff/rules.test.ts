import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAccountChange, generatePin, isWeakPin } from "./rules.ts";

const admin = { id: "a1", permissions: ["ADMIN"] as const, active: true };
const sales = { id: "s1", permissions: ["SALES"] as const, active: true };
const both = { id: "b1", permissions: ["SALES", "ADMIN"] as const, active: true };

test("không tự ngưng hoặc tự đổi quyền của chính mình", () => {
  assert.match(checkAccountChange("a1", admin, { active: false }, 2)!, /tự ngưng/);
  assert.match(checkAccountChange("a1", admin, { permissions: ["SALES"] }, 2)!, /tự ngưng/);
  assert.match(checkAccountChange("a1", admin, { permissions: ["ADMIN", "ACCOUNTING"] }, 2)!, /tự ngưng/, "thêm quyền cho mình cũng bị chặn");
  assert.equal(checkAccountChange("a1", admin, { permissions: ["ADMIN"] }, 2), null, "không thay đổi gì");
  assert.equal(checkAccountChange("a1", both, { permissions: ["ADMIN", "SALES"] }, 2), null, "cùng tập quyền, khác thứ tự = không đổi");
});

test("không để hết admin đang hoạt động", () => {
  assert.match(checkAccountChange("x", admin, { active: false }, 1)!, /ít nhất một quản trị viên/);
  assert.match(checkAccountChange("x", admin, { permissions: ["SALES"] }, 1)!, /ít nhất một quản trị viên/);
  assert.match(checkAccountChange("x", both, { permissions: ["SALES"] }, 1)!, /ít nhất một quản trị viên/, "bỏ ADMIN nhưng giữ SALES vẫn là mất admin");
  assert.equal(checkAccountChange("x", both, { permissions: ["ADMIN"] }, 1), null, "bỏ SALES, còn ADMIN thì không mất admin");
  assert.equal(checkAccountChange("x", admin, { active: false }, 2), null);
});

test("sửa nhân viên thường luôn được (không phải admin cuối)", () => {
  assert.equal(checkAccountChange("a1", sales, { active: false }, 1), null);
  assert.equal(checkAccountChange("a1", sales, { permissions: ["SALES", "ADMIN"] }, 1), null);
  assert.equal(checkAccountChange("a1", { id: "z", permissions: ["ADMIN"] as const, active: false }, { active: true }, 1), null, "admin đã ngưng không tính là mất admin");
});

test("PIN yếu bị loại; PIN sinh ra luôn 6 số và không yếu", () => {
  for (const w of ["000000", "111111", "123456", "654321", "234567", "890123"]) assert.ok(isWeakPin(w), w);
  for (const ok of ["135790", "482915", "100200"]) assert.ok(!isWeakPin(ok), ok);
  for (let i = 0; i < 2000; i++) {
    const p = generatePin();
    assert.match(p, /^\d{6}$/);
    assert.ok(!isWeakPin(p));
  }
  // random giả trả PIN yếu trước rồi PIN tốt → phải bỏ qua PIN yếu
  const seq = [111111, 123456, 482915];
  assert.equal(generatePin(() => seq.shift()!), "482915");
});
