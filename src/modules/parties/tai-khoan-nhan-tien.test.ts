// Luật thuần "Tài khoản nhận tiền" (ADR-0108 đ2; đặc tả QR §4.1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoaTenChuTaiKhoan, docTaiKhoanNhanTien } from "./tai-khoan-nhan-tien.ts";

test("tên chủ tài khoản: bỏ dấu, đ → D, in hoa, gộp khoảng trắng", () => {
  assert.equal(chuanHoaTenChuTaiKhoan("  Công ty TNHH   Tour Đảo "), "CONG TY TNHH TOUR DAO");
  assert.equal(chuanHoaTenChuTaiKhoan("Lưu Tuấn Vũ"), "LUU TUAN VU");
});

test("đọc thân: chuẩn hoá số (bỏ cách, chấm, gạch), bắt buộc truocDo rõ ràng (null hoặc id)", () => {
  assert.deepEqual(docTaiKhoanNhanTien({ maNganHang: "VCB", soTaiKhoan: "0011 001.234-567", chuTaiKhoan: "Công ty Tour Đảo", truocDo: null }), {
    ok: true, value: { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TOUR DAO", truocDo: null },
  });
  for (const [sua, mau] of [
    [{ maNganHang: "vcb" }, /ngân hàng/], [{ soTaiKhoan: "12AB345" }, /Số tài khoản/], [{ soTaiKhoan: "123" }, /Số tài khoản/],
    [{ chuTaiKhoan: "A" }, /Tên chủ tài khoản/], [{ chuTaiKhoan: "CONG & TY" }, /Tên chủ tài khoản/], [{ truocDo: undefined }, /tải lại/],
  ] as const) {
    const r = docTaiKhoanNhanTien({ maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "TOUR DAO", truocDo: null, ...sua });
    assert.equal(r.ok, false, JSON.stringify(sua));
    if (!r.ok) assert.match(r.cau, mau);
  }
});
