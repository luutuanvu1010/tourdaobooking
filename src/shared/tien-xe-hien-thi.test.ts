import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NHAN_NHOM_BANG_KE, NHAN_TRANG_THAI_GIA, chipDongChiPhi, docSoTien, dongDieuChinhBangKe, goiYDoiGia, hieuLuc, ngayVn, soTienCoDau, tomTatBangKe,
} from "./tien-xe-hien-thi.ts";

test("ngayVn: YYYY-MM-DD → dd/mm/yyyy (thao tác chuỗi, không lệch múi giờ)", () => {
  assert.equal(ngayVn("2026-07-01"), "01/07/2026");
});

test("hieuLuc: '01/07/2026 – đang áp' khi chưa có ngày kết thúc (bản vẽ 1a)", () => {
  assert.equal(hieuLuc("2026-07-01", null), "01/07/2026 – đang áp");
  assert.equal(hieuLuc("2026-01-01", "2026-06-30"), "01/01/2026 – 30/06/2026");
});

test("docSoTien: chỉ đọc số người gõ — dấu chấm / khoảng trắng / ₫ bỏ qua; số dương", () => {
  assert.equal(docSoTien("1.350.000"), 1_350_000);
  assert.equal(docSoTien(" 480 000 ₫"), 480_000);
  assert.equal(docSoTien(""), null);
  assert.equal(docSoTien("abc"), null);
  assert.equal(docSoTien("-5"), null, "ô giá không nhận số âm");
});

test("docSoTien có dấu (ô điều chỉnh): '−' (U+2212), '-', '+' — parseMoney cũ bỏ dấu nên KHÔNG dùng được", () => {
  assert.equal(docSoTien("− 700.000", { coDau: true }), -700_000);
  assert.equal(docSoTien("-150000", { coDau: true }), -150_000);
  assert.equal(docSoTien("+ 150.000", { coDau: true }), 150_000);
  assert.equal(docSoTien("150.000", { coDau: true }), 150_000);
  assert.equal(docSoTien("0", { coDau: true }), 0, "0 vẫn đọc được — máy chủ báo câu 'khác 0'");
  assert.equal(docSoTien("1-2", { coDau: true }), null);
});

test("soTienCoDau: '+ 450.000 ₫' / '− 400.000 ₫' — chỉ định dạng dấu của số máy chủ trả", () => {
  assert.equal(soTienCoDau(450_000), "+ 450.000 ₫");
  assert.equal(soTienCoDau(-400_000), "− 400.000 ₫");
});

test("NHAN_TRANG_THAI_GIA: ba trạng thái dòng giá (máy chủ gắn) → nhãn + tông bản vẽ", () => {
  assert.deepEqual(NHAN_TRANG_THAI_GIA.DANG_AP, { nhan: "Đang áp", tone: "ok" });
  assert.deepEqual(NHAN_TRANG_THAI_GIA.SAP_AP, { nhan: "Sắp áp", tone: "unit" });
  assert.deepEqual(NHAN_TRANG_THAI_GIA.DA_KET_THUC, { nhan: "Đã kết thúc", tone: "muted" });
});

test("goiYDoiGia: câu gợi ý theo ngày người gõ (máy chủ quyết)", () => {
  assert.equal(goiYDoiGia("2026-10-01"), "Dòng cũ sẽ kết thúc ngày 30/09/2026, dòng mới bắt đầu ngày 01/10/2026.");
  assert.equal(goiYDoiGia(""), "");
});

test("chipDongChiPhi: loại dòng → nhãn bản vẽ; điều chỉnh lý do phí huỷ muộn → 'Điều chỉnh · phí huỷ' tông đỏ", () => {
  assert.deepEqual(chipDongChiPhi({ loai: "SNAPSHOT", lyDo: null }), { nhan: "Giá bảng", tone: "ok" });
  assert.deepEqual(chipDongChiPhi({ loai: "AGREED", lyDo: null }), { nhan: "Giá thoả thuận", tone: "ok" });
  assert.deepEqual(chipDongChiPhi({ loai: "ADJUSTMENT", lyDo: { ma: "CPX_CAU_DUONG", nhan: "Phí cầu đường / bến bãi" } }), { nhan: "Điều chỉnh", tone: "unit" });
  assert.deepEqual(chipDongChiPhi({ loai: "ADJUSTMENT", lyDo: { ma: "CPX_HUY_MUON", nhan: "Phí huỷ muộn" } }), { nhan: "Điều chỉnh · phí huỷ", tone: "danger" });
  assert.deepEqual(chipDongChiPhi({ loai: "REVERSAL", lyDo: null }), { nhan: "Đảo", tone: "muted" });
});

test("NHAN_NHOM_BANG_KE: năm nhóm trạng thái bảng kê → nhãn + tông bản vẽ (không lộ mã)", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(NHAN_NHOM_BANG_KE).map(([k, v]) => [k, v.nhan])), {
    DA_PHAT_SINH: "Đã phát sinh", CHUA_CHAY: "Chưa chạy", DANG_CHAY: "Đang chạy", DA_HUY: "Đã huỷ", THIEU_GIA: "Chưa có giá",
  });
  assert.equal(NHAN_NHOM_BANG_KE.DANG_CHAY.tone, "navy");
});

test("tomTatBangKe: số do máy chủ đếm; bỏ vế 'chưa có giá' khi bằng 0", () => {
  assert.equal(tomTatBangKe({ soChuyen: 6, soNhaXe: 2, soThieuGia: 1 }), "6 chuyến · 2 nhà xe · 1 chuyến chưa có giá");
  assert.equal(tomTatBangKe({ soChuyen: 3, soNhaXe: 1, soThieuGia: 0 }), "3 chuyến · 1 nhà xe");
});

test("dongDieuChinhBangKe: cột ĐIỀU CHỈNH = số tiền máy chủ tính (câu 4.2); '—' khi không có điều chỉnh; dòng phụ số điều chỉnh bị đảo", () => {
  assert.deepEqual(dongDieuChinhBangKe({ tongDieuChinh: 150_000, soDieuChinh: 1, soDieuChinhBiDao: 0 }), { so: "+ 150.000 ₫", am: false, phu: "" });
  assert.deepEqual(dongDieuChinhBangKe({ tongDieuChinh: -100_000, soDieuChinh: 2, soDieuChinhBiDao: 1 }), { so: "− 100.000 ₫", am: true, phu: "1 điều chỉnh bị đảo do đổi chuyến" });
  assert.deepEqual(dongDieuChinhBangKe({ tongDieuChinh: 0, soDieuChinh: 0, soDieuChinhBiDao: 0 }), { so: "—", am: false, phu: "" });
});
