// Luật thuần kiểm đầu vào nhập lô (ADR-0153; Task 4c): không I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOI_DA_VE_MOI_DOT } from "../../shared/ve-nhap-lo.ts";
import { che4SoCuoi, kiemLo, kiemVeMoi } from "./nhap-lo.ts";

test("kiemLo: nhóm khách, tên sản phẩm, mã tour", () => {
  assert.deepEqual(kiemLo({ catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "VVC Multiday 2 lần" }), { ok: true, value: { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "VVC Multiday 2 lần", nguon: "HANG_NGOAI" } });
  assert.equal(kiemLo({ catalogCode: "V2D", nhomKhach: "INFANT", tenSanPham: "x" }).ok, false, "em bé không có vé");
  assert.equal(kiemLo({ catalogCode: "", nhomKhach: "ADULT", tenSanPham: "x" }).ok, false);
  assert.equal(kiemLo({ catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "  " }).ok, false);
  assert.equal(kiemLo({ catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "a".repeat(201) }).ok, false);
});

test("kiemVeMoi: mã vé, ngày, giờ", () => {
  const ok = kiemVeMoi({ maVe: "TA.123456789012", tuNgay: "2026-10-24", denNgay: "2026-11-23", gio: "12:00" }, "HANG_NGOAI");
  assert.deepEqual(ok, { ok: true, value: { maVe: "TA.123456789012", tuNgay: "2026-10-24", denNgay: "2026-11-23", gio: "12:00" } });
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-24", denNgay: "2026-10-24" }, "HANG_NGOAI").ok, true, "vé một ngày");
  assert.equal(kiemVeMoi({ maVe: "", tuNgay: "2026-10-24", denNgay: "2026-10-24" }, "HANG_NGOAI").ok, false);
  assert.equal(kiemVeMoi({ maVe: "x y", tuNgay: "2026-10-24", denNgay: "2026-10-24" }, "HANG_NGOAI").ok, false, "khoảng trắng");
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-25", denNgay: "2026-10-24" }, "HANG_NGOAI").ok, false, "đảo ngày");
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-02-30", denNgay: "2026-03-01" }, "HANG_NGOAI").ok, false, "ngày không có thật");
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "24/10/2026", denNgay: "25/10/2026" }, "HANG_NGOAI").ok, false);
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-24", denNgay: "2026-10-24", gio: "25:00" }, "HANG_NGOAI").ok, false);
  const khongGio = kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-24", denNgay: "2026-10-24", gio: "" }, "HANG_NGOAI");
  assert.deepEqual(khongGio.ok && khongGio.value.gio, null);
});

test("kiemLo: nguồn của lô — thiếu là hãng ngoài, TOUR_DAO nhận, nguồn lạ từ chối (ADR-0175 Đ1.1)", () => {
  const goc = { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "x" };
  const td = kiemLo({ ...goc, nguon: "TOUR_DAO" });
  assert.equal(td.ok && td.value.nguon, "TOUR_DAO");
  assert.equal(kiemLo({ ...goc, nguon: "KHAC" }).ok, false);
  assert.equal(kiemLo({ ...goc, nguon: null }).ok, false);
});

test("kiemVeMoi: lô Tour Đảo chỉ nhận TD1. + 26 base32; lô hãng ngoài từ chối tiền tố TD1. (ADR-0175 Đ1.6)", () => {
  const ngay = { tuNgay: "2026-10-24", denNgay: "2026-10-24" };
  const maTD = "TD1." + "A".repeat(26);
  assert.equal(kiemVeMoi({ maVe: maTD, ...ngay }, "TOUR_DAO").ok, true);
  assert.equal(kiemVeMoi({ maVe: "ABC123", ...ngay }, "TOUR_DAO").ok, false);
  assert.equal(kiemVeMoi({ maVe: "TD1.AAAA", ...ngay }, "TOUR_DAO").ok, false);
  assert.equal(kiemVeMoi({ maVe: maTD, ...ngay }, "HANG_NGOAI").ok, false);
  assert.equal(kiemVeMoi({ maVe: "TD1.X", ...ngay }, "HANG_NGOAI").ok, false);
  const loi = kiemVeMoi({ maVe: maTD, ...ngay }, "HANG_NGOAI");
  assert.ok(!loi.ok && !loi.message.includes("TD1"), "câu lỗi không nhắc lại mã");
});

test("che4SoCuoi: chỉ lộ 4 ký tự cuối, không bao giờ trả cả mã", () => {
  assert.equal(che4SoCuoi("TA.123456789012"), "…9012");
  assert.equal(che4SoCuoi("AB"), "…");
  assert.doesNotMatch(che4SoCuoi("TA.123456789012"), /TA\./);
  assert.ok(TOI_DA_VE_MOI_DOT >= 5);
});
