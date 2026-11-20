// Bài kiểm phần phân tích tham số và tìm axe của lệnh đo giao diện (scripts/giao-dien/tham-so.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error tệp .mjs không có kiểu
import { phanTichThamSo, timAxe } from "../scripts/giao-dien/tham-so.mjs";

const GOC = "/kho/tourdao-sales";
const goi = (argv: string[]) => phanTichThamSo(argv, { goc: GOC });

test("phanTichThamSo: thiếu --o ⇒ lỗi", () => {
  assert.throws(() => goi([]), /--o/);
  assert.throws(() => goi(["--kho", "390"]), /--o/);
});

test("phanTichThamSo: một ô, mặc định cả hai khổ", () => {
  const t = goi(["--o", "SALES:/order-form"]);
  assert.deepEqual(t.o, [{ bo: "SALES", trang: "/order-form" }]);
  assert.deepEqual(t.kho, [390, 1280]);
  assert.equal(t.khongAxe, false);
  assert.equal(t.tiem, null);
});

test("phanTichThamSo: nhiều ô, khổ, tiêm, ra, không-axe, hạn", () => {
  const ra = join(tmpdir(), "ra-thu");
  const t = goi(["--o", "SALES:/orders,PARTNER:/order-form", "--kho", "390", "--tiem", "/tmp/x.js", "--ra", ra, "--khong-axe", "--han-phut", "7"]);
  assert.deepEqual(t.o, [{ bo: "SALES", trang: "/orders" }, { bo: "PARTNER", trang: "/order-form" }]);
  assert.deepEqual(t.kho, [390]);
  assert.equal(t.tiem, "/tmp/x.js");
  assert.equal(t.ra, ra);
  assert.equal(t.khongAxe, true);
  assert.equal(t.hanPhut, 7);
});

test("phanTichThamSo: bộ lạ ⇒ lỗi; KHACH hợp lệ", () => {
  assert.throws(() => goi(["--o", "BOSS:/orders"]), /BOSS/);
  assert.deepEqual(goi(["--o", "KHACH:/login"]).o, [{ bo: "KHACH", trang: "/login" }]);
});

test("phanTichThamSo: ô sai dạng ⇒ lỗi", () => {
  assert.throws(() => goi(["--o", "SALES"]), /BỘ:\/trang|dạng/);
  assert.throws(() => goi(["--o", "SALES:orders"]), /BỘ:\/trang|dạng/);
});

test("phanTichThamSo: khổ ngoài 390 và 1280 ⇒ lỗi", () => {
  assert.throws(() => goi(["--o", "SALES:/orders", "--kho", "820"]), /820/);
  assert.deepEqual(goi(["--o", "SALES:/orders", "--kho", "1280,390"]).kho, [1280, 390]);
});

test("phanTichThamSo: --ra nằm trong kho ⇒ lỗi; ngoài kho thì được", () => {
  assert.throws(() => goi(["--o", "SALES:/orders", "--ra", `${GOC}/anh`]), /trong kho/);
  assert.throws(() => goi(["--o", "SALES:/orders", "--ra", GOC]), /trong kho/);
  assert.doesNotThrow(() => goi(["--o", "SALES:/orders", "--ra", "/kho/tourdao-sales-khac/anh"]));
  assert.doesNotThrow(() => goi(["--o", "SALES:/orders", "--ra", "/tmp/anh"]));
});

test("phanTichThamSo: tham số lạ ⇒ lỗi", () => {
  assert.throws(() => goi(["--o", "SALES:/orders", "--la"]), /--la/);
});

test("timAxe: có AXE_JS thì dùng đúng nó; không tồn tại ⇒ lỗi, không đổi chỗ khác", () => {
  assert.equal(timAxe({ env: { AXE_JS: "/a/axe.min.js" }, tonTai: (p: string) => p === "/a/axe.min.js", goc: GOC }), "/a/axe.min.js");
  assert.throws(() => timAxe({ env: { AXE_JS: "/khong/co.js" }, tonTai: () => false, goc: GOC }), /AXE_JS/);
  // AXE_JS hỏng nhưng node_modules có: vẫn lỗi
  assert.throws(() => timAxe({ env: { AXE_JS: "/khong/co.js" }, tonTai: (p: string) => p.includes("node_modules"), goc: GOC }), /AXE_JS/);
});

test("timAxe: không AXE_JS thì dùng node_modules/axe-core/axe.min.js; không thấy ⇒ null", () => {
  const mac = join(GOC, "node_modules", "axe-core", "axe.min.js");
  assert.equal(timAxe({ env: {}, tonTai: (p: string) => p === mac, goc: GOC }), mac);
  assert.equal(timAxe({ env: {}, tonTai: () => false, goc: GOC }), null);
  assert.equal(timAxe({ env: { AXE_JS: "" }, tonTai: () => false, goc: GOC }), null);
});
