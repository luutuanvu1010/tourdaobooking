// ADR-0180 Đ1, Đ3 — phiên mang vai đang đóng (`aut_session.acting_role`); `currentStaff` tính bộ quyền hiệu lực ở MỘT chỗ. Chạy cả ứng dụng trên SQLite thật
// (tests/audit/harness.mjs); quan sát bằng `GET /api/auth/me` (trả nguyên `staff` do `currentStaff` dựng).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { SECRET, app, seedStaff, world } from "../../../tests/audit/harness.mjs";
import { setActingRoleStatement } from "./repository.ts";

const CHU = "77777777-7777-4777-8777-777777777777";
const AN = "11111111-1111-4111-8111-111111111111";

function dung() {
  const w = world();
  seedStaff(w.sqlite, { id: CHU, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: AN, phone: "0900000001", name: "An", perms: ["SALES"] });
  return w;
}
const phienMoiNhat = (w: any, staffId: string): string =>
  w.q("SELECT id FROM aut_session WHERE staff_id = ? AND ended_at IS NULL ORDER BY created_at DESC LIMIT 1", staffId)[0].id;
const datVai = (w: any, sessionId: string, role: string | null) => w.sqlite.prepare("UPDATE aut_session SET acting_role = ? WHERE id = ?").run(role, sessionId);
const datLastSeen = (w: any, sessionId: string, iso: string) => w.sqlite.prepare("UPDATE aut_session SET last_seen_at = ? WHERE id = ?").run(iso, sessionId);
const me = (w: any, as: string) => w.call("GET", "/api/auth/me", { as });

test("(a) phiên đang đóng vai Kế toán, còn hạn → quyền hiệu lực chỉ còn ACCOUNTING; quyền thật vẫn mang theo", async () => {
  const w = dung();
  await w.token(CHU);
  datVai(w, phienMoiNhat(w, CHU), "ACCOUNTING");
  const r = await me(w, CHU);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.staff.permissions, ["ACCOUNTING"]);
  assert.equal(r.json.staff.actingRole, "ACCOUNTING");
  assert.ok(r.json.staff.realPermissions.includes("SUPER_ADMIN"));
});

test("không đóng vai → không có actingRole / realPermissions (giữ nguyên hình dạng cũ của staff)", async () => {
  const w = dung();
  const r = await me(w, CHU);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.staff.permissions, ["SUPER_ADMIN"]);
  assert.equal("actingRole" in r.json.staff, false);
  assert.equal("realPermissions" in r.json.staff, false);
});

test("(b) quá 60 phút không thao tác → về quyền thật; cột vai được xoá nên lần gọi sau (last_seen_at đã mới) KHÔNG sống lại vai", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  datVai(w, id, "ACCOUNTING");
  datLastSeen(w, id, new Date(Date.now() - 61 * 60 * 1000).toISOString());
  const r1 = await me(w, CHU);
  assert.equal(r1.status, 200, r1.text);
  assert.deepEqual(r1.json.staff.permissions, ["SUPER_ADMIN"]);
  assert.equal("actingRole" in r1.json.staff, false);
  await w.choNen();
  assert.equal(w.q("SELECT acting_role FROM aut_session WHERE id = ?", id)[0].acting_role, null, "hết hạn thì cột vai phải về NULL");
  const r2 = await me(w, CHU);
  assert.deepEqual(r2.json.staff.permissions, ["SUPER_ADMIN"], "lần gọi kế tiếp không được sống lại vai đã hết hạn");
});

test("(b') 59 phút không thao tác → vẫn đang đóng vai", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  datVai(w, id, "SALES");
  datLastSeen(w, id, new Date(Date.now() - 59 * 60 * 1000).toISOString());
  const r = await me(w, CHU);
  assert.deepEqual(r.json.staff.permissions, ["SALES"]);
  await w.choNen();
  assert.equal(w.q("SELECT acting_role FROM aut_session WHERE id = ?", id)[0].acting_role, "SALES");
});

test("(c) đóng vai ở một phiên không ảnh hưởng phiên khác của cùng tài khoản", async () => {
  const w = dung();
  await w.token(CHU);
  const cu = phienMoiNhat(w, CHU);
  // Phiên thứ hai (máy khác), chèn như lô đăng nhập; single = 0 để chỉ mục một-phiên-một-máy không vỡ.
  const moi = crypto.randomUUID();
  const at = new Date(Date.now() + 1000).toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
      "VALUES (?1, ?2, 'PIN', 0, NULL, 'Máy B', NULL, NULL, ?3, ?3, ?4, NULL, NULL, NULL, ?2, ?3, NULL)",
  ).run(moi, CHU, at, new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());
  datVai(w, cu, "ACCOUNTING");
  const tokCu = await app.createSessionToken(SECRET, CHU, cu, Date.now());
  const tokMoi = await app.createSessionToken(SECRET, CHU, moi, Date.now());
  const goi = (tok: string) => w.call("GET", "/api/auth/me", { headers: { cookie: `td_session=${tok}` } });
  const rCu = await goi(tokCu);
  const rMoi = await goi(tokMoi);
  assert.deepEqual(rCu.json.staff.permissions, ["ACCOUNTING"]);
  assert.deepEqual(rMoi.json.staff.permissions, ["SUPER_ADMIN"]);
  assert.equal("actingRole" in rMoi.json.staff, false);
});

test("(d) tài khoản KHÔNG giữ SUPER_ADMIN mà dòng phiên có acting_role (dữ liệu hỏng) → bỏ qua cột, trả quyền thật", async () => {
  const w = dung();
  await w.token(AN);
  datVai(w, phienMoiNhat(w, AN), "ACCOUNTING");
  const r = await me(w, AN);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.staff.permissions, ["SALES"]);
  assert.equal("actingRole" in r.json.staff, false);
  assert.equal("realPermissions" in r.json.staff, false);
});

test("(e) bảo trì bật + Toàn quyền đang đóng vai Bán hàng → vẫn qua cổng bảo trì (xét quyền THẬT); Bán hàng thật thì bị chặn", async () => {
  const w = dung();
  await w.token(CHU);
  await w.token(AN);
  datVai(w, phienMoiNhat(w, CHU), "SALES");
  w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 3600_000).toISOString()}' WHERE id = 'default'`);
  const r = await me(w, CHU);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.staff.permissions, ["SALES"]);
  const rAn = await me(w, AN);
  assert.equal(rAn.status, 503, rAn.text);
});

test("setActingRoleStatement: đặt vai và gỡ vai chỉ trên phiên còn sống; đặt vai làm mới updated_at và last_seen_at", async () => {
  const w = dung();
  await w.token(CHU);
  const id = phienMoiNhat(w, CHU);
  datLastSeen(w, id, "2026-01-01T00:00:00.000Z");
  const now = new Date().toISOString();
  const r1 = await setActingRoleStatement(w.env.DB, id, "HR", now).run();
  assert.equal(r1.meta.changes, 1);
  const dong = w.q("SELECT acting_role, updated_at, last_seen_at FROM aut_session WHERE id = ?", id)[0];
  assert.deepEqual({ ...dong }, { acting_role: "HR", updated_at: now, last_seen_at: now });
  const r2 = await setActingRoleStatement(w.env.DB, id, null, now).run();
  assert.equal(r2.meta.changes, 1);
  assert.equal(w.q("SELECT acting_role FROM aut_session WHERE id = ?", id)[0].acting_role, null);
  // Phiên đã kết thúc: không đổi gì.
  w.sqlite.prepare("UPDATE aut_session SET ended_at = ?, end_reason = 'dang_xuat' WHERE id = ?").run(now, id);
  const r3 = await setActingRoleStatement(w.env.DB, id, "HR", now).run();
  assert.equal(r3.meta.changes, 0);
  assert.equal(w.q("SELECT acting_role FROM aut_session WHERE id = ?", id)[0].acting_role, null);
});
