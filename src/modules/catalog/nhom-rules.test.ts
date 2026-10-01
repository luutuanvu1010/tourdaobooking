// Luật thuần của nhóm dịch vụ (ADR-0058 Đ2, Đ5; kế hoạch §5.3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemLoGan, kiemTenNhom, moTaDoiNhom, nhomChoForm } from "./nhom-rules.ts";

test("kiemTenNhom: cắt khoảng trắng hai đầu, 1–40 ký tự, không rỗng", () => {
  assert.deepEqual(kiemTenNhom("  Tour đảo  "), { ok: true, value: "Tour đảo" });
  assert.equal(kiemTenNhom("").ok, false);
  assert.equal(kiemTenNhom("   ").ok, false);
  assert.equal(kiemTenNhom(undefined).ok, false);
  assert.equal(kiemTenNhom(12).ok, false);
  assert.equal(kiemTenNhom("a".repeat(40)).ok, true);
  const dai = kiemTenNhom("a".repeat(41));
  assert.equal(dai.ok, false);
  if (!dai.ok) assert.match(dai.message, /40/);
  assert.equal(kiemTenNhom(`  ${"a".repeat(40)}  `).ok, true, "độ dài tính sau khi cắt");
});

test("kiemLoGan: 1..50 mã hợp lệ, bỏ trùng, groupCode là chuỗi hoặc null", () => {
  assert.deepEqual(kiemLoGan({ codes: ["A1", "B2", "A1"], groupCode: "TDA" }), { ok: true, value: { codes: ["A1", "B2"], groupCode: "TDA" } });
  assert.deepEqual(kiemLoGan({ codes: ["A1"], groupCode: null }), { ok: true, value: { codes: ["A1"], groupCode: null } });
  assert.equal(kiemLoGan({ codes: [], groupCode: null }).ok, false, "0 mã");
  assert.equal(kiemLoGan({ codes: Array.from({ length: 51 }, (_, i) => `C${i}`), groupCode: null }).ok, false, "51 mã");
  assert.equal(kiemLoGan({ codes: Array.from({ length: 50 }, (_, i) => `C${i}`), groupCode: null }).ok, true, "50 mã");
  assert.equal(kiemLoGan({ codes: ["có dấu cách"], groupCode: null }).ok, false, "mã sai dạng");
  assert.equal(kiemLoGan({ codes: [""], groupCode: null }).ok, false);
  assert.equal(kiemLoGan({ codes: [5], groupCode: null }).ok, false, "mã không phải chuỗi");
  assert.equal(kiemLoGan({ codes: ["A1"], groupCode: 7 }).ok, false, "groupCode số");
  assert.equal(kiemLoGan({ codes: ["A1"] }).ok, false, "thiếu groupCode (phải ghi rõ null)");
  assert.equal(kiemLoGan({ codes: ["A1"], groupCode: "" }).ok, false, "groupCode rỗng");
  assert.equal(kiemLoGan(null).ok, false);
  assert.equal(kiemLoGan({ codes: "A1", groupCode: null }).ok, false);
  assert.equal(kiemLoGan({ codes: Array.from({ length: 60 }, () => "A1"), groupCode: null }).ok, false, "số mã đếm TRƯỚC khi bỏ trùng: quá 50 là từ chối");
});

const N = (code: string, name: string, sortOrder: number, active = true) => ({ code, name, sortOrder, active });

test("nhomChoForm: chỉ nhóm còn bật và có ≥ 1 dịch vụ đang hiện, xếp theo sort_order", () => {
  const r = nhomChoForm(
    [N("B", "Bãi biển", 2), N("A", "Tour đảo", 1), N("C", "Trống", 3), N("D", "Đã tắt", 4, false)],
    [{ code: "s1", groupCode: "B" }, { code: "s2", groupCode: "A" }, { code: "s3", groupCode: "D" }, { code: "s4", groupCode: null }],
  );
  assert.deepEqual(r.groups, [{ code: "A", name: "Tour đảo" }, { code: "B", name: "Bãi biển" }]);
});

test("nhomChoForm: dịch vụ thuộc nhóm tắt (hoặc mã nhóm lạ) → groupCode null; dịch vụ khác giữ nguyên", () => {
  const r = nhomChoForm(
    [N("A", "Tour đảo", 1), N("D", "Đã tắt", 2, false)],
    [{ code: "s1", groupCode: "A", x: 1 }, { code: "s2", groupCode: "D", x: 2 }, { code: "s3", groupCode: "ZZZ", x: 3 }, { code: "s4", groupCode: null, x: 4 }],
  );
  assert.deepEqual(r.items.map((i) => [i.code, i.groupCode, i.x]), [["s1", "A", 1], ["s2", null, 2], ["s3", null, 3], ["s4", null, 4]]);
});

test("nhomChoForm: thứ tự bằng nhau xếp theo tên (ổn định, không phụ thuộc thứ tự vào)", () => {
  const r = nhomChoForm([N("Y", "Beta", 1), N("X", "Alpha", 1)], [{ code: "s", groupCode: "X" }, { code: "t", groupCode: "Y" }]);
  assert.deepEqual(r.groups.map((g) => g.name), ["Alpha", "Beta"]);
});

test("moTaDoiNhom: nhóm cũ → nhóm mới; null là Chưa phân loại", () => {
  assert.equal(moTaDoiNhom("Tour đảo", "Thể thao biển"), "Tour đảo → Thể thao biển");
  assert.equal(moTaDoiNhom(null, "Tour đảo"), "Chưa phân loại → Tour đảo");
  assert.equal(moTaDoiNhom("Tour đảo", null), "Tour đảo → Chưa phân loại");
});
