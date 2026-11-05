// Luật màn «Dịch vụ cần kiểm vé» (ADR-0136 Đ1): dòng dịch vụ thắng dòng nhóm, không có gì = không cần, chỉ dịch vụ đang bán.
import { test } from "node:test";
import assert from "node:assert/strict";
import { demKiemVe, locNhomKiemVe, nhanNguonKiemVe, xepNhomKiemVe } from "./dich-vu-kiem-ve.ts";

const dv = [
  { code: "VB350", ten: "Vé Vinwonders + buffet 350", dangBan: true, groupCode: "VIN" },
  { code: "VTC", ten: "Vé Vinwonders tiêu chuẩn", dangBan: true, groupCode: "VIN" },
  { code: "CU", ten: "Vé đã ngưng", dangBan: false, groupCode: "VIN" },
  { code: "SM1", ten: "Vé Hòn Tằm", dangBan: true, groupCode: "HTA" },
  { code: "LE", ten: "Vé lẻ", dangBan: true, groupCode: null },
];
const nhom = [{ code: "VIN", ten: "Vinwonders" }, { code: "HTA", ten: "Hòn Tằm" }, { code: "RONG", ten: "Nhóm rỗng" }];

test("không có cờ: mọi vé không cần; bỏ dịch vụ ngưng bán và nhóm rỗng; chưa phân loại đứng cuối, không đặt được cả nhóm", () => {
  const r = xepNhomKiemVe(dv, nhom, []);
  assert.deepEqual(r.map((n) => n.ma), ["VIN", "HTA", null]);
  assert.deepEqual(r[0]!.dichVu.map((d) => d.ma), ["VB350", "VTC"]);
  assert.ok(r.every((n) => n.soCan === 0 && !n.caNhomCan));
  assert.equal(demKiemVe(r[0]!), "Không có vé cần kiểm");
  assert.equal(nhanNguonKiemVe(r[2]!.dichVu[0]!), "Chưa đặt", "vé chưa phân loại không ghi «Theo nhóm»");
});

test("dòng riêng bật một vé: chỉ vé đó cần, nhãn nguồn đúng", () => {
  const r = xepNhomKiemVe(dv, nhom, [{ pham: "SERVICE", ma: "VB350", canXacNhan: true }]);
  const [a, b] = r[0]!.dichVu;
  assert.deepEqual([a!.can, a!.rieng, b!.can, b!.rieng], [true, true, false, false]);
  assert.equal(nhanNguonKiemVe(a!), "Đặt riêng cho vé này");
  assert.equal(nhanNguonKiemVe(b!), "Theo nhóm");
  assert.equal(demKiemVe(r[0]!), "1/2 vé cần kiểm");
});

test("nhóm cần, dòng riêng không cần: dòng riêng thắng", () => {
  const r = xepNhomKiemVe(dv, nhom, [{ pham: "GROUP", ma: "VIN", canXacNhan: true }, { pham: "SERVICE", ma: "VTC", canXacNhan: false }]);
  assert.equal(r[0]!.caNhomCan, true);
  assert.deepEqual(r[0]!.dichVu.map((d) => d.can), [true, false]);
});

test("tìm không phân biệt dấu; khớp tên nhóm thì giữ cả nhóm; để trống giữ nguyên", () => {
  const r = xepNhomKiemVe(dv, nhom, []);
  assert.deepEqual(locNhomKiemVe(r, "BUFFET").map((n) => n.dichVu.map((d) => d.ma)), [["VB350"]]);
  assert.deepEqual(locNhomKiemVe(r, "hon tam").map((n) => n.ma), ["HTA"]);
  assert.equal(locNhomKiemVe(r, "  ").length, 3);
});
