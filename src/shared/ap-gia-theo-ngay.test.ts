// ADR-0229 Đ7: form chọn giá theo ngày đi từ `giaTheoNgay` của `/api/catalog/for-order`, đổi ngày nhiều lần vẫn tính từ giá gốc.
import { test } from "node:test";
import assert from "node:assert/strict";
import { apGiaTheoNgay, type CatalogTheoNgay } from "./service-form.ts";

const goc = { adult: 450000, child: 300000, senior: null, infant: 0 };
const item: CatalogTheoNgay = {
  code: "T3D", name: "Tour 3 đảo", unit: "perPax", prices: goc, notes: { child: null, senior: null, infant: null },
  giaTheoNgay: [{ tu: "2027-02-01", den: "2027-02-15", prices: { adult: 515000, child: 350000, senior: null, infant: 0 }, mucTang: { phanTram: 10, soTien: 20000 } }],
};

test("ngày trong đoạn ⇒ giá mùa vụ + mức tăng; ngày ngoài đoạn / chưa có ngày ⇒ giá gốc; đổi ngày lần hai vẫn từ giá gốc", () => {
  const trong = apGiaTheoNgay(item, "2027-02-05");
  assert.equal(trong.prices.adult, 515000);
  assert.deepEqual(trong.mucTang, { phanTram: 10, soTien: 20000 });
  const ngoai = apGiaTheoNgay(trong, "2027-02-20");
  assert.deepEqual(ngoai.prices, goc);
  assert.equal(ngoai.mucTang, null);
  assert.deepEqual(apGiaTheoNgay(trong, null).prices, goc);
  assert.equal(apGiaTheoNgay(apGiaTheoNgay(ngoai, "2027-02-15"), "2027-02-01").prices.adult, 515000);
});

test("dịch vụ không có giaTheoNgay (bản chụp, /api/catalog) ⇒ giữ nguyên", () => {
  const banChup = { code: "X", name: "X", unit: "perPax", prices: goc, notes: { child: null, senior: null, infant: null } };
  assert.equal(apGiaTheoNgay(banChup, "2027-02-05"), banChup);
});
