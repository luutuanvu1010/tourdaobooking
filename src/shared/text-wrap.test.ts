import { test } from "node:test";
import assert from "node:assert/strict";
import { graphemes, wrapLines } from "./text-wrap.ts";

// Đo giả: mỗi mã ký tự rộng 10 đơn vị (chữ có dấu gõ rời tốn nhiều hơn chữ dựng sẵn — đúng thứ bộ vẽ phải xử lý).
const measure = (s: string): number => [...s].length * 10;
// Mã số thay cho ký tự đặc biệt (không chép ký tự ẩn/dấu rời vào tệp).
const cp = (...codes: number[]): string => String.fromCodePoint(...codes);
const NBSP = cp(0xa0);

test("vừa một dòng thì giữ nguyên; chuỗi rỗng ra một dòng rỗng", () => {
  assert.deepEqual(wrapLines("Tour 4 đảo", 200, measure), ["Tour 4 đảo"]);
  assert.deepEqual(wrapLines("", 200, measure), [""]);
});

test("ngắt tham lam tại dấu cách: mỗi dòng nhồi được nhiều từ nhất, từ không bị cắt khi còn vừa một dòng", () => {
  assert.deepEqual(wrapLines("aaa bbb ccc ddd", 70, measure), ["aaa bbb", "ccc ddd"]);
  assert.deepEqual(wrapLines("aaa bbb ccc", 60, measure), ["aaa", "bbb", "ccc"]);
  // dòng đúng bằng bề rộng vẫn vừa (≤, không phải <)
  assert.deepEqual(wrapLines("abc def", 70, measure), ["abc def"]);
});

test("xuống dòng cứng \\n luôn được giữ, kể cả dòng trống; ngắt theo bề rộng áp cho từng đoạn", () => {
  assert.deepEqual(wrapLines("a\n\nb", 200, measure), ["a", "", "b"]);
  assert.deepEqual(wrapLines("aaa bbb\nccc ddd", 40, measure), ["aaa", "bbb", "ccc", "ddd"]);
  assert.deepEqual(wrapLines("a\n", 200, measure), ["a", ""]);
});

test("từ dài hơn cả dòng (không có dấu cách) bị ngắt cứng; phần dư đứng làm đầu dòng kế và nhận tiếp từ sau", () => {
  assert.deepEqual(wrapLines("abcdefghij", 40, measure), ["abcd", "efgh", "ij"]);
  assert.deepEqual(wrapLines("xx abcdefghij yy", 40, measure), ["xx", "abcd", "efgh", "ij", "yy"]);
  assert.deepEqual(wrapLines("abcdefghij yy", 60, measure), ["abcdef", "ghij", "yy"]);
});

test("dấu NBSP không phải chỗ ngắt: 'số + NBSP + ₫' luôn ở cùng dòng (không mồ côi chữ ₫ ở dòng riêng); dấu cách thường thì ngắt được", () => {
  assert.deepEqual(wrapLines("aaaaa bbb c", 90, measure), ["aaaaa bbb", "c"]);
  assert.deepEqual(wrapLines(`aaaaa bbb${NBSP}c`, 90, measure), ["aaaaa", `bbb${NBSP}c`]);
});

test("dấu cách thừa: nhiều dấu cách liền nhau gộp thành một, dấu cách đầu/cuối đoạn bỏ (không dòng nào bắt đầu hay kết thúc bằng dấu cách)", () => {
  assert.deepEqual(wrapLines("  a   b  ", 200, measure), ["a b"]);
  for (const line of wrapLines("aa  bb   cc dd", 50, measure)) assert.equal(line, line.trim());
});

test("ngắt cứng theo CỤM ký tự: dấu tiếng Việt gõ rời (e + mũ + ngã) không bị tách khỏi chữ gốc, không dòng nào bắt đầu bằng dấu rời", () => {
  const ee = `e${cp(0x302, 0x303)}`; // ễ gõ rời: 3 mã ký tự, 1 cụm
  const word = ee.repeat(5);
  assert.deepEqual(graphemes(word), [ee, ee, ee, ee, ee]);
  const lines = wrapLines(word, 65, measure); // mỗi cụm 30 → 2 cụm/dòng (60 ≤ 65)
  assert.deepEqual(lines, [ee.repeat(2), ee.repeat(2), ee]);
  for (const line of lines) assert.ok(!/^\p{M}/u.test(line), "dòng không được bắt đầu bằng dấu rời");
});

test("bề rộng nhỏ hơn một ký tự vẫn kết thúc: mỗi dòng có ít nhất một cụm ký tự (không lặp vô hạn)", () => {
  assert.deepEqual(wrapLines("abc", 5, measure), ["a", "b", "c"]);
  assert.deepEqual(wrapLines("ab cd", 0, measure), ["a", "b", "c", "d"]);
});

test("chuỗi rất dài không dấu cách: ngắt cứng nhanh (tìm nhị phân, không đo từng ký tự một) và không mất ký tự", () => {
  const word = "x".repeat(20000);
  let calls = 0;
  const counting = (s: string): number => (calls++, measure(s));
  const lines = wrapLines(word, 400, counting);
  assert.equal(lines.length, 500);
  assert.equal(lines.join(""), word);
  assert.ok(lines.every((l) => measure(l) <= 400));
  assert.ok(calls < 20000, `đo ${calls} lần — phải ít hơn số ký tự`);
});

test("tổng quát: ghép lại các dòng (bỏ dấu cách/xuống dòng) luôn ra đúng chữ ban đầu, mọi dòng vừa bề rộng (trừ khi một cụm ký tự đã rộng hơn cả dòng)", () => {
  const text = "Tour 4 đảo Nha Trang — Người lớn (giá mỗi nhóm tối đa 5 khách)\nGhi chú: đón sớm 06:30, xe 7 chỗ";
  for (const width of [30, 55, 100, 250, 1000]) {
    const lines = wrapLines(text, width, measure);
    assert.equal(lines.join("").replace(/\s+/g, ""), text.replace(/\s+/g, ""), `bề rộng ${width}`);
    for (const line of lines) assert.ok(measure(line) <= Math.max(width, 10), `dòng "${line}" rộng ${measure(line)} > ${width}`);
  }
});
