// Luật thuần ô «Vé do ai phát» (ADR-0175 Đ1.2): không có dòng là vé hãng ngoài.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nguonVeCua, type NguonVe } from "./nguon-ve.ts";

test("nguonVeCua: không có dòng, hoặc dịch vụ nhập tay (mã null), là HANG_NGOAI; có dòng thì theo dòng", () => {
  assert.equal(nguonVeCua("ZVD1", new Map()), "HANG_NGOAI");
  assert.equal(nguonVeCua(null, new Map<string, NguonVe>([["ZVD1", "TOUR_DAO"]])), "HANG_NGOAI");
  assert.equal(nguonVeCua("ZVD1", new Map<string, NguonVe>([["ZVD1", "TOUR_DAO"]])), "TOUR_DAO");
  assert.equal(nguonVeCua("ZVD1", new Map<string, NguonVe>([["ZVD1", "HANG_NGOAI"]])), "HANG_NGOAI");
  assert.equal(nguonVeCua("KHAC", new Map<string, NguonVe>([["ZVD1", "TOUR_DAO"]])), "HANG_NGOAI");
});
