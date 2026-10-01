// ADR-0084 Đ1: ô giới tính của hồ sơ người đi CÙNG đường với ô tên (PUT /api/parties/:id, POST /api/parties), CÙNG cổng quyền; nhật ký chỉ ghi "đổi giới tính"
// (không giá trị); giá trị lạ ⇒ 400 lời thường, không ghi. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  return w;
}
const pty = (id: string) => `pty-${id}`;
const gioiTinh = (w: any, partyId: string) => w.q("SELECT gender FROM pty_person WHERE party_id = ?", partyId)[0].gender;
const nhatKy = (w: any, partyId: string) => w.q("SELECT detail FROM audit_log WHERE target_id = ? AND action = 'party_updated' ORDER BY rowid", partyId).map((r: any) => r.detail);
async function sua(w: any, as: string, partyId: string, them: Record<string, unknown>) {
  const cur = w.q("SELECT updated_at u, active a, display_name n FROM pty_party WHERE id = ?", partyId)[0];
  return w.call("PUT", `/api/parties/${partyId}`, { as, body: { fullName: cur.n, active: cur.a === 1, expectedUpdatedAt: cur.u, ...them } });
}

test("PUT: đặt NU → lưu, DTO trả gender; nhật ký 'đổi giới tính' KHÔNG kèm giá trị; vắng ô ⇒ giữ nguyên, không ghi 'đổi giới tính'; '' ⇒ xoá", async () => {
  const w = setup();
  let r = await sua(w, ADM, pty(SALES), { gender: "NU" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.party.gender, "NU");
  assert.equal(gioiTinh(w, pty(SALES)), "NU");
  r = await sua(w, ADM, pty(SALES), {});
  assert.equal(r.status, 200, r.text);
  assert.equal(gioiTinh(w, pty(SALES)), "NU", "vắng ô ⇒ giữ nguyên");
  r = await sua(w, ADM, pty(SALES), { gender: "NU" });
  assert.equal(r.status, 200);
  r = await sua(w, ADM, pty(SALES), { gender: "" });
  assert.equal(r.status, 200);
  assert.equal(gioiTinh(w, pty(SALES)), null);
  assert.equal(r.json.party.gender, null);
  const nk = nhatKy(w, pty(SALES));
  assert.deepEqual(nk, ["cá nhân — đổi giới tính", "cá nhân", "cá nhân", "cá nhân — đổi giới tính"]);
  for (const d of nk) assert.doesNotMatch(d, /\bNAM\b|\bNU\b|\bNam\b|Nữ/, "nhật ký không ghi giá trị giới tính");
  assert.equal((await w.call("GET", `/api/parties/${pty(SALES)}`, { as: ADM })).json.party.gender, null);
});

test("PUT: giá trị lạ ⇒ 400 lời thường, không ghi, không nhật ký", async () => {
  const w = setup();
  for (const bad of ["nam", "Nữ", "KHAC", 1]) {
    const r = await sua(w, ADM, pty(SALES), { gender: bad });
    assert.equal(r.status, 400, String(bad));
    assert.equal(r.json.error.message, "Giới tính chỉ nhận Nam, Nữ hoặc để trống.");
  }
  assert.equal(gioiTinh(w, pty(SALES)), null);
  assert.deepEqual(nhatKy(w, pty(SALES)), []);
});

test("CÙNG cổng quyền với ô tên: Bán hàng không đổi được giới tính hồ sơ có tài khoản của người khác (403, không ghi)", async () => {
  const w = setup();
  const r = await sua(w, SALES2, pty(SALES), { gender: "NAM" });
  assert.equal(r.status, 403);
  assert.equal(gioiTinh(w, pty(SALES)), null);
});

test("POST: tạo hồ sơ người kèm giới tính; tổ chức gửi giới tính ⇒ 400", async () => {
  const w = setup();
  let r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Trần Thị Mai", gender: "NU", contacts: [] } });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.party.gender, "NU");
  assert.equal(gioiTinh(w, r.json.party.id), "NU");
  r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Lê Văn Tư", contacts: [] } });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.party.gender, null);
  r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Lê Văn Năm", gender: "X", contacts: [] } });
  assert.equal(r.status, 400);
  r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "ORGANIZATION", displayName: "Đại lý A", gender: "NAM", contacts: [] } });
  assert.equal(r.status, 400);
});
