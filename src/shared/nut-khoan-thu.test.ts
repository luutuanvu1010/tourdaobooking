import assert from "node:assert/strict";
import { test } from "node:test";
import { cauXacNhanDaNhan, hienNutSuaKhoanThu } from "./nut-khoan-thu.ts";

const khoan = { id: "k1", traLai: false, daDao: false, laDongDao: false };

test("Sửa khoản thu đã ghi: hiện trên khoản thu thường của đơn chưa huỷ", () => {
  assert.equal(hienNutSuaKhoanThu(khoan, { choXacNhan: [], donDaHuy: false }), true);
});

test("Sửa khoản thu đã ghi: KHÔNG hiện trên khoản «Công ty thu – CK» còn chờ xác nhận (máy chủ luôn từ chối 409 ck_cho_xac_nhan)", () => {
  assert.equal(hienNutSuaKhoanThu(khoan, { choXacNhan: ["k1"], donDaHuy: false }), false);
  assert.equal(hienNutSuaKhoanThu(khoan, { choXacNhan: ["k2"], donDaHuy: false }), true, "khoản khác đang chờ không ảnh hưởng");
});

test("Sửa khoản thu đã ghi: không hiện trên dòng đã huỷ, dòng huỷ, dòng trả lại khách, đơn đã huỷ (như trước)", () => {
  assert.equal(hienNutSuaKhoanThu({ ...khoan, daDao: true }, { choXacNhan: [], donDaHuy: false }), false);
  assert.equal(hienNutSuaKhoanThu({ ...khoan, laDongDao: true }, { choXacNhan: [], donDaHuy: false }), false);
  assert.equal(hienNutSuaKhoanThu({ ...khoan, traLai: true }, { choXacNhan: [], donDaHuy: false }), false);
  assert.equal(hienNutSuaKhoanThu(khoan, { choXacNhan: [], donDaHuy: true }), false);
});

test("Câu xác nhận đã nhận: chuyển khoản hỏi «vào tài khoản» và nhắc mã giao dịch", () => {
  const c = cauXacNhanDaNhan({ hinhThuc: "BANK_TRANSFER", soTien: "300.000 ₫" });
  assert.match(c, /vào tài khoản\?/);
  assert.match(c, /mã giao dịch/);
});

test("Câu xác nhận đã nhận: tiền mặt / hình thức khác KHÔNG nói «vào tài khoản», không đòi mã giao dịch", () => {
  for (const hinhThuc of ["CASH", "OTHER"] as const) {
    const c = cauXacNhanDaNhan({ hinhThuc, soTien: "300.000 ₫" });
    assert.doesNotMatch(c, /tài khoản/, hinhThuc);
    assert.doesNotMatch(c, /mã giao dịch/, hinhThuc);
    assert.match(c, /300\.000 ₫/);
  }
  assert.match(cauXacNhanDaNhan({ hinhThuc: "CASH", soTien: "1 ₫" }), /tiền mặt/);
});

test("duocHuyKhoanSo (BL-SDL2-DAO-DONG-TM): nút «Huỷ khoản thu» chỉ cho người ghi sổ KHÔNG giữ quyền Đối tác — cùng cổng với route POST /api/ledger/adjustments", async () => {
  const { duocHuyKhoanSo } = await import("./nut-khoan-thu.ts");
  const ai = (perms: string[]) => ({ id: "x", permissions: perms }) as never;
  assert.equal(duocHuyKhoanSo(ai(["ACCOUNTING"])), true);
  assert.equal(duocHuyKhoanSo(ai(["SUPER_ADMIN"])), true);
  assert.equal(duocHuyKhoanSo(ai(["ACCOUNTING", "PARTNER"])), false, "lai Kế toán + Đối tác");
  assert.equal(duocHuyKhoanSo(ai(["SUPER_ADMIN", "PARTNER"])), false, "lai Toàn quyền + Đối tác");
  assert.equal(duocHuyKhoanSo(ai(["SALES"])), false);
});
