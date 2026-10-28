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
