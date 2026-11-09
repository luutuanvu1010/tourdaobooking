// ADR-0190 (R3d): chỉ Quản trị, Toàn quyền ngừng dùng hoặc dùng lại hồ sơ KHÔNG gắn tài khoản; nhật ký ghi rõ «— ngừng dùng» / «— dùng lại».
// Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs (cùng khung với ho-so-co-tai-khoan.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const SM = "99999999-9999-4999-8999-999999999999";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const ACC = "55555555-5555-4555-8555-555555555555";
const CAU_CHAN = "Chỉ Quản trị hoặc Toàn quyền ngừng dùng hoặc dùng lại hồ sơ.";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SM, phone: "0900000009", name: "Quản lý bán", perms: ["SALES_MANAGER", "SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  return w;
}

async function khachMoi(w: any): Promise<string> {
  const made = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Trần Khách", contacts: [{ kind: "PHONE", value: "0912345678" }] } });
  assert.equal(made.status, 201, made.text);
  return made.json.party.id;
}
const hang = (w: any, id: string) => w.q("SELECT active a, display_name n, updated_at u FROM pty_party WHERE id = ?", id)[0];
async function sua(w: any, as: string, id: string, given: string, active: boolean) {
  const cur = hang(w, id);
  return w.call("PUT", `/api/parties/${id}`, { as, body: { familyName: "Trần", middleName: null, givenName: given, active, expectedUpdatedAt: cur.u } });
}
const nhatKy = (w: any, id: string) => w.q("SELECT detail FROM audit_log WHERE target_id = ? AND action = 'party_updated' ORDER BY rowid", id).map((r: any) => r.detail);

test("ADR-0190: Bán hàng, Quản lý bán hàng, Kế toán ngừng dùng hồ sơ khách → 403 một câu, hồ sơ và nhật ký giữ nguyên", async () => {
  const w = setup();
  const id = await khachMoi(w);
  for (const as of [SALES, SALES2, SM, ACC]) {
    const truoc = hang(w, id);
    const r = await sua(w, as, id, "Khách Đổi", false);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.message, CAU_CHAN);
    assert.deepEqual({ ...hang(w, id) }, { ...truoc }, "hồ sơ không đổi (kể cả tên gửi kèm)");
  }
  assert.deepEqual(nhatKy(w, id), []);
});

test("ADR-0190: Quản trị, Toàn quyền ngừng dùng rồi dùng lại → 200; nhật ký «— ngừng dùng» / «— dùng lại», không SĐT", async () => {
  for (const as of [ADM, SUP]) {
    const w = setup();
    const id = await khachMoi(w);
    const tat = await sua(w, as, id, "Khách", false);
    assert.equal(tat.status, 200, tat.text);
    assert.equal(hang(w, id).a, 0);
    const bat = await sua(w, as, id, "Khách", true);
    assert.equal(bat.status, 200, bat.text);
    assert.equal(hang(w, id).a, 1);
    assert.deepEqual(nhatKy(w, id), ["cá nhân — ngừng dùng", "cá nhân — dùng lại"]);
    for (const d of nhatKy(w, id)) assert.equal(/0912345678/.test(d), false);
  }
});

test("ADR-0190: dùng lại hồ sơ đã ngừng — Bán hàng, Quản lý bán hàng, Kế toán → 403, hồ sơ vẫn ngừng", async () => {
  const w = setup();
  const id = await khachMoi(w);
  assert.equal((await sua(w, ADM, id, "Khách", false)).status, 200);
  for (const as of [SALES, SM, ACC]) {
    const r = await sua(w, as, id, "Khách", true);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.message, CAU_CHAN);
    assert.equal(hang(w, id).a, 0);
  }
});

test("ADR-0190: cờ không đổi thì không hỏi ô — Bán hàng, Kế toán sửa tên → 200, nhật ký không hậu tố", async () => {
  const w = setup();
  const id = await khachMoi(w);
  assert.equal((await sua(w, SALES2, id, "Khách Mới", true)).status, 200);
  assert.equal((await sua(w, ACC, id, "Khách Mới Hai", true)).status, 200);
  assert.deepEqual(nhatKy(w, id), ["cá nhân", "cá nhân"]);
});

test("ADR-0190: luật hồ sơ gắn tài khoản và luật công ty chủ hỏi TRƯỚC — Quản trị ngừng hồ sơ có tài khoản vẫn 409 account_rule", async () => {
  const w = setup();
  const r = await sua(w, ADM, `pty-${SALES}`, "An", false);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "account_rule");
});

test("ADR-0190: DTO chi tiết hồ sơ có cờ activeEditable theo người xem", async () => {
  const w = setup();
  const id = await khachMoi(w);
  for (const [as, mong] of [[SALES, false], [SM, false], [ACC, false], [ADM, true], [SUP, true]] as const) {
    const p = (await w.call("GET", `/api/parties/${id}`, { as })).json.party;
    assert.equal(p.activeEditable, mong, as);
  }
  // Hồ sơ gắn tài khoản: đổi ở màn Quản lý tài khoản, kể cả Quản trị → false.
  assert.equal((await w.call("GET", `/api/parties/pty-${SALES}`, { as: ADM })).json.party.activeEditable, false);
});
