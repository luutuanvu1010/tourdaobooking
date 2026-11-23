// ADR-0229 Đ10 — bổ sung theo người kiểm độc lập 23/11 (N2): dòng thương mại lúc «Đã giao» (`dongThuongMaiTu`) tính hoa hồng TỶ LỆ trên `coSoHoaHong` (thành tiền trừ phần tăng
// mùa vụ), không trên thành tiền; giá vốn vẫn trên thành tiền. Số theo sổ vàng H2: 2 × 515.000, cơ sở 900.000, 10 % ⇒ 90.000.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dongThuongMaiTu } from "./rules.ts";
import type { BanChup } from "../../shared/hoa-hong-dong.ts";

const chup = (o: { rateBp: number; costRateBp?: number }): BanChup => ({
  serviceId: "s1", beneficiaryPartyId: "dai-ly", hoaHong: { status: "SET", kind: "RATE", rateBp: o.rateBp, perPax: null, ruleId: "r", source: "AUTO" },
  cungUng: o.costRateBp ? { status: "SET", termId: "t", sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: o.costRateBp } : { status: "SET", termId: "t", sellerPartyId: "cty", supplierPartyId: null, costRateBp: null },
} as unknown as BanChup);

test("N2: «Đã giao» — hoa hồng 10 % trên cơ sở 900.000 = 90.000 (không phải 103.000); giá vốn 80 % vẫn trên thành tiền 1.030.000", () => {
  const [d] = dongThuongMaiTu({ chup: [chup({ rateBp: 1000 })], dichVu: [{ id: "s1", name: "Tour 3 đảo", thanhTien: 1_030_000, coSoHoaHong: 900_000, soKhachTinh: 2, pax: null }] });
  assert.equal(d!.hoaHong, 90_000);
  assert.equal(d!.thanhTien, 1_030_000);
  const [v] = dongThuongMaiTu({ chup: [chup({ rateBp: 1000, costRateBp: 8000 })], dichVu: [{ id: "s1", name: "Vé", thanhTien: 1_030_000, coSoHoaHong: 900_000, soKhachTinh: 2, pax: null }] });
  assert.equal(v!.giaVon, 824_000);
});
