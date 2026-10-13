// ADR-0114 D3 — luật thuần "mỗi đơn có ít nhất một người lớn đi cùng". Bài canh: người đi kèm = người lớn + người cao tuổi (điều khoản 1);
// dịch vụ theo nhóm / nhập tay chỉ có ô "số khách" ở `adult` nên tự được tính là người lớn (điều khoản 2); tính trên CẢ ĐƠN, không từng dịch vụ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_THIEU_NGUOI_LON, bangSuaSoKhachVeKhong, donThieuNguoiLon, soNguoiDiKem, suaDuaVeKhongNguoiLon } from "./nguoi-di-kem.ts";
import type { MoneyEditSource } from "./viec-cua-toi.ts";

test("soNguoiDiKem: chỉ trẻ em và em bé → 0; người cao tuổi tính là người đi kèm; người lớn + người cao tuổi cộng lại", () => {
  assert.equal(soNguoiDiKem({ adult: 0, child: 2, senior: 0, infant: 1 }), 0);
  assert.equal(soNguoiDiKem({ adult: 0, senior: 2 }), 2);
  assert.equal(soNguoiDiKem({ adult: 3, child: 1, senior: 2, infant: 4 }), 5);
  assert.equal(soNguoiDiKem({}), 0, "thiếu khoá = 0");
});

test("donThieuNguoiLon: tính trên CẢ ĐƠN — một dịch vụ toàn trẻ em vẫn qua nếu dịch vụ khác có người lớn", () => {
  assert.equal(donThieuNguoiLon([{ adult: 0, child: 3 }, { adult: 0 }]), true);
  assert.equal(donThieuNguoiLon([{ adult: 0, child: 3 }, { adult: 1 }]), false);
  assert.equal(donThieuNguoiLon([{ adult: 0, child: 0, senior: 0, infant: 5 }]), true, "chỉ em bé");
  assert.equal(donThieuNguoiLon([{ adult: 0, senior: 2 }]), false, "đơn toàn người cao tuổi lập được (điều khoản 1)");
  assert.equal(donThieuNguoiLon([]), true, "đơn không có dịch vụ nào cũng là thiếu người lớn");
});

test("CAU_THIEU_NGUOI_LON: nguyên văn ADR-0114, tiếng Việt có dấu, KHÔNG có chữ số", () => {
  assert.equal(CAU_THIEU_NGUOI_LON, "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.");
  assert.doesNotMatch(CAU_THIEU_NGUOI_LON, /\d/);
});

// ---- báo sớm ở bảng "Sửa số khách" (web/sheet-so-khach.ts): CÙNG luật với máy chủ (`planMoneyEdit`), máy chủ vẫn quyết ----

test("suaDuaVeKhongNguoiLon: chỉ khi tổng người đi kèm đi từ ≥ 1 xuống 0 — đơn cũ đã 0 người lớn KHÔNG bị chặn thêm (điều khoản 3)", () => {
  assert.equal(suaDuaVeKhongNguoiLon([{ adult: 2, child: 1 }], [{ adult: 0, child: 1 }]), true, "2 người lớn + 1 trẻ em → còn trẻ em: chặn");
  assert.equal(suaDuaVeKhongNguoiLon([{ adult: 2 }], [{ adult: 1 }]), false, "còn 1 người lớn");
  assert.equal(suaDuaVeKhongNguoiLon([{ adult: 0, child: 2 }], [{ adult: 0, child: 3 }]), false, "đơn cũ 0 người lớn, sửa vẫn 0: không chặn thêm");
  assert.equal(suaDuaVeKhongNguoiLon([{ adult: 0, child: 2 }], [{ adult: 1, child: 2 }]), false, "đang 0 và thêm người lớn: qua");
  assert.equal(suaDuaVeKhongNguoiLon([{ adult: 0, senior: 2 }], [{ adult: 0, senior: 0, child: 2 }]), true, "người cao tuổi tính là người đi kèm: bớt hết thì chặn");
});

type Loai = "adult" | "child" | "senior" | "infant";
const TAT_CA: readonly Loai[] = ["adult", "child", "senior", "infant"];
const nguonMau = (rows: { id: string; catalogCode: string | null; pax: Partial<Record<Loai, number>>; editable?: readonly Loai[] }[]): MoneyEditSource[] =>
  rows.map((r) => ({ id: r.id, catalogCode: r.catalogCode, pax: { adult: 0, child: 0, senior: 0, infant: 0, ...r.pax }, editablePaxCodes: r.editable ?? (r.catalogCode === null ? [] : TAT_CA) }));

test("bangSuaSoKhachVeKhong: 2 người lớn bớt về 0, còn 1 trẻ em ⇒ báo (đúng ca máy chủ trả 409 thieu_nguoi_lon)", () => {
  const nguon = nguonMau([{ id: "s1", catalogCode: "TD101", pax: { adult: 2, child: 1 } }]);
  assert.equal(bangSuaSoKhachVeKhong(nguon, new Map([["s1", { adult: 0 }]])), true);
  assert.equal(bangSuaSoKhachVeKhong(nguon, new Map([["s1", { adult: 1 }]])), false);
  assert.equal(bangSuaSoKhachVeKhong(nguon, new Map()), false, "chưa đổi gì");
});

test("bangSuaSoKhachVeKhong: tính trên CẢ ĐƠN — dịch vụ khác còn người lớn thì bớt hết một dịch vụ vẫn qua; dịch vụ nhập tay giữ số khách ở hai vế", () => {
  const hai = nguonMau([{ id: "s1", catalogCode: "TD101", pax: { adult: 2 } }, { id: "s2", catalogCode: "TTB03", pax: { adult: 3 } }]);
  assert.equal(bangSuaSoKhachVeKhong(hai, new Map([["s1", { adult: 0 }]])), false);
  assert.equal(bangSuaSoKhachVeKhong(hai, new Map([["s1", { adult: 0 }], ["s2", { adult: 0 }]])), true);
  const nhapTay = nguonMau([{ id: "s1", catalogCode: "TD101", pax: { adult: 2 } }, { id: "tay", catalogCode: null, pax: { adult: 4 } }]);
  assert.equal(bangSuaSoKhachVeKhong(nhapTay, new Map([["s1", { adult: 0 }]])), false, "dịch vụ nhập tay còn 4 khách (tính là người lớn)");
});

test("bangSuaSoKhachVeKhong: loại khách KHÔNG sửa được giữ nguyên (editablePaxCodes), dù ô nháp có số; đơn cũ 0 người lớn sửa trẻ em vẫn qua", () => {
  const chiTreEm = nguonMau([{ id: "s1", catalogCode: "TD101", pax: { adult: 2, child: 1 }, editable: ["child"] }]);
  assert.equal(bangSuaSoKhachVeKhong(chiTreEm, new Map([["s1", { adult: 0, child: 3 }]])), false, "ô người lớn không sửa được: giữ 2");
  const cu = nguonMau([{ id: "s1", catalogCode: "TD101", pax: { adult: 0, child: 2 } }]);
  assert.equal(bangSuaSoKhachVeKhong(cu, new Map([["s1", { child: 1 }]])), false);
  const caoTuoi = nguonMau([{ id: "s1", catalogCode: "TD101", pax: { adult: 0, senior: 2 } }]);
  assert.equal(bangSuaSoKhachVeKhong(caoTuoi, new Map([["s1", { senior: 0 }]])), true);
});
