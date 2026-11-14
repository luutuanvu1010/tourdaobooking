// Khu vực đón (ADR-0147 Đ1; kế hoạch Phí đưa đón Đợt A, Task 2): route thêm / sửa / ngưng khu vực và xếp địa điểm vào khu vực.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, fakeD1 } from "../../../tests/audit/harness.mjs";
import { readFileSync, readdirSync } from "node:fs";
// index.ts nhập "../audit" (thư mục, không có đuôi) nên node không nạp trực tiếp được; hàm công bố `vungDangBat` của index.ts chỉ gọi lại listVungDangBat.
import { listVungDangBat } from "./vung-repo.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  return w;
}
const lay = async (w: any, as = ADM) => (await w.call("GET", "/api/locations", { as })).json;
const diem = async (w: any, code: string) => (await lay(w)).locations.find((l: any) => l.code === code);
const thanPut = (l: any, them: Record<string, unknown> = {}) => ({ name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: l.active, expectedUpdatedAt: l.updatedAt, ...them });
const putDiem = (w: any, l: any, them: Record<string, unknown> = {}, as = ADM) => w.call("PUT", `/api/locations/${l.id}`, { as, body: thanPut(l, them) });
const taoVung = (w: any, code = "BAC", as = ADM) => w.call("POST", "/api/location-zones", { as, body: { code, name: "Bắc Nha Trang", sortOrder: 2 } });
const vungCua = async (w: any, code: string) => (await lay(w)).zones.find((z: any) => z.code === code);
const nhatKy = (w: any, action: string) => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: any) => ({ ...r }));

test("ai ghi được vùng: Bán hàng, Kế toán, Đối tác, Thực tập → 403; Quản trị, Toàn quyền → 201 và đúng một dòng nhật ký", async () => {
  const w = setup();
  for (const as of [SALES, ACC, PARTNER, INTERN]) assert.equal((await taoVung(w, "BAC", as)).status, 403);
  assert.deepEqual(nhatKy(w, "location_zone_created"), []);
  const a = await taoVung(w, "BAC", ADM);
  assert.equal(a.status, 201, a.text);
  assert.equal(a.json.zone.code, "BAC");
  assert.equal((await taoVung(w, "NAM", SUP)).status, 201);
  const log = nhatKy(w, "location_zone_created");
  assert.equal(log.length, 2);
  assert.equal(log[0].detail, "BAC — Bắc Nha Trang");
});

test("trùng mã → 409 code_taken, không thêm nhật ký", async () => {
  const w = setup();
  assert.equal((await taoVung(w)).status, 201);
  const r = await taoVung(w);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "code_taken");
  assert.equal(nhatKy(w, "location_zone_created").length, 1);
});

test("xếp địa điểm vào vùng; PUT không gửi zoneCode giữ nguyên; zoneCode null bỏ xếp", async () => {
  const w = setup();
  await taoVung(w);
  let l = await diem(w, "QUAY_VE_01");
  assert.equal(l.zoneCode, null);
  const r = await putDiem(w, l, { zoneCode: "BAC" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.location.zoneCode, "BAC");
  const g = await lay(w);
  assert.equal(g.locations.find((x: any) => x.code === "QUAY_VE_01").zoneCode, "BAC");
  assert.equal(g.zones.find((z: any) => z.code === "BAC").soDiaDiem, 1);
  assert.match(nhatKy(w, "location_updated")[0].detail, /khu vực: chưa xếp → BAC/);
  l = r.json.location;
  const giu = await putDiem(w, l, { name: "Quầy vé 01 (sửa tên)" });
  assert.equal(giu.status, 200, giu.text);
  assert.equal(giu.json.location.zoneCode, "BAC", "khoá vắng giữ nguyên");
  const bo = await putDiem(w, giu.json.location, { zoneCode: null });
  assert.equal(bo.json.location.zoneCode, null);
  assert.match(nhatKy(w, "location_updated")[2].detail, /khu vực: BAC → chưa xếp/);
});

test("vùng không có → 400, địa điểm không đổi", async () => {
  const w = setup();
  const l = await diem(w, "QUAY_VE_01");
  const r = await putDiem(w, l, { zoneCode: "KHONG_CO" });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal((await diem(w, "QUAY_VE_01")).zoneCode, null);
  assert.deepEqual(nhatKy(w, "location_updated"), []);
});

test("ngưng vùng: còn địa điểm → 409 zone_in_use; NGOAI_VUNG → 409 zone_required; vùng trống → 200 rồi không gán được (400)", async () => {
  const w = setup();
  await taoVung(w, "BAC");
  await taoVung(w, "NAM");
  const l = await diem(w, "QUAY_VE_01");
  assert.equal((await putDiem(w, l, { zoneCode: "BAC" })).status, 200);
  const sua = (z: any, them: Record<string, unknown>) => w.call("PUT", `/api/location-zones/${z.code}`, { as: ADM, body: { name: z.name, sortOrder: z.sortOrder, active: z.active, expectedUpdatedAt: z.updatedAt, ...them } });
  const bac = await vungCua(w, "BAC");
  const a = await sua(bac, { active: false });
  assert.equal(a.status, 409);
  assert.equal(a.json.error.code, "zone_in_use");
  const ngoai = await vungCua(w, "NGOAI_VUNG");
  const b = await sua(ngoai, { active: false });
  assert.equal(b.status, 409);
  assert.equal(b.json.error.code, "zone_required");
  const nam = await vungCua(w, "NAM");
  const c = await sua(nam, { active: false });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.zone.active, false);
  const l2 = await diem(w, "QUAY_VE_02");
  assert.equal((await putDiem(w, l2, { zoneCode: "NAM" })).status, 400);
  assert.equal(nhatKy(w, "location_zone_updated").length, 1);
});

test("khoá lạc quan: PUT vùng với expectedUpdatedAt cũ → 409 stale; Bán hàng → 403", async () => {
  const w = setup();
  await taoVung(w);
  const bac = await vungCua(w, "BAC");
  const thuong = { name: "Bắc mới", sortOrder: 3, active: true, expectedUpdatedAt: bac.updatedAt };
  assert.equal((await w.call("PUT", "/api/location-zones/BAC", { as: SALES, body: thuong })).status, 403);
  const ok = await w.call("PUT", "/api/location-zones/BAC", { as: ADM, body: thuong });
  assert.equal(ok.status, 200, ok.text);
  const cu = await w.call("PUT", "/api/location-zones/BAC", { as: ADM, body: { ...thuong, name: "Khác" } });
  assert.equal(cu.status, 409);
  assert.equal(cu.json.error.code, "stale");
  assert.equal(nhatKy(w, "location_zone_updated").length, 1);
});

test("vungDangBat: chỉ vùng đang bật, có NGOAI_VUNG, sắp theo thứ tự", async () => {
  const w = setup();
  await taoVung(w, "BAC");
  await taoVung(w, "NAM");
  const nam = await vungCua(w, "NAM");
  await w.call("PUT", "/api/location-zones/NAM", { as: ADM, body: { name: nam.name, sortOrder: nam.sortOrder, active: false, expectedUpdatedAt: nam.updatedAt } });
  assert.match(readFileSync(new URL("./index.ts", import.meta.url), "utf8"), /export function vungDangBat\(db: D1Database\)[^\n]*\{\s*return listVungDangBat\(db\);/);
  const ds = await listVungDangBat(fakeD1(w.sqlite));
  assert.deepEqual(ds.map((z) => z.code), ["BAC", "NGOAI_VUNG"]);
});

test("gốc lắp ráp tiêm vungDon: index.ts nối vungDangBat; pricing không đọc loc_ và không import locations", () => {
  const goc = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
  assert.match(goc, /vungDon:\s*\(env\)\s*=>\s*vungDangBat\(env\.DB\)/);
  const thuMuc = new URL("../pricing/", import.meta.url);
  const tep = readdirSync(thuMuc).filter((t) => t.endsWith(".ts") && !t.endsWith(".test.ts"));
  assert.ok(tep.length > 0, "không quét được tệp nào của pricing");
  for (const t of tep) {
    const noi = readFileSync(new URL(t, thuMuc), "utf8");
    assert.ok(!noi.includes("loc_"), `${t} chứa loc_`);
    assert.ok(!noi.includes("modules/locations"), `${t} import locations`);
  }
});
