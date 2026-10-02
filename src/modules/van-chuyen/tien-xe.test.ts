// Luật thuần TIỀN XE THUÊ (ADR-0057 T1 B2, T2 C4/C6/C8) — bảng ca theo "Ví dụ vàng" của kế hoạch Đợt 4 (V1–V13).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chonDongGiaThue, coXeCua, dongChongGia, type CoXe, type DongGiaThue } from "./tien-xe.ts";

const HP = "p-hung-phat";
const CO: CoXe[] = [
  { code: "C16", min: 10, max: 16, active: true },
  { code: "C29", min: 17, max: 29, active: true },
  { code: "C45CU", min: 30, max: 45, active: false },
];
const G: DongGiaThue[] = [
  { id: "G1", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: "C16", amount: 1_200_000, validFrom: "2026-10-01", validTo: "2026-10-31" },
  { id: "G2", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: null, amount: 1_000_000, validFrom: "2026-10-01", validTo: "2026-10-31" },
  { id: "G3", carrierPartyId: HP, routeCode: null, sizeCode: "C16", amount: 900_000, validFrom: "2026-10-01", validTo: null },
  { id: "G4", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: null, amount: 1_100_000, validFrom: "2026-11-01", validTo: null },
  { id: "KHAC", carrierPartyId: "p-khac", routeCode: "NT-CR", sizeCode: "C16", amount: 5_000_000, validFrom: "2026-01-01", validTo: null },
];
const ca = (routeCode: string | null, so: number, ngayChay: string) => chonDongGiaThue({ carrierPartyId: HP, routeCode, sizeCode: coXeCua(so, CO), ngayChay }, G)?.id ?? null;

test("coXeCua: khoảng tính cả hai đầu; cỡ ngưng dùng không áp; ngoài mọi khoảng → null", () => {
  assert.equal(coXeCua(10, CO), "C16");
  assert.equal(coXeCua(16, CO), "C16");
  assert.equal(coXeCua(17, CO), "C29");
  assert.equal(coXeCua(35, CO), null);
  assert.equal(coXeCua(9, CO), null);
});

test("chonDongGiaThue — ví dụ vàng V1–V6: tuyến+cỡ > tuyến > cỡ; ranh ngày; không dòng → null; đúng nhà xe", () => {
  assert.equal(ca("NT-CR", 16, "2026-10-15"), "G1"); // V1
  assert.equal(ca("NT-CR", 29, "2026-10-15"), "G2"); // V2
  assert.equal(ca(null, 16, "2026-10-15"), "G3"); // V3
  assert.equal(ca("NT-DL", 16, "2026-10-15"), "G3"); // V4
  assert.equal(ca("NT-CR", 29, "2026-10-31"), "G2"); // V5a ngày cuối vẫn áp
  assert.equal(ca("NT-CR", 29, "2026-11-01"), "G4"); // V5b
  assert.equal(ca("NT-CR", 29, "2026-09-30"), null); // trước ngày bắt đầu
  assert.equal(ca(null, 29, "2026-10-15"), null); // V6 thiếu giá
  assert.equal(chonDongGiaThue({ carrierPartyId: "p-la", routeCode: "NT-CR", sizeCode: "C16", ngayChay: "2026-10-15" }, G), null);
});

test("dongChongGia: cùng khoá (nhà xe, tuyến, cỡ — so cả trống) giao ngày → chồng; khác khoá hoặc ngày rời → không", () => {
  const moi = { carrierPartyId: HP, routeCode: "NT-CR", sizeCode: null, validFrom: "2026-10-31", validTo: null };
  assert.equal(dongChongGia(moi, G)?.id, "G2"); // 31/10 chạm G2 (tính cả ngày cuối)
  assert.equal(dongChongGia({ ...moi, validFrom: "2026-11-01" }, G)?.id, "G4");
  assert.equal(dongChongGia({ ...moi, validFrom: "2026-11-01" }, G, "G4"), null); // bỏ qua dòng đang thay
  assert.equal(dongChongGia({ carrierPartyId: HP, routeCode: null, sizeCode: "C29", validFrom: "2026-10-01", validTo: null }, G), null);
  assert.equal(dongChongGia({ carrierPartyId: HP, routeCode: null, sizeCode: "C16", validFrom: "2027-01-01", validTo: null }, G)?.id, "G3"); // G3 mở
});
