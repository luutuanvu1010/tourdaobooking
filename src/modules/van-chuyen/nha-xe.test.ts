// Xe của nhà xe đối tác (ADR-0048 D1, B1.1 lớp route) — chạy CẢ ứng dụng trên SQLite thật (có trigger 0039) qua tests/audit/harness.mjs:
// - POST /api/van-chuyen/xe nhận `ownerPartyId` (vắng = công ty chủ, như cũ); chủ không phải công ty chủ / nhà xe đang hợp tác → 409 `vehicle_owner_not_carrier`
//   (lớp route, KHÁC mã `vehicle_owner_conflict` của lớp CSDL); nhật ký ghi "chủ: <tên nhà xe>" (tên, không liên hệ, không MST — G7).
// - GET /api/van-chuyen/xe?chu=<partyId> lọc theo chủ; mọi xe có ownerPartyId, ownerName, ownerIsCompany.
// - GET /api/van-chuyen/nha-xe (mới): công ty chủ + nhà xe đang hợp tác (hàm công bố nhaXeDangHopTac của parties) + số xe chưa ngừng (G5) + số tài xế.
// Lưới "lỗi trigger → 409 vehicle_owner_conflict qua route thật" KHÔNG viết bằng bài chèn thẳng qua câu lệnh (đi vòng qua route = bài kiểm giả); bằng chứng là
// phép đột biến ở nhật ký thi công (Task A9 bước 6: bỏ lời kiểm chủ ở POST).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const TX_DT = "66666666-6666-4666-8666-666666666667";
const CAU_CONG_OFFICE = /chỉ dùng cho việc được giao/;
const CAU_O_XE = /không quản lý được xe/;

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: TX_DT, phone: "0900000009", name: "Tài xế đối tác", perms: ["DRIVER_PARTNER"] });
  return w;
}
async function hoSo(w: any, body: Record<string, unknown>): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
}
async function nhaXe(w: any, body: Record<string, unknown>): Promise<string> {
  const id = await hoSo(w, body);
  const r = await w.call("POST", `/api/parties/${id}/roles`, { as: ADM, body: { roleTypeCode: "CARRIER" } });
  assert.equal(r.status, 201, r.text);
  return id;
}
let so = 0;
const xe = (extra: Record<string, unknown> = {}) => {
  so++;
  return { plateNumber: `79B-5${String(so).padStart(2, "0")}.01`, chassisNumber: `KHUNGNHAXE${String(so).padStart(4, "0")}`, name: "Ford Transit", modelYear: 2019, passengerCapacity: 15, ...extra };
};
const themXe = (w: any, body: unknown, as = ADM) => w.call("POST", "/api/van-chuyen/xe", { as, body });
const congTyChu = (w: any): string => w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id;
const soXe = (w: any): number => w.q("SELECT count(*) n FROM vc_vehicle")[0].n;
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log")[0].n;

test("POST xe: không gửi chủ → công ty chủ (như cũ); chủ = nhà xe đang hợp tác → 201, ownerName = tên nhà xe, ownerIsCompany false, nhật ký có 'chủ: <tên>'", async () => {
  const w = setup();
  let r = await themXe(w, xe());
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.vehicle.ownerPartyId, congTyChu(w));
  assert.equal(r.json.vehicle.ownerIsCompany, true);
  assert.equal(r.json.vehicle.ownerName, "Công ty TNHH Tour Đảo");
  const px = await nhaXe(w, { kind: "ORGANIZATION", displayName: "Nhà xe Phương Nam" });
  r = await themXe(w, xe({ ownerPartyId: px }));
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(
    { ownerPartyId: r.json.vehicle.ownerPartyId, ownerName: r.json.vehicle.ownerName, ownerIsCompany: r.json.vehicle.ownerIsCompany },
    { ownerPartyId: px, ownerName: "Nhà xe Phương Nam", ownerIsCompany: false },
  );
  assert.equal(w.q("SELECT owner_party_id FROM vc_vehicle WHERE id = ?", r.json.vehicle.id)[0].owner_party_id, px);
  const log = w.q("SELECT detail FROM audit_log WHERE action = 'vehicle_created' AND target_id = ?", r.json.vehicle.id)[0].detail as string;
  assert.match(log, /chủ: Nhà xe Phương Nam/);
  // Gửi tường minh id công ty chủ cũng được.
  r = await themXe(w, xe({ ownerPartyId: congTyChu(w) }));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.vehicle.ownerIsCompany, true);
});

test("POST xe: chủ là hồ sơ THƯỜNG (không mở vai Nhà xe) → 409 vehicle_owner_not_carrier, không ghi, không nhật ký; nhà xe đã thôi → 409; sai khuôn → 400", async () => {
  const w = setup();
  const daiLy = await hoSo(w, { kind: "ORGANIZATION", displayName: "Đại lý thường" });
  const [x0, l0] = [soXe(w), soNhatKy(w)];
  let r = await themXe(w, xe({ ownerPartyId: daiLy }));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "vehicle_owner_not_carrier");
  assert.match(r.json.error.message, /nhà xe đối tác/);
  assert.equal(soXe(w), x0);
  assert.equal(soNhatKy(w), l0);
  const thoi = await nhaXe(w, { kind: "ORGANIZATION", displayName: "Nhà xe đã thôi" });
  const rid = w.q("SELECT id FROM pty_party_role WHERE party_id = ? AND role_type_code = 'CARRIER'", thoi)[0].id;
  assert.equal((await w.call("POST", `/api/parties/${thoi}/roles/${rid}/end`, { as: ADM, body: {} })).status, 200);
  r = await themXe(w, xe({ ownerPartyId: thoi }));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "vehicle_owner_not_carrier");
  for (const sai of ["abc", 12, "../x"]) {
    r = await themXe(w, xe({ ownerPartyId: sai }));
    assert.equal(r.status, 400, `${JSON.stringify(sai)}: ${r.text}`);
  }
});

test("GET xe?chu=: chỉ xe của chủ đó; chu sai khuôn → 400; chu vắng → mọi xe; mọi xe có ownerPartyId/ownerName/ownerIsCompany", async () => {
  const w = setup();
  const px = await nhaXe(w, { kind: "ORGANIZATION", displayName: "Nhà xe Phương Nam" });
  const a = (await themXe(w, xe())).json.vehicle.id;
  const b = (await themXe(w, xe({ ownerPartyId: px }))).json.vehicle.id;
  let r = await w.call("GET", `/api/van-chuyen/xe?chu=${px}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.vehicles.map((v: any) => v.id), [b]);
  r = await w.call("GET", `/api/van-chuyen/xe?chu=${congTyChu(w)}`, { as: ADM });
  assert.deepEqual(r.json.vehicles.map((v: any) => v.id), [a]);
  r = await w.call("GET", "/api/van-chuyen/xe?chu=abc", { as: ADM });
  assert.equal(r.status, 400, r.text);
  r = await w.call("GET", "/api/van-chuyen/xe", { as: ADM });
  assert.deepEqual(r.json.vehicles.map((v: any) => v.id).sort(), [a, b].sort());
  for (const v of r.json.vehicles) for (const k of ["ownerPartyId", "ownerName", "ownerIsCompany"]) assert.ok(k in v, `${v.id}: thiếu ${k}`);
  assert.equal((await w.call("GET", `/api/van-chuyen/xe?chu=${px}`, { as: SALES })).status, 403, "403 ô đứng TRƯỚC 400 thân/tham số");
});

test("GET /api/van-chuyen/nha-xe: Quản trị → công ty chủ + nhà xe (xếp tên) với số xe CHƯA NGỪNG và số tài xế; Bán hàng → 403 ô; tài xế đối tác → 403 cổng", async () => {
  const w = setup();
  const px = await nhaXe(w, { kind: "ORGANIZATION", displayName: "Nhà xe Phương Nam" });
  const ca = await nhaXe(w, { kind: "PERSON", fullName: "Anh Tự Lái", contacts: [] });
  const taiXe = await hoSo(w, { kind: "PERSON", fullName: "Trần Văn Lái", contacts: [] });
  assert.equal((await w.call("POST", `/api/parties/${px}/relationships`, { as: ADM, body: { fromPartyId: taiXe, toPartyId: px, relationshipTypeCode: "DRIVES_FOR" } })).status, 201);
  await themXe(w, xe({ ownerPartyId: px }));
  const ngung = (await themXe(w, xe({ ownerPartyId: px }))).json.vehicle;
  const ra = await w.call("PUT", `/api/van-chuyen/xe/${ngung.id}`, {
    as: ADM,
    body: { plateNumber: ngung.plateNumber, chassisNumber: ngung.chassisNumber, name: ngung.name, modelYear: ngung.modelYear, passengerCapacity: ngung.passengerCapacity, status: "retired", expectedUpdatedAt: ngung.updatedAt },
  });
  assert.equal(ra.status, 200, ra.text);
  await themXe(w, xe());
  const r = await w.call("GET", "/api/van-chuyen/nha-xe", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.ownerCompany, { partyId: congTyChu(w), name: "Công ty TNHH Tour Đảo" });
  const tenCa = w.q("SELECT display_name FROM pty_party WHERE id = ?", ca)[0].display_name;
  assert.deepEqual(r.json.carriers, [
    { partyId: ca, name: tenCa, kind: "PERSON", vehicleCount: 0, driverCount: 1 },
    { partyId: px, name: "Nhà xe Phương Nam", kind: "ORGANIZATION", vehicleCount: 1, driverCount: 1 },
  ].sort((x, y) => (x.name < y.name ? -1 : 1)));
  const s = await w.call("GET", "/api/van-chuyen/nha-xe", { as: SALES });
  assert.equal(s.status, 403);
  assert.equal(s.json.error.code, "forbidden");
  assert.match(s.json.error.message, CAU_O_XE);
  const d = await w.call("GET", "/api/van-chuyen/nha-xe", { as: TX_DT });
  assert.equal(d.status, 403);
  assert.match(d.json.error.message, CAU_CONG_OFFICE);
});
