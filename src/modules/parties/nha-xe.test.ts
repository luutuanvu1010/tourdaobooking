// Nhà xe đối tác + quan hệ "Tài xế của" ở lớp MÁY CHỦ (ADR-0048 D1, B1.2): route quan hệ sẵn có `POST /api/parties/:id/relationships` (cổng admin +
// admin.manage) kiểm TRƯỚC khi chạm CSDL — đầu TỪ là hồ sơ cá nhân (409 `drives_for_not_person`), đầu TỚI đang mở vai Nhà xe (409 `drives_for_not_carrier`),
// không đặt trước ngày kết thúc (400 — giả định G2, điều phối chấp nhận 2026-09-29). Mã route KHÁC mã lớp CSDL (`drives_for_rule`, trigger *_drives_for_*)
// để phép đột biến bỏ lời kiểm route thấy đỏ (tiền lệ R15 của Vận chuyển 1a). Gán vai "Nhà xe đối tác" đi đường sẵn có `POST /api/parties/:id/roles`.
// Chạy CẢ ứng dụng trên SQLite thật (có trigger 0038) qua khung tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  return w;
}
async function hoSo(w: any, body: Record<string, unknown>): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
}
const nguoi = (w: any, ten: string) => hoSo(w, { kind: "PERSON", fullName: ten, contacts: [] });
const toChuc = (w: any, ten: string) => hoSo(w, { kind: "ORGANIZATION", displayName: ten });
const ganVai = (w: any, as: string, id: string, code: string) => w.call("POST", `/api/parties/${id}/roles`, { as, body: { roleTypeCode: code } });
const quanHe = (w: any, as: string, onParty: string, from: string, to: string, extra: Record<string, unknown> = {}) =>
  w.call("POST", `/api/parties/${onParty}/relationships`, { as, body: { fromPartyId: from, toPartyId: to, relationshipTypeCode: "DRIVES_FOR", ...extra } });
const soQuanHe = (w: any): number => w.q("SELECT count(*) n FROM pty_party_relationship")[0].n;
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log")[0].n;

test("Quản trị gán 'Nhà xe đối tác' cho hồ sơ tổ chức VÀ hồ sơ cá nhân qua route vai sẵn có → 201 (vai nhóm OTHER, không sinh quyền)", async () => {
  const w = setup();
  const org = await toChuc(w, "Nhà xe Phương Nam");
  const ca = await nguoi(w, "Nguyễn Văn Tự Lái");
  for (const id of [org, ca]) {
    const r = await ganVai(w, ADM, id, "CARRIER");
    assert.equal(r.status, 201, r.text);
    assert.deepEqual(r.json.party.roleCodes, ["CARRIER"]);
  }
  assert.equal((await ganVai(w, SALES, org, "CARRIER")).status, 403, "Bán hàng: cổng admin");
});

test("B1.2 route: 'Tài xế của' người → nhà xe → 201 + nhật ký party_relationship_changed; từ tổ chức → 409 drives_for_not_person; tới hồ sơ không mở vai → 409 drives_for_not_carrier; không ghi gì khi 409", async () => {
  const w = setup();
  const nhaXe = await toChuc(w, "Nhà xe Phương Nam");
  assert.equal((await ganVai(w, ADM, nhaXe, "CARRIER")).status, 201);
  const taiXe = await nguoi(w, "Trần Văn Lái");
  const daiLy = await toChuc(w, "Đại lý Thường");

  let [qh, log] = [soQuanHe(w), soNhatKy(w)];
  let r = await quanHe(w, ADM, nhaXe, daiLy, nhaXe);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "drives_for_not_person");
  assert.match(r.json.error.message, /hồ sơ cá nhân/);
  assert.equal(soQuanHe(w), qh);
  assert.equal(soNhatKy(w), log);

  r = await quanHe(w, ADM, taiXe, taiXe, daiLy);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "drives_for_not_carrier");
  assert.match(r.json.error.message, /nhà xe đối tác/);
  assert.equal(soQuanHe(w), qh);
  assert.equal(soNhatKy(w), log);

  r = await quanHe(w, ADM, nhaXe, taiXe, nhaXe);
  assert.equal(r.status, 201, r.text);
  assert.equal(soQuanHe(w), qh + 1);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_relationship_changed' AND target_id = ?", nhaXe)[0].n, 1);
  [qh, log] = [soQuanHe(w), soNhatKy(w)];
  // Nhà xe đã THÔI hợp tác (đóng vai) không nhận tài xế mới.
  const thoi = await toChuc(w, "Nhà xe Đã Thôi");
  assert.equal((await ganVai(w, ADM, thoi, "CARRIER")).status, 201);
  const rid = w.q("SELECT id FROM pty_party_role WHERE party_id = ? AND role_type_code = 'CARRIER'", thoi)[0].id;
  assert.equal((await w.call("POST", `/api/parties/${thoi}/roles/${rid}/end`, { as: ADM, body: {} })).status, 200);
  r = await quanHe(w, ADM, taiXe, taiXe, thoi);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "drives_for_not_carrier");
});

test("G2: 'Tài xế của' có ngày kết thúc đặt trước → 400 (khi thôi thì bấm Kết thúc); Bán hàng → 403; CONTACT_OF không bị chạm (tới hồ sơ không phải nhà xe vẫn 201)", async () => {
  const w = setup();
  const nhaXe = await toChuc(w, "Nhà xe Phương Nam");
  assert.equal((await ganVai(w, ADM, nhaXe, "CARRIER")).status, 201);
  const taiXe = await nguoi(w, "Lê Văn Lái");
  const r = await quanHe(w, ADM, nhaXe, taiXe, nhaXe, { validTo: "2026-12-31" });
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal((await quanHe(w, SALES, nhaXe, taiXe, nhaXe)).status, 403);
  const daiLy = await toChuc(w, "Đại lý Thường");
  const lienHe = await w.call("POST", `/api/parties/${daiLy}/relationships`, { as: ADM, body: { fromPartyId: taiXe, toPartyId: daiLy, relationshipTypeCode: "CONTACT_OF" } });
  assert.equal(lienHe.status, 201, lienHe.text);
  const haiToChuc = await w.call("POST", `/api/parties/${daiLy}/relationships`, { as: ADM, body: { fromPartyId: nhaXe, toPartyId: daiLy, relationshipTypeCode: "CONTACT_OF" } });
  assert.equal(haiToChuc.status, 201, haiToChuc.text);
});

test("R-B1: thêm trùng 'Tài xế của' cho cùng nhà xe → 409 relationship_overlap, câu lỗi trung tính (không nói 'Người liên hệ'), không ghi thêm", async () => {
  const w = setup();
  const nhaXe = await toChuc(w, "Nhà xe Phương Nam");
  assert.equal((await ganVai(w, ADM, nhaXe, "CARRIER")).status, 201);
  const taiXe = await nguoi(w, "Phạm Văn Lái");
  assert.equal((await quanHe(w, ADM, nhaXe, taiXe, nhaXe)).status, 201);
  const [qh, log] = [soQuanHe(w), soNhatKy(w)];
  const r = await quanHe(w, ADM, nhaXe, taiXe, nhaXe);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "relationship_overlap");
  assert.equal(r.json.error.message, "Quan hệ này đã được ghi trong khoảng thời gian trùng.");
  assert.equal(soQuanHe(w), qh);
  assert.equal(soNhatKy(w), log);
});
