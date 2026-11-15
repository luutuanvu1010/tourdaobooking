// Chữ hiển thị của màn «Phí đưa đón» (kế hoạch Phí đưa đón, Đợt B Task 8). Thuần: không I/O, không tính tiền.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cauCanhBaoGop, cauCanhBao, cauDieuKien, cauKetQuaThuTra, cauKhoangNgay, cauTien, dieuKienGui, soTienDocDuoc, tenCap,
  type TenPhiDon,
} from "./phi-don-hien-thi.ts";
import type { CanhBaoPhiDonDto, MucPhiDonDto, ThuTraPhiDonResponse } from "./contracts.ts";

const ten: TenPhiDon = {
  vung: new Map([["BD_CR", "Bãi Dài – Cam Ranh"], ["NGOAI_VUNG", "Ngoài khu vực"]]),
  cap: new Map([["T3", "Đại lý cấp 3"]]),
  nhom: new Map([["HT", "Hòn Tằm"]]),
  dichVu: new Map([["DV1", "Tour 4 đảo"]]),
};

const muc = (o: Partial<MucPhiDonDto> & { dieuKien?: Partial<MucPhiDonDto["dieuKien"]> }): MucPhiDonDto => ({
  id: "m1", kieu: "PER_PAX", tien: 50000, tuNgay: "2027-01-01", denNgay: null, ghiChu: null, updatedAt: "2026-11-14T00:00:00.000Z",
  ...o,
  dieuKien: { vung: "BD_CR", cap: null, dichVu: null, nhom: null, chieu: null, xeRieng: false, ...o.dieuKien },
});

const KHONG_MA_THO = /PER_PAX|PER_TRIP|OUT\b|RETURN|NGOAI_VUNG|BD_CR|THIEU_MUC|CO_MUC|XUNG_DOT|KHONG_CO_MUC/;

test("cauTien: 0 đồng là Miễn phí; theo khách; theo chuyến", () => {
  assert.equal(cauTien({ kieu: "PER_PAX", tien: 0 }), "Miễn phí");
  assert.equal(cauTien({ kieu: "PER_TRIP", tien: 0 }), "Miễn phí");
  assert.equal(cauTien({ kieu: "PER_PAX", tien: 50000 }), "50.000 đ/khách");
  assert.equal(cauTien({ kieu: "PER_TRIP", tien: 1500000 }), "1.500.000 đ/chuyến");
});

test("cauDieuKien: nối các ô đã nêu, theo thứ tự khu vực, cấp, dịch vụ, nhóm, chiều", () => {
  const m = muc({ dieuKien: { cap: "T3", nhom: "HT", chieu: "RETURN" } });
  assert.equal(cauDieuKien(m, ten), "Bãi Dài – Cam Ranh · Đại lý cấp 3 · Nhóm Hòn Tằm · Chiều về");
  assert.equal(cauDieuKien(muc({ dieuKien: { dichVu: "DV1", chieu: "OUT" } }), ten), "Bãi Dài – Cam Ranh · Tour 4 đảo · Chiều đi");
  assert.equal(cauDieuKien(muc({ dieuKien: { xeRieng: true } }), ten), "Bãi Dài – Cam Ranh · Xe riêng");
});

test("cauDieuKien: Mọi cấp chỉ khi không ô nào khác được nêu; cấp đã khoá hiện mã kèm (đã khoá)", () => {
  assert.equal(cauDieuKien(muc({}), ten), "Bãi Dài – Cam Ranh · Mọi cấp");
  assert.equal(cauDieuKien(muc({ dieuKien: { chieu: "OUT" } }), ten), "Bãi Dài – Cam Ranh · Chiều đi");
  assert.equal(cauDieuKien(muc({ dieuKien: { cap: "T9" } }), ten), "Bãi Dài – Cam Ranh · T9 (đã khoá)");
  assert.equal(tenCap("T9", ten.cap), "T9 (đã khoá)");
  assert.equal(tenCap("T3", ten.cap), "Đại lý cấp 3");
});

test("cauDieuKien: không lộ mã thô", () => {
  const m = muc({ dieuKien: { vung: "NGOAI_VUNG", chieu: "OUT", xeRieng: true } });
  assert.doesNotMatch(cauDieuKien(m, ten), KHONG_MA_THO);
  assert.equal(cauDieuKien(m, ten), "Ngoài khu vực · Xe riêng · Chiều đi");
});

test("cauKhoangNgay: từ ngày; từ ngày đến ngày", () => {
  assert.equal(cauKhoangNgay("2027-01-01", null), "Từ 01/01/2027");
  assert.equal(cauKhoangNgay("2027-01-01", "2027-12-31"), "01/01/2027 – 31/12/2027");
});

test("soTienDocDuoc: chỉ chữ số, có thể có dấu chấm ngăn", () => {
  assert.equal(soTienDocDuoc("50000"), 50000);
  assert.equal(soTienDocDuoc("50.000"), 50000);
  assert.equal(soTienDocDuoc("0"), 0);
  assert.equal(soTienDocDuoc(""), null);
  assert.equal(soTienDocDuoc("-5"), null);
  assert.equal(soTienDocDuoc("12,5"), null);
  assert.equal(soTienDocDuoc("abc"), null);
});

const canhBao = (o: Partial<CanhBaoPhiDonDto>): CanhBaoPhiDonDto => ({
  cap: "T3", vung: "BD_CR", chieu: "OUT", xeRieng: false, dichVu: "DV1", nhom: null, tienCap: 60000, tienKhongCap: 50000, ...o,
});

test("cauCanhBao: đúng câu của bản giao việc; dịch vụ hoặc nhóm", () => {
  assert.equal(cauCanhBao(canhBao({}), ten), "Đại lý cấp 3 đang trả 60.000 đ, cao hơn mức không có cấp 50.000 đ ở Bãi Dài – Cam Ranh, Tour 4 đảo.");
  assert.equal(
    cauCanhBao(canhBao({ dichVu: null, nhom: "HT" }), ten),
    "Đại lý cấp 3 đang trả 60.000 đ, cao hơn mức không có cấp 50.000 đ ở Bãi Dài – Cam Ranh, nhóm Hòn Tằm.",
  );
  assert.doesNotMatch(cauCanhBao(canhBao({ vung: "NGOAI_VUNG" }), ten), KHONG_MA_THO);
});

test("cauCanhBaoGop: hai chiều cùng nội dung gộp một dòng; khác nội dung giữ hai", () => {
  const hai = cauCanhBaoGop([canhBao({ chieu: "OUT" }), canhBao({ chieu: "RETURN" })], ten);
  assert.equal(hai.length, 1);
  const khac = cauCanhBaoGop([canhBao({ chieu: "OUT" }), canhBao({ chieu: "RETURN", tienCap: 70000 })], ten);
  assert.equal(khac.length, 2);
  assert.match(khac[0]!, /, chiều đi\.$/);
  assert.match(khac[1]!, /, chiều về\.$/);
  assert.equal(hai[0], cauCanhBao(canhBao({}), ten)); // gộp thì giữ nguyên câu, không thêm chiều
  assert.deepEqual(cauCanhBaoGop([], ten), []);
});

test("cauKetQuaThuTra: có mức theo khách, theo chuyến, miễn phí", () => {
  const r: ThuTraPhiDonResponse = {
    ketQua: { trangThai: "CO_MUC", mucId: "m1", kieu: "PER_PAX", donGia: 50000, soLuong: 3, tien: 150000 },
    thua: [{ mucId: "m2", tien: 40000, viSao: "thua vì dòng thắng nêu cấp đại lý" }],
  };
  const dong = cauKetQuaThuTra(r, { ...ten, muc: new Map([["m2", muc({ id: "m2", tien: 40000 })]]) });
  assert.equal(dong[0], "Phí đón: 150.000 đ (50.000 đ/khách × 3 khách)");
  assert.equal(dong[1], "Mức không được dùng: Bãi Dài – Cam Ranh · Mọi cấp · 40.000 đ/khách — thua vì dòng thắng nêu cấp đại lý");
  assert.equal(dong.length, 2);
  const chuyen = cauKetQuaThuTra({ ketQua: { trangThai: "CO_MUC", mucId: "m1", kieu: "PER_TRIP", donGia: 500000, soLuong: 1, tien: 500000 }, thua: [] }, ten);
  assert.deepEqual(chuyen, ["Phí đón: 500.000 đ (500.000 đ/chuyến × 1 chuyến)"]);
  const mien = cauKetQuaThuTra({ ketQua: { trangThai: "CO_MUC", mucId: "m1", kieu: "PER_PAX", donGia: 0, soLuong: 4, tien: 0 }, thua: [] }, ten);
  assert.deepEqual(mien, ["Phí đón: Miễn phí"]);
});

test("cauKetQuaThuTra: thiếu mức và hai mức khác tiền cùng bậc", () => {
  const thieu = cauKetQuaThuTra({ ketQua: { trangThai: "THIEU_MUC", lyDo: "KHONG_CO_MUC" }, thua: [] }, ten);
  assert.deepEqual(thieu, ["Chưa có mức cho tình huống này, nên đơn như vậy không xác nhận được."]);
  const xd = cauKetQuaThuTra({ ketQua: { trangThai: "THIEU_MUC", lyDo: "XUNG_DOT" }, thua: [] }, ten);
  assert.equal(xd.length, 1);
  assert.match(xd[0]!, /hai mức/);
  for (const d of [...thieu, ...xd]) assert.doesNotMatch(d, KHONG_MA_THO);
});

test("cauKetQuaThuTra: phí chưa áp vào ngày hỏi thì thêm một dòng nói rõ, số tiền vẫn nằm đầu", () => {
  const r: ThuTraPhiDonResponse = {
    ketQua: { trangThai: "CO_MUC", mucId: "m1", kieu: "PER_PAX", donGia: 50000, soLuong: 2, tien: 100000 },
    thua: [], chuaApNgayNay: true,
  };
  const dong = cauKetQuaThuTra(r, ten);
  assert.equal(dong[0], "Phí đón: 100.000 đ (50.000 đ/khách × 2 khách)");
  assert.ok(dong.includes("Phí đưa đón chưa áp vào ngày này."), dong.join(" | "));
  const da = cauKetQuaThuTra({ ...r, chuaApNgayNay: false }, ten);
  assert.ok(!da.includes("Phí đưa đón chưa áp vào ngày này."));
  const thieu = cauKetQuaThuTra({ ketQua: { trangThai: "THIEU_MUC", lyDo: "KHONG_CO_MUC" }, thua: [], chuaApNgayNay: true }, ten);
  assert.equal(thieu.length, 2);
  assert.equal(thieu[1], "Phí đưa đón chưa áp vào ngày này.");
});

test("dieuKienGui: dựng lại đủ khoá từ dòng đã đọc; xe riêng thành EXCLUSIVE 1", () => {
  assert.deepEqual(dieuKienGui(muc({}).dieuKien), [{ khoa: "ZONE", giaTri: "BD_CR" }]);
  assert.deepEqual(
    dieuKienGui(muc({ dieuKien: { cap: "T3", nhom: "HT", chieu: "RETURN", xeRieng: true } }).dieuKien),
    [{ khoa: "ZONE", giaTri: "BD_CR" }, { khoa: "TIER", giaTri: "T3" }, { khoa: "SERVICE_GROUP", giaTri: "HT" }, { khoa: "DIRECTION", giaTri: "RETURN" }, { khoa: "EXCLUSIVE", giaTri: "1" }],
  );
});

// ---- Đợt C, Task 6: phí đưa đón trên trang đơn và biên nhận (chủ 15/11, câu 3: «Miễn phí», «dự kiến») ----
import { CHU_DU_KIEN, CHU_MIEN_PHI, cauThieuPhiDon, chuThanhTienPhi, dongPhiTrenDon, tenKhoiPhiDon } from "./phi-don-hien-thi.ts";
import type { PhiDuaDonCuaDonDto, PhiDuaDonDto } from "./contracts.ts";

const tien = (n: number): string => `${soTienChu(n)} ₫`;
const soTienChu = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const dongPhi = (o: Partial<PhiDuaDonDto> = {}): PhiDuaDonDto => ({
  id: "f1", legId: "l1", serviceId: "s1", direction: "OUT", zoneCode: "BD_CR", zoneName: "Bãi Dài – Cam Ranh", tierCode: null, kind: "PER_PAX", returnPax: null,
  quantity: 2, unitPrice: 70_000, lineTotal: 140_000, description: "Phí đưa đón — chiều đi, Bãi Dài – Cam Ranh", ...o,
});

test("chuThanhTienPhi: «Miễn phí» CHỈ khi đơn giá đã chụp là 0 đồng; số lượng về 0 với đơn giá > 0 in số 0 đồng (không phải «Miễn phí»)", () => {
  assert.equal(chuThanhTienPhi({ unitPrice: 0, lineTotal: 0 }, tien), CHU_MIEN_PHI);
  assert.equal(chuThanhTienPhi({ unitPrice: 70_000, lineTotal: 140_000 }, tien), "140.000 ₫");
  assert.equal(chuThanhTienPhi({ unitPrice: 70_000, lineTotal: 0 }, tien), "0 ₫", "dịch vụ bớt còn em bé ⇒ dòng phí 0 × đơn giá, không gọi là miễn phí");
});

test("tenKhoiPhiDon: đơn nháp ghi «dự kiến», đơn đã chụp không ghi", () => {
  assert.equal(tenKhoiPhiDon(true), `Phí đưa đón (${CHU_DU_KIEN})`);
  assert.equal(tenKhoiPhiDon(false), "Phí đưa đón");
  assert.equal(CHU_DU_KIEN, "dự kiến");
});

test("dongPhiTrenDon: mỗi chặng một dòng — chiều, khu vực, dòng phụ số khách × đơn giá, thành tiền; mức 0 đồng in «Miễn phí»; theo chuyến ghi «chuyến»; không lộ mã thô", () => {
  const p: PhiDuaDonCuaDonDto = {
    dong: [
      dongPhi(),
      dongPhi({ id: "f2", legId: "l2", direction: "RETURN", unitPrice: 0, lineTotal: 0, description: "Phí đưa đón — chiều về, Bãi Dài – Cam Ranh" }),
      dongPhi({ id: "f3", legId: "l3", kind: "PER_TRIP", quantity: 1, unitPrice: 300_000, lineTotal: 300_000, zoneName: "Ngoài khu vực", zoneCode: "NGOAI_VUNG" }),
      dongPhi({ id: "f4", legId: "l4", quantity: 0, lineTotal: 0 }),
    ],
    thieu: [],
    duKien: false,
  };
  const r = dongPhiTrenDon(p, tien, null);
  assert.equal(r.tieuDe, "Phí đưa đón");
  assert.deepEqual(r.dong, [
    { nhan: "Chiều đi · Bãi Dài – Cam Ranh", chiTiet: "2 khách × 70.000 ₫", giaTri: "140.000 ₫" },
    { nhan: "Chiều về · Bãi Dài – Cam Ranh", chiTiet: null, giaTri: CHU_MIEN_PHI },
    { nhan: "Chiều đi · Ngoài khu vực", chiTiet: "1 chuyến × 300.000 ₫", giaTri: "300.000 ₫" },
    { nhan: "Chiều đi · Bãi Dài – Cam Ranh", chiTiet: "0 khách × 70.000 ₫", giaTri: "0 ₫" },
  ]);
  assert.deepEqual(r.thieu, []);
  assert.doesNotMatch(JSON.stringify(r), KHONG_MA_THO);
});

test("dongPhiTrenDon: đơn nháp ghi «dự kiến»; chặng thiếu mức ⇒ câu băng báo ĐÚNG câu 409 của lúc xác nhận (không trùng lặp), kể cả khi chưa có dòng nào", () => {
  const p: PhiDuaDonCuaDonDto = {
    dong: [],
    thieu: [
      { legId: "l1", zoneName: "Bắc Nha Trang", lyDo: "KHONG_CO_MUC" },
      { legId: "l2", zoneName: "Bắc Nha Trang", lyDo: "KHONG_CO_MUC" },
      { legId: "l3", zoneName: "Bãi Dài", lyDo: "XUNG_DOT" },
      { legId: "l4", zoneName: "Bãi Dài", lyDo: "DAI_LY_HAI_CAP" },
    ],
    duKien: true,
  };
  const r = dongPhiTrenDon(p, tien, "Lữ Hành Dò Tìm");
  assert.equal(r.tieuDe, "Phí đưa đón (dự kiến)");
  assert.deepEqual(r.dong, []);
  assert.deepEqual(r.thieu, [
    cauThieuPhiDon({ lyDo: "KHONG_CO_MUC", tenVung: "Bắc Nha Trang" }, "Lữ Hành Dò Tìm"),
    cauThieuPhiDon({ lyDo: "XUNG_DOT", tenVung: "Bãi Dài" }, "Lữ Hành Dò Tìm"),
    "Cần gán cấp riêng cho đối tác Lữ Hành Dò Tìm trước khi xác nhận.",
  ]);
  assert.equal(r.thieu[0], "Quản trị cần đặt phí đưa đón cho khu vực Bắc Nha Trang trước khi xác nhận.");
});

test("CHU_THIEU_MUC của Thử tra: không còn nói «khi phí được cộng vào đơn» (Đợt C đã cộng phí vào đơn)", async () => {
  const { CHU_THIEU_MUC } = await import("./phi-don-hien-thi.ts");
  assert.doesNotMatch(CHU_THIEU_MUC, /Khi phí được cộng vào đơn/);
  assert.match(CHU_THIEU_MUC, /không xác nhận được/);
});
