import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
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

// Task 15 (help-smoke.mjs bước e đỏ trên nhánh, xanh ở gốc 1d3c67fd): /help vẽ nhật ký thay đổi TRƯỚC initShell để đọc được khi mất mạng (đặc tả 6.3:
// chỉ thay thân khi trang «chưa kịp vẽ gì»). Trang tự vẽ trước shell khai `<main data-ve-truoc-shell>` ⇒ giữ nội dung, chỉ có dải ngoài mạng.
test("trang khai data-ve-truoc-shell (vd /help) ⇒ giữ nội dung đã vẽ, không thay thân", () => {
  const main = new NutGia("main");
  main.setAttribute("data-ve-truoc-shell", "");
  const nhatKy = new NutGia("section");
  main.append(nhatKy);
  veThanNgoaiMang(main as unknown as Element, () => undefined);
  assert.equal(main.children.length, 1);
  assert.equal(main.children[0], nhatKy);
  assert.equal(main.querySelectorAll("[data-loai]").length, 0);
});

test("không có <main> ⇒ không ném", () => {
  veThanNgoaiMang(null, () => undefined);
});

// Lượt sửa cuối (I2, I3): thân «chưa nạp» đã vẽ ⇒ dải chỉ báo ngắn, không nút (không hai nút «Thử lại»); một lần gọi API có trả lời ⇒ gỡ dải.
const { thanNgoaiMang, hienDaiNgoaiMang, ganNgoaiMang, goDaiNgoaiMang } = await import("../web/dai.ts");
const body = (globalThis as unknown as { document: { body: NutGia } }).document.body;
const strips = new NutGia("div");
strips.setAttribute("id", "strips");
body.append(strips);
const dai = (): NutGia | null => strips.querySelector(".dai");

test("thân nhánh shell nói «chưa tải được dữ liệu», không nói «chưa mở lần nào»", () => {
  const chu = (thanNgoaiMang(() => undefined) as unknown as NutGia).textContent;
  assert.match(chu, /chưa tải được dữ liệu/);
  assert.doesNotMatch(chu, /chưa mở lần nào/);
});

test("chưa có thân «chưa nạp» ⇒ dải kèm nút Thử lại; đã có ⇒ dải «Đang ngoài mạng», không nút", () => {
  hienDaiNgoaiMang();
  assert.equal(dai()!.querySelectorAll("button").length, 1);
  const main = body.querySelector("main")!;
  main.replaceChildren(thanNgoaiMang(() => undefined) as unknown as NutGia);
  hienDaiNgoaiMang();
  assert.equal(dai()!.querySelector(".dai-cau")!.textContent, "Đang ngoài mạng");
  assert.equal(dai()!.querySelectorAll("button").length + dai()!.querySelectorAll("a").length, 0);
  main.replaceChildren();
});

test("tín hiệu ngoai-mang hiện dải; goDaiNgoaiMang (máy chủ đã trả lời) gỡ dải", () => {
  ganNgoaiMang();
  const w = (globalThis as unknown as { window: { dispatchEvent: (e: { type: string }) => boolean } }).window;
  w.dispatchEvent({ type: "ngoai-mang" });
  assert.ok(dai());
  goDaiNgoaiMang();
  assert.equal(dai(), null);
  goDaiNgoaiMang(); // không có dải: không ném
});

test("api.ts gỡ dải khi máy chủ trả lời; nhánh mất mạng của shell nghe online một lần ⇒ tải lại", () => {
  const api = readFileSync(new URL("../web/api.ts", import.meta.url), "utf8");
  const sauFetch = api.slice(api.indexOf("const res = await fetch("), api.indexOf("vongDoiVe.ketThuc(ve, { status"));
  assert.match(sauFetch, /\bgoDaiNgoaiMang\(\)/);
  const shell = readFileSync(new URL("../web/shell.ts", import.meta.url), "utf8");
  const i = shell.indexOf('veThanNgoaiMang(document.querySelector("main")');
  const nhanh = shell.slice(i, shell.indexOf("return new Promise<never>", i));
  assert.match(nhanh, /addEventListener\("online", taiLai\)/);
  assert.match(readFileSync(new URL("../web/dai.ts", import.meta.url), "utf8"), /export const taiLai = \(\): void => location\.reload\(\);/);
});
