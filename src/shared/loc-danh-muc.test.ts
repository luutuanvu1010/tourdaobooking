import { test } from "node:test";
import assert from "node:assert/strict";
import { docNhoDanhMuc, locDanhMuc, NHO_DANH_MUC_TRONG, doiGhim } from "./loc-danh-muc.ts";

const it = (code: string, name: string, unit: string) => ({ code, name, unit });
const DS = [it("TD101", "Tour 4 đảo", "perPax"), it("TTB03", "Phao chuối", "per5Pax"), it("TTB06", "Motor nước", "perPax"), it("DD01", "Đưa đón", "manual")];
const ma = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

test("locDanhMuc: không lọc → như cũ (ô tìm theo tên hoặc mã, không phân biệt hoa thường)", () => {
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "", loc: null, ghim: [] })), ["TD101", "TTB03", "TTB06", "DD01"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "PHAO", loc: null, ghim: [] })), ["TTB03"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "ttb", loc: null, ghim: [] })), ["TTB03", "TTB06"]);
});

test("locDanhMuc: 'Hay dùng' = dịch vụ đã ghim trên máy; 'Theo người' / 'Theo nhóm' theo đơn vị tính; lọc AND với ô tìm", () => {
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "", loc: "hay-dung", ghim: ["TTB06", "TD101", "KHONG_CON"] })), ["TD101", "TTB06"], "giữ thứ tự danh mục; mã đã ghim nhưng không còn thì bỏ qua");
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "", loc: "theo-nguoi", ghim: [] })), ["TD101", "TTB06"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "", loc: "theo-nhom", ghim: [] })), ["TTB03"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "motor", loc: "theo-nguoi", ghim: [] })), ["TTB06"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "", loc: "hay-dung", ghim: [] })), [], "chưa ghim gì → rỗng");
});

test("doiGhim: bật / tắt ghim, không trùng; docNhoDanhMuc: rác / sai dạng → trống, không ném lỗi", () => {
  assert.deepEqual(doiGhim(["A"], "B"), ["A", "B"]);
  assert.deepEqual(doiGhim(["A", "B"], "A"), ["B"]);
  const ok = { loc: "hay-dung", ghim: ["TD101"] };
  assert.deepEqual(docNhoDanhMuc(JSON.stringify(ok)), ok);
  assert.deepEqual(docNhoDanhMuc(JSON.stringify({ loc: null, ghim: [] })), NHO_DANH_MUC_TRONG);
  for (const rac of [null, "", "{", "[]", JSON.stringify({ loc: "khac", ghim: [] }), JSON.stringify({ loc: null, ghim: "TD101" }), JSON.stringify({ loc: null, ghim: [1] })]) {
    assert.deepEqual(docNhoDanhMuc(rac), NHO_DANH_MUC_TRONG, String(rac));
  }
  const nhieu = JSON.stringify({ loc: null, ghim: Array.from({ length: 300 }, (_, i) => `M${i}`) });
  assert.equal(docNhoDanhMuc(nhieu).ghim.length, 200, "giới hạn 200 mã ghim");
});
