// ADR-0068 Đ9, đặc tả C2 (+ C1 route đọc — [Dừng Q4]): POST /api/staff không kèm hồ sơ có sẵn mà có hồ sơ cá nhân đang dùng khớp SĐT liên hệ hoặc tên chuẩn hoá
// → 409 party_match_exists kèm danh sách (id, tên, lý do, vai, có tài khoản) — KHÔNG SĐT của hồ sơ khác; có cờ taoHoSoMoi → tạo như cũ; không khớp → tạo như cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "44444444-4444-4444-8444-444444444444";
const SO = "0912000111";
async function nen() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  // ADR-0071: chỉ Hành chính nhân sự / Toàn quyền tạo tài khoản — người tạo trong các bài dưới là Toàn quyền.
  seedStaff(w.sqlite, { id: SUP, phone: "0900000004", name: "Toàn Quyền", perms: ["ADMIN", "SUPER_ADMIN"] });
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Nguyễn Phú Hải", contacts: [{ kind: "PHONE", value: SO }] } });
  const P = r.json.party.id as string;
  assert.equal((await w.call("POST", `/api/parties/${P}/roles`, { as: ADM, body: { roleTypeCode: "BOAT_CAPTAIN" } })).status, 201);
  return { w, P };
}
const tao = (w: any, body: Record<string, unknown>) => w.call("POST", "/api/staff", { as: SUP, body: { roles: ["SALES_STAFF"], ...body } });

test("C2: tên khớp (chữ thường, khoảng trắng thừa) → 409 kèm danh sách; không SĐT của hồ sơ khác; không tạo gì", async () => {
  const { w, P } = await nen();
  const truoc = w.q("SELECT count(*) n FROM staff")[0].n;
  const r = await tao(w, { fullName: "  nguyễn   phú HẢI ", phone: "0900000050" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "party_match_exists");
  assert.deepEqual(r.json.error.khop, [{ id: P, displayName: "Nguyễn Phú Hải", lyDo: ["NAME"], vai: ["Lái cano"], coTaiKhoan: false }]);
  assert.ok(!r.text.includes(SO), "không lộ SĐT của hồ sơ khác");
  assert.equal(w.q("SELECT count(*) n FROM staff")[0].n, truoc);
});

test("C2: SĐT đăng nhập trùng SĐT liên hệ của hồ sơ có sẵn → lý do PHONE", async () => {
  const { w, P } = await nen();
  const r = await tao(w, { fullName: "Tên Khác Hẳn", phone: SO });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error.khop.map((k: any) => [k.id, k.lyDo]), [[P, ["PHONE"]]]);
});

test("C2: có cờ taoHoSoMoi → tạo như cũ (hồ sơ MỚI); không khớp → tạo như cũ, không cần cờ; kèm partyId → không xét khớp", async () => {
  const { w, P } = await nen();
  const moi = await tao(w, { fullName: "Nguyễn Phú Hải", phone: "0900000050", taoHoSoMoi: true });
  assert.equal(moi.status, 201, moi.text);
  assert.notEqual(moi.json.staff.partyId, P);
  assert.equal((await tao(w, { fullName: "Hoàn Toàn Mới", phone: "0900000051" })).status, 201);
  const coSan = await tao(w, { partyId: P, phone: "0900000052", roles: ["SALES_STAFF"] });
  assert.equal(coSan.status, 201, coSan.text);
  assert.equal(coSan.json.staff.partyId, P);
});

test("C2 đường cũ (danh sách quyền): cũng chặn khi khớp, cũng nhận cờ", async () => {
  const { w } = await nen();
  const r = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Nguyễn Phú Hải", phone: "0900000053", permissions: ["SALES"] } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "party_match_exists");
  assert.equal((await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Nguyễn Phú Hải", phone: "0900000053", permissions: ["SALES"], taoHoSoMoi: true } })).status, 201);
});

test("C1 [Dừng Q4]: GET /api/staff/ho-so-khop trả ĐÚNG danh sách của 409; Bán hàng → 403; thiếu cả hai tham số → rỗng", async () => {
  const { w, P } = await nen();
  const r = await w.call("GET", `/api/staff/ho-so-khop?phone=${SO}&ten=${encodeURIComponent("Nguyễn Phú Hải")}`, { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.khop.map((k: any) => [k.id, k.lyDo]), [[P, ["PHONE", "NAME"]]]);
  // F20: route đọc trả ĐÚNG danh sách của 409 (cùng tham số) — một luật, không hai.
  const post = await tao(w, { fullName: "Nguyễn Phú Hải", phone: SO });
  assert.equal(post.status, 409, post.text);
  assert.deepEqual(r.json.khop, post.json.error.khop);
  assert.equal((await w.call("GET", `/api/staff/ho-so-khop?phone=${SO}`, { as: SALES })).status, 403);
  assert.equal((await w.call("GET", `/api/staff/ho-so-khop?phone=${SO}`, { as: ADM })).status, 403, "ADR-0071: Quản trị không tạo tài khoản ⇒ không hỏi hồ sơ khớp");
  assert.deepEqual((await w.call("GET", "/api/staff/ho-so-khop", { as: SUP })).json, { khop: [] });
});
