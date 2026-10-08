import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_THIEU_MUC, NHAN_LY_DO_THIEU, laDongThuongMai, nhanMuc, nhanTyLeBp } from "./so-dai-ly-nhan.ts";

test("nhãn tiếng Việt, không lộ mã thô", () => {
  assert.equal(nhanTyLeBp(1250), "12,5%");
  assert.equal(nhanTyLeBp(1000), "10%");
  assert.equal(nhanTyLeBp(1), "0,01%");
  assert.equal(nhanTyLeBp(0), "0%");
  assert.equal(nhanMuc({ kind: "PER_PAX", rateBp: null, perPax: 50_000 }), "50.000đ/khách");
  assert.equal(nhanMuc({ kind: "RATE", rateBp: 1250, perPax: null }), "12,5%");
  for (const v of Object.values(NHAN_LY_DO_THIEU)) assert.doesNotMatch(v, /[A-Z]{3,}/);
  assert.equal(NHAN_LY_DO_THIEU.NO_RULE, "Chưa có mức cho dịch vụ này");
  assert.equal(CAU_THIEU_MUC, "Thiếu mức — Kế toán xử lý");
});

test("laDongThuongMai: ba hành động order_terms_*", () => {
  for (const a of ["order_terms_captured", "order_terms_recaptured", "order_terms_manual"]) assert.ok(laDongThuongMai(a));
  assert.equal(laDongThuongMai("confirmed"), false);
});

test("đủ năm lý do thiếu mức của bản chụp, mỗi lý do một câu khác nhau", () => {
  assert.deepEqual(Object.keys(NHAN_LY_DO_THIEU).sort(), ["BOOKER_NOT_BENEFICIARY", "MANUAL_LINE", "NOT_CAPTURED", "NO_RULE", "RULE_CONFLICT"]);
  assert.equal(new Set(Object.values(NHAN_LY_DO_THIEU)).size, 5);
});
