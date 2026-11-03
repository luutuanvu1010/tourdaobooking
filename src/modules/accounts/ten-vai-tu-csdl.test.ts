// Mã định danh 5.26, Task 3b (Ruling D, 31/10): tên vai tài khoản đọc từ CSDL (pty_role_type) — đổi tên loại Có sẵn TRAVEL_AGENCY bằng
// PATCH /api/pricing/loai-doi-tac/:code thì màn Quản lý tài khoản (GET /api/staff → tenVai), nhật ký tài khoản MỚI, câu báo lỗi «Hồ sơ này đang giữ vai trò …»
// và danh sách hồ sơ khớp của Hành chính nhân sự đều hiện tên mới. Nhật ký cũ giữ nguyên chữ đã ghi (chỉ-thêm). Chạy cả ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const SUP = "33333333-3333-4333-8333-333333333333";
const HR = "77777777-7777-4777-8777-777777777777";
const MOI = "Đại lý lữ hành";
const SO_HO_SO = "0912000222";
type W = ReturnType<typeof world>;

async function nen(doiTen = true): Promise<W> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]],
    [SUP, "0900000003", "Toàn Quyền", ["ADMIN", "SUPER_ADMIN"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  if (doiTen) {
    const r = await w.call("PATCH", "/api/pricing/loai-doi-tac/TRAVEL_AGENCY", { as: KT, body: { ten: MOI, updatedAt: null } });
    assert.equal(r.status, 200, r.text);
  }
  return w;
}
const nhatKy = (w: W, action: string): string[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: { detail: string }) => r.detail);
async function hoSoGiuVaiLuHanh(w: W): Promise<string> {
  const p = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Trần Lữ Hành", contacts: [{ kind: "PHONE", value: SO_HO_SO }] } });
  assert.equal(p.status, 201, p.text);
  const id = p.json.party.id as string;
  // Vai tài khoản không gán được qua Danh bạ (role_via_account) — gieo thẳng dòng vai đang mở, như ho-so-khop-hcns.test.ts.
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)")
    .run(crypto.randomUUID(), id, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
  return id;
}

test("3b-a: GET /api/staff trả tenVai = tên hiện hành từ CSDL cho mọi mã vai tài khoản; vai chưa đổi giữ tên gốc", async () => {
  const w = await nen();
  const r = await w.call("GET", "/api/staff", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.tenVai.TRAVEL_AGENCY, MOI);
  assert.equal(r.json.tenVai.SALES_STAFF, "Nhân viên kinh doanh");
  assert.equal(r.json.tenVai.COLLABORATOR, "Cộng tác viên");
  assert.equal(r.json.tenVai.OWNER_COMPANY, undefined, "chỉ mã vai tài khoản, không vai hồ sơ khác");
});

test("3b-b: tạo tài khoản mang vai đã đổi tên ⇒ nhật ký «vai trò: Đại lý lữ hành»; đổi vai ⇒ «Đại lý lữ hành → Cộng tác viên»", async () => {
  const w = await nen();
  const c = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Đối Tác Mới", phone: "0900000050", roles: ["TRAVEL_AGENCY"], taoHoSoMoi: true } });
  assert.equal(c.status, 201, c.text);
  assert.match(nhatKy(w, "staff_created").at(-1)!, /^vai trò: Đại lý lữ hành;/);
  const p = await w.call("PUT", `/api/staff/${c.json.staff.id}/roles`, { as: SUP, body: { roles: ["COLLABORATOR"], adds: [], removes: [], reason: "" } });
  assert.equal(p.status, 200, p.text);
  assert.match(nhatKy(w, "account_roles_changed").at(-1)!, /^vai trò: Đại lý lữ hành → Cộng tác viên;/);
});

test("3b-c: hồ sơ đang giữ vai đã đổi tên, tạo tài khoản không chọn vai đó ⇒ câu báo lỗi dùng tên mới", async () => {
  const w = await nen();
  const id = await hoSoGiuVaiLuHanh(w);
  const r = await w.call("POST", "/api/staff", { as: SUP, body: { partyId: id, phone: "0900000051", roles: ["COLLABORATOR"] } });
  assert.equal(r.status, 409, r.text);
  assert.ok(r.json.error.message.includes(`Hồ sơ này đang giữ vai trò ${MOI}:`), r.json.error.message);
  assert.ok(!r.json.error.message.includes("Công ty lữ hành"));
});

test("3b-c2: Hành chính nhân sự tra hồ sơ khớp ⇒ tên vai tài khoản là tên mới", async () => {
  const w = await nen();
  await hoSoGiuVaiLuHanh(w);
  const r = await w.call("GET", `/api/staff/ho-so-khop?phone=${SO_HO_SO}`, { as: HR });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.khop.map((k: { vai: string[] }) => k.vai), [[MOI]]);
});

test("3b: CSDL mới (chưa đổi tên) ⇒ tên như ROLES; nhật ký cũ giữ nguyên chữ đã ghi sau khi đổi tên", async () => {
  const w = await nen(false);
  const r = await w.call("GET", "/api/staff", { as: ADM });
  assert.equal(r.json.tenVai.TRAVEL_AGENCY, "Công ty lữ hành");
  const c = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Đối Tác Cũ", phone: "0900000052", roles: ["TRAVEL_AGENCY"], taoHoSoMoi: true } });
  assert.equal(c.status, 201, c.text);
  const truoc = nhatKy(w, "staff_created");
  assert.equal((await w.call("PATCH", "/api/pricing/loai-doi-tac/TRAVEL_AGENCY", { as: KT, body: { ten: MOI, updatedAt: null } })).status, 200);
  assert.deepEqual(nhatKy(w, "staff_created"), truoc);
  assert.match(truoc.at(-1)!, /^vai trò: Công ty lữ hành;/);
});
