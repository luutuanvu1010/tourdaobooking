// Task 6 (đợt 0): chân dính một kiểu — hàm thuần đoán "có thanh dính đang hiện" và rào cho vòng quan sát của shell.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BO_CHON_THANH_DINH, boTheoDoi, coThanhDinhHien, thanhDinhHien } from "./shared/thanh-dinh-day.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("coThanhDinhHien: rỗng, đang hiện, nằm trong sheet, thiếu getClientRects", () => {
  assert.equal(coThanhDinhHien([]), false);
  assert.equal(coThanhDinhHien([{ getClientRects: () => [1], closest: () => null }]), true);
  assert.equal(coThanhDinhHien([{ getClientRects: () => [1], closest: () => ({}) as Element }]), false);
  assert.equal(coThanhDinhHien([{ getClientRects: () => [], closest: () => null }]), false);
  assert.equal(coThanhDinhHien([{ closest: () => null }]), false);
});

test("BO_CHON_THANH_DINH loại .dp-run-end", () => {
  assert.match(BO_CHON_THANH_DINH, /^\.thanh-hanh-dong-cuoi:not\(\.dp-run-end\)$/);
});

test("boTheoDoi: chỉ gọi khi giá trị đổi (lần đầu luôn gọi)", () => {
  const goi: boolean[] = [];
  const cap = boTheoDoi((co) => goi.push(co));
  for (const co of [false, false, true, true, false]) cap(co);
  assert.deepEqual(goi, [false, true, false]);
});

test("thanhDinhHien trả đúng phần tử đầu tiên đang hiện", () => {
  const an = { getClientRects: () => [], closest: () => null };
  const hien = { getClientRects: () => [1], closest: () => null };
  assert.equal(thanhDinhHien([an, hien]), hien);
  assert.equal(thanhDinhHien([an]), null);
});

test("shell.ts: có rào MutationObserver, không quan sát thuộc tính của body (tránh vòng tự kích)", () => {
  const src = readFileSync(`${ROOT}web/shell.ts`, "utf8");
  assert.match(src, /typeof MutationObserver/);
  assert.match(src, /boTheoDoi\(/);
  const i = src.indexOf("function theoDoiThanhDinh");
  assert.ok(i > 0);
  const ham = src.slice(i, src.indexOf("\n}\n", i));
  const bodyCalls = [...ham.matchAll(/observe\(document\.body[^)]*\)[^;]*;/g)].map((m) => m[0]);
  assert.equal(bodyCalls.length, 1);
  assert.doesNotMatch(bodyCalls[0]!, /attribute/);
  assert.match(ham, /observe\(main/);
});

// Task 15 (dot-0-smoke.mjs bước 16 đỏ): trang Hỗ trợ tự ẩn thanh tab khi mở luồng (`datThanhTab(false)`, lớp `tabbar-an`); khi ô trả lời dính đáy bị ẩn lúc luồng còn mở
// (`dungVi` của ho-tro-luong.ts), bộ theo dõi của shell gọi `datThanhTab(true)` và xoá luôn lớp của trang ⇒ thanh tab hiện lại chồng lên luồng toàn màn.
// Hai nguồn ẩn phải tách: bộ theo dõi chỉ đổi lớp RIÊNG `tabbar-dinh`, không đụng `tabbar-an` của trang; CSS ẩn thanh tab khi có một trong hai lớp.
test("bộ theo dõi thanh dính dùng lớp riêng tabbar-dinh, không gọi datThanhTab (không xoá lớp ẩn do trang đặt)", () => {
  const src = readFileSync(`${ROOT}web/shell.ts`, "utf8");
  const i = src.indexOf("function theoDoiThanhDinh");
  const ham = src.slice(i, src.indexOf("\n}\n", i));
  assert.doesNotMatch(ham, /datThanhTab\(/);
  assert.match(ham, /classList\.toggle\("tabbar-dinh"/);
  const css = readFileSync(`${ROOT}public/app.css`, "utf8");
  assert.match(css, /body\.tabbar-an #tabbar, body\.tabbar-dinh #tabbar \{ display: none; \}/);
  assert.match(css, /body\.has-tabbar\.tabbar-an main, body\.has-tabbar\.tabbar-dinh main \{/);
  assert.match(css, /body\.tabbar-an \.vc-bottom-bar, body\.tabbar-dinh \.vc-bottom-bar \{ bottom: 0; \}/);
});

// Hệ quả của lớp riêng: trang gọi datThanhTab(true) khi đóng luồng (Hỗ trợ) thì `tabbar-dinh` còn đọng tới khung hình sau (bộ theo dõi gom theo
// requestAnimationFrame) ⇒ thanh tab hiện trễ một nhịp (ho-tro-smoke bước 8 «đóng bằng nút quay lại» đỏ). datThanhTab xếp một lần đo lại ngay sau đoạn mã
// đang chạy (queueMicrotask) để hai lớp khớp nhau trước lần vẽ kế.
test("datThanhTab xếp đo lại thanh dính bằng queueMicrotask (không chờ khung hình sau)", () => {
  const src = readFileSync(`${ROOT}web/shell.ts`, "utf8");
  const i = src.indexOf("export function datThanhTab");
  const ham = src.slice(i, src.indexOf("\n}\n", i));
  assert.match(ham, /queueMicrotask\(kiemThanhDinh\)/);
  assert.match(src, /kiemThanhDinh = capNhat;/);
});
