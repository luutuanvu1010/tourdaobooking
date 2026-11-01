import { test } from "node:test";
import assert from "node:assert/strict";
import { GOI_Y_GHI_CHU_DOI_TAC, GOI_Y_GIAM_GIA_DOI_TAC, MAX_GHI_CHU_DICH_VU, NHAN_GHI_CHU_DOI_TAC, formGonDoiTac } from "./form-dat-ve.ts";

test("formGonDoiTac: mọi tài khoản có quyền Đối tác (kể cả lai Bán hàng + Đối tác) dùng form gọn; tài khoản không có quyền Đối tác thì không", () => {
  assert.equal(formGonDoiTac({ permissions: ["PARTNER"] }), true);
  assert.equal(formGonDoiTac({ permissions: ["SALES", "PARTNER"] }), true);
  for (const quyen of [["SALES"], ["INTERN"], ["ADMIN"], ["SUPER_ADMIN"]] as const) {
    assert.equal(formGonDoiTac({ permissions: [...quyen] }), false, `không gọn với ${quyen.join("+")}`);
  }
});

test("chữ của form gọn đúng từng ký tự theo bản thiết kế; trần ghi chú bằng trần của máy chủ (validateTrip: 1000)", () => {
  assert.equal(GOI_Y_GIAM_GIA_DOI_TAC, "Giảm giá cho khách");
  assert.equal(NHAN_GHI_CHU_DOI_TAC, "Ghi chú");
  assert.equal(GOI_Y_GHI_CHU_DOI_TAC, "Thời gian đón");
  assert.equal(MAX_GHI_CHU_DICH_VU, 1000);
});
