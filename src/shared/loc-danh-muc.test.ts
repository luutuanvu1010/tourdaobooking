import { test } from "node:test";
import assert from "node:assert/strict";
import { docNhoDanhMuc, locDanhMuc, NHO_DANH_MUC_TRONG, doiGhim, xepGhimTruoc, locTheoNhom, doiNhom, demTheoNhom, khoaNhoNhom, docNhoNhom, CHUA_PHAN_LOAI } from "./loc-danh-muc.ts";

const it = (code: string, name: string, unit: string) => ({ code, name, unit });
const DS = [it("TD101", "Tour 4 đảo", "perPax"), it("TTB03", "Phao chuối", "per5Pax"), it("TTB06", "Motor nước", "perPax"), it("DD01", "Đưa đón", "manual")];
const ma = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

test("locDanhMuc: chỉ còn ô tìm (tên hoặc mã, không phân biệt hoa thường); mọi bộ lọc phụ đã bỏ", () => {
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "" })), ["TD101", "TTB03", "TTB06", "DD01"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "PHAO" })), ["TTB03"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "ttb" })), ["TTB03", "TTB06"]);
  assert.deepEqual(ma(locDanhMuc(DS, { kim: "  motor " })), ["TTB06"], "cắt khoảng trắng hai đầu");
});

test("xepGhimTruoc (đợt 1, ý chủ 13/10: sao CÓ TÁC DỤNG): dịch vụ đã gắn sao xếp lên trước, giữ thứ tự cũ trong từng phần; mã ghim không còn thì bỏ qua", () => {
  assert.deepEqual(ma(xepGhimTruoc(DS, ["TTB06", "DD01", "KHONG_CON"])), ["TTB06", "DD01", "TD101", "TTB03"]);
  assert.deepEqual(ma(xepGhimTruoc(DS, ["DD01", "TTB06"])), ["TTB06", "DD01", "TD101", "TTB03"], "thứ tự ghim không đổi thứ tự hiện: theo danh mục");
  assert.deepEqual(ma(xepGhimTruoc(DS, [])), ["TD101", "TTB03", "TTB06", "DD01"], "chưa ghim gì → nguyên thứ tự");
  assert.deepEqual(ma(xepGhimTruoc(DS, ["TD101", "TTB03", "TTB06", "DD01"])), ["TD101", "TTB03", "TTB06", "DD01"], "ghim hết → nguyên thứ tự");
  const goc = [...DS];
  xepGhimTruoc(DS, ["DD01"]);
  assert.deepEqual(DS, goc, "không sửa mảng đầu vào");
});

test("doiGhim: bật / tắt ghim, không trùng", () => {
  assert.deepEqual(doiGhim(["A"], "B"), ["A", "B"]);
  assert.deepEqual(doiGhim(["A", "B"], "A"), ["B"]);
  const day = Array.from({ length: 200 }, (_, i) => `M${i}`);
  const them = doiGhim(day, "MOI");
  assert.equal(them.length, 200, "ghi cũng cắt ở 200 mã (không chỉ lúc đọc)");
  assert.equal(them.at(-1), "MOI", "mã mới giữ");
  assert.equal(them.includes("M0"), false, "bỏ mã cũ nhất");
  assert.equal(doiGhim(day, "M5").length, 199, "bỏ sao không bị cắt thêm");
});

test("docNhoDanhMuc: chỉ đọc mã ghim; trường `loc` của bản nhớ cũ (hay-dung / theo-nguoi / theo-nhom / lạ) bị BỎ QUA, không ai kẹt trong bộ lọc ẩn; rác → trống, không ném lỗi", () => {
  assert.deepEqual(docNhoDanhMuc(JSON.stringify({ ghim: ["TD101"] })), { ghim: ["TD101"] });
  for (const loc of ["hay-dung", "theo-nguoi", "theo-nhom", "khac", null, 5]) {
    assert.deepEqual(docNhoDanhMuc(JSON.stringify({ loc, ghim: ["TD101"] })), { ghim: ["TD101"] }, `loc cũ ${String(loc)}`);
  }
  assert.deepEqual(docNhoDanhMuc(JSON.stringify({ loc: "hay-dung", ghim: [] })), NHO_DANH_MUC_TRONG);
  for (const rac of [null, "", "{", "[]", "123", JSON.stringify({ ghim: "TD101" }), JSON.stringify({ ghim: [1] }), JSON.stringify({})]) {
    assert.deepEqual(docNhoDanhMuc(rac), NHO_DANH_MUC_TRONG, String(rac));
  }
  const nhieu = JSON.stringify({ ghim: Array.from({ length: 300 }, (_, i) => `M${i}`) });
  assert.equal(docNhoDanhMuc(nhieu).ghim.length, 200, "giới hạn 200 mã ghim");
});

// ---- Nhóm dịch vụ (ADR-0058 Đ8), đợt 1 ý chủ 13/10: nút xổ xuống + tick, chọn NHIỀU nhóm ----
const g = (code: string, name: string, unit: string, groupCode: string | null) => ({ code, name, unit, groupCode });
const DSN = [
  g("TD101", "Tour 4 đảo", "perPax", "TDA"),
  ...Array.from({ length: 23 }, (_, i) => g(`TTB${String(i + 1).padStart(2, "0")}`, i === 5 ? "Motor nước" : `Trò ${i + 1}`, i === 2 ? "per5Pax" : "perPax", "TTB")),
  g("KON01", "Kong Forest", "perPax", "KON"),
  g("MOI01", "Dịch vụ mới", "perPax", null),
  g("MOI02", "Motor mới", "perPax", null),
];
const GROUPS = [{ code: "TDA", name: "Tour đảo" }, { code: "TTB", name: "Thể thao biển" }, { code: "KON", name: "Kong Forest" }];

test("locTheoNhom: không tick nhóm nào = tất cả; một nhóm; nhiều nhóm (HOẶC); 'Chưa phân loại'; nhóm không tồn tại", () => {
  assert.equal(locTheoNhom(DSN, []).length, DSN.length, "không nhóm = tất cả");
  assert.equal(locTheoNhom(DSN, ["TTB"]).length, 23);
  assert.ok(locTheoNhom(DSN, ["TTB"]).every((x) => x.groupCode === "TTB"));
  assert.deepEqual(ma(locTheoNhom(DSN, ["TDA", "KON"])), ["TD101", "KON01"], "hai nhóm: gộp, giữ thứ tự danh mục");
  assert.deepEqual(ma(locTheoNhom(DSN, [CHUA_PHAN_LOAI])), ["MOI01", "MOI02"]);
  assert.deepEqual(ma(locTheoNhom(DSN, ["KON", CHUA_PHAN_LOAI])), ["KON01", "MOI01", "MOI02"], "nhóm thật + chưa phân loại");
  assert.deepEqual(locTheoNhom(DSN, ["KHONGCO"]), [], "nhóm không tồn tại: không có gì khớp, không ném lỗi");
  assert.deepEqual(ma(locTheoNhom(DSN, ["KHONGCO", "TDA"])), ["TD101"]);
});

test("locTheoNhom kết hợp VÀ với ô tìm", () => {
  const sau = (kim: string, nhom: string[]) => ma(locTheoNhom(locDanhMuc(DSN, { kim }), nhom));
  assert.deepEqual(sau("motor", ["TTB"]), ["TTB06"], "tìm TRONG nhóm");
  assert.deepEqual(sau("motor", [CHUA_PHAN_LOAI]), ["MOI02"]);
  assert.deepEqual(sau("motor", ["TTB", CHUA_PHAN_LOAI]), ["TTB06", "MOI02"]);
  assert.deepEqual(sau("motor", ["TDA"]), []);
});

test("doiNhom: tick / bỏ tick một nhóm, không trùng, không sửa mảng đầu vào", () => {
  const a = ["TDA"];
  assert.deepEqual(doiNhom(a, "TTB"), ["TDA", "TTB"]);
  assert.deepEqual(doiNhom(["TDA", "TTB"], "TDA"), ["TTB"]);
  assert.deepEqual(doiNhom([], "KON"), ["KON"]);
  assert.deepEqual(a, ["TDA"]);
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

test("docNhoNhom: dạng mới (mảng) giữ nhóm còn trong groups; dạng CŨ (một chuỗi) đổi sang mảng một phần tử; nhóm không còn / rác bỏ qua → [] ('tất cả'); không ném lỗi", () => {
  assert.deepEqual(docNhoNhom('["TTB","KON"]', GROUPS), ["TTB", "KON"]);
  assert.deepEqual(docNhoNhom('["TTB","KON","DA_TAT"]', GROUPS), ["TTB", "KON"], "nhóm bị tắt / không còn → bỏ riêng nhóm đó");
  assert.deepEqual(docNhoNhom('["DA_TAT"]', GROUPS), [], "toàn nhóm không còn → tất cả");
  assert.deepEqual(docNhoNhom('"TTB"', GROUPS), ["TTB"], "bản nhớ cũ: một nhóm dạng chuỗi");
  assert.deepEqual(docNhoNhom('"TTB"', GROUPS.filter((x) => x.code !== "TTB")), [], "bản nhớ cũ mà nhóm không còn");
  assert.deepEqual(docNhoNhom(JSON.stringify(CHUA_PHAN_LOAI), GROUPS), [CHUA_PHAN_LOAI], "bản nhớ cũ 'Chưa phân loại' đọc được");
  assert.deepEqual(docNhoNhom(JSON.stringify(["TTB", "TTB", CHUA_PHAN_LOAI]), GROUPS), ["TTB", CHUA_PHAN_LOAI], "bỏ trùng");
  for (const rac of [null, "", "rác", "{", "123", "null", "[]", '{"nhom":"TTB"}', '""', '[1,2]', '[null]', '["hay-dung"]', '"hay-dung"', '"theo-nguoi"']) assert.deepEqual(docNhoNhom(rac, GROUPS), [], String(rac));
});
