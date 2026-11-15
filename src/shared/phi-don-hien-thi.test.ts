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
  assert.deepEqual(thieu, ["Chưa có mức cho tình huống này. Khi phí được cộng vào đơn, đơn như vậy sẽ không xác nhận được."]);
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
