// ADR-0075 điều 3 (Task 8): tài khoản MẤT miễn luật một máy (bỏ Toàn quyền qua PUT /api/staff/:id/permissions, bỏ vai IT qua PUT /api/staff/:id/roles)
// → chỉ còn phiên còn sống mới nhất (single = 1), các phiên khác 'mat_mien' trong CÙNG lô ghi quyền/vai; máy bị kết thúc mất Bảng tin + thông báo (điều 6).
// ĐƯỢC miễn → phiên còn sống thôi chịu chỉ mục một máy (single = 0). Chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const SUP2 = "55555555-5555-4555-8555-555555555555";

function setup() {
  const goi: any[] = [];
  const w = world({ ghiDe: { dongBangTin: async (_env: unknown, muc: unknown) => { goi.push(muc); } } });
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: SUP2, phone: "0900000005", name: "IT Hai", perms: ["SUPER_ADMIN"] });
  return { w, goi };
}
const maPhien = (token: string) => token.split(".")[2]!;
const callWith = (w: any, token: string, method: string, path: string) => w.call(method, path, { headers: { cookie: `td_session=${token}` } });
/** Một máy KHÁC của tài khoản (dòng phiên chèn thẳng, mới hơn phiên của token). */
function mayKhac(w: any, id: string, staff: string, single: 0 | 1, createdAt = new Date().toISOString()) {
  w.sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
      "VALUES (?1, ?2, 'PIN', ?3, NULL, 'Máy Mac · Chrome', NULL, NULL, ?4, ?4, ?5, NULL, NULL, NULL, ?2, ?4, NULL)",
  ).run(id, staff, single, createdAt, new Date(Date.now() + 86400_000).toISOString());
}
/** Lùi giờ cấp của phiên token về 1 giờ trước (để phiên chèn sau là "mới nhất"). */
const lui = (w: any, sid: string) => {
  const t = new Date(Date.now() - 3600_000).toISOString();
  w.sqlite.prepare("UPDATE aut_session SET created_at = ?2, last_seen_at = ?2 WHERE id = ?1").run(sid, t);
};
const song = (w: any, staff: string) => w.q("SELECT id, single FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY id", staff).map((r: any) => ({ ...r }));

test("ADR-0075 điều 3: Toàn quyền bỏ quyền Toàn quyền của tài khoản đang mở 2 máy → còn ĐÚNG phiên mới nhất (single=1); máy cũ 'mat_mien' + 401; Bảng tin đóng đúng máy cũ", async () => {
  const { w, goi } = setup();
  const tk = await w.token(SUP2);
  const cu = maPhien(tk);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", cu)[0].single, 0, "Toàn quyền: phiên nhiều máy");
  lui(w, cu);
  mayKhac(w, "may-moi", SUP2, 0);
  const r = await w.call("PUT", `/api/staff/${SUP2}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(song(w, SUP2), [{ id: "may-moi", single: 1 }]);
  const d = w.q("SELECT end_reason, ended_by, updated_by, ended_at FROM aut_session WHERE id = ?", cu)[0];
  assert.deepEqual({ ...d, ended_at: typeof d.ended_at }, { end_reason: "mat_mien", ended_by: SUP, updated_by: SUP, ended_at: "string" });
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 401, "máy cũ bị đăng xuất");
  assert.ok(goi.some((g) => JSON.stringify(g) === JSON.stringify({ staffId: SUP2, sessionIds: [cu], giuPhien: "may-moi" })), JSON.stringify(goi));
});

test("ADR-0075 điều 3: tài khoản thường được cấp Toàn quyền → phiên còn sống single=0; đổi quyền không làm đổi miễn → không đụng phiên, không gọi Bảng tin theo phiên", async () => {
  const { w, goi } = setup();
  const tk = await w.token(SALES);
  assert.equal(w.q("SELECT single FROM aut_session WHERE id = ?", maPhien(tk))[0].single, 1);
  const r = await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: SUP, body: { permissions: ["SALES", "SUPER_ADMIN"] } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(song(w, SALES), [{ id: maPhien(tk), single: 0 }]);
  await w.token(ADM);
  const truoc = w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", ADM);
  assert.equal(truoc.length, 1);
  const r2 = await w.call("PUT", `/api/staff/${ADM}/permissions`, { as: SUP, body: { permissions: ["ADMIN", "SALES"] } });
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(w.q("SELECT id, single, updated_at FROM aut_session WHERE staff_id = ?", ADM), truoc);
  assert.ok(!goi.some((g) => "sessionIds" in g), "không lời gọi theo phiên khi không ai bị kết thúc");
});

test("ADR-0075 điều 3: gán vai IT → nhiều máy; bỏ vai IT (gỡ ADMIN — đường câu chốt) → còn phiên mới nhất, máy cũ 401", async () => {
  const { w, goi } = setup();
  const tk = await w.token(SALES);
  const cu = maPhien(tk);
  const len = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["IT"] } });
  assert.equal(len.status, 200, len.text);
  assert.deepEqual(song(w, SALES), [{ id: cu, single: 0 }], "được miễn → single=0");
  lui(w, cu);
  mayKhac(w, "may-moi", SALES, 0);
  const xuong = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["SALES_STAFF"] } });
  assert.equal(xuong.status, 200, xuong.text);
  assert.deepEqual(song(w, SALES), [{ id: "may-moi", single: 1 }]);
  assert.equal(w.q("SELECT end_reason FROM aut_session WHERE id = ?", cu)[0].end_reason, "mat_mien");
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 401);
  assert.ok(goi.some((g) => JSON.stringify(g) === JSON.stringify({ staffId: SALES, sessionIds: [cu], giuPhien: "may-moi" })), JSON.stringify(goi));
});

test("ADR-0075 điều 3: bỏ Toàn quyền bị từ chối (quản trị viên cuối cùng, 409) → không phiên nào đổi", async () => {
  const { w } = setup();
  // SUP2 giữ ADMIN + Toàn quyền; ngưng ADM để SUP2 là quản trị viên hoạt động duy nhất.
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('sup2-admin', '${SUP2}', 'ADMIN', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`);
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${ADM}'`);
  const tk = await w.token(SUP2);
  mayKhac(w, "may-hai", SUP2, 0);
  const truoc = w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", SUP2);
  const r = await w.call("PUT", `/api/staff/${SUP2}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(w.q("SELECT id, single, ended_at, updated_at FROM aut_session WHERE staff_id = ? ORDER BY id", SUP2), truoc);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
});
