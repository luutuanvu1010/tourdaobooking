import { test } from "node:test";
import assert from "node:assert/strict";
import { DANH_SACH_PHI_DON, TRAN_PHI_DON, CAU_VUOT_TRAN_PHI_DON, CAU_KHONG_HOP_LE_PHI_DON, kiemMucChon, tinhPhiChon } from "./phi-don-chon.ts";

test("hằng số đúng lời chủ", () => {
  assert.deepEqual([...DANH_SACH_PHI_DON], [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000]);
  assert.equal(TRAN_PHI_DON, 5_000_000);
  assert.equal(CAU_VUOT_TRAN_PHI_DON, "Mức phí tối đa 5.000.000 đ.");
});
test("kiemMucChon: mức hợp lệ", () => {
  for (const s of DANH_SACH_PHI_DON) assert.deepEqual(kiemMucChon({ loai: "DANH_SACH", soTien: s }), { ok: true, muc: { loai: "DANH_SACH", soTien: s } });
  for (const s of [1, 70000, 5_000_000]) assert.equal(kiemMucChon({ loai: "SO_KHAC", soTien: s }).ok, true);
});
test("kiemMucChon: từ chối", () => {
  const ng = (loi: string, v: unknown) => assert.deepEqual(kiemMucChon(v), { ok: false, loi }, JSON.stringify(v));
  ng("VUOT_TRAN", { loai: "SO_KHAC", soTien: 5_000_001 });
  ng("VUOT_TRAN", { loai: "SO_KHAC", soTien: 6_000_000 });
  for (const s of [0, -1, 1.5, NaN, Infinity, "70000", null, undefined]) ng("KHONG_HOP_LE", { loai: "SO_KHAC", soTien: s });
  ng("KHONG_HOP_LE", { loai: "DANH_SACH", soTien: 7000 });
  ng("KHONG_HOP_LE", { loai: "DANH_SACH", soTien: "5000" });
  ng("KHONG_HOP_LE", { loai: "KHAC", soTien: 5000 });
  for (const v of [null, undefined, 5000, "x", [], {}]) ng("KHONG_HOP_LE", v);
});
test("tinhPhiChon", () => {
  const muc = { loai: "DANH_SACH", soTien: 30000 } as const;
  const b = { muc, xeRieng: false, direction: "OUT", soKhachTinhTien: 2, paxOverride: null } as const;
  assert.deepEqual(tinhPhiChon(b), { donGia: 30000, soLuong: 2, tien: 60000 });
  assert.deepEqual(tinhPhiChon({ ...b, xeRieng: true, soKhachTinhTien: 9 }), { donGia: 30000, soLuong: 1, tien: 30000 });
  assert.deepEqual(tinhPhiChon({ ...b, direction: "RETURN", soKhachTinhTien: 4, paxOverride: 2 }), { donGia: 30000, soLuong: 2, tien: 60000 });
  assert.equal(tinhPhiChon({ ...b, direction: "RETURN", soKhachTinhTien: 2, paxOverride: 5 })!.soLuong, 2, "lấy số nhỏ hơn");
  assert.equal(tinhPhiChon({ ...b, direction: "OUT", paxOverride: 1 })!.soLuong, 2, "chiều đi bỏ qua override");
  assert.equal(tinhPhiChon({ ...b, soKhachTinhTien: 0 }), null);
  assert.equal(tinhPhiChon({ ...b, direction: "RETURN", paxOverride: 0 }), null);
  assert.deepEqual(tinhPhiChon({ ...b, muc: { loai: "DANH_SACH", soTien: 0 } }), { donGia: 0, soLuong: 2, tien: 0 });
  assert.throws(() => tinhPhiChon({ ...b, muc: { loai: "SO_KHAC", soTien: 5_000_000 }, soKhachTinhTien: 2 ** 50 }), RangeError);
});
