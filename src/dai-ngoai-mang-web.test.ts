import assert from "node:assert/strict";
import { test } from "node:test";
import { dungDomGia, NutGia } from "./dom-gia.ts";

dungDomGia();
const { veThanNgoaiMang } = await import("../web/dai.ts");

test("nhánh mất mạng của shell: <main> có sẵn khung/khoảng trắng ⇒ thay bằng khối «chưa nạp được»", () => {
  const main = new NutGia("main");
  main.append("\n  ", new NutGia("div"));
  veThanNgoaiMang(main as unknown as Element, () => undefined);
  assert.equal(main.querySelectorAll("[data-loai]").length, 1);
  assert.equal(main.querySelectorAll("div").length, 0);
  assert.equal(main.querySelector("[data-loai]")!.getAttribute("data-loai"), "mat-mang-chua-nap");
});

test("trang đã tự vẽ khối trạng thái (vd /ngoai-mang) ⇒ giữ nguyên, không vẽ đè", () => {
  const main = new NutGia("main");
  const co = new NutGia("section");
  co.setAttribute("data-loai", "mat-mang-chua-nap");
  main.append(co);
  veThanNgoaiMang(main as unknown as Element, () => undefined);
  assert.equal(main.children.length, 1);
  assert.equal(main.children[0], co);
});

test("không có <main> ⇒ không ném", () => {
  veThanNgoaiMang(null, () => undefined);
});
