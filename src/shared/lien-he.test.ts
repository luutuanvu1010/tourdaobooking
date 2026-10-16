import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_LOAI_LIEN_HE, nhanLoaiLienHe } from "./lien-he.ts";

test("nhãn loại liên hệ: ba loại có nhãn tiếng Việt; mã lạ ⇒ 'Liên hệ' (không lộ mã thô)", () => {
  assert.deepEqual(NHAN_LOAI_LIEN_HE, { PHONE: "Điện thoại", EMAIL: "Email", ADDRESS: "Địa chỉ" });
  assert.equal(nhanLoaiLienHe("ADDRESS"), "Địa chỉ");
  assert.equal(nhanLoaiLienHe("ZALO"), "Liên hệ");
});
