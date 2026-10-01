// E2E chính sách đăng nhập (ADR-0085; đặc tả §11 AC2–AC10). Đổi chính sách TOÀN HỆ THỐNG của D1 tạm ⇒ khôi phục trong `finally` (đặc tả §6 quy tắc 10);
// tài khoản thử dùng một lần (không đụng salesA/salesB dùng chung). Cookie lấy TƯỜNG MINH từ đăng nhập (không dựa helper tạo lại phiên).
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, randomPhone, session, sql, sqlRows } from "./lib.mjs";
import { insertStaffSql } from "../../scripts/staff-lib.mjs";

/** Tài khoản thử dùng một lần — gieo thẳng vào D1 tạm, KHÔNG đăng nhập (gieoTaiKhoanLai của lib đăng nhập một lần, làm lệch số phiên của các ca dưới). */
async function taoTaiKhoanThu(name, permissions) {
  const phone = randomPhone();
  const pin = String(100000 + Math.floor(Math.random() * 900000));
  await sql((await insertStaffSql({ name, phone, pin, permissions })).replace(/\n/g, " "));
  const [row] = await sqlRows(`SELECT id FROM staff WHERE phone = '${phone}'`);
  return { id: row.id, phone, pin };
}

const SA = await session(ACCOUNTS.superAdmin);
const ADM = await session(ACCOUNTS.admin);
const HR = await session(ACCOUNTS.hr);
const ban = async () => (await call(SA, "GET", "/api/sessions/policy")).body.rows;
const banCua = (rows, c) => rows.find((r) => r.permissionCode === c).banId;
const luu = (thayDoi) => call(SA, "PUT", "/api/sessions/policy", { thayDoi });
async function dangNhapMay(tk, ua) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, "user-agent": ua, "cf-connecting-ip": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({ phone: tk.phone, pin: tk.pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
  });
  assert.equal(r.status, 200, `đăng nhập ${r.status}`);
  return r.headers.get("set-cookie").split(";")[0];
}
const ban0 = await ban(); // chính sách lúc vào kịch bản — khôi phục về đúng giá trị này
try {
  // 1. AC5: Quản trị, Nhân sự → 403
  for (const c of [ADM, HR]) {
    assert.equal((await call(c, "GET", "/api/sessions/policy")).status, 403);
    assert.equal((await call(c, "PUT", "/api/sessions/policy", { thayDoi: [{ permissionCode: "SALES", multi: true, banDangXem: null }] })).status, 403);
  }
  // 2. AC6: SUPER_ADMIN, mã lạ → 400
  assert.equal((await luu([{ permissionCode: "SUPER_ADMIN", multi: false, banDangXem: null }])).status, 400);
  assert.equal((await luu([{ permissionCode: "BOSS", multi: true, banDangXem: null }])).status, 400);
  console.log("✓ 403 Quản trị/Nhân sự; 400 SUPER_ADMIN/mã lạ");

  // 3. AC2: Bán hàng = Nhiều máy → hai máy cùng sống
  const X = await taoTaiKhoanThu("Bán hàng thử chính sách", ["SALES"]);
  let r = await luu([{ permissionCode: "SALES", multi: true, banDangXem: banCua(await ban(), "SALES") }]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const m1 = await dangNhapMay(X, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1");
  const m2 = await dangNhapMay(X, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36");
  assert.equal((await call(m1, "GET", "/api/auth/me")).status, 200, "máy 1 vẫn dùng được");
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200);
  // Đăng ký thông báo hai máy (gắn phiên)
  const ep1 = `https://fcm.googleapis.com/fcm/send/e2e-cs-1-${Date.now()}`;
  const ep2 = `https://fcm.googleapis.com/fcm/send/e2e-cs-2-${Date.now()}`;
  assert.equal((await call(m1, "POST", "/api/account/thong-bao/may", { endpoint: ep1, thietBi: "Máy 1" })).status, 200);
  assert.equal((await call(m2, "POST", "/api/account/thong-bao/may", { endpoint: ep2, thietBi: "Máy 2" })).status, 200);
  console.log("✓ AC2: Bán hàng Nhiều máy — hai máy cùng sống");

  // 4. AC3: đặt lại Một máy — xem trước đúng số, sau lưu máy cũ 401 + lý do, thông báo máy cũ tắt (mat-mien), máy còn lại bật
  r = await call(SA, "GET", "/api/sessions/policy/preview?nhieuMay=");
  assert.deepEqual(r.body, { soPhien: 1, soNguoi: 1 });
  r = await luu([{ permissionCode: "SALES", multi: false, banDangXem: banCua(await ban(), "SALES") }]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.soPhien, 1);
  assert.equal((await call(m1, "GET", "/api/auth/me")).status, 401);
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200);
  assert.equal((await call(m1, "POST", "/api/auth/session-ended")).body.reason, "Không còn quyền dùng nhiều máy");
  await new Promise((ok) => setTimeout(ok, 500));
  const [d1] = await sqlRows(`SELECT revoked_at, revoke_reason FROM ntf_push_sub WHERE endpoint = '${ep1}'`);
  const [d2] = await sqlRows(`SELECT revoked_at FROM ntf_push_sub WHERE endpoint = '${ep2}'`);
  assert.equal(d1.revoke_reason, "mat-mien");
  assert.equal(d2.revoked_at, null, "máy giữ lại vẫn nhận thông báo");
  console.log("✓ AC3: siết — máy cũ 401 'Không còn quyền dùng nhiều máy', thông báo máy cũ tắt, máy giữ lại còn bật");

  // 5. AC7: hai lần lưu cùng bản → 200 + 409. Đua từ bản KHÁC null (SALES đã có dòng hiện hành từ bước 4) để chứng minh trên D1 thật đường "đóng dòng cũ rồi chèn" (changes() → NOT NULL).
  const b = banCua(await ban(), "SALES");
  assert.notEqual(b, null, "SALES phải có bản hiện hành để đua từ banId khác null");
  const [p, q] = await Promise.all([luu([{ permissionCode: "SALES", multi: true, banDangXem: b }]), luu([{ permissionCode: "SALES", multi: true, banDangXem: b }])]);
  assert.deepEqual([p.status, q.status].sort(), [200, 409]);
  assert.equal((await luu([{ permissionCode: "SALES", multi: false, banDangXem: banCua(await ban(), "SALES") }])).status, 200); // trả Bán hàng về Một máy cho các bước sau (AC9 cần Bán hàng = Một máy)
  console.log("✓ AC7: hai lần lưu đè nhau → 200 + 409");

  // 6. AC4: Bán hàng + Kế toán, chỉ Kế toán Nhiều máy → nhiều máy
  const Y = await taoTaiKhoanThu("Bán hàng kế toán thử", ["SALES", "ACCOUNTING"]);
  assert.equal((await luu([{ permissionCode: "ACCOUNTING", multi: true, banDangXem: banCua(await ban(), "ACCOUNTING") }])).status, 200);
  const y1 = await dangNhapMay(Y, "iPhone A");
  const y2 = await dangNhapMay(Y, "Windows B");
  assert.equal((await call(y1, "GET", "/api/auth/me")).status, 200);
  assert.equal((await call(y2, "GET", "/api/auth/me")).status, 200);
  console.log("✓ AC4: một quyền Nhiều máy là đủ");

  // 7. AC9: Quản trị đổi vai Z (Kế toán → Nhân viên kinh doanh) → máy thừa đăng xuất ngay
  const Z = await taoTaiKhoanThu("Kế toán thử đổi vai", ["ACCOUNTING"]);
  const z1 = await dangNhapMay(Z, "iPhone Z");
  const z2 = await dangNhapMay(Z, "Windows Z");
  r = await call(ADM, "PUT", `/api/staff/${Z.id}/roles`, { roles: ["SALES_STAFF"] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(z1, "GET", "/api/auth/me")).status, 401);
  assert.equal((await call(z2, "GET", "/api/auth/me")).status, 200);
  console.log("✓ AC9: Quản trị đổi vai → máy thừa đăng xuất ngay");

  // 8. AC10 / Review Focus 4: 1000 tài khoản Đối tác giả (hồ sơ đầy đủ — audit-invariants --strict), mỗi người 2 phiên sống → Đối tác về Một máy: một lô, đo giờ
  assert.equal((await luu([{ permissionCode: "PARTNER", multi: true, banDangXem: banCua(await ban(), "PARTNER") }])).status, 200);
  const at = new Date().toISOString();
  const at2 = new Date(Date.now() + 1000).toISOString(); // phiên thứ hai MỚI HƠN phiên thứ nhất (được giữ khi siết)
  const het = new Date(Date.now() + 86400_000).toISOString();
  const N = "WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)";
  await sql([
    `INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) ${N} SELECT 'pty-cs1000-' || i, 'PERSON', 'Thử ' || i, 1, '${at}', '${at}' FROM n;`,
    `INSERT INTO pty_person (party_id, given_name, created_at, updated_at) ${N} SELECT 'pty-cs1000-' || i, 'Thử ' || i, '${at}', '${at}' FROM n;`,
    `INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) ${N} SELECT 'ptr-cs1000-' || i, 'pty-cs1000-' || i, 'COLLABORATOR', '2026-01-01', '${at}', '${at}' FROM n;`,
    `INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) ${N} SELECT 'stf-cs1000-' || i, '', '0880' || substr('000000' || i, -6), 'x', 'sales', 1, '${at}', 'pty-cs1000-' || i FROM n;`,
    `INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) ${N} SELECT 'sp-cs1000-' || i, 'stf-cs1000-' || i, 'PARTNER', '${at}', '${at}', '${at}' FROM n;`,
    `INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) ${N} SELECT 'ss-cs1000-a-' || i, 'stf-cs1000-' || i, 'PIN', 0, NULL, 'Máy', NULL, NULL, '${at}', '${at}', '${het}', NULL, NULL, NULL, 'stf-cs1000-' || i, '${at}', NULL FROM n;`,
    `INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) ${N} SELECT 'ss-cs1000-b-' || i, 'stf-cs1000-' || i, 'PIN', 0, NULL, 'Máy', NULL, NULL, '${at2}', '${at2}', '${het}', NULL, NULL, NULL, 'stf-cs1000-' || i, '${at2}', NULL FROM n;`,
  ].join(" "));
  const t0 = Date.now();
  r = await luu([{ permissionCode: "PARTNER", multi: false, banDangXem: banCua(await ban(), "PARTNER") }]);
  const ms = Date.now() - t0;
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.soNguoi >= 1000, true);
  const [con] = await sqlRows("SELECT count(*) AS n FROM (SELECT staff_id FROM aut_session WHERE staff_id LIKE 'stf-cs1000-%' AND ended_at IS NULL GROUP BY staff_id HAVING count(*) > 1)");
  assert.equal(con.n, 0, "mỗi tài khoản còn đúng một phiên");
  console.log(`✓ AC10: siết 1000 tài khoản Đối tác — một lô, ${ms} ms, ${r.body.soPhien} máy / ${r.body.soNguoi} người`);
} finally {
  // Khôi phục chính sách lúc vào kịch bản: đọc bản HIỆN TẠI (lấy banId mới) rồi đặt lại từng quyền khác ban0.
  const hien = await ban();
  const thayDoi = hien.filter((h) => h.multi !== ban0.find((b) => b.permissionCode === h.permissionCode).multi)
    .map((h) => ({ permissionCode: h.permissionCode, multi: ban0.find((b) => b.permissionCode === h.permissionCode).multi, banDangXem: h.banId }));
  if (thayDoi.length) {
    const k = await luu(thayDoi);
    assert.equal(k.status, 200, `khôi phục chính sách: ${JSON.stringify(k.body)}`);
  }
  console.log("✓ đã khôi phục chính sách");
}
