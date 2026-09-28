// Luật thuần giấy tờ dùng chung (ADR-0040 D1, D2): lý do sửa sai (danh sách đóng), trạng thái xe (tập đóng), số ngày còn lại, mức hạn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LOAI_CO_DINH, LY_DO_SUA_SAI, TRANG_THAI_XE, mucHan, soNgayConLai, type LyDoSuaSai } from "./giay-to.ts";

test("soNgayConLai: ngày dân sự giờ VN — cùng ngày 0, qua tháng, qua năm, đã quá hạn âm, năm nhuận", () => {
  assert.equal(soNgayConLai("2026-10-28", "2026-09-28"), 30);
  assert.equal(soNgayConLai("2027-01-01", "2026-12-31"), 1, "qua năm");
  assert.equal(soNgayConLai("2026-09-27", "2026-09-28"), -1, "đã quá hạn một ngày");
  assert.equal(soNgayConLai("2026-09-28", "2026-09-28"), 0, "cùng ngày");
  assert.equal(soNgayConLai("2028-03-01", "2028-02-28"), 2, "năm nhuận có 29/02");
  assert.equal(soNgayConLai("2027-03-01", "2027-02-28"), 1, "năm không nhuận");
});

test("mucHan: không hạn / đã hết / sắp hết (tới đúng ngưỡng) / còn hạn", () => {
  const homNay = "2026-09-28";
  assert.equal(mucHan(null, homNay, 30), "khong-han");
  assert.equal(mucHan("2026-09-27", homNay, 30), "het-han", "hôm qua");
  assert.equal(mucHan("2026-09-28", homNay, 30), "sap-het", "hôm nay vẫn còn dùng được trong ngày");
  assert.equal(mucHan("2026-10-28", homNay, 30), "sap-het", "đúng ngưỡng");
  assert.equal(mucHan("2026-10-29", homNay, 30), "con-han", "ngưỡng + 1");
});

test("LY_DO_SUA_SAI: danh sách ĐÓNG sáu lý do; nhãn tiếng Việt có dấu, khác nhau; mỗi lý do sửa đúng một trường (trừ huỷ dòng)", () => {
  const khoa = Object.keys(LY_DO_SUA_SAI) as LyDoSuaSai[];
  assert.deepEqual(khoa, ["SAI_SO", "SAI_NGAY_CAP", "SAI_NGAY_HET_HAN", "SAI_NOI_CAP", "SAI_HANG", "NHAP_NHAM_DONG"]);
  const nhan = khoa.map((k) => LY_DO_SUA_SAI[k].nhan);
  assert.equal(new Set(nhan).size, nhan.length, "nhãn không trùng");
  for (const n of nhan) {
    assert.match(n, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, `${n}: tiếng Việt có dấu`);
    assert.doesNotMatch(n, /_/, `${n}: không lộ mã thô`);
  }
  assert.deepEqual(khoa.filter((k) => LY_DO_SUA_SAI[k].choXe), ["SAI_SO", "SAI_NGAY_CAP", "SAI_NGAY_HET_HAN", "NHAP_NHAM_DONG"], "giấy tờ xe không có nơi cấp, không có hạng");
  const truong = khoa.map((k) => LY_DO_SUA_SAI[k].truong).filter((t) => t !== null);
  assert.equal(new Set(truong).size, truong.length, "mỗi trường chỉ một lý do");
  assert.equal(LY_DO_SUA_SAI.NHAP_NHAM_DONG.truong, null, "nhập nhầm cả dòng = huỷ dòng, không sửa trường nào");
});

test("TRANG_THAI_XE: tập đóng active / maintenance / retired (khớp CHECK của migration *_van_chuyen_xe); nhãn tiếng Việt", () => {
  assert.deepEqual(Object.keys(TRANG_THAI_XE), ["active", "maintenance", "retired"]);
  assert.deepEqual(Object.values(TRANG_THAI_XE), ["Đang dùng", "Bảo dưỡng", "Ngừng dùng"]);
});

test("LOAI_CO_DINH: hai mã loại giấy tờ của người mà CHECK/trigger dựa vào (đổi bằng ADR)", () => {
  assert.deepEqual({ ...LOAI_CO_DINH }, { CCCD: "CCCD", GPLX: "GPLX" });
});
