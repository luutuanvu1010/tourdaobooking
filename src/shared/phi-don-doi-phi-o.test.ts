// Ô «Đổi phí» (ADR-0218 Đ1.5, Task 9): giá trị ô ↔ số đổi gửi lên, đọc lại dòng đã lưu, chữ số máy tính. Cùng câu báo với máy chủ (kiemDoiPhi).
import { test } from "node:test";
import assert from "node:assert/strict";
import { O_DOI_PHI_TRONG, chuSoMay, docDonGia, doiPhiTuO, nhanODonGia, oTuDong } from "./phi-don-doi-phi-o.ts";

test("docDonGia: chữ số trần hoặc ngăn nghìn đúng nhóm ba; dấu thập phân, chữ, dấu trừ, dấu phẩy ⇒ null (không bỏ chấm rồi đọc: «70.5» không thành 705)", () => {
  assert.equal(docDonGia("70000"), 70_000);
  assert.equal(docDonGia(" 5.000.000 "), 5_000_000);
  assert.equal(docDonGia("0"), 0);
  for (const sai of ["70.5", "abc", "-5", "1,5", "", "1.00", "1.2345"]) assert.equal(docDonGia(sai), null, sai);
});

test("doiPhiTuO: không đổi ⇒ null (bỏ đổi); đổi đủ ⇒ số + lý do cắt khoảng trắng; 0 hợp lệ; sai ⇒ đúng câu của máy chủ", () => {
  assert.deepEqual(doiPhiTuO(O_DOI_PHI_TRONG), { ok: true, doiPhi: null });
  assert.deepEqual(doiPhiTuO({ doi: true, donGia: "80.000", lyDo: "  Khách ở xa " }), { ok: true, doiPhi: { donGia: 80_000, lyDo: "Khách ở xa" } });
  assert.deepEqual(doiPhiTuO({ doi: true, donGia: "0", lyDo: "Miễn cho khách quen" }), { ok: true, doiPhi: { donGia: 0, lyDo: "Miễn cho khách quen" } });
  const CAU_GIA = "Đơn giá phí đưa đón phải là số nguyên từ 0 đến 5.000.000 đ.";
  assert.deepEqual(doiPhiTuO({ doi: true, donGia: "5.000.001", lyDo: "x" }), { ok: false, cau: CAU_GIA });
  assert.deepEqual(doiPhiTuO({ doi: true, donGia: "", lyDo: "x" }), { ok: false, cau: CAU_GIA });
  assert.deepEqual(doiPhiTuO({ doi: true, donGia: "1000", lyDo: "  " }), { ok: false, cau: "Nhập lý do đổi phí." });
  assert.deepEqual(doiPhiTuO({ doi: true, donGia: "1000", lyDo: "x".repeat(301) }), { ok: false, cau: "Lý do đổi phí tối đa 300 ký tự." });
});

test("oTuDong: chỉ dòng nguồn DOI_TAY là «đang đổi» (nạp số + lý do); GIA_GOC / CHUONG_TRINH / dòng cũ / vắng ⇒ không đổi — sai ở đây thì lần lưu sau gửi `null` và xoá mất số đã đổi", () => {
  assert.deepEqual(oTuDong({ nguon: "DOI_TAY", unitPrice: 80_000, lyDoDoi: "Khách ở xa" }), { doi: true, donGia: "80000", lyDo: "Khách ở xa" });
  assert.deepEqual(oTuDong({ nguon: "DOI_TAY", unitPrice: 0, lyDoDoi: null }), { doi: true, donGia: "0", lyDo: "" });
  for (const nguon of ["GIA_GOC", "CHUONG_TRINH", null] as const) assert.deepEqual(oTuDong({ nguon, unitPrice: 5, lyDoDoi: null }), O_DOI_PHI_TRONG);
  assert.deepEqual(oTuDong(undefined), O_DOI_PHI_TRONG);
});

test("chuSoMay: giá gốc, chương trình (tên), đổi số, miễn phí; kiểu chuyến; nhãn ô theo xe riêng", () => {
  assert.equal(chuSoMay({ nguon: "GIA_GOC", kind: "PER_PAX", unitPrice: 50_000, quantity: 2, tenChuongTrinh: null }), "50.000 đ × 2 khách (giá gốc)");
  assert.equal(chuSoMay({ nguon: "GIA_GOC", kind: "PER_TRIP", unitPrice: 300_000, quantity: 1, tenChuongTrinh: null }), "300.000 đ × 1 chuyến (giá gốc)");
  assert.equal(chuSoMay({ nguon: "CHUONG_TRINH", kind: "PER_PAX", unitPrice: 0, quantity: 2, tenChuongTrinh: "Miễn phí tháng 12" }), "Miễn phí (chương trình «Miễn phí tháng 12»)");
  assert.equal(chuSoMay({ nguon: "DOI_TAY", kind: "PER_PAX", unitPrice: 80_000, quantity: 2, tenChuongTrinh: null }), "80.000 đ × 2 khách (đã đổi số)");
  assert.equal(chuSoMay({ nguon: null, kind: "PER_PAX", unitPrice: 0, quantity: 2, tenChuongTrinh: null }), "Miễn phí");
  assert.equal(nhanODonGia(true), "Phí cả chuyến (đ)");
  assert.equal(nhanODonGia(false), "Phí mỗi khách (đ)");
});
