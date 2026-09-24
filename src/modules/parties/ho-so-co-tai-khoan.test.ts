// Hồi quy F-01 / red team R3, R3b, R3c (ADR-0013): chạy CẢ ứng dụng (router + mọi module, gói bằng esbuild) trên SQLite thật qua khung
// tests/audit/harness.mjs — cùng khung với red team, nhưng nằm trong `npm test` để lỗ không mở lại âm thầm.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const PARTNER = "88888888-8888-4888-8888-888888888888";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000006", name: "Quản trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Thực địa", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  return w;
}
const pty = (staffId: string) => `pty-${staffId}`;
const label = (w: any, id: string) => w.q("SELECT label FROM v_stf_staff_label WHERE id = ?", id)[0].label;
const logCount = (w: any, partyId: string) => w.q("SELECT count(*) n FROM audit_log WHERE target_id = ?", partyId)[0].n;

async function rename(w: any, as: string, partyId: string, given: string, active?: boolean) {
  const cur = w.q("SELECT updated_at u, active a FROM pty_party WHERE id = ?", partyId)[0];
  return w.call("PUT", `/api/parties/${partyId}`, { as, body: { familyName: null, middleName: null, givenName: given, active: active ?? cur.a === 1, expectedUpdatedAt: cur.u } });
}
const addPhone = (w: any, as: string, partyId: string) => w.call("POST", `/api/parties/${partyId}/contacts`, { as, body: { kind: "PHONE", value: "0911222333" } });

test("R3/R3c hồi quy: SALES, ACCOUNTING không đổi tên, không ngưng, không thêm SĐT vào hồ sơ có tài khoản — 403, không ghi, không nhật ký", async () => {
  const w = setup();
  for (const as of [SALES2, ACC]) {
    for (const target of [ADM, SALES, SUP, PARTNER]) {
      const before = logCount(w, pty(target));
      assert.equal((await rename(w, as, pty(target), "Kẻ Mạo Danh")).status, 403, `${as} đổi tên ${target}`);
      assert.equal((await rename(w, as, pty(target), "Kẻ Mạo Danh", false)).status, 403, `${as} ngưng ${target}`);
      assert.equal((await addPhone(w, as, pty(target))).status, 403, `${as} thêm SĐT ${target}`);
      assert.notEqual(label(w, target), "Kẻ Mạo Danh");
      assert.equal(logCount(w, pty(target)), before);
    }
  }
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE value_normalized = '0911222333'")[0].n, 0);
});

test("FIELD không vào được Hồ sơ (403)", async () => {
  const w = setup();
  assert.equal((await rename(w, FIELD, pty(SALES), "X")).status, 403);
  assert.equal((await addPhone(w, FIELD, pty(SALES))).status, 403);
});

test("ADR-0014 điều 8: ADMIN sửa hồ sơ cấp dưới và của chính mình; không sửa ADMIN khác, SUPER_ADMIN; SUPER_ADMIN sửa được ADMIN", async () => {
  const w = setup();
  assert.equal((await rename(w, ADM, pty(SALES), "An Mới")).status, 200);
  assert.equal(label(w, SALES), "An Mới");
  assert.equal((await addPhone(w, ADM, pty(PARTNER))).status, 201);
  assert.equal((await rename(w, ADM, pty(ADM), "Quản trị Mới")).status, 200, "tự sửa hồ sơ của chính mình");
  const beforeAdm2 = logCount(w, pty(ADM2));
  assert.equal((await rename(w, ADM, pty(ADM2), "Giả")).status, 403);
  assert.equal((await addPhone(w, ADM, pty(ADM2))).status, 403);
  assert.equal(logCount(w, pty(ADM2)), beforeAdm2, "403 không ghi thêm nhật ký (ADM → ADM2)");
  const beforeSup = logCount(w, pty(SUP));
  assert.equal((await rename(w, ADM, pty(SUP), "Giả")).status, 403);
  assert.equal(logCount(w, pty(SUP)), beforeSup, "403 không ghi thêm nhật ký (ADM → SUP)");
  assert.equal((await rename(w, SUP, pty(ADM2), "Hai Mới")).status, 200);
});

test("hồ sơ của tài khoản ĐANG NGƯNG vẫn là hồ sơ có tài khoản (ADR-0013 điều 1)", async () => {
  const w = setup();
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${ADM2}'`);
  assert.equal((await rename(w, SALES, pty(ADM2), "Kẻ Mạo Danh")).status, 403);
});

test("ADR-0013 điều 5: không ai đổi 'đang dùng' của hồ sơ có tài khoản ở màn Hồ sơ (409); gửi lại đúng giá trị cũ khi đổi tên thì không chặn", async () => {
  const w = setup();
  for (const as of [ADM, SUP]) {
    const r = await rename(w, as, pty(SALES), "An", false);
    assert.equal(r.status, 409, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "account_rule");
  }
  assert.equal((await rename(w, ADM, pty(ADM), "Quản trị", false)).status, 409, "kể cả tự ngưng hồ sơ mình");
  assert.equal(w.q("SELECT active a FROM pty_party WHERE id = ?", pty(SALES))[0].a, 1);
  assert.equal((await rename(w, ADM, pty(SALES), "An Hai", true)).status, 200);
});

test("hành vi cũ giữ nguyên: SALES tạo, sửa, ngưng, thêm/đóng liên hệ của hồ sơ KHÔNG gắn tài khoản", async () => {
  const w = setup();
  const made = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Trần Khách", contacts: [] } });
  assert.equal(made.status, 201, made.text);
  const id = made.json.party.id;
  assert.equal(made.json.party.accountLinked, false);
  assert.equal(made.json.party.editable, true);
  assert.equal((await rename(w, SALES2, id, "Khách Mới")).status, 200);
  const added = await addPhone(w, SALES2, id);
  assert.equal(added.status, 201);
  const cid = added.json.party.contacts[0].id;
  assert.equal((await w.call("POST", `/api/parties/${id}/contacts/${cid}/end`, { as: ACC, body: {} })).status, 200);
  assert.equal((await rename(w, SALES2, id, "Khách Mới", false)).status, 200, "ngưng hồ sơ khách vẫn được (R3d ngoài phạm vi)");
});

test("đóng liên hệ của hồ sơ có tài khoản: SALES 403, ADMIN (cấp dưới) 200; ADMIN không đóng được liên hệ của ADMIN khác/SUPER_ADMIN", async () => {
  const w = setup();
  const cid = (await addPhone(w, ADM, pty(SALES))).json.party.contacts[0].id;
  assert.equal((await w.call("POST", `/api/parties/${pty(SALES)}/contacts/${cid}/end`, { as: SALES2, body: {} })).status, 403);
  assert.equal((await w.call("POST", `/api/parties/${pty(SALES)}/contacts/${cid}/end`, { as: ADM, body: {} })).status, 200);

  // ADR-0014 điều 8: ADMIN không đóng được liên hệ của một ADMIN khác (hàng ngang, không phải cấp dưới).
  const added = await w.call("POST", `/api/parties/${pty(ADM2)}/contacts`, { as: SUP, body: { kind: "PHONE", value: "0922333444" } });
  assert.equal(added.status, 201, added.text);
  const cid2 = added.json.party.contacts[0].id;
  const beforeLog = logCount(w, pty(ADM2));
  const forbidden = await w.call("POST", `/api/parties/${pty(ADM2)}/contacts/${cid2}/end`, { as: ADM, body: {} });
  assert.equal(forbidden.status, 403);
  assert.equal(logCount(w, pty(ADM2)), beforeLog, "403 không ghi thêm nhật ký");
  assert.equal(w.q("SELECT valid_to_date v FROM pty_contact_point WHERE id = ?", cid2)[0].v, null, "liên hệ vẫn còn mở");
});

test("403 đứng TRƯỚC 400 ở /end: SALES gửi thân yêu cầu sai với hồ sơ không được sửa vẫn là 403", async () => {
  const w = setup();
  const cidOnAdm = (await addPhone(w, ADM, pty(ADM))).json.party.contacts[0].id;
  const r = await w.call("POST", `/api/parties/${pty(ADM)}/contacts/${cidOnAdm}/end`, { as: SALES, body: { validTo: "rác" } });
  assert.equal(r.status, 403);
});

test("GET /api/parties/:id trả accountLinked/editable theo người xem, không lộ tài khoản", async () => {
  const w = setup();
  const bySales = (await w.call("GET", `/api/parties/${pty(ADM)}`, { as: SALES })).json.party;
  assert.equal(bySales.accountLinked, true);
  assert.equal(bySales.editable, false);
  assert.equal((await w.call("GET", `/api/parties/${pty(SALES)}`, { as: ADM })).json.party.editable, true);
  assert.equal((await w.call("GET", `/api/parties/${pty(ADM2)}`, { as: ADM })).json.party.editable, false);
  for (const k of ["accountId", "staffId", "permissions", "loginPhone"]) assert.equal(k in bySales, false, k);
});

test("403 đứng TRƯỚC 400: thân yêu cầu sai với hồ sơ không được sửa vẫn là 403", async () => {
  const w = setup();
  assert.equal((await w.call("PUT", `/api/parties/${pty(ADM)}`, { as: SALES, body: { rác: 1 } })).status, 403);
  assert.equal((await w.call("POST", `/api/parties/${pty(ADM)}/contacts`, { as: SALES, body: { kind: "FAX" } })).status, 403);
});
