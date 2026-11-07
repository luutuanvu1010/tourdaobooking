// ADR-0180 Đ1, Đ3 — route bật / thoát "xem như vai khác" (POST|DELETE /api/auth/xem-nhu-vai). Chạy cả ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { SECRET, app, seedStaff, world } from "../../../tests/audit/harness.mjs";

const CHU = "77777777-7777-4777-8777-777777777777";
const AN = "11111111-1111-4111-8111-111111111111";
const DUONG = "/api/auth/xem-nhu-vai";

function dung() {
  const w = world();
  seedStaff(w.sqlite, { id: CHU, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: AN, phone: "0900000001", name: "An", perms: ["SALES"] });
  return w;
}
const phienMoiNhat = (w: any, staffId: string): string =>
  w.q("SELECT id FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY created_at DESC LIMIT 1", staffId)[0].id;
const vaiPhien = (w: any, id: string) => w.q("SELECT acting_role FROM aut_session WHERE id = ?", id)[0].acting_role;
const nhatKy = (w: any, action: string) => w.q("SELECT staff_id, detail, target_type, target_id FROM audit_log WHERE action = ? ORDER BY rowid", action);
const bat = (w: any, as = CHU, role: unknown = "ACCOUNTING") => w.call("POST", DUONG, { as, body: { role } });

test("Bán hàng gọi POST → 403 đúng câu, không đổi phiên, không ghi nhật ký", async () => {
  const w = dung();
  await w.token(AN);
  const r = await bat(w, AN, "ACCOUNTING");
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.message ?? r.json.message, "Chỉ người phụ trách hệ thống mới dùng được chức năng này.");
  assert.doesNotMatch(r.text, /Toàn quyền/);
  assert.equal(vaiPhien(w, phienMoiNhat(w, AN)), null);
  assert.equal(nhatKy(w, "acting_role_set").length, 0);
});

test("Bán hàng gọi DELETE → 403", async () => {
  const w = dung();
  await w.token(AN);
  assert.equal((await w.call("DELETE", DUONG, { as: AN })).status, 403);
});

test("Toàn quyền: role SUPER_ADMIN, mã lạ, thiếu role, role không phải chuỗi → 400 và phiên không đổi", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  for (const role of ["SUPER_ADMIN", "XYZ", undefined, 7, null, "IT"]) {
    const r = await w.call("POST", DUONG, { as: CHU, body: role === undefined ? {} : { role } });
    assert.equal(r.status, 400, `${String(role)} → ${r.text}`);
    assert.equal(vaiPhien(w, id), null);
  }
  assert.equal(nhatKy(w, "acting_role_set").length, 0);
});

test("Toàn quyền POST ACCOUNTING → 200, dòng phiên và GET /me cùng cho thấy vai; nhật ký đúng, không dữ liệu cá nhân", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  const r = await bat(w);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.actingRole, "ACCOUNTING");
  assert.deepEqual(r.json.staff.permissions, ["ACCOUNTING"]);
  assert.equal(r.json.staff.actingRole, "ACCOUNTING");
  assert.ok(r.json.staff.realPermissions.includes("SUPER_ADMIN"));
  assert.equal(vaiPhien(w, id), "ACCOUNTING");
  const m = await w.call("GET", "/api/auth/me", { as: CHU });
  assert.equal(m.json.actingRole, "ACCOUNTING");
  assert.deepEqual(m.json.staff.permissions, ["ACCOUNTING"]);
  const dong = nhatKy(w, "acting_role_set");
  assert.equal(dong.length, 1);
  assert.equal(dong[0].staff_id, CHU);
  assert.equal(dong[0].detail, "ACCOUNTING");
  assert.doesNotMatch(JSON.stringify(dong), /0900000007|@/);
});

test("đang đóng Bán hàng → DELETE vẫn 200 (quyền thật Toàn quyền), về quyền thật, nhật ký thoát có mã vai", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  assert.equal((await bat(w, CHU, "SALES")).status, 200);
  const r = await w.call("DELETE", DUONG, { as: CHU });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.staff.permissions, ["SUPER_ADMIN"]);
  assert.equal("actingRole" in r.json, false);
  assert.equal("actingRole" in r.json.staff, false);
  assert.equal(vaiPhien(w, id), null);
  assert.deepEqual(nhatKy(w, "acting_role_cleared").map((d: any) => d.detail), ["SALES"]);
  const m = await w.call("GET", "/api/auth/me", { as: CHU });
  assert.deepEqual(m.json.staff.permissions, ["SUPER_ADMIN"]);
});

test("đang đóng vai này vẫn đổi được sang vai khác (POST lần hai)", async () => {
  const w = dung();
  await w.token(CHU);
  await bat(w, CHU, "SALES");
  const r = await bat(w, CHU, "DRIVER_PARTNER");
  assert.equal(r.status, 200, r.text);
  assert.equal(vaiPhien(w, phienMoiNhat(w, CHU)), "DRIVER_PARTNER");
});

test("bảo trì đang bật: cả POST lẫn DELETE vẫn chạy được cho Toàn quyền (theo quyền thật)", async () => {
  const w = dung();
  await w.token(CHU);
  w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 3_600_000).toISOString()}', allowed_phones = '0900000099' WHERE id = 'default'`);
  const a = await bat(w, CHU, "SALES");
  assert.equal(a.status, 200, a.text);
  const b = await w.call("DELETE", DUONG, { as: CHU });
  assert.equal(b.status, 200, b.text);
});

test("POST / DELETE thiếu Origin cùng site bị chặn như mọi thao tác ghi; phiên không đổi", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  const p = await w.call("POST", DUONG, { as: CHU, body: { role: "SALES" }, headers: { origin: null } });
  assert.equal(p.status, 403, p.text);
  const p2 = await w.call("POST", DUONG, { as: CHU, body: { role: "SALES" }, headers: { origin: "https://evil.example" } });
  assert.equal(p2.status, 403, p2.text);
  assert.equal(vaiPhien(w, id), null);
  w.sqlite.prepare("UPDATE aut_session SET acting_role = 'SALES' WHERE id = ?").run(id);
  const d = await w.call("DELETE", DUONG, { as: CHU, headers: { origin: null } });
  assert.equal(d.status, 403, d.text);
  assert.equal(vaiPhien(w, id), "SALES");
});

test("phiên khác của cùng tài khoản (máy B) không bị ảnh hưởng khi bật rồi thoát ở máy A", async () => {
  const w = dung();
  await w.token(CHU);
  const cu = phienMoiNhat(w, CHU);
  const moi = crypto.randomUUID();
  const at = new Date(Date.now() + 1000).toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
      "VALUES (?1, ?2, 'PIN', 0, NULL, 'Máy B', NULL, NULL, ?3, ?3, ?4, NULL, NULL, NULL, ?2, ?3, NULL)",
  ).run(moi, CHU, at, new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());
  const cookieA = `td_session=${await app.createSessionToken(SECRET, CHU, cu, Date.now())}`;
  const r = await w.call("POST", DUONG, { headers: { cookie: cookieA }, body: { role: "SALES" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(vaiPhien(w, cu), "SALES");
  assert.equal(vaiPhien(w, moi), null);
  assert.equal((await w.call("DELETE", DUONG, { headers: { cookie: cookieA } })).status, 200);
  assert.equal(vaiPhien(w, cu), null);
  assert.equal(vaiPhien(w, moi), null);
});

// ---- Sửa sau lần kiểm Task 4 (ADR-0180) ----
const BINH = "22222222-2222-4222-8222-222222222222";
const dongPhien = (w: any, id: string) => JSON.stringify(w.q("SELECT * FROM aut_session WHERE id = ?", id));
const demNhatKy = (w: any) => w.q("SELECT count(*) AS n FROM audit_log")[0].n;

test("tài khoản chỉ giữ Quản trị (ADMIN) gọi POST lẫn DELETE → 403, không đổi phiên, không ghi nhật ký", async () => {
  const w = dung();
  seedStaff(w.sqlite, { id: BINH, phone: "0900000002", name: "Bình", perms: ["ADMIN"] });
  await w.token(BINH);
  const id = phienMoiNhat(w, BINH);
  const truoc = dongPhien(w, id);
  const n0 = demNhatKy(w);
  assert.equal((await bat(w, BINH, "SALES")).status, 403);
  assert.equal((await w.call("DELETE", DUONG, { as: BINH })).status, 403);
  assert.equal(dongPhien(w, id), truoc);
  assert.equal(demNhatKy(w), n0);
});

test("dòng phiên của người không giữ Toàn quyền có cột vai (dữ liệu hỏng): DELETE → 403, phiên nguyên, không thêm dòng nhật ký", async () => {
  const w = dung();
  await w.token(AN);
  const id = phienMoiNhat(w, AN);
  w.sqlite.prepare("UPDATE aut_session SET acting_role = 'SALES' WHERE id = ?").run(id);
  const truoc = dongPhien(w, id);
  const n0 = demNhatKy(w);
  assert.equal((await w.call("DELETE", DUONG, { as: AN })).status, 403);
  assert.equal(dongPhien(w, id), truoc);
  assert.equal(demNhatKy(w), n0);
});

test("đang đóng Bán hàng → DELETE ghi ĐÚNG một dòng nhật ký (dòng thoát), không thêm dòng nào khác", async () => {
  const w = dung();
  await w.token(CHU);
  assert.equal((await bat(w, CHU, "SALES")).status, 200);
  const n0 = demNhatKy(w);
  assert.equal((await w.call("DELETE", DUONG, { as: CHU })).status, 200);
  assert.equal(demNhatKy(w), n0 + 1);
  assert.equal(nhatKy(w, "acting_role_cleared").length, 1);
});

test("Toàn quyền không đóng vai gọi DELETE → 200 hồ sơ thường, không ghi nhật ký, dòng phiên nguyên", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  const truoc = dongPhien(w, id);
  const n0 = demNhatKy(w);
  const r = await w.call("DELETE", DUONG, { as: CHU });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.staff.permissions, ["SUPER_ADMIN"]);
  assert.equal("actingRole" in r.json, false);
  assert.equal(demNhatKy(w), n0);
  assert.equal(dongPhien(w, id), truoc);
});

test("POST thân rỗng hoặc không phải JSON → 400, phiên không đổi", async () => {
  const w = dung();
  const tk = await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  const exec = { waitUntil() {}, passThroughOnException() {} };
  for (const body of [undefined, "", "không phải json", "[1,2]"]) {
    const req = new Request(`https://booking.tourdao.vn${DUONG}`, {
      method: "POST", body,
      headers: { cookie: `td_session=${tk}`, origin: "https://booking.tourdao.vn", "content-type": "application/json" },
    });
    const res = await app.default.fetch(req, w.env, exec);
    assert.equal(res.status, 400, `${String(body)} → ${await res.text()}`);
  }
  assert.equal(vaiPhien(w, id), null);
  assert.equal(nhatKy(w, "acting_role_set").length, 0);
});
