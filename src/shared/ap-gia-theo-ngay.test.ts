// ADR-0229 Đ7: form chọn giá theo ngày đi từ `giaTheoNgay` của `/api/catalog/for-order`, đổi ngày nhiều lần vẫn tính từ giá gốc.
import { test } from "node:test";
import assert from "node:assert/strict";
import { apGiaTheoNgay, chuGiaMuaVu, doiNgayThe, draftFromDto, newCatalogDraft, setPax, setUnitPrice, toServiceInput, type CatalogDraft, type CatalogTheoNgay } from "./service-form.ts";
import type { OrderServiceDto } from "./contracts.ts";

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

// ---- thẻ dịch vụ khi đổi ngày đi (ADR-0229 Đ6 vá Q11, Đ7) và dòng «Giá mùa vụ» (Đ9) ----

const nhom = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

test("thẻ mới: đổi ngày vào mùa ⇒ đơn giá chưa thương lượng theo giá mùa vụ, đơn giá đã thương lượng giữ; catalogPriceSeen = giá theo ngày đi", () => {
  let d = setPax(newCatalogDraft(apGiaTheoNgay(item, "2027-02-20"), "k1"), "child", 1);
  d = setUnitPrice(d, "child", 280000); // văn phòng bớt giá trẻ em
  const mua = doiNgayThe(d, "2027-02-05", apGiaTheoNgay(item, "2027-02-05"));
  assert.equal(mua.trip.departDate, "2027-02-05");
  assert.deepEqual([mua.unitPrices.adult, mua.unitPrices.child], [515000, 280000]);
  assert.deepEqual((toServiceInput(mua) as { catalogPriceSeen: unknown }).catalogPriceSeen, { adult: 515000, child: 350000 });
  const ve = doiNgayThe(mua, "2027-02-20", apGiaTheoNgay(item, "2027-02-20"));
  assert.deepEqual([ve.unitPrices.adult, ve.unitPrices.child], [450000, 280000]);
});

const daLuu: OrderServiceDto = {
  id: "svc-1", kind: "catalog", catalogCode: "T3D", name: "Tour 3 đảo", unit: "perPax", pax: { adult: 2, child: 0, senior: 0, infant: 0 },
  items: [{ id: "i1", catalogCode: "T3D", paxCode: "adult", description: "Tour 3 đảo — Người lớn", detail: null, quantity: 2, unitPrice: 430000, catalogPrice: 450000, lineTotal: 860000 }],
  catalogStatus: null, departDate: "2027-02-20", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null, legs: [],
};

test("nháp đã lưu (bản chụp): đổi ngày ⇒ giá danh mục của ngày mới như máy chủ dựng lại (giữ đơn giá thương lượng); quay về đúng ngày đã lưu ⇒ lại bản chụp", () => {
  const d = draftFromDto(daLuu, new Map([["T3D", apGiaTheoNgay(item, "2027-02-20")]]), "k1") as CatalogDraft;
  assert.equal(d.source, "snapshot");
  const mua = doiNgayThe(d, "2027-02-05", apGiaTheoNgay(item, "2027-02-05"));
  assert.deepEqual([mua.source, mua.unitPrices.adult, mua.item.prices.adult], ["live", 430000, 515000]); // 430.000 là giá đã thương lượng (khác giá danh mục 450.000 đã lưu)
  assert.deepEqual((toServiceInput(mua) as { catalogPriceSeen: unknown }).catalogPriceSeen, { adult: 515000 });
  const chuaBot = doiNgayThe(draftFromDto({ ...daLuu, items: [{ ...daLuu.items[0]!, unitPrice: 450000, lineTotal: 900000 }] }, new Map([["T3D", apGiaTheoNgay(item, "2027-02-20")]]), "k3") as CatalogDraft, "2027-02-05", apGiaTheoNgay(item, "2027-02-05"));
  assert.equal(chuaBot.unitPrices.adult, 515000); // ví dụ ADR-0229 tiêu chí 4: nháp 900.000 đổi sang 05/02 ⇒ 2 × 515.000
  assert.equal(doiNgayThe(d, "2027-02-20", apGiaTheoNgay(item, "2027-02-20")).source, "snapshot");
  const lai = doiNgayThe(mua, "2027-02-20", apGiaTheoNgay(item, "2027-02-20"));
  assert.deepEqual([lai.source, lai.unitPrices.adult], ["snapshot", 430000]);
  // cùng số khách nhưng khác ngày ⇒ KHÔNG quay lại bản chụp (máy chủ chỉ giữ bản chụp khi cả ngày đi y như đã lưu)
  assert.equal(setPax(setPax(mua, "adult", 3), "adult", 2).source, "live");
  // danh mục không còn dịch vụ: thẻ khoá chỉ đổi ngày
  const khoa = draftFromDto(daLuu, new Map(), "k2") as CatalogDraft;
  assert.deepEqual([doiNgayThe(khoa, "2027-02-05", null).source, doiNgayThe(khoa, "2027-02-05", null).trip.departDate], ["snapshot", "2027-02-05"]);
});

test("dòng «Giá mùa vụ»: văn phòng thấy khi ngày trong mùa; ngoài mùa hoặc Đối tác (máy chủ không gửi mucTang) thì không", () => {
  assert.equal(chuGiaMuaVu(apGiaTheoNgay(item, "2027-02-05"), nhom), "Giá mùa vụ: +10 % +20.000 đ");
  assert.equal(chuGiaMuaVu(apGiaTheoNgay(item, "2027-02-20"), nhom), null);
  const doiTac: CatalogTheoNgay = { ...item, giaTheoNgay: item.giaTheoNgay!.map(({ mucTang: _m, ...x }) => x) };
  const dt = apGiaTheoNgay(doiTac, "2027-02-05");
  assert.equal(dt.prices.adult, 515000);
  assert.equal(chuGiaMuaVu(dt, nhom), null);
  assert.equal(chuGiaMuaVu({ ...item, mucTang: { phanTram: 0, soTien: 5000 } }, nhom), "Giá mùa vụ: +5.000 đ");
});

test("nạp nháp: draftFromDto lấy giá danh mục của chính ngày đi đã lưu từ map for-order (giaTheoNgay)", () => {
  const d = draftFromDto({ ...daLuu, departDate: "2027-02-05" }, new Map([["T3D", item]]), "k1") as CatalogDraft;
  assert.equal(d.live?.prices.adult, 515000);
  assert.equal(setPax(d, "adult", 3).unitPrices.adult, 515000); // đổi số khách ⇒ giá hiện tại của ngày đi, không phải giá gốc
});
