// Luật thuần TIỀN XE THUÊ (ADR-0057 T1 B2, T2 C4/C6/C8) — bảng ca theo "Ví dụ vàng" của kế hoạch Đợt 4 (V1–V13).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chonDongGiaThue, coXeCua, daoDuoc, dieuChinhDuoc, dongBiDaoKhi, ngayDieuChinhMacDinh, ngayGhiDao, demDieuChinh, dongChongGia, loaiNguonGia, nhaXeChiuChiPhi, nhomBangKe, dongConHieuLuc, nguonGiaConHieuLuc, phanLoaiThue, thuTuDaoTatCa, tongBangKe, tongChiPhiChuyen, tongDieuChinh,
  type CoXe, type DongChiPhi, type DongGiaThue, type LoaiDongChiPhi,
} from "./tien-xe.ts";
import { keHoachChiPhiKhiDoi, keHoachChiPhiKhiHuy, type DongLo } from "./tien-xe-lo.ts";

const HP = "p-hung-phat";
const CO: CoXe[] = [
  { code: "C16", min: 10, max: 16, active: true },
  { code: "C29", min: 17, max: 29, active: true },
  { code: "C45CU", min: 30, max: 45, active: false },
];
// Vòng sửa 2 (B — ADR-0095 Q3): giá luôn theo CẢ tuyến LẪN cỡ xe — mọi dòng giá đủ hai khoá (CHECK 0072 + máy chủ).
const G: DongGiaThue[] = [
  { id: "G1", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: "C16", amount: 1_200_000, validFrom: "2026-10-01", validTo: "2026-10-31" },
  { id: "G2", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: "C29", amount: 1_000_000, validFrom: "2026-10-01", validTo: "2026-10-31" },
  { id: "G3", carrierPartyId: HP, routeCode: "NT-DL", sizeCode: "C16", amount: 900_000, validFrom: "2026-10-01", validTo: null },
  { id: "G4", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: "C29", amount: 1_100_000, validFrom: "2026-11-01", validTo: null },
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

test("chonDongGiaThue (vòng sửa 2 — B): CHỈ khớp đủ tuyến + cỡ; ranh ngày; chưa chọn tuyến / cỡ ngoài danh mục → null (thoả thuận); đúng nhà xe", () => {
  assert.equal(ca("NT-CR", 16, "2026-10-15"), "G1"); // V1
  assert.equal(ca("NT-CR", 29, "2026-10-15"), "G2"); // V2
  assert.equal(ca(null, 16, "2026-10-15"), null); // V3: chưa chọn tuyến → chưa có giá
  assert.equal(ca("NT-DL", 16, "2026-10-15"), "G3"); // V4
  assert.equal(ca("NT-CR", 29, "2026-10-31"), "G2"); // V5a ngày cuối vẫn áp
  assert.equal(ca("NT-CR", 29, "2026-11-01"), "G4"); // V5b
  assert.equal(ca("NT-CR", 29, "2026-09-30"), null); // trước ngày bắt đầu
  assert.equal(ca(null, 29, "2026-10-15"), null); // V6 thiếu giá
  assert.equal(ca("NT-DL", 29, "2026-10-15"), null); // tuyến có giá nhưng cỡ khác → không lấy giá "theo tuyến"
  assert.equal(ca("NT-CR", 35, "2026-10-15"), null); // xe ngoài mọi cỡ đang dùng
  assert.equal(chonDongGiaThue({ carrierPartyId: "p-la", routeCode: "NT-CR", sizeCode: "C16", ngayChay: "2026-10-15" }, G), null);
  // Dòng THIẾU một khoá (không còn tạo được — dữ liệu dò) không bao giờ được chọn.
  const thieu: DongGiaThue[] = [{ id: "X", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: null, amount: 1, validFrom: "2026-01-01", validTo: null },
    { id: "Y", carrierPartyId: HP, routeCode: null, sizeCode: "C16", amount: 2, validFrom: "2026-01-01", validTo: null }];
  assert.equal(chonDongGiaThue({ carrierPartyId: HP, routeCode: "NT-CR", sizeCode: "C16", ngayChay: "2026-10-15" }, thieu), null);
});

test("dongChongGia: cùng khoá (nhà xe, tuyến, cỡ) giao ngày → chồng; khác khoá hoặc ngày rời → không", () => {
  const moi = { carrierPartyId: HP, routeCode: "NT-CR", sizeCode: "C29", validFrom: "2026-10-31", validTo: null };
  assert.equal(dongChongGia(moi, G)?.id, "G2"); // 31/10 chạm G2 (tính cả ngày cuối)
  assert.equal(dongChongGia({ ...moi, validFrom: "2026-11-01" }, G)?.id, "G4");
  assert.equal(dongChongGia({ ...moi, validFrom: "2026-11-01" }, G, "G4"), null); // bỏ qua dòng đang thay
  assert.equal(dongChongGia({ carrierPartyId: HP, routeCode: "NT-DL", sizeCode: "C29", validFrom: "2026-10-01", validTo: null }, G), null);
  assert.equal(dongChongGia({ carrierPartyId: HP, routeCode: "NT-DL", sizeCode: "C16", validFrom: "2027-01-01", validTo: null }, G)?.id, "G3"); // G3 mở
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

test("bảng kê: loaiNguonGia, demDieuChinh (điều chỉnh bị đảo DO ĐỔI CHUYẾN), nhomBangKe (đã phát sinh / chưa chạy / đang chạy / đã huỷ / chưa có giá)", () => {
  const R = (id: string, amount: number, goc: string, ly: string) => ({ ...D(id, "REVERSAL", amount, goc), reasonCode: ly });
  const v7 = [D("s", "SNAPSHOT", 1_200_000), D("a", "ADJUSTMENT", 150_000), R("ra", -150_000, "a", "CPX_DOI_CHUYEN"), R("rs", -1_200_000, "s", "CPX_DOI_CHUYEN"), D("s2", "SNAPSHOT", 900_000), D("b", "ADJUSTMENT", 50_000)];
  assert.equal(loaiNguonGia(v7), "BANG");
  assert.equal(loaiNguonGia([D("g", "AGREED", 1)]), "THOA_THUAN");
  assert.equal(loaiNguonGia([]), null);
  assert.deepEqual(demDieuChinh(v7), { soDieuChinh: 1, soDieuChinhBiDao: 1 });
  assert.deepEqual(demDieuChinh([D("a", "ADJUSTMENT", 5), R("r", -5, "a", "CPX_NHAP_SAI")]), { soDieuChinh: 0, soDieuChinhBiDao: 0 }, "Kế toán tự đảo: không phải do đổi chuyến");
  assert.equal(nhomBangKe("ENDED", true, true), "DA_PHAT_SINH");
  assert.equal(nhomBangKe("ENDED_INTERRUPTED", true, true), "DA_PHAT_SINH");
  assert.equal(nhomBangKe("RUNNING", true, true), "DANG_CHAY");
  assert.equal(nhomBangKe("CANCELLED", true, false), "DA_HUY");
  assert.equal(nhomBangKe("PLANNED", true, false), "THIEU_GIA");
  assert.equal(nhomBangKe("PLANNED", true, true), "CHUA_CHAY");
  assert.equal(nhomBangKe("PLANNED", false, false), "CHUA_CHAY");
});

test("nhaXeChiuChiPhi: nhà xe của nguồn giá GHI GẦN NHẤT (kể cả đã đảo — đổi sang xe công ty rồi huỷ vẫn là nhà xe cũ); chưa có nguồn giá → chủ xe của chuyến", () => {
  assert.equal(nhaXeChiuChiPhi([], "p-cty"), "p-cty");
  assert.equal(nhaXeChiuChiPhi([{ kind: "SNAPSHOT", carrierPartyId: "p-a" }, { kind: "REVERSAL", carrierPartyId: "p-a" }, { kind: "ADJUSTMENT", carrierPartyId: "p-a" }], "p-cty"), "p-a");
  assert.equal(nhaXeChiuChiPhi([{ kind: "SNAPSHOT", carrierPartyId: "p-a" }, { kind: "REVERSAL", carrierPartyId: "p-a" }, { kind: "AGREED", carrierPartyId: "p-b" }], "p-b"), "p-b");
});

test("ngayGhiDao (vòng sửa 2, SV-1): dòng đảo mang ngày của DÒNG GỐC; kỳ của dòng gốc đã khoá (ADR-0080) ⇒ ngày hiện tại", () => {
  assert.equal(ngayGhiDao({ occurredDate: "2026-10-31" }, { homNay: "2026-11-05", kyDaKhoa: () => false }), "2026-10-31");
  assert.equal(ngayGhiDao({ occurredDate: "2026-10-31" }, { homNay: "2026-11-05", kyDaKhoa: (n) => n.startsWith("2026-10") }), "2026-11-05");
});

test("ngayGhiDao / ngayDieuChinhMacDinh: tháng đã khoá ⇒ hôm nay; tháng mở ⇒ ngày gốc", () => {
  const kyDaKhoa = (n: string) => n.startsWith("2026-09");
  assert.equal(ngayGhiDao({ occurredDate: "2026-09-20" }, { homNay: "2026-10-08", kyDaKhoa }), "2026-10-08");
  assert.equal(ngayGhiDao({ occurredDate: "2026-10-02" }, { homNay: "2026-10-08", kyDaKhoa }), "2026-10-02");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "ENDED", ngayHuy: null, ngayChay: "2026-09-28", homNay: "2026-10-08", kyDaKhoa }), "2026-10-08");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "CANCELLED", ngayHuy: "2026-10-01", ngayChay: "2026-09-28", homNay: "2026-10-08", kyDaKhoa }), "2026-10-01");
  // Chuyến đã huỷ mà NGÀY HUỶ cũng thuộc tháng đã khoá (huỷ từ tháng trước, tháng đó vừa khoá) ⇒ cũng sang hôm nay; tháng mở thì giữ ngày mặc định.
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "CANCELLED", ngayHuy: "2026-09-30", ngayChay: "2026-10-05", homNay: "2026-10-08", kyDaKhoa }), "2026-10-08");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "PLANNED", ngayHuy: null, ngayChay: "2026-10-15", homNay: "2026-10-08", kyDaKhoa }), "2026-10-15");
});

test("ngayDieuChinhMacDinh (ADR-0095 Q4 — vòng sửa 3 M1): chuyến đã huỷ ⇒ NGÀY HUỶ; chuyến chưa huỷ ⇒ NGÀY CHẠY (không phải hôm nay) khi tháng còn mở", () => {
  const mo = { homNay: "2026-11-20", kyDaKhoa: () => false };
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "CANCELLED", ngayHuy: "2026-10-13", ngayChay: "2026-10-15", ...mo }), "2026-10-13");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "ENDED", ngayHuy: null, ngayChay: "2026-10-15", ...mo }), "2026-10-15");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "PLANNED", ngayHuy: null, ngayChay: "2026-10-15", ...mo }), "2026-10-15");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "ENDED_INTERRUPTED", ngayHuy: null, ngayChay: "2026-10-15", ...mo }), "2026-10-15");
});

// ---- Khoá tháng ở kế hoạch chi phí của lô chuyến (sổ đại lý đợt 1, Task 8; ADR-0080) -----------------------------------------------------------------
const DL = (id: string, kind: LoaiDongChiPhi, amount: number, occurredDate: string, reversesId: string | null = null): DongLo =>
  ({ ...D(id, kind, amount, reversesId), carrierPartyId: HP, occurredDate });
const GIA_THANG_9: DongGiaThue[] = [{ id: "g1", carrierPartyId: HP, routeCode: "T1", sizeCode: "C16", amount: 1_200_000, validFrom: "2026-09-01", validTo: null }];
const DAU_VAO_DOI = {
  homNay: "2026-10-08", rentedMoi: 1 as const, chuXeMoi: HP, nhaXeDangMo: new Set([HP]), laTaoMoi: false, doiXeHoacNhaXe: false, doiTuyen: true, doiNgay: false,
  tuyenMoi: "T1", soChoMoi: 16, ngayChayMoi: "2026-10-15", gia: GIA_THANG_9, coXe: CO,
};
const khoaThang9 = (n: string) => n.startsWith("2026-09");

test("keHoachChiPhiKhiDoi (khoá tháng): dòng gốc tháng 9 đã khoá ⇒ dòng đảo mang hôm nay; chụp mới ở tháng mở ⇒ vẫn chụp; dòng gốc tháng mở ⇒ giữ ngày gốc", () => {
  const dong = [DL("s", "SNAPSHOT", 1_200_000, "2026-09-20"), DL("a", "ADJUSTMENT", 50_000, "2026-10-02")];
  const kq = keHoachChiPhiKhiDoi({ ...DAU_VAO_DOI, dong, kyDaKhoa: khoaThang9 });
  assert.equal(kq.ok, true);
  if (!kq.ok) return;
  assert.deepEqual(Object.fromEntries(kq.kh.dao.map((d) => [d.goc.id, d.ngay])), { s: "2026-10-08", a: "2026-10-02" }, "chỉ dòng tháng 9 (đã khoá) sang hôm nay; dòng tháng 10 giữ ngày gốc");
  assert.equal(kq.kh.chup?.ngayChay, "2026-10-15");
});

test("keHoachChiPhiKhiDoi (khoá tháng): phải chụp giá cho ngày chạy thuộc tháng đã khoá ⇒ { loi: period_closed, thang }; không phải chụp ⇒ không chặn", () => {
  const dong = [DL("s", "SNAPSHOT", 1_200_000, "2026-09-20")];
  const kq = keHoachChiPhiKhiDoi({ ...DAU_VAO_DOI, dong, ngayChayMoi: "2026-09-25", doiNgay: true, kyDaKhoa: khoaThang9 });
  assert.equal(kq.ok, false);
  if (kq.ok) return;
  assert.equal(kq.loi, "period_closed");
  assert.equal("thang" in kq ? kq.thang : null, "2026-09");
  // Đổi sang xe công ty (không chụp) dù ngày chạy ở tháng khoá: chỉ đảo, đảo mang hôm nay, KHÔNG chặn.
  const congTy = keHoachChiPhiKhiDoi({ ...DAU_VAO_DOI, dong, ngayChayMoi: "2026-09-25", doiXeHoacNhaXe: true, rentedMoi: 0, chuXeMoi: "p-cty", kyDaKhoa: khoaThang9 });
  assert.equal(congTy.ok, true);
  if (congTy.ok) assert.deepEqual(congTy.kh.dao.map((d) => d.ngay), ["2026-10-08"]);
  // Thuê nhưng KHÔNG có dòng giá khớp (không chụp gì) ở ngày chạy tháng khoá ⇒ không có gì để ghi nên không chặn.
  const khongGia = keHoachChiPhiKhiDoi({ ...DAU_VAO_DOI, dong: [], laTaoMoi: true, ngayChayMoi: "2026-09-25", gia: [], kyDaKhoa: khoaThang9 });
  assert.equal(khongGia.ok, true);
});

test("keHoachChiPhiKhiHuy (khoá tháng): dòng gốc tháng 9 đã khoá ⇒ dòng đảo mang hôm nay; tháng mở ⇒ giữ ngày gốc", () => {
  const dong = [DL("s", "SNAPSHOT", 1_200_000, "2026-09-20"), DL("a", "ADJUSTMENT", -200_000, "2026-10-05")];
  const kh = keHoachChiPhiKhiHuy(dong, "2026-10-08", khoaThang9);
  assert.deepEqual(kh.dao.map((d) => [d.goc.id, d.ngay]), [["a", "2026-10-05"], ["s", "2026-10-08"]], "âm trước dương sau");
  const mo = keHoachChiPhiKhiHuy(dong, "2026-10-08", () => false);
  assert.deepEqual(mo.dao.map((d) => d.ngay), ["2026-10-05", "2026-09-20"]);
});

test("dieuChinhDuoc (ADR-0095 Q5, vòng sửa 2 4.7): xe thuê / đã huỷ ⇒ mọi lý do; đã đổi sang xe công ty chưa huỷ ⇒ CHỈ Phí huỷ muộn", () => {
  assert.equal(dieuChinhDuoc({ rented: 1, trangThai: "PLANNED", lyDo: "CPX_KHAC" }), true);
  assert.equal(dieuChinhDuoc({ rented: 0, trangThai: "CANCELLED", lyDo: "CPX_NHAP_SAI" }), true);
  assert.equal(dieuChinhDuoc({ rented: 0, trangThai: "PLANNED", lyDo: "CPX_HUY_MUON" }), true);
  assert.equal(dieuChinhDuoc({ rented: 0, trangThai: "ENDED", lyDo: "CPX_HUY_MUON" }), true);
  assert.equal(dieuChinhDuoc({ rented: 0, trangThai: "PLANNED", lyDo: "CPX_KHAC" }), false);
  assert.equal(dieuChinhDuoc({ rented: 0, trangThai: "RUNNING", lyDo: "CPX_PHU_THU_CHO" }), false);
});

test("dongBiDaoKhi (vòng sửa 3, H1 — ADR-0095 Q5b, chủ chọn E1): đổi chuyến / huỷ chuyến đảo MỌI dòng còn hiệu lực, KỂ CẢ phí huỷ muộn cho nhà xe cũ; thứ tự âm trước dương sau", () => {
  const dong: DongChiPhi[] = [
    D("s", "SNAPSHOT", 1_200_000), D("r", "REVERSAL", -1_200_000, "s"), { ...D("p", "ADJUSTMENT", 300_000), reasonCode: "CPX_HUY_MUON" }, D("a", "ADJUSTMENT", -50_000),
  ];
  for (const khi of ["DOI_CHUYEN", "HUY_CHUYEN"] as const) {
    assert.deepEqual(dongBiDaoKhi(dong, khi).map((d) => d.id), ["a", "p"], `${khi}: phí huỷ cho nhà xe cũ (p) BỊ đảo theo luật chung (Q5b)`);
  }
});
