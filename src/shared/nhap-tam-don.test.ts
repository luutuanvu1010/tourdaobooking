// ADR-0192: luật thuần của bản chụp form đơn khi hết phiên (khôi phục một lần, đúng người, 30 phút; dọn ở mọi trang).
import { test } from "node:test";
import assert from "node:assert/strict";
import { HAN_NHAP_TAM_MS, TIEN_TO_NHAP_TAM, docBanChup, khoaNhapTam, nenXoaKhiMoTrang, quyetKhoiPhuc, type BanChup } from "./nhap-tam-don.ts";

const T0 = Date.parse("2026-11-10T03:00:00.000Z");
const PHUT = 60 * 1000;
const o = { customerName: "Nguyễn Văn A", note: "đón sớm" };
const formMoi = (at = T0): BanChup => ({ loai: "form", staffId: "s1", at, orderId: null, updatedAt: null, o });
const formSua = (orderId = "A", updatedAt = "2026-11-10T02:00:00.000Z"): BanChup => ({ loai: "form", staffId: "s1", at: T0, orderId, updatedAt, o });

test("khoá = tiền tố + mã nhân viên; hạn 30 phút", () => {
  assert.equal(TIEN_TO_NHAP_TAM, "td-nhap-don:");
  assert.equal(khoaNhapTam("s1"), "td-nhap-don:s1");
  assert.equal(HAN_NHAP_TAM_MS, 30 * 60 * 1000);
});

test("quyetKhoiPhuc: cùng người, 29 phút, đơn mới ⇒ điền; đúng 30 phút ⇒ bỏ", () => {
  assert.deepEqual(quyetKhoiPhuc(formMoi(), "s1", T0 + 29 * PHUT, null, null), { lam: "dien", o });
  assert.deepEqual(quyetKhoiPhuc(formMoi(), "s1", T0 + 30 * PHUT, null, null), { lam: "bo" });
});

test("quyetKhoiPhuc: khác người ⇒ bỏ", () => {
  assert.deepEqual(quyetKhoiPhuc(formMoi(), "s2", T0 + PHUT, null, null), { lam: "bo" });
});

test("quyetKhoiPhuc: đang sửa đơn — updatedAt khớp ⇒ điền, lệch ⇒ bỏ", () => {
  assert.deepEqual(quyetKhoiPhuc(formSua(), "s1", T0 + PHUT, "A", "2026-11-10T02:00:00.000Z"), { lam: "dien", o });
  assert.deepEqual(quyetKhoiPhuc(formSua(), "s1", T0 + PHUT, "A", "2026-11-10T02:30:00.000Z"), { lam: "bo" });
  assert.deepEqual(quyetKhoiPhuc(formSua(), "s1", T0 + PHUT, "A", null), { lam: "bo" });
});

test("quyetKhoiPhuc: bản chụp đơn A không điền vào form đơn B; bản chụp đơn mới không điền vào form sửa đơn A", () => {
  assert.deepEqual(quyetKhoiPhuc(formSua("A"), "s1", T0 + PHUT, "B", "2026-11-10T02:00:00.000Z"), { lam: "bo" });
  assert.deepEqual(quyetKhoiPhuc(formMoi(), "s1", T0 + PHUT, "A", null), { lam: "bo" });
  assert.deepEqual(quyetKhoiPhuc(formSua("A"), "s1", T0 + PHUT, null, null), { lam: "bo" });
});

test("quyetKhoiPhuc: đơn đã tạo (Đối tác) cùng người trong hạn ⇒ chuyển tới đúng đơn; khác người / quá hạn ⇒ bỏ", () => {
  const b: BanChup = { loai: "da-tao", staffId: "s1", at: T0, orderId: "D9" };
  assert.deepEqual(quyetKhoiPhuc(b, "s1", T0 + PHUT, null, null), { lam: "chuyen", orderId: "D9" });
  assert.deepEqual(quyetKhoiPhuc(b, "s2", T0 + PHUT, null, null), { lam: "bo" });
  assert.deepEqual(quyetKhoiPhuc(b, "s1", T0 + 30 * PHUT, null, null), { lam: "bo" });
});

test("quyetKhoiPhuc: không có bản chụp ⇒ bỏ", () => {
  assert.deepEqual(quyetKhoiPhuc(null, "s1", T0, null, null), { lam: "bo" });
});

test("nenXoaKhiMoTrang: khác người ⇒ xoá; quá hạn ⇒ xoá; cùng người trong hạn ⇒ giữ; hỏng ⇒ xoá", () => {
  assert.equal(nenXoaKhiMoTrang(formMoi(), "s2", T0 + PHUT), true);
  assert.equal(nenXoaKhiMoTrang(formMoi(), "s1", T0 + 30 * PHUT), true);
  assert.equal(nenXoaKhiMoTrang(formMoi(), "s1", T0 + 29 * PHUT), false);
  assert.equal(nenXoaKhiMoTrang(null, "s1", T0), true);
  // `initShell` truyền thẳng JSON.parse thô (gọn cho trần gói Đơn hàng): thiếu giờ chụp, số, chuỗi ⇒ xoá
  assert.equal(nenXoaKhiMoTrang({ staffId: "s1" } as unknown as BanChup, "s1", T0), true);
  assert.equal(nenXoaKhiMoTrang(5 as unknown as BanChup, "s1", T0), true);
  assert.equal(nenXoaKhiMoTrang("x" as unknown as BanChup, "s1", T0), true);
});

test("docBanChup: JSON hỏng / thiếu trường ⇒ null; đúng dạng ⇒ bản chụp", () => {
  assert.equal(docBanChup(null), null);
  assert.equal(docBanChup("{"), null);
  assert.equal(docBanChup("null"), null);
  assert.equal(docBanChup(JSON.stringify({ loai: "form", at: T0, orderId: null, updatedAt: null, o })), null, "thiếu staffId");
  assert.equal(docBanChup(JSON.stringify({ loai: "form", staffId: "s1", orderId: null, updatedAt: null, o })), null, "thiếu giờ chụp");
  assert.equal(docBanChup(JSON.stringify({ loai: "form", staffId: "s1", at: T0, orderId: null, updatedAt: null })), null, "thiếu giá trị ô");
  assert.equal(docBanChup(JSON.stringify({ loai: "da-tao", staffId: "s1", at: T0 })), null, "đơn đã tạo thiếu mã đơn");
  assert.equal(docBanChup(JSON.stringify({ loai: "khac", staffId: "s1", at: T0, orderId: "D9" })), null);
  assert.deepEqual(docBanChup(JSON.stringify(formSua())), formSua());
  assert.deepEqual(docBanChup(JSON.stringify({ loai: "da-tao", staffId: "s1", at: T0, orderId: "D9" })), { loai: "da-tao", staffId: "s1", at: T0, orderId: "D9" });
});
