import { test } from "node:test";
import assert from "node:assert/strict";
import { boLocAn, LOC_CON_LOI_VAO, docNhoDanhMuc, locDanhMuc, NHO_DANH_MUC_TRONG, doiGhim, LOC_DANH_MUC, locTheoNhom, demTheoNhom, khoaNhoNhom, docNhoNhom, CHUA_PHAN_LOAI } from "./loc-danh-muc.ts";

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

// ---- ADR-0058 Đ8: chip "Nhóm dịch vụ" (Task A6; chủ chọn cách 1 ngày 30/9: hàng riêng, VÀ với hàng lọc trên) ----
const g = (code: string, name: string, unit: string, groupCode: string | null) => ({ code, name, unit, groupCode });
const DSN = [
  g("TD101", "Tour 4 đảo", "perPax", "TDA"),
  ...Array.from({ length: 23 }, (_, i) => g(`TTB${String(i + 1).padStart(2, "0")}`, i === 5 ? "Motor nước" : `Trò ${i + 1}`, i === 2 ? "per5Pax" : "perPax", "TTB")),
  g("KON01", "Kong Forest", "perPax", "KON"),
  g("MOI01", "Dịch vụ mới", "perPax", null),
  g("MOI02", "Motor mới", "perPax", null),
];
const GROUPS = [{ code: "TDA", name: "Tour đảo" }, { code: "TTB", name: "Thể thao biển" }, { code: "KON", name: "Kong Forest" }];

test("locTheoNhom: một nhóm → đúng dịch vụ nhóm đó; 'Chưa phân loại' → chỉ groupCode null; null → tất cả", () => {
  assert.equal(locTheoNhom(DSN, "TTB").length, 23);
  assert.ok(locTheoNhom(DSN, "TTB").every((x) => x.groupCode === "TTB"));
  assert.deepEqual(ma(locTheoNhom(DSN, CHUA_PHAN_LOAI)), ["MOI01", "MOI02"]);
  assert.equal(locTheoNhom(DSN, null).length, DSN.length);
  assert.deepEqual(locTheoNhom(DSN, "KHONGCO"), []);
});

test("locTheoNhom kết hợp VÀ với ô tìm và hàng lọc 1.42 (Hay dùng / Giá theo nhóm)", () => {
  const sau = (kim: string, loc: Parameters<typeof locDanhMuc>[1]["loc"], ghim: string[], nhom: string | null) => ma(locTheoNhom(locDanhMuc(DSN, { kim, loc, ghim }), nhom));
  assert.deepEqual(sau("motor", null, [], "TTB"), ["TTB06"], "tìm TRONG nhóm");
  assert.deepEqual(sau("motor", null, [], CHUA_PHAN_LOAI), ["MOI02"]);
  assert.deepEqual(sau("", "hay-dung", ["TD101", "TTB04"], "TTB"), ["TTB04"], "★ Hay dùng + Thể thao biển");
  assert.deepEqual(sau("", "theo-nhom", [], "TTB"), ["TTB03"], "Giá theo nhóm + Thể thao biển");
  assert.deepEqual(sau("", "hay-dung", ["TD101"], "TTB"), []);
});

test("demTheoNhom: đếm theo nhóm, dịch vụ không nhóm đếm vào CHUA_PHAN_LOAI", () => {
  const d = demTheoNhom(DSN);
  assert.equal(d.get("TTB"), 23);
  assert.equal(d.get("TDA"), 1);
  assert.equal(d.get(CHUA_PHAN_LOAI), 2);
  assert.equal(demTheoNhom(DSN.filter((x) => x.groupCode !== null)).get(CHUA_PHAN_LOAI) ?? 0, 0);
});

test("khoaNhoNhom: khoá nhớ gồm id tài khoản — hai tài khoản trên cùng máy không nhớ lẫn", () => {
  assert.equal(khoaNhoNhom("a"), "loc-nhom-dv:a");
  assert.notEqual(khoaNhoNhom("a"), khoaNhoNhom("b"));
});

test("docNhoNhom: nhóm đã nhớ còn trong groups → giữ; không còn / rác → null ('Tất cả'); 'Chưa phân loại' đọc được", () => {
  assert.equal(docNhoNhom('"TTB"', GROUPS), "TTB");
  assert.equal(docNhoNhom('"TTB"', GROUPS.filter((x) => x.code !== "TTB")), null, "nhóm bị tắt / không còn → Tất cả");
  assert.equal(docNhoNhom(JSON.stringify(CHUA_PHAN_LOAI), GROUPS), CHUA_PHAN_LOAI);
  for (const rac of [null, "", "rác", "{", "123", "null", "[]", '{"nhom":"TTB"}', '""']) assert.equal(docNhoNhom(rac, GROUPS), null, String(rac));
});

test("Đổi chữ chip 1.42 'Theo nhóm' → 'Giá theo nhóm' (chủ chọn 30/9); khoá lọc 'theo-nhom' GIỮ NGUYÊN", () => {
  assert.deepEqual(LOC_DANH_MUC.map((x) => x.nhan), ["★ Hay dùng", "Theo người", "Giá theo nhóm"]);
  assert.deepEqual(LOC_DANH_MUC.map((x) => x.khoa), ["hay-dung", "theo-nguoi", "theo-nhom"]);
});

// ---- Đợt 1 (bảng việc 13/10, #3): bỏ hàng "Lọc sẵn có"; chỉ "★ Hay dùng" còn lối vào (chip trong hàng Nhóm dịch vụ) ----
test("boLocAn: bộ lọc 'Theo người' / 'Giá theo nhóm' đã nhớ trên máy không còn nút để tắt → bỏ khi đọc; 'Hay dùng' và mã ghim giữ nguyên", () => {
  assert.deepEqual(boLocAn({ loc: "theo-nguoi", ghim: ["TD101"] }), { loc: null, ghim: ["TD101"] });
  assert.deepEqual(boLocAn({ loc: "theo-nhom", ghim: [] }), { loc: null, ghim: [] });
  assert.deepEqual(boLocAn({ loc: "hay-dung", ghim: ["TD101"] }), { loc: "hay-dung", ghim: ["TD101"] });
  assert.deepEqual(boLocAn({ loc: null, ghim: ["A"] }), { loc: null, ghim: ["A"] });
  assert.deepEqual(boLocAn(docNhoDanhMuc(JSON.stringify({ loc: "theo-nguoi", ghim: ["B"] }))), { loc: null, ghim: ["B"] }, "đường đọc bản nhớ cũ");
  assert.deepEqual(LOC_CON_LOI_VAO, ["hay-dung"], "chỉ 'Hay dùng' còn chip");
});
