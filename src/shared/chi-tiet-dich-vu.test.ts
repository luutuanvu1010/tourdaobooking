import { test } from "node:test";
import assert from "node:assert/strict";
import { MO_TA_TOI_DA, TEN_TOI_DA, cauTenSheetDoi, giongNhau, kiemChiTiet, tenHieuLuc } from "./chi-tiet-dich-vu.ts";

test("tên hiệu lực: có tên hiển thị thì thắng tên Sheet; trống thì dùng tên Sheet", () => {
  assert.equal(tenHieuLuc("Tour 4 đảo", { tenHienThi: "Tour 4 đảo cao cấp" }), "Tour 4 đảo cao cấp");
  assert.equal(tenHieuLuc("Tour 4 đảo", { tenHienThi: null }), "Tour 4 đảo");
  assert.equal(tenHieuLuc("Tour 4 đảo", undefined), "Tour 4 đảo");
});

test("kiểm thân: cắt khoảng trắng, chuỗi rỗng thành null", () => {
  assert.deepEqual(kiemChiTiet({ tenHienThi: "  Tour mới  ", moTa: "   " }), { ok: true, giaTri: { tenHienThi: "Tour mới", moTa: null } });
  assert.deepEqual(kiemChiTiet({ tenHienThi: null, moTa: "Dòng 1\nDòng 2" }), { ok: true, giaTri: { tenHienThi: null, moTa: "Dòng 1\nDòng 2" } });
});

test("kiểm thân: sai kiểu, thiếu trường, quá dài → lỗi có câu tiếng Việt", () => {
  for (const sai of [null, [], "x", { tenHienThi: 5, moTa: null }, { tenHienThi: null }, { moTa: null }, { tenHienThi: null, moTa: {} }]) {
    const r = kiemChiTiet(sai);
    assert.equal(r.ok, false, JSON.stringify(sai));
  }
  const dai = kiemChiTiet({ tenHienThi: "a".repeat(TEN_TOI_DA + 1), moTa: null });
  assert.equal(dai.ok, false);
  if (!dai.ok) assert.match(dai.cau, /Tên hiển thị/u);
  const moTaDai = kiemChiTiet({ tenHienThi: null, moTa: "a".repeat(MO_TA_TOI_DA + 1) });
  assert.equal(moTaDai.ok, false);
  if (!moTaDai.ok) assert.match(moTaDai.cau, /Mô tả/u);
  assert.equal(kiemChiTiet({ tenHienThi: "a".repeat(TEN_TOI_DA), moTa: "a".repeat(MO_TA_TOI_DA) }).ok, true);
});

test("giống nhau: so cả tên lẫn mô tả (null coi như chưa có)", () => {
  assert.equal(giongNhau({ tenHienThi: null, moTa: null }, undefined), true);
  assert.equal(giongNhau({ tenHienThi: "A", moTa: null }, { tenHienThi: "A", moTa: null }), true);
  assert.equal(giongNhau({ tenHienThi: "A", moTa: "x" }, { tenHienThi: "A", moTa: null }), false);
});

test("báo tên Sheet đổi: chỉ khi đang có tên hiển thị và tên Sheet hiện khác tên lúc ghi", () => {
  assert.equal(cauTenSheetDoi("Tour 4 đảo (mới)", { tenHienThi: "Tour đẹp", tenSheetLucGhi: "Tour 4 đảo" }), "Tên trên Sheet đã đổi thành «Tour 4 đảo (mới)» từ lúc đặt tên hiển thị.");
  assert.equal(cauTenSheetDoi("Tour 4 đảo", { tenHienThi: "Tour đẹp", tenSheetLucGhi: "Tour 4 đảo" }), null);
  assert.equal(cauTenSheetDoi("Tour 4 đảo (mới)", { tenHienThi: null, tenSheetLucGhi: "Tour 4 đảo" }), null);
  assert.equal(cauTenSheetDoi("Tour 4 đảo", undefined), null);
});
