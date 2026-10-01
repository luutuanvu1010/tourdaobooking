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
  assert.equal((await addPhone(w, SALES, pty(ADM2))).status, 403, "SALES thêm SĐT vào hồ sơ của tài khoản đang ngưng");
});

// Kiểm độc lập I-1 (2026-09-24): các ca trên chỉ thử người gọi KHÔNG PHẢI chính hồ sơ mục tiêu, nên `acc.manageable` = false —
// điều đó tự chặn, che mất ô `party.staff.write`. Đổi ô đó thành `party.write` (ô "any" cho SALES/ACCOUNTING) ở cả ba route
// (PUT, POST contacts, POST contacts/:cid/end) mà KHÔNG có ca nào dưới đây thì bộ test vẫn xanh — vì với chính mình,
// `partyAccountVerdict` luôn trả `manageable: true` (actor.id === target.id), nên chỉ còn ô quyết định.
test("hồ sơ có tài khoản: SALES/ACCOUNTING tự sửa hồ sơ CỦA CHÍNH MÌNH cũng bị chặn (ô party.staff.write = none, không phải cấp bậc)", async () => {
  const w = setup();
  for (const as of [SALES, ACC]) {
    const target = pty(as);

    const beforeRename = logCount(w, target);
    assert.equal((await rename(w, as, target, "Tự Đổi Tên")).status, 403, `${as} tự đổi tên hồ sơ mình`);
    assert.notEqual(label(w, as), "Tự Đổi Tên");
    assert.equal(logCount(w, target), beforeRename, "403 tự đổi tên không ghi thêm nhật ký");

    const beforeAddPhone = logCount(w, target);
    assert.equal((await addPhone(w, as, target)).status, 403, `${as} tự thêm SĐT vào hồ sơ mình`);
    assert.equal(logCount(w, target), beforeAddPhone, "403 tự thêm SĐT không ghi thêm nhật ký");

    // Gieo một liên hệ bằng ADMIN (được phép) rồi chính chủ hồ sơ thử tự đóng liên hệ đó.
    const added = await w.call("POST", `/api/parties/${target}/contacts`, { as: ADM, body: { kind: "EMAIL", value: `tu-dong-${as}@vidu.vn` } });
    assert.equal(added.status, 201, added.text);
    const cid = added.json.party.contacts[0].id;
    const beforeEnd = logCount(w, target);
    assert.equal((await w.call("POST", `/api/parties/${target}/contacts/${cid}/end`, { as, body: {} })).status, 403, `${as} tự đóng liên hệ của hồ sơ mình`);
    assert.equal(logCount(w, target), beforeEnd, "403 tự đóng liên hệ không ghi thêm nhật ký");
    assert.equal(w.q("SELECT valid_to_date v FROM pty_contact_point WHERE id = ?", cid)[0].v, null, "liên hệ vẫn còn mở");
  }
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

// Kiểm độc lập I-1 (2026-09-24, ADR-0013 điều 5): không tạo tài khoản trên hồ sơ ĐANG NGƯNG. Chặn ở src/modules/staff/index.ts
// (createAccountWithRolesStatements, dòng `if (!party.active) return { ok: false, ... }`), lộ ra ở POST /api/staff thành 409 account_rule
// (src/modules/accounts/index.ts). Xoá dòng chặn đó thì mọi test khác vẫn xanh — chỉ ca này bắt được lỗ.
test("ADR-0013 điều 5 / I-1: không tạo tài khoản trên hồ sơ đang NGƯNG (409 account_rule); hồ sơ đang hoạt động thì tạo được (201)", async () => {
  const w = setup();

  // Đối chứng dương: hồ sơ đang hoạt động → tạo tài khoản trên hồ sơ có sẵn được (201).
  const active = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Khách Còn Hoạt Động", contacts: [] } });
  assert.equal(active.status, 201, active.text);
  const activeId = active.json.party.id;
  const beforeCountOk = w.q("SELECT count(*) n FROM staff")[0].n;
  const created = await w.call("POST", "/api/staff", { as: SUP, body: { roles: ["SALES_STAFF"], phone: "0900000097", partyId: activeId } });
  assert.equal(created.status, 201, created.text);
  assert.equal(w.q("SELECT count(*) n FROM staff")[0].n, beforeCountOk + 1);
  assert.equal(w.q("SELECT count(*) n FROM staff WHERE party_id = ?", activeId)[0].n, 1);

  // Ca chính: hồ sơ đang ngưng (chưa có tài khoản nên được phép tự ngưng) → tạo tài khoản phải bị chặn.
  const made = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Khách Sẽ Ngưng", contacts: [] } });
  assert.equal(made.status, 201, made.text);
  const inactiveId = made.json.party.id;
  const stopped = await rename(w, SALES, inactiveId, "Khách Sẽ Ngưng", false);
  assert.equal(stopped.status, 200, stopped.text);
  assert.equal(w.q("SELECT active a FROM pty_party WHERE id = ?", inactiveId)[0].a, 0);

  const beforeCount = w.q("SELECT count(*) n FROM staff")[0].n;
  const blocked = await w.call("POST", "/api/staff", { as: SUP, body: { roles: ["SALES_STAFF"], phone: "0900000098", partyId: inactiveId } });
  assert.equal(blocked.status, 409, blocked.text);
  assert.equal(blocked.json.error.code, "account_rule");
  assert.equal(w.q("SELECT count(*) n FROM staff")[0].n, beforeCount, "không tạo thêm dòng staff");
  assert.equal(w.q("SELECT count(*) n FROM staff WHERE party_id = ?", inactiveId)[0].n, 0, "không có tài khoản gắn hồ sơ đang ngưng");
});

// ---- ADR-0019 điều 2 / Q11 (chủ quyết 25/9): vai và quan hệ của hồ sơ GẮN TÀI KHOẢN theo luật cấp bậc ("tự mình hoặc cấp dưới") -------------------
// Sửa một phần ADR-0014 điều 8. Quan hệ chạm HAI hồ sơ nên xét cả hai đầu. Hồ sơ không gắn tài khoản: chỉ ô admin.manage như cũ.
// Loại công việc ĐANG DÙNG (Lái cano, nhóm OTHER): mã hồ sơ cũ DRIVER đã ngưng từ migration *_vai_quyen_tai_xe (ADR-0040 D3) và máy chủ từ chối gán mới loại
// đã ngưng (Ruling R6) — dùng DRIVER ở đây sẽ nhận 409 role_type_inactive, không đo được luật cấp bậc.
const BOAT_CAPTAIN = { roleTypeCode: "BOAT_CAPTAIN" };
const addRole = (w: any, as: string, partyId: string, body: unknown = BOAT_CAPTAIN) => w.call("POST", `/api/parties/${partyId}/roles`, { as, body });
const endRole = (w: any, as: string, partyId: string, rid: string) => w.call("POST", `/api/parties/${partyId}/roles/${rid}/end`, { as, body: {} });
const link = (w: any, as: string, onParty: string, from: string, to: string) =>
  w.call("POST", `/api/parties/${onParty}/relationships`, { as, body: { fromPartyId: from, toPartyId: to, relationshipTypeCode: "CONTACT_OF" } });
const endLink = (w: any, as: string, onParty: string, rid: string) => w.call("POST", `/api/parties/${onParty}/relationships/${rid}/end`, { as, body: {} });
const roleRows = (w: any, partyId: string) => w.q("SELECT id, valid_to_date v FROM pty_party_role WHERE party_id = ?", partyId);
const relRows = (w: any) => w.q("SELECT id, valid_to_date v FROM pty_party_relationship");
async function customer(w: any, name = "Khách Lẻ") {
  const made = await w.call("POST", "/api/parties", { as: SUP, body: { kind: "PERSON", fullName: name, contacts: [] } });
  assert.equal(made.status, 201, made.text);
  return made.json.party.id as string;
}
const auditCount = (w: any, action: string) => w.q("SELECT count(*) n FROM audit_log WHERE action = ?", action)[0].n;

test("Q11 (a): ADMIN thêm vai vào hồ sơ của ADMIN khác hoặc SUPER_ADMIN → 403, không dòng vai, không nhật ký; 403 đứng trước 400", async () => {
  const w = setup();
  const before = auditCount(w, "party_role_added");
  for (const target of [ADM2, SUP]) {
    const rowsBefore = roleRows(w, pty(target)).length;
    assert.equal((await addRole(w, ADM, pty(target))).status, 403, `ADM thêm vai vào ${target}`);
    assert.equal((await addRole(w, ADM, pty(target), { rác: 1 })).status, 403, `403 đứng trước 400 (${target})`);
    assert.equal(roleRows(w, pty(target)).length, rowsBefore, "không thêm dòng vai");
  }
  assert.equal(auditCount(w, "party_role_added"), before, "không nhật ký party_role_added");
});

test("Q11 (b): ADMIN kết thúc vai trên hồ sơ của ADMIN khác → 403, vai vẫn mở", async () => {
  const w = setup();
  const put = await addRole(w, SUP, pty(ADM2));
  assert.equal(put.status, 201, put.text);
  const rid = put.json.party.roles.find((r: any) => r.roleTypeCode === "BOAT_CAPTAIN").id;
  const before = auditCount(w, "party_role_ended");
  assert.equal((await endRole(w, ADM, pty(ADM2), rid)).status, 403);
  assert.equal(w.q("SELECT valid_to_date v FROM pty_party_role WHERE id = ?", rid)[0].v, null, "vai vẫn mở");
  assert.equal(auditCount(w, "party_role_ended"), before);
  assert.equal((await endRole(w, SUP, pty(ADM2), rid)).status, 200, "Toàn quyền kết thúc được");
});

test("Q11 (c): ADMIN thêm quan hệ mà MỘT đầu là hồ sơ của ADMIN khác → 403 cả hai chiều gọi (trên hồ sơ khách và trên hồ sơ ADMIN khác)", async () => {
  const w = setup();
  const k = await customer(w);
  const before = auditCount(w, "party_relationship_changed");
  assert.equal((await link(w, ADM, k, k, pty(ADM2))).status, 403, "gọi trên hồ sơ khách, đầu kia là ADMIN khác");
  assert.equal((await link(w, ADM, k, pty(ADM2), k)).status, 403, "đảo chiều quan hệ");
  assert.equal((await link(w, ADM, pty(ADM2), k, pty(ADM2))).status, 403, "gọi trên hồ sơ ADMIN khác");
  assert.equal((await link(w, ADM, k, k, pty(SUP))).status, 403, "đầu kia là SUPER_ADMIN");
  assert.equal(relRows(w).length, 0, "không có dòng quan hệ");
  assert.equal(auditCount(w, "party_relationship_changed"), before);
});

test("Q11 (d): ADMIN kết thúc quan hệ giữa khách và hồ sơ ADMIN khác → 403 (gọi từ đầu nào cũng vậy), quan hệ vẫn mở", async () => {
  const w = setup();
  const k = await customer(w);
  const made = await link(w, SUP, k, k, pty(ADM2));
  assert.equal(made.status, 201, made.text);
  const rid = relRows(w)[0].id;
  const before = auditCount(w, "party_relationship_changed");
  assert.equal((await endLink(w, ADM, k, rid)).status, 403, "gọi từ hồ sơ khách");
  assert.equal((await endLink(w, ADM, pty(ADM2), rid)).status, 403, "gọi từ hồ sơ ADMIN khác");
  assert.equal(relRows(w)[0].v, null, "quan hệ vẫn mở");
  assert.equal(auditCount(w, "party_relationship_changed"), before);
  assert.equal((await endLink(w, SUP, k, rid)).status, 200, "Toàn quyền kết thúc được");
});

test("Q11 (e): đối chứng dương — ADMIN làm được trên hồ sơ cấp dưới, của chính mình, hồ sơ khách; SUPER_ADMIN làm được trên hồ sơ ADMIN khác", async () => {
  const w = setup();
  const k = await customer(w);
  for (const target of [pty(SALES), pty(PARTNER), pty(ADM), k]) {
    const put = await addRole(w, ADM, target);
    assert.equal(put.status, 201, `ADM thêm vai vào ${target}: ${put.text}`);
    const rid = put.json.party.roles.find((r: any) => r.roleTypeCode === "BOAT_CAPTAIN").id;
    assert.equal((await endRole(w, ADM, target, rid)).status, 200, `ADM kết thúc vai ${target}`);
  }
  for (const other of [pty(SALES), pty(PARTNER), pty(ADM)]) {
    const made = await link(w, ADM, k, k, other);
    assert.equal(made.status, 201, `ADM nối khách với ${other}: ${made.text}`);
    const rid = w.q("SELECT id FROM pty_party_relationship WHERE to_party_id = ?", other)[0].id;
    assert.equal((await endLink(w, ADM, k, rid)).status, 200, `ADM kết thúc quan hệ với ${other}`);
  }
  const k2 = await customer(w, "Khách Hai");
  assert.equal((await link(w, ADM, k, k, k2)).status, 201, "quan hệ giữa hai hồ sơ khách");
  // Toàn quyền làm được trên hồ sơ của ADMIN khác.
  const put = await addRole(w, SUP, pty(ADM2));
  assert.equal(put.status, 201, put.text);
  assert.equal((await link(w, SUP, k, k, pty(ADM2))).status, 201);
  // Bán hàng: 403 ở cổng.
  assert.equal((await addRole(w, SALES, k)).status, 403);
  assert.equal((await link(w, SALES, k, k, k2)).status, 403);
});
