// ADR-0133 Task 3: mức «mỗi khách theo loại» ở module pricing — luật thuần (kiểm thân, chọn mức, bản chụp, nhãn) và route thật qua khung thử.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chonMuc, chupDon, kiemThanMuc, moTaMuc, type DongMuc, type NguoiHuong } from "./rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const DL: NguoiHuong = { loai: "HUONG", partyId: "dl-a", vai: ["TRAVEL_AGENCY"] };
let k = 0;
const muc = (o: Partial<DongMuc>): DongMuc => ({
  id: `m${++k}`, targetPartyId: null, targetRoleCode: "TRAVEL_AGENCY", targetTierCode: null, scope: "ALL", catalogCode: null, groupCode: null, kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000,
  validFrom: "2026-01-01", validTo: null, ...o,
});
const than = (extra: Record<string, unknown>) => ({ doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", tuNgay: "2026-10-01", ...extra });

test("kiểm thân: không khai theo loại ⇒ theoLoai null (đúng như cũ)", () => {
  const r = kiemThanMuc(than({ kieu: "PER_PAX", moiKhach: 50_000 }));
  assert.ok(r.ok);
  assert.equal(r.value.theoLoai, null);
});

test("kiểm thân: khai theo loại — người lớn = moiKhach; ô trống = 0 (ADR-0133 điều 2)", () => {
  const r = kiemThanMuc(than({ kieu: "PER_PAX", moiKhach: 50_000, theoLoai: { treEm: 30_000 } }));
  assert.ok(r.ok);
  assert.deepEqual(r.value.theoLoai, { adult: 50_000, child: 30_000, senior: 0 });
  const r2 = kiemThanMuc(than({ kieu: "PER_PAX", moiKhach: 50_000, theoLoai: { treEm: "", nguoiCaoTuoi: null } }));
  assert.ok(r2.ok);
  assert.deepEqual(r2.value.theoLoai, { adult: 50_000, child: 0, senior: 0 });
});

test("kiểm thân: theo loại chỉ với kiểu đ/khách; số phải nguyên, không âm, không quá trần", () => {
  for (const bad of [{ kieu: "RATE", tyLeBp: 1000, theoLoai: { treEm: 1 } }, { kieu: "PER_PAX", moiKhach: 50_000, theoLoai: { treEm: -1 } }, { kieu: "PER_PAX", moiKhach: 50_000, theoLoai: { nguoiCaoTuoi: 1.5 } },
    { kieu: "PER_PAX", moiKhach: 50_000, theoLoai: { treEm: 100_000_001 } }, { kieu: "PER_PAX", moiKhach: 50_000, theoLoai: "abc" }, { kieu: "PER_PAX", moiKhach: 50_000, theoLoai: { treEm: "30000" } }]) {
    const r = kiemThanMuc(than(bad));
    assert.equal(r.ok, false, JSON.stringify(bad));
    if (!r.ok) assert.match(r.message, /[À-ỹ]/, "câu báo lỗi tiếng Việt có dấu");
  }
});

test("chọn mức trả kèm ba số; hai dòng cùng bậc, cùng người lớn nhưng khác trẻ em ⇒ RULE_CONFLICT", () => {
  const a = muc({ theoLoai: { adult: 50_000, child: 30_000, senior: 40_000 } });
  const r = chonMuc({ nguoiHuong: DL, catalogCode: "X", groupCode: null, ngay: "2026-10-19", dong: [a] });
  assert.equal(r.trangThai, "SET");
  if (r.trangThai === "SET") assert.deepEqual(r.dong.theoLoai, { adult: 50_000, child: 30_000, senior: 40_000 });
  const b = muc({ targetRoleCode: "TRAVEL_AGENCY", theoLoai: { adult: 50_000, child: 31_000, senior: 40_000 } });
  const c = muc({ targetRoleCode: "TRAVEL_AGENCY", theoLoai: null });
  const nguoiHaiVai: NguoiHuong = { loai: "HUONG", partyId: "dl-a", vai: ["TRAVEL_AGENCY", "COLLABORATOR"] };
  const ban = (x: DongMuc, vai: string) => ({ ...x, targetRoleCode: vai });
  assert.deepEqual(chonMuc({ nguoiHuong: nguoiHaiVai, catalogCode: "X", groupCode: null, ngay: "2026-10-19", dong: [ban(a, "TRAVEL_AGENCY"), ban(b, "COLLABORATOR")] }), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" });
  assert.deepEqual(chonMuc({ nguoiHuong: nguoiHaiVai, catalogCode: "X", groupCode: null, ngay: "2026-10-19", dong: [ban(a, "TRAVEL_AGENCY"), ban(c, "COLLABORATOR")] }), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" }, "có/không có số theo loại cũng là hai mức khác nhau");
});

test("bản chụp: hoaHong SET mang ba số của mức; mức cũ không có số theo loại ⇒ theoLoai null", () => {
  const a = muc({ theoLoai: { adult: 50_000, child: 30_000, senior: 40_000 } });
  const [cu] = chupDon({ nguoiHuong: DL, ngay: "2026-10-19", dong: [{ serviceId: "s1", catalogCode: "X", groupCode: null }], muc: [a], gan: [], dieuKhoan: [] });
  assert.ok(cu!.hoaHong.status === "SET");
  if (cu!.hoaHong.status === "SET") assert.deepEqual(cu!.hoaHong.theoLoai, { adult: 50_000, child: 30_000, senior: 40_000 });
  const [cu2] = chupDon({ nguoiHuong: DL, ngay: "2026-10-19", dong: [{ serviceId: "s1", catalogCode: "X", groupCode: null }], muc: [muc({})], gan: [], dieuKhoan: [] });
  if (cu2!.hoaHong.status === "SET") assert.equal(cu2!.hoaHong.theoLoai ?? null, null);
});

test("nhãn nhật ký: nêu đủ ba số theo loại", () => {
  const s = moTaMuc({ doiTuong: "loại X", scope: "ALL", catalogCode: null, groupCode: null, kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000, theoLoai: { adult: 50_000, child: 30_000, senior: 0 } });
  assert.match(s, /50\.000/);
  assert.match(s, /30\.000/);
  assert.match(s, /người lớn/i);
  assert.match(s, /trẻ em/i);
  assert.match(s, /người cao tuổi/i);
});

// ---- route thật ----
const KT = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-10-19T00:00:00.000Z";
function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, first_seen_at, updated_at) VALUES ('IRESORT', 'I-Resort', 'perPax', 300000, '${NOW}', '${NOW}')`);
  return w;
}
const body = (extra: Record<string, unknown>) => ({ doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2026-10-19", ...extra });

test("route: thêm mức theo loại ⇒ 201, DTO có ba số, bảng phụ có một dòng, nhật ký nêu ba số; đọc lại vẫn đủ", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: body({ theoLoai: { treEm: 30_000, nguoiCaoTuoi: 40_000 } }) });
  assert.equal(r.status, 201, r.text);
  const dong = (r.json as { dong: { id: string; moiKhach: number; theoLoai: unknown } }).dong;
  assert.deepEqual(dong.theoLoai, { nguoiLon: 50_000, treEm: 30_000, nguoiCaoTuoi: 40_000 });
  const phuRows = w.q("SELECT adult_amount, child_amount, senior_amount FROM prc_commission_rule_pax WHERE rule_id = ?", dong.id);
  assert.equal(phuRows.length, 1);
  assert.deepEqual([phuRows[0].adult_amount, phuRows[0].child_amount, phuRows[0].senior_amount], [50_000, 30_000, 40_000]);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'prc_commission_rule_added'");
  assert.match(String(nk[0].detail), /30\.000/);
  const ds = await w.call("GET", "/api/pricing/hoa-hong", { as: KT });
  const doc = (ds.json as { dong: { id: string; theoLoai: unknown }[] }).dong.find((x) => x.id === dong.id)!;
  assert.deepEqual(doc.theoLoai, { nguoiLon: 50_000, treEm: 30_000, nguoiCaoTuoi: 40_000 });
});

test("route: mức đ/khách cũ không khai theo loại ⇒ DTO theoLoai null, không có dòng phụ; kiểu RATE kèm theo loại ⇒ 400 và không ghi gì", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: body({}) });
  assert.equal(r.status, 201, r.text);
  assert.equal((r.json as { dong: { theoLoai: unknown } }).dong.theoLoai, null);
  assert.equal(w.q("SELECT 1 FROM prc_commission_rule_pax").length, 0);
  const x = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code: "COLLABORATOR" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: "2026-10-19", theoLoai: { treEm: 1 } } });
  assert.equal(x.status, 400);
  assert.equal(w.q("SELECT 1 FROM prc_commission_rule").length, 1);
});
