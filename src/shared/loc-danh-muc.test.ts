import { test } from "node:test";
import assert from "node:assert/strict";
import { docNhoDanhMuc, locDanhMuc, NHO_DANH_MUC_TRONG, doiGhim, xepGhimTruoc, locTheoNhom, khoaNhoNhom, docNhoNhom, CHUA_PHAN_LOAI, docNhoMotNhom, ghiNhoMotNhom, chamNhom, doiChuTim, chiaMuc, nhomConKetQua, nhanDem, tachTenDichVu, dungMucDanhMuc, type TrangThaiNhom } from "./loc-danh-muc.ts";

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

// ---- Hàng nhóm CHỌN MỘT, chia mục, nhãn đếm (thiết kế lại màn Tạo đơn, 18/10/2026) ----
test("docNhoMotNhom: mảng nhiều nhóm → lấy nhóm hợp lệ đầu; chuỗi đơn đọc được", () => {
  assert.equal(docNhoMotNhom('["TTB","KON","TDA"]', GROUPS), "TTB");
  assert.equal(docNhoMotNhom('["DA_TAT","KON","TDA"]', GROUPS), "KON", "bỏ nhóm không còn, lấy nhóm hợp lệ đầu");
  assert.equal(docNhoMotNhom('"TTB"', GROUPS), "TTB", "chuỗi đơn");
});

test("docNhoMotNhom: JSON hỏng, null, nhóm đã xoá → '' (Tất cả)", () => {
  assert.equal(docNhoMotNhom("{", GROUPS), "");
  assert.equal(docNhoMotNhom(null, GROUPS), "");
  assert.equal(docNhoMotNhom('["DA_TAT"]', GROUPS), "");
});

test("ghiNhoMotNhom: '' → [] ; có mã → mảng một phần tử", () => {
  assert.deepEqual(ghiNhoMotNhom(""), []);
  assert.deepEqual(ghiNhoMotNhom("TTB"), ["TTB"]);
});

test("chuỗi trạng thái nhóm: gõ chữ về 'Tất cả', chạm nhóm khi đang tìm thì giữ, xoá chữ thì trả nhóm cũ", () => {
  const dau: TrangThaiNhom = { nhom: "TTB", truocKhiTim: null, daThuHep: false };
  const a = doiChuTim(dau, "", "hòn");
  assert.deepEqual(a, { nhom: "", truocKhiTim: "TTB", daThuHep: false });
  const b = chamNhom(a, "HT", true);
  assert.deepEqual(b, { nhom: "HT", truocKhiTim: "TTB", daThuHep: true });
  const c = doiChuTim(b, "hòn", "hòn t");
  assert.equal(c.nhom, "HT", "có→có: giữ nguyên");
  assert.deepEqual(doiChuTim(c, "hòn t", ""), { nhom: "TTB", truocKhiTim: null, daThuHep: false });
  assert.deepEqual(chamNhom(dau, "KON", false), { nhom: "KON", truocKhiTim: null, daThuHep: false }, "không tìm: không đánh dấu thu hẹp");
  assert.deepEqual(doiChuTim({ nhom: "KON", truocKhiTim: null, daThuHep: false }, "x", ""), { nhom: "KON", truocKhiTim: null, daThuHep: false }, "xoá chữ khi chưa có nhóm cũ: giữ nhóm hiện tại");
});

test("chiaMuc: ★ Hay dùng đứng đầu, dịch vụ sao không lặp ở mục nhóm; mục nhóm theo thứ tự groups, Chưa phân loại cuối, mục rỗng bỏ", () => {
  const ds = [g("TD1", "A", "perPax", "TDA"), g("TD2", "B", "perPax", "TDA"), g("TTB1", "C", "perPax", "TTB"), g("MOI1", "D", "perPax", null)];
  const muc = chiaMuc(ds, GROUPS, ["TD2"]);
  assert.deepEqual(muc.map((m) => m.khoa), ["hay-dung", "TDA", "TTB", CHUA_PHAN_LOAI]);
  assert.equal(muc[0].tieuDe, "★ Hay dùng");
  assert.deepEqual(ma(muc[0].dong), ["TD2"]);
  assert.deepEqual(ma(muc[1].dong), ["TD1"], "TD2 không còn ở mục Tour đảo");
  assert.equal(muc[1].tieuDe, "Tour đảo");
  assert.equal(muc[3].tieuDe, "Chưa phân loại");
  assert.deepEqual(chiaMuc(ds, GROUPS, null).map((m) => m.khoa), ["TDA", "TTB", CHUA_PHAN_LOAI], "null: không có mục sao");
  assert.deepEqual(chiaMuc(ds, GROUPS, []).map((m) => m.khoa), ["TDA", "TTB", CHUA_PHAN_LOAI], "không dịch vụ sao: bỏ mục rỗng");
  assert.deepEqual(chiaMuc([ds[2]], GROUPS, null).map((m) => m.khoa), ["TTB"], "nhóm rỗng bỏ");
});

test("nhomConKetQua: mã nhóm (kể cả Chưa phân loại) còn ít nhất một dòng", () => {
  const s = nhomConKetQua([{ groupCode: "TDA" }, { groupCode: null }, { groupCode: "TDA" }]);
  assert.deepEqual([...s].sort(), [CHUA_PHAN_LOAI, "TDA"].sort());
  assert.equal(nhomConKetQua([]).size, 0);
});

test("nhanDem: có / không tên nhóm", () => {
  assert.equal(nhanDem(114, null), "114 dịch vụ");
  assert.equal(nhanDem(23, "Thể thao biển"), "23 dịch vụ · Thể thao biển");
});

test("tachTenDichVu: tách phần trước dấu hai chấm ĐẦU TIÊN (in màu chữ phụ); ghép lại đúng tên gốc, không cắt chữ", () => {
  assert.deepEqual(tachTenDichVu("Motor nước: Jetski L2 (30 phút) Hòn Tằm"), { dau: "Motor nước:", sau: " Jetski L2 (30 phút) Hòn Tằm" });
  assert.deepEqual(tachTenDichVu("Vé Hòn Tằm: Cano + tắm bùn: trọn gói"), { dau: "Vé Hòn Tằm:", sau: " Cano + tắm bùn: trọn gói" }, "chỉ tách ở dấu đầu");
  assert.deepEqual(tachTenDichVu("Phao chuối (5 pax) Hòn Tằm"), { dau: "", sau: "Phao chuối (5 pax) Hòn Tằm" }, "không có dấu hai chấm");
  assert.deepEqual(tachTenDichVu(":lạ"), { dau: "", sau: ":lạ" }, "dấu ở đầu: không có phần trước");
  assert.deepEqual(tachTenDichVu("Tour:  "), { dau: "", sau: "Tour:  " }, "sau dấu không còn chữ: giữ nguyên, không làm mờ cả tên");
  assert.deepEqual(tachTenDichVu(""), { dau: "", sau: "" });
  for (const ten of ["Tháp Bà: tắm bùn khoáng", "a:b", "Không dấu"]) {
    const t = tachTenDichVu(ten);
    assert.equal(t.dau + t.sau, ten, "ghép lại đúng tên gốc");
  }
});

test("dungMucDanhMuc: đang tìm rồi thu hẹp MỘT nhóm → dịch vụ gắn sao lên đầu (như khi không tìm), giữ thứ tự danh mục trong từng phần (nợ T2(1))", () => {
  const r = dungMucDanhMuc(DSN, { kim: "trò 1", nhom: "TTB", ghim: ["TTB12"], groups: GROUPS });
  assert.deepEqual(r.muc.map((m) => m.khoa), ["TTB"]);
  assert.deepEqual(ma(r.muc[0].dong), ["TTB12", "TTB01", "TTB10", "TTB11", "TTB13", "TTB14", "TTB15", "TTB16", "TTB17", "TTB18", "TTB19"]);
  assert.deepEqual([...(r.conKetQua ?? [])], ["TTB"], "nhóm còn kết quả tính trên MỌI nhóm của chữ tìm");
  const cpl = dungMucDanhMuc(DSN, { kim: "mo", nhom: CHUA_PHAN_LOAI, ghim: ["MOI02"], groups: GROUPS });
  assert.deepEqual(ma(cpl.muc.flatMap((m) => m.dong)), ["MOI02", "MOI01"], "Chưa phân loại cũng xếp sao lên đầu");
});

test("dungMucDanhMuc: 'Tất cả' lúc tìm chia mục theo nhóm, KHÔNG có mục Hay dùng; không tìm thì có; không có nhóm → một khối", () => {
  const tim = dungMucDanhMuc(DSN, { kim: "motor", nhom: "", ghim: ["MOI02"], groups: GROUPS });
  assert.deepEqual(tim.muc.map((m) => m.khoa), ["TTB", CHUA_PHAN_LOAI]);
  assert.deepEqual(ma(tim.muc[1].dong), ["MOI02"]);
  const tatCa = dungMucDanhMuc(DSN, { kim: "", nhom: "", ghim: ["MOI02"], groups: GROUPS });
  assert.equal(tatCa.muc[0].khoa, "hay-dung");
  assert.equal(tatCa.conKetQua, null, "không tìm: không làm mờ nhóm nào");
  const motNhom = dungMucDanhMuc(DSN, { kim: "", nhom: "TTB", ghim: ["TTB23"], groups: GROUPS });
  assert.deepEqual(ma(motNhom.muc[0].dong).slice(0, 2), ["TTB23", "TTB01"]);
  const khongNhom = dungMucDanhMuc(DSN, { kim: "motor", nhom: "", ghim: [], groups: [] });
  assert.deepEqual(khongNhom.muc.map((m) => [m.khoa, ma(m.dong)]), [["", ["TTB06", "MOI02"]]]);
});
