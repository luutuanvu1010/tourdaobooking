// Bộ lọc danh sách «Số vé còn» của Kho vé điện tử (đặc tả 2026-11-20-sua-giao-dien-bon-y-cua-chu.md, H4): lọc ngay trên dữ liệu đã tải.
import assert from "node:assert/strict";
import { test } from "node:test";
import { NHOM_SO_VE, demTheoNhom, locKhoVe } from "./loc-kho-ve.ts";

const dong = (ten: string | null, conTrong: number, ma = "X") => ({ catalogCode: ma, tenDichVu: ten, conTrong });
const KHO = [dong("Vé Hòn Tằm: tắm biển", 0), dong("Bus city tour 1 vòng", 1), dong("Tắm bùn I Resort", 5), dong("Vé Hòn Tằm: buffet", 6), dong(null, 16, "ZTD9")];

test("không lọc gì thì giữ nguyên thứ tự và đủ dòng", () => {
  assert.deepEqual(locKhoVe(KHO, { tim: "", nhom: "tat-ca" }), KHO);
});

test("bốn nhóm số vé còn: hết vé = 0, «Còn 1 đến 5» gồm cả 1 và 5, «Còn trên 5» từ 6", () => {
  assert.deepEqual(NHOM_SO_VE.map((n) => n.nhan), ["Tất cả", "Hết vé", "Còn 1 đến 5", "Còn trên 5"]);
  assert.deepEqual(locKhoVe(KHO, { tim: "", nhom: "het" }).map((d) => d.conTrong), [0]);
  assert.deepEqual(locKhoVe(KHO, { tim: "", nhom: "it" }).map((d) => d.conTrong), [1, 5]);
  assert.deepEqual(locKhoVe(KHO, { tim: "", nhom: "nhieu" }).map((d) => d.conTrong), [6, 16]);
});

test("tìm theo tên không phân biệt dấu, hoa thường; dòng không có tên thì tìm theo mã dịch vụ", () => {
  assert.deepEqual(locKhoVe(KHO, { tim: "hon tam", nhom: "tat-ca" }).map((d) => d.conTrong), [0, 6]);
  assert.deepEqual(locKhoVe(KHO, { tim: "  BÙN ", nhom: "tat-ca" }).map((d) => d.conTrong), [5]);
  assert.deepEqual(locKhoVe(KHO, { tim: "ztd9", nhom: "tat-ca" }).map((d) => d.conTrong), [16]);
});

test("hai bộ lọc cùng áp", () => {
  assert.deepEqual(locKhoVe(KHO, { tim: "hòn tằm", nhom: "nhieu" }).map((d) => d.conTrong), [6]);
  assert.deepEqual(locKhoVe(KHO, { tim: "không có dòng nào", nhom: "tat-ca" }), []);
});

test("số đếm trên nút tính theo ô tìm đang gõ", () => {
  assert.deepEqual(demTheoNhom(KHO, ""), { "tat-ca": 5, het: 1, it: 2, nhieu: 2 });
  assert.deepEqual(demTheoNhom(KHO, "hòn tằm"), { "tat-ca": 2, het: 1, it: 0, nhieu: 1 });
});
