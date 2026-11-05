// Luật thuần ô «Có vé» (ADR-0174 Đ2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { coVeCua } from "./co-ve.ts";

const co = (d: [string, boolean][], n: [string, boolean][]) => ({ coDichVu: new Map(d), coNhom: new Map(n) });

test("coVeCua: dòng riêng thắng nhóm hai chiều; chưa khai, không nhóm, nhập tay là Không vé", () => {
  assert.deepEqual(coVeCua("A", "G", co([["A", true]], [["G", false]])), { coVe: true, nguon: "SERVICE" });
  assert.deepEqual(coVeCua("A", "G", co([["A", false]], [["G", true]])), { coVe: false, nguon: "SERVICE" });
  assert.deepEqual(coVeCua("A", "G", co([], [["G", true]])), { coVe: true, nguon: "GROUP" });
  assert.deepEqual(coVeCua("A", "G", co([], [["G", false]])), { coVe: false, nguon: "GROUP" });
  assert.deepEqual(coVeCua("A", "G", co([], [])), { coVe: false, nguon: "CHUA_KHAI" });
  assert.deepEqual(coVeCua("A", null, co([], [["G", true]])), { coVe: false, nguon: "CHUA_KHAI" });
  assert.deepEqual(coVeCua(null, "G", co([], [["G", true]])), { coVe: false, nguon: "CHUA_KHAI" });
});
