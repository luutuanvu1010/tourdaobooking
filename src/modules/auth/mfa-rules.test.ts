// Luật bước đăng nhập hai lớp + cookie chờ (ADR-0074). Thuần, không I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";
import { allowedFactors, clearedPendingCookie, createPendingToken, isInternal, loginStep, mfaBanner, PENDING_COOKIE, PENDING_TTL_SECONDS, pendingCookie, verifyPendingToken } from "./mfa-rules.ts";
import { createSessionToken, verifySessionToken } from "./session.ts";

const NOW = "2026-10-02T01:00:00.000Z";
const FUTURE = "2026-10-03T01:00:00.000Z";
const PAST = "2026-10-01T01:00:00.000Z";
const SECRET = "bi-mat-phien-thu-nghiem";

test("isInternal: có ít nhất một quyền không thuộc nhóm bên ngoài", () => {
  assert.equal(isInternal(["PARTNER"]), false);
  assert.equal(isInternal(["DRIVER_PARTNER"]), false);
  assert.equal(isInternal([]), false);
  assert.equal(isInternal(["SALES"]), true);
  assert.equal(isInternal(["HR"]), true);
  assert.equal(isInternal(["PARTNER", "SALES"]), true);
});

test("allowedFactors: Quản trị, Toàn quyền, Kế toán chỉ TOTP; còn lại TOTP + EMAIL (kể cả HR)", () => {
  for (const p of PERMISSION_CODES) {
    const want = p === "ADMIN" || p === "SUPER_ADMIN" || p === "ACCOUNTING" ? ["TOTP"] : ["TOTP", "EMAIL"];
    assert.deepEqual(allowedFactors([p]), want, p);
  }
  assert.deepEqual(allowedFactors(["SALES", "ACCOUNTING"]), ["TOTP"], "một quyền nhạy cảm kéo cả tài khoản về TOTP");
  assert.deepEqual(allowedFactors(["HR"]), ["TOTP", "EMAIL"]);
});

type In = Parameters<typeof loginStep>[0];
const base = (o: Partial<In>): In => ({ perms: ["SALES"], hasFactor: false, trusted: false, graceUntil: null, enrollUntil: null, nowIso: NOW, ...o });

test("loginStep: có yếu tố -> tin thì vào, không tin thì hỏi mã", () => {
  for (const perms of [["SALES"], ["PARTNER"]] as PermissionCode[][]) {
    assert.equal(loginStep(base({ perms, hasFactor: true, trusted: true })), "session");
    assert.equal(loginStep(base({ perms, hasFactor: true, trusted: false })), "mfa");
  }
  assert.equal(loginStep(base({ hasFactor: true, enrollUntil: FUTURE })), "mfa");
});

test("loginStep: không yếu tố, trong cửa sổ 24 giờ sau khi bị tắt -> enroll (cả bên ngoài)", () => {
  assert.equal(loginStep(base({ enrollUntil: FUTURE })), "enroll");
  assert.equal(loginStep(base({ perms: ["PARTNER"], enrollUntil: FUTURE })), "enroll");
  assert.equal(loginStep(base({ enrollUntil: FUTURE, graceUntil: FUTURE })), "enroll");
  assert.equal(loginStep(base({ enrollUntil: PAST })), "blocked_no_factor");
  assert.equal(loginStep(base({ perms: ["PARTNER"], enrollUntil: PAST })), "session");
  assert.equal(loginStep(base({ enrollUntil: NOW })), "blocked_no_factor", "đúng bằng mốc = đã hết");
});

test("loginStep: không yếu tố, bên ngoài -> vào", () => {
  assert.equal(loginStep(base({ perms: ["PARTNER"] })), "session");
  assert.equal(loginStep(base({ perms: ["DRIVER_PARTNER"], graceUntil: PAST })), "session");
});

test("loginStep: không yếu tố, nội bộ -> còn ân hạn thì vào, hết hoặc không có thì chặn", () => {
  assert.equal(loginStep(base({ graceUntil: FUTURE })), "session");
  assert.equal(loginStep(base({ graceUntil: PAST })), "blocked_no_factor");
  assert.equal(loginStep(base({ graceUntil: NOW })), "blocked_no_factor");
  assert.equal(loginStep(base({ graceUntil: null })), "blocked_no_factor");
  assert.equal(loginStep(base({ perms: ["PARTNER", "SALES"], graceUntil: null })), "blocked_no_factor");
});

test("mfaBanner: chỉ nội bộ chưa có yếu tố mới bị yêu cầu; kèm hạn ân hạn còn hiệu lực", () => {
  assert.deepEqual(mfaBanner(base({ graceUntil: FUTURE })), { required: true, graceUntil: FUTURE });
  assert.deepEqual(mfaBanner(base({ graceUntil: PAST })), { required: true, graceUntil: null });
  assert.deepEqual(mfaBanner(base({ hasFactor: true, graceUntil: FUTURE })), { required: false, graceUntil: null });
  assert.deepEqual(mfaBanner(base({ perms: ["PARTNER"], graceUntil: FUTURE })), { required: false, graceUntil: null });
});

test("token chờ: khứ hồi đúng; sai bí mật, hết 300 giây, sửa mục đích, sửa mã người -> null", async () => {
  const t0 = 1_800_000_000_000;
  const tv = await createPendingToken(SECRET, "nv-1", "verify", t0);
  assert.deepEqual(await verifyPendingToken(SECRET, tv, t0 + 1000), { staffId: "nv-1", purpose: "verify", issuedAt: t0 });
  const te = await createPendingToken(SECRET, "nv-1", "enroll", t0);
  assert.equal((await verifyPendingToken(SECRET, te, t0))?.purpose, "enroll");
  assert.equal(await verifyPendingToken("bi-mat-khac", tv, t0), null);
  assert.ok(await verifyPendingToken(SECRET, tv, t0 + PENDING_TTL_SECONDS * 1000 - 1));
  assert.equal(await verifyPendingToken(SECRET, tv, t0 + PENDING_TTL_SECONDS * 1000), null);
  assert.equal(await verifyPendingToken(SECRET, tv, t0 - 120_000), null, "phát hành trong tương lai xa");
  assert.equal(await verifyPendingToken(SECRET, tv.replace(".verify.", ".enroll."), t0), null);
  assert.equal(await verifyPendingToken(SECRET, tv.replace("nv-1", "nv-2"), t0), null);
  assert.equal(await verifyPendingToken(SECRET, "", t0), null);
  assert.equal(await verifyPendingToken(SECRET, "rac.roi.ren", t0), null);
});

test("khoá riêng: token chờ không dùng làm token phiên, token phiên không dùng làm token chờ", async () => {
  const t0 = Date.now();
  const pending = await createPendingToken(SECRET, "nv-1", "verify", t0);
  assert.equal(await verifySessionToken(SECRET, pending, t0), null);
  const session = await createSessionToken(SECRET, "nv-1", "ss-1", t0);
  assert.equal(await verifyPendingToken(SECRET, session, t0), null);
  // token chờ ký thẳng bằng SESSION_SECRET (không dẫn xuất) bị từ chối
  const payload = `mfa1.nv-1.${t0}.verify`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("base64url");
  assert.equal(await verifyPendingToken(SECRET, `${payload}.${sig}`, t0), null);
});

test("cookie chờ: tên, thuộc tính, Secure khi https", () => {
  assert.equal(PENDING_COOKIE, "td_mfa_pending");
  assert.equal(pendingCookie("abc", false), "td_mfa_pending=abc; Path=/api/auth/mfa; Max-Age=300; HttpOnly; SameSite=Lax");
  assert.equal(pendingCookie("abc", true), "td_mfa_pending=abc; Path=/api/auth/mfa; Max-Age=300; HttpOnly; SameSite=Lax; Secure");
  assert.equal(clearedPendingCookie(true), "td_mfa_pending=; Path=/api/auth/mfa; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
});
