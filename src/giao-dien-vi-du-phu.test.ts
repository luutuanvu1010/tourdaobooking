// Độ phủ bộ ví dụ thử trợ lý đánh giá giao diện (scripts/giao-dien/vi-du/ca.json): mỗi tiêu chí suy xét S có ít nhất một ca; tệp cấy có thật; ô đúng dạng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
// @ts-expect-error tệp .mjs không có kiểu
import { BO_QUYEN } from "../scripts/giao-dien/moi-truong.mjs";

type Ca = { ma: string; o: string; tiem: string | null; nhom: string; mongDoi: { ma: string[]; tuKhoa: string[] } | null };
const CA: Ca[] = JSON.parse(readFileSync(new URL("../scripts/giao-dien/vi-du/ca.json", import.meta.url), "utf8"));

test("đủ 20 ca, mã ca không trùng và đúng dạng ca-01…ca-20", () => {
  assert.equal(CA.length, 20);
  assert.deepEqual(CA.map((c) => c.ma), Array.from({ length: 20 }, (_, i) => `ca-${String(i + 1).padStart(2, "0")}`));
  assert.equal(new Set(CA.map((c) => c.ma)).size, 20);
});

test("mỗi tiêu đề ### S<số> của tài liệu tiêu chí có ít nhất một ca mà ma[0] là mã đó", () => {
  const md = readFileSync(new URL("../docs/TIEU-CHI-GIAO-DIEN.md", import.meta.url), "utf8");
  const ma = [...md.matchAll(/^### (S\d+)\b/gm)].map((m) => m[1]);
  assert.equal(ma.length, 10);
  for (const m of ma) assert.ok(CA.some((c) => c.mongDoi?.ma[0] === m), `chưa có ca nào cho ${m}`);
});

test("mọi tệp tiem có thật; nhóm hợp lệ; mongDoi đúng với nhóm", () => {
  for (const c of CA) {
    if (c.tiem) assert.ok(existsSync(new URL(`../scripts/giao-dien/vi-du/tiem/${c.tiem}`, import.meta.url)), `${c.ma}: thiếu tệp ${c.tiem}`);
    assert.ok(["cay", "that", "khong-cay"].includes(c.nhom), `${c.ma}: nhóm lạ ${c.nhom}`);
    if (c.nhom === "cay") assert.ok(c.tiem, `${c.ma}: ca cấy phải có tệp tiem`);
    if (c.nhom === "khong-cay") { assert.equal(c.mongDoi, null); assert.equal(c.tiem, null); }
    else assert.ok(c.mongDoi && c.mongDoi.ma.length && c.mongDoi.tuKhoa.length && c.mongDoi.tuKhoa.every((k) => k === k.toLowerCase()), `${c.ma}: mongDoi sai`);
  }
});

test("mọi ô đúng dạng BỘ:/trang với bộ có trong BO_QUYEN", () => {
  for (const c of CA) {
    const m = c.o.match(/^([A-Z_]+):(\/.*)$/);
    assert.ok(m, `${c.ma}: ô sai dạng ${c.o}`);
    assert.ok(BO_QUYEN[m![1]], `${c.ma}: bộ lạ ${m![1]}`);
  }
});
