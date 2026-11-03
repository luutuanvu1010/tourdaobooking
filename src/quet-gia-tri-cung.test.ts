// Phép quét «giá trị viết cứng» của khối app iPhone (scripts/quet-gia-tri-cung.mjs, dùng ở tests/e2e/pwa.mjs). Khoá: điều kiện @media / @container được miễn (chủ duyệt @container 2026-10-31), còn MỌI thứ khác vẫn bị bắt.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { MARK, quetGiaTriCung } from "../scripts/quet-gia-tri-cung.mjs";

const bao = (thanCss: string): string => `.truoc { width: 999px; }\n${MARK} — thử */\n${thanCss}`;

test("điều kiện @media và @container được miễn (cùng lý do: CSS không cho var() trong điều kiện)", () => {
  assert.deepEqual(quetGiaTriCung(bao("@media (min-width: 641px) { .a { padding: var(--s2); } }")), []);
  assert.deepEqual(quetGiaTriCung(bao("@container (min-width: 54rem) { .a { padding: var(--s2); } }")), []);
  assert.deepEqual(quetGiaTriCung(bao("@container (max-width: 44rem) { .a { padding: var(--s2); } }\n@container khoi (min-width: 30rem) { .b { gap: var(--s1); } }")), []);
});

test("luật VẪN bắt: px / rem viết cứng trong khai báo thường, màu hex, rgb()", () => {
  assert.deepEqual(quetGiaTriCung(bao(".a { width: 24px; }")), ["24px"]);
  assert.deepEqual(quetGiaTriCung(bao(".a { padding: 1.5rem; }")), ["1.5rem"]);
  assert.deepEqual(quetGiaTriCung(bao(".a { color: #fff; }")), ["#fff"]);
  assert.deepEqual(quetGiaTriCung(bao(".a { color: rgba(0,0,0,.5); }")), ["rgba("]);
  assert.deepEqual(quetGiaTriCung(bao(".a { border: 1px solid var(--c-border); }")), [], "viền 1px là ngoại lệ có sẵn");
});

test("chỉ ĐIỀU KIỆN được miễn: giá trị trong THÂN @container / @media vẫn bị quét", () => {
  assert.deepEqual(quetGiaTriCung(bao("@container (min-width: 54rem) { .a { width: 40rem; } }")), ["40rem"]);
  assert.deepEqual(quetGiaTriCung(bao("@container (min-width: 54rem) { .a { color: #abc; margin: 12px; } }")), ["#abc", "12px"]);
  assert.deepEqual(quetGiaTriCung(bao("@media (min-width: 641px) { .a { height: 3em; } }")), ["3em"]);
});

test("phần TRƯỚC dấu mốc không bị quét; mất dấu mốc thì ném lỗi", () => {
  assert.deepEqual(quetGiaTriCung(bao(".a { color: var(--c-text); }")), []);
  assert.throws(() => quetGiaTriCung(".a { width: 5px; }"), /dấu mốc/);
});

test("app.css thật: 0 giá trị viết cứng ở khối PWA (bản 2.53)", () => {
  const css = readFileSync(fileURLToPath(new URL("../public/app.css", import.meta.url)), "utf8");
  assert.deepEqual(quetGiaTriCung(css), []);
});
