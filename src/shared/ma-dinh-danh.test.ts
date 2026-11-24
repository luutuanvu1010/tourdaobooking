import { test } from "node:test";
import assert from "node:assert/strict";
import { MA_DINH_DANH_RE, TIEN_TO_MA, sinhMa } from "./ma-dinh-danh.ts";

const BYTES = new Uint8Array([0, 1, 2, 25, 26, 27, 200, 255]);
test("sinhMa: khớp hình dạng mã và giữ đúng chuỗi cũ của LD / MT", () => {
  assert.match(sinhMa("LD", BYTES), MA_DINH_DANH_RE);
  assert.equal(sinhMa("LD", BYTES), "LD_" + Array.from(BYTES, (b) => String.fromCharCode(65 + (b % 26))).join(""));
  assert.equal(sinhMa("MT", BYTES), "MT_" + sinhMa("LD", BYTES).slice(3));
});
test("sinhMa: tiền tố ngoài bảng thì ném lỗi", () => {
  assert.throws(() => sinhMa("XX", BYTES));
});
test("hàng rào: không hai dòng TIEN_TO_MA trùng tiền tố, mọi tiền tố là 2–3 chữ hoa", () => {
  const ds = TIEN_TO_MA.map((d) => d.tienTo);
  assert.equal(new Set(ds).size, ds.length, "hai loại bản ghi trùng tiền tố mã");
  for (const t of ds) assert.match(t, /^[A-Z]{2,3}$/);
});
test("ADR-0217: tiền tố VE (số sê-ri vé) có trong bảng; mã sinh ra khớp hình dạng", () => {
  assert.ok(TIEN_TO_MA.some((d) => d.tienTo === "VE"));
  assert.match(sinhMa("VE", BYTES), /^VE_[A-Z]{8}$/);
  assert.match(sinhMa("VE", BYTES), MA_DINH_DANH_RE);
});
