// Luật thuần TIỀN XE THUÊ (ADR-0057 T1 B2, T2 C4/C6/C8) — bảng ca theo "Ví dụ vàng" của kế hoạch Đợt 4 (V1–V13).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chonDongGiaThue, coXeCua, daoDuoc, dongChongGia, dongConHieuLuc, nguonGiaConHieuLuc, phanLoaiThue, thuTuDaoTatCa, tongBangKe, tongChiPhiChuyen, tongDieuChinh,
  type CoXe, type DongChiPhi, type DongGiaThue, type LoaiDongChiPhi,
} from "./tien-xe.ts";

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

// ---- T2: chi phí chuyến (ADR-0057 C3, C4, C6, C8) ---------------------------------------------------------------------------------------------------------
const D = (id: string, kind: LoaiDongChiPhi, amount: number, reversesId: string | null = null, t = id): DongChiPhi =>
  ({ id, kind, amount, reversesId, reasonCode: kind === "SNAPSHOT" ? null : "X", createdAt: t });

test("tongChiPhiChuyen / nguồn giá / còn hiệu lực — V7, V8", () => {
  const v7 = [D("s", "SNAPSHOT", 1_200_000), D("a", "ADJUSTMENT", 150_000), D("ra", "REVERSAL", -150_000, "a"), D("rs", "REVERSAL", -1_200_000, "s"), D("s2", "SNAPSHOT", 900_000)];
  assert.equal(tongChiPhiChuyen(v7), 900_000);
  assert.equal(nguonGiaConHieuLuc(v7)?.id, "s2");
  assert.deepEqual(dongConHieuLuc(v7).map((d) => d.id), ["s2"]);
  assert.equal(tongChiPhiChuyen([]), 0);
  const v8 = [D("s", "SNAPSHOT", 1_200_000), D("a", "ADJUSTMENT", -200_000), D("ra", "REVERSAL", 200_000, "a"), D("rs", "REVERSAL", -1_200_000, "s")];
  assert.equal(tongChiPhiChuyen(v8), 0);
  assert.equal(nguonGiaConHieuLuc(v8), null);
});

test("thuTuDaoTatCa: âm trước, dương sau — tổng không bao giờ âm giữa lô (V8)", () => {
  const dong = [D("s", "SNAPSHOT", 1_200_000, null, "1"), D("a1", "ADJUSTMENT", -200_000, null, "2"), D("a2", "ADJUSTMENT", 50_000, null, "3")];
  const thuTu = thuTuDaoTatCa(dong);
  assert.deepEqual(thuTu.map((d) => d.id), ["a1", "a2", "s"]); // trong mỗi nhóm dấu: MỚI NHẤT trước ("gỡ ngược")
  let tong = tongChiPhiChuyen(dong);
  for (const d of thuTu) { tong -= d.amount; assert.ok(tong >= 0, `âm sau khi đảo ${d.id}`); }
  assert.equal(tong, 0);
  assert.deepEqual(thuTuDaoTatCa([D("s", "SNAPSHOT", 1), D("r", "REVERSAL", -1, "s")]), [], "dòng đã đảo không đảo lại");
});

test("phanLoaiThue: nhà xe đang mở, không phải công ty chủ ⇒ 1; công ty chủ ⇒ 0; hồ sơ đã thôi vai: chuyến mới 0, đổi xe từ chuyến thuê giữ 1 (cấm hạ)", () => {
  const nx = new Set(["p-nx"]);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-nx", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: null }), 1);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cty", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: 1 }), 0);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cu", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: null }), 0);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cu", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: 1 }), 1);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cu", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: 0 }), 0);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cty", congTyChuId: "p-cty", nhaXeDangMo: new Set(["p-cty"]), cuRented: null }), 0, "công ty chủ có vai nhà xe vẫn là xe công ty");
});

test("tongDieuChinh (bảng kê — cột Điều chỉnh là TIỀN): cộng điều chỉnh CHƯA đảo; tongBangKe cộng các tổng đã tính", () => {
  const dong = [D("s", "SNAPSHOT", 1_200_000), D("a", "ADJUSTMENT", 150_000), D("b", "ADJUSTMENT", -50_000), D("c", "ADJUSTMENT", 70_000), D("rc", "REVERSAL", -70_000, "c")];
  assert.equal(tongDieuChinh(dong), 100_000);
  assert.equal(tongDieuChinh([]), 0);
  assert.equal(tongBangKe([{ tong: 1_200_000 }, { tong: 300_000 }]), 1_500_000);
  assert.equal(tongBangKe([]), 0);
});

test("daoDuoc: không đảo dòng đảo, không đảo dòng đã bị đảo; nguồn giá chỉ khi chuyến chưa xuất bến; điều chỉnh mọi lúc", () => {
  const dong = [D("s", "SNAPSHOT", 1_200_000), D("a", "ADJUSTMENT", 150_000), D("b", "ADJUSTMENT", -50_000), D("rb", "REVERSAL", 50_000, "b")];
  const theo = (tt: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED") => dong.map((d) => daoDuoc(dong, d, tt));
  assert.deepEqual(theo("PLANNED"), [true, true, false, false]);
  assert.deepEqual(theo("ENDED"), [false, true, false, false]);
  assert.deepEqual(theo("CANCELLED"), [false, true, false, false]);
});
