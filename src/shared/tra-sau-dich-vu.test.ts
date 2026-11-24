// Luật thuần «Trả sau theo dịch vụ» (ADR-0178 Đ2, sửa bởi ADR-0230 Đ1 mục 2): đơn đủ điều kiện khi có ít nhất một dịch vụ «Có vé», MỌI dịch vụ «Có vé» là vé Tour Đảo
// và có dấu (riêng hoặc của nhóm hiện tại), không có dòng nhập tay. Dịch vụ không «Có vé» bỏ qua. Kết quả = giờ trả nhỏ nhất, ân hạn nhỏ nhất (lấy độc lập).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dieuKienTraSauDichVu, type DauDichVu } from "./tra-sau-dich-vu.ts";
import type { NguonVe } from "./nguon-ve.ts";

const dv = (ma: string | null, nhom: string | null, coVe: boolean, nguonVe: NguonVe = "TOUR_DAO") => ({ ma, nhom, coVe, nguonVe });
const nhom = (code: string, gioTra: number, gioAnHan = 0): DauDichVu => ({ targetKind: "GROUP", targetCode: code, gioTra, gioAnHan });
const rieng = (code: string, gioTra: number, gioAnHan = 0): DauDichVu => ({ targetKind: "SERVICE", targetCode: code, gioTra, gioAnHan });

test("hai dịch vụ vé Tour Đảo, dấu nhóm 24 giờ và 48 giờ → giờ trả nhỏ nhất 24", () => {
  const kq = dieuKienTraSauDichVu([dv("A", "N24", true), dv("B", "N48", true)], [nhom("N24", 24, 6), nhom("N48", 48, 2)]);
  assert.deepEqual(kq, { gioTra: 24, gioAnHan: 2 }); // ân hạn nhỏ nhất lấy độc lập với giờ trả
});

test("dấu riêng 12 giờ của dịch vụ trong nhóm 48 giờ → dấu riêng thắng dấu nhóm: 12", () => {
  assert.deepEqual(dieuKienTraSauDichVu([dv("A", "N48", true)], [nhom("N48", 48, 10), rieng("A", 12, 20)]), { gioTra: 12, gioAnHan: 20 });
});

test("thêm một dịch vụ vé hãng ngoài (dù có dấu) → cả đơn không đủ điều kiện", () => {
  assert.equal(dieuKienTraSauDichVu([dv("A", "N24", true), dv("H", "N24", true, "HANG_NGOAI")], [nhom("N24", 24)]), null);
});

test("vé Tour Đảo không có dấu riêng lẫn dấu nhóm → null", () => {
  assert.equal(dieuKienTraSauDichVu([dv("A", "N24", true), dv("B", "NX", true)], [nhom("N24", 24)]), null);
  assert.equal(dieuKienTraSauDichVu([dv("B", null, true)], [nhom("N24", 24)]), null);
});

test("chỉ dịch vụ không «Có vé» có dấu → null (đơn phải có ít nhất một dịch vụ «Có vé»)", () => {
  assert.equal(dieuKienTraSauDichVu([dv("K", "N24", false)], [nhom("N24", 24), rieng("K", 5)]), null);
});

test("dịch vụ không «Có vé» không dấu + vé Tour Đảo có dấu → đủ điều kiện, dịch vụ không vé không tính vào số giờ", () => {
  assert.deepEqual(dieuKienTraSauDichVu([dv("K", null, false, "HANG_NGOAI"), dv("A", "N24", true)], [nhom("N24", 24, 3)]), { gioTra: 24, gioAnHan: 3 });
  assert.deepEqual(dieuKienTraSauDichVu([dv("K", "N24", false), dv("A", "N48", true)], [rieng("K", 1, 0), nhom("N48", 48, 4)]), { gioTra: 48, gioAnHan: 4 });
});

test("có dòng nhập tay (mã null) → null, kể cả khi dòng đó mang cờ không vé", () => {
  assert.equal(dieuKienTraSauDichVu([dv("A", "N24", true), dv(null, null, false)], [nhom("N24", 24)]), null);
  assert.equal(dieuKienTraSauDichVu([dv("A", "N24", true), dv(null, "N24", true)], [nhom("N24", 24)]), null);
});

test("đơn rỗng → null; không có dấu nào → null", () => {
  assert.equal(dieuKienTraSauDichVu([], [nhom("N24", 24)]), null);
  assert.equal(dieuKienTraSauDichVu([dv("A", "N24", true)], []), null);
});

test("dấu SERVICE của mã trùng tên mã nhóm không áp nhầm sang nhóm (và ngược lại)", () => {
  assert.equal(dieuKienTraSauDichVu([dv("A", "X", true)], [rieng("X", 5)]), null);
  assert.equal(dieuKienTraSauDichVu([dv("X", null, true)], [nhom("X", 5)]), null);
});
