// Luật thuần kiểm đầu vào nhập lô (ADR-0153; Task 4c): không I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { che4SoCuoi, kiemLo, kiemVeMoi, TOI_DA_VE_MOI_DOT } from "./nhap-lo.ts";

test("kiemLo: nhóm khách, tên sản phẩm, mã tour", () => {
  assert.deepEqual(kiemLo({ catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "VVC Multiday 2 lần" }), { ok: true, value: { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "VVC Multiday 2 lần" } });
  assert.equal(kiemLo({ catalogCode: "V2D", nhomKhach: "INFANT", tenSanPham: "x" }).ok, false, "em bé không có vé");
  assert.equal(kiemLo({ catalogCode: "", nhomKhach: "ADULT", tenSanPham: "x" }).ok, false);
  assert.equal(kiemLo({ catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "  " }).ok, false);
  assert.equal(kiemLo({ catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "a".repeat(201) }).ok, false);
});

test("kiemVeMoi: mã vé, ngày, giờ", () => {
  const ok = kiemVeMoi({ maVe: "TA.123456789012", tuNgay: "2026-10-24", denNgay: "2026-11-23", gio: "12:00" });
  assert.deepEqual(ok, { ok: true, value: { maVe: "TA.123456789012", tuNgay: "2026-10-24", denNgay: "2026-11-23", gio: "12:00" } });
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-24", denNgay: "2026-10-24" }).ok, true, "vé một ngày");
  assert.equal(kiemVeMoi({ maVe: "", tuNgay: "2026-10-24", denNgay: "2026-10-24" }).ok, false);
  assert.equal(kiemVeMoi({ maVe: "x y", tuNgay: "2026-10-24", denNgay: "2026-10-24" }).ok, false, "khoảng trắng");
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-25", denNgay: "2026-10-24" }).ok, false, "đảo ngày");
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-02-30", denNgay: "2026-03-01" }).ok, false, "ngày không có thật");
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "24/10/2026", denNgay: "25/10/2026" }).ok, false);
  assert.equal(kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-24", denNgay: "2026-10-24", gio: "25:00" }).ok, false);
  const khongGio = kiemVeMoi({ maVe: "TA.1", tuNgay: "2026-10-24", denNgay: "2026-10-24", gio: "" });
  assert.deepEqual(khongGio.ok && khongGio.value.gio, null);
});

test("che4SoCuoi: chỉ lộ 4 ký tự cuối, không bao giờ trả cả mã", () => {
  assert.equal(che4SoCuoi("TA.123456789012"), "…9012");
  assert.equal(che4SoCuoi("AB"), "…");
  assert.doesNotMatch(che4SoCuoi("TA.123456789012"), /TA\./);
  assert.ok(TOI_DA_VE_MOI_DOT >= 5);
});
