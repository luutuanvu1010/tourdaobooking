import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAccountChange, generatePin, isWeakPin } from "./rules.ts";

const admin = { id: "a1", role: "admin" as const, active: true };
const sales = { id: "s1", role: "sales" as const, active: true };

test("không tự ngưng hoặc tự hạ quyền", () => {
  assert.match(checkAccountChange("a1", admin, { active: false }, 2)!, /tự ngưng/);
  assert.match(checkAccountChange("a1", admin, { role: "sales" }, 2)!, /tự ngưng/);
  assert.equal(checkAccountChange("a1", admin, { role: "admin" }, 2), null); // không thay đổi gì
});

test("không để hết admin đang hoạt động", () => {
  assert.match(checkAccountChange("x", admin, { active: false }, 1)!, /ít nhất một quản trị viên/);
  assert.match(checkAccountChange("x", admin, { role: "sales" }, 1)!, /ít nhất một quản trị viên/);
  assert.equal(checkAccountChange("x", admin, { active: false }, 2), null);
});

test("sửa nhân viên thường luôn được (không phải admin cuối)", () => {
  assert.equal(checkAccountChange("a1", sales, { active: false }, 1), null);
  assert.equal(checkAccountChange("a1", sales, { role: "admin" }, 1), null);
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
