// Luật hiển thị của màn «Hạn mức trả sau» và khối Thanh toán trên đơn (ADR-0168; kế hoạch Task 6). Thay R-CRD-3 (bộ kiểm dữ liệu không tính được phải thu).
import assert from "node:assert/strict";
import { test } from "node:test";
import { CAU_VE_TRA_TRUOC, cauChonTraSau, cauHanMuc, canhBaoVuotHanMuc, docHanMuc, docSoNgay, nhanHinhThucDon, nhanQuaHan, quyetHinhThuc } from "./han-muc-tra-sau-hien-thi.ts";

test("cảnh báo khi nợ vượt hạn mức hiện hành; vừa bằng thì chưa cảnh báo", () => {
  assert.equal(canhBaoVuotHanMuc({ hanMuc: 50_000_000, dangNo: 50_000_000 }), null);
  assert.equal(canhBaoVuotHanMuc({ hanMuc: 50_000_000, dangNo: 0 }), null);
  const c = canhBaoVuotHanMuc({ hanMuc: 30_000_000, dangNo: 45_000_000 });
  assert.ok(c && c.includes("45.000.000") && c.includes("30.000.000") && c.includes("vượt"), String(c));
});

test("hết hạn mức mà còn nợ cũng cảnh báo; không hạn mức và không nợ thì im", () => {
  assert.equal(canhBaoVuotHanMuc({ hanMuc: null, dangNo: 0 }), null);
  const c = canhBaoVuotHanMuc({ hanMuc: null, dangNo: 7_000_000 });
  assert.ok(c && c.includes("7.000.000") && c.includes("không còn hạn mức"), String(c));
});

test("nhãn hạn mức và nhãn quá hạn", () => {
  assert.equal(cauHanMuc({ hanMuc: 50_000_000, soNgay: 30 }), "50.000.000 ₫ · 30 ngày");
  assert.equal(cauHanMuc({ hanMuc: null, soNgay: null }), "Chưa có hạn mức");
  assert.equal(nhanQuaHan(0), null);
  assert.equal(nhanQuaHan(2), "2 đơn quá hạn");
});

test("nhãn hình thức trên chi tiết đơn: Trả sau kèm hạn trả đầy đủ năm; Trả trước không kèm gì", () => {
  assert.equal(nhanHinhThucDon("PREPAID", null), "Trả trước");
  assert.equal(nhanHinhThucDon("CREDIT", "2026-11-10"), "Trả sau · hạn trả 10/11/2026");
  assert.equal(nhanHinhThucDon("CREDIT", null), "Trả sau");
});

test("khối chọn hình thức: không hạn mức thì ẩn; có hạn mức hiện «Còn được dùng»; quá hạn thì khoá kèm lý do", () => {
  assert.deepEqual(cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false }), { hien: false, khoa: null, cau: "" });
  assert.deepEqual(cauChonTraSau({ coHanMuc: true, conDuocDung: 12_000_000, coDonQuaHan: false }), { hien: true, khoa: null, cau: "Còn được dùng 12.000.000 ₫" });
  const q = cauChonTraSau({ coHanMuc: true, conDuocDung: 12_000_000, coDonQuaHan: true });
  assert.equal(q.hien, true);
  assert.ok(q.khoa && q.khoa.includes("quá hạn"), String(q.khoa));
});

test("ô nhập hạn mức: số nguyên đồng dương, bỏ dấu chấm nghìn, trần 10 tỷ; số ngày 1 đến 365", () => {
  assert.deepEqual(docHanMuc("50.000.000"), { ok: true, dong: 50_000_000 });
  assert.equal(docHanMuc("").ok, false);
  assert.equal(docHanMuc("0").ok, false);
  assert.equal(docHanMuc("12,5").ok, false);
  assert.equal(docHanMuc("10.000.000.001").ok, false);
  assert.deepEqual(docSoNgay("30"), { ok: true, ngay: 30 });
  for (const sai of ["", "0", "366", "1,5", "abc"]) assert.equal(docSoNgay(sai).ok, false, sai);
});

test("quyết hình thức sau khi biết hạn mức của bên đặt: giữ lựa chọn khi dùng được; về Trả trước KÈM câu báo khi không dùng được (không đổi âm thầm)", () => {
  const co = cauChonTraSau({ coHanMuc: true, conDuocDung: 1_000_000, coDonQuaHan: false });
  const khong = cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false });
  const quaHan = cauChonTraSau({ coHanMuc: true, conDuocDung: 1_000_000, coDonQuaHan: true });
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: co }), { chon: "CREDIT", bao: null });
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: co }), { chon: "PREPAID", bao: null });
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: khong }), { chon: "PREPAID", bao: null }, "đang Trả trước thì không có gì để báo");
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: khong }), { chon: "PREPAID", bao: CAU_VE_TRA_TRUOC });
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: quaHan }), { chon: "PREPAID", bao: CAU_VE_TRA_TRUOC });
  assert.ok(CAU_VE_TRA_TRUOC.includes("Trả trước") && CAU_VE_TRA_TRUOC.includes("hạn mức"));
});
