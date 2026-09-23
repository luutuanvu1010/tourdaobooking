import { test } from "node:test";
import assert from "node:assert/strict";
import { CHALLENGE_TTL_SECONDS, challengeCookie, clearedChallengeCookie, issueChallenge, readChallenge } from "./challenge.ts";
import { createSessionToken, verifySessionToken } from "./session.ts";

const SECRET = "s".repeat(48);
const STAFF = "3f0c9a52-7a51-4c1b-9f8e-2d6b1e0a9c11";
const NOW = 1_790_000_000_000;

test("đọc lại đúng thách thức, giờ phát hành và phần phụ", async () => {
  const c = await issueChallenge(SECRET, "register", STAFF, "u".repeat(22), NOW);
  const r = await readChallenge(SECRET, c.token, "register", STAFF, NOW + 1000);
  assert.deepEqual(r, { challenge: c.challenge, issuedAt: NOW, extra: "u".repeat(22) });
  assert.equal(c.challenge.length, 43); // 32 byte base64url, không '='
});

test("sai mục đích, sai người, hết hạn, giờ tương lai, chữ ký sửa, khác bí mật, token rỗng → null", async () => {
  const c = await issueChallenge(SECRET, "login", null, null, NOW);
  assert.equal(await readChallenge(SECRET, c.token, "pin", null, NOW), null);
  assert.equal(await readChallenge(SECRET, c.token, "login", STAFF, NOW), null);
  assert.equal(await readChallenge(SECRET, c.token, "login", null, NOW + CHALLENGE_TTL_SECONDS * 1000), null);
  assert.ok(await readChallenge(SECRET, c.token, "login", null, NOW + CHALLENGE_TTL_SECONDS * 1000 - 1));
  const future = await issueChallenge(SECRET, "login", null, null, NOW + 120_000);
  assert.equal(await readChallenge(SECRET, future.token, "login", null, NOW), null);
  assert.equal(await readChallenge(SECRET, c.token.slice(0, -2) + "AA", "login", null, NOW), null);
  assert.equal(await readChallenge("k".repeat(48), c.token, "login", null, NOW), null);
  assert.equal(await readChallenge(SECRET, null, "login", null, NOW), null);
  assert.equal(await readChallenge(SECRET, "a.b.c", "login", null, NOW), null);
});

test("token thách thức KHÔNG BAO GIỜ được nhận làm phiên đăng nhập; phiên cũng không được nhận làm thách thức", async () => {
  const c = await issueChallenge(SECRET, "login", null, null, NOW);
  assert.equal(await verifySessionToken(SECRET, c.token, NOW), null);
  const withStaff = await issueChallenge(SECRET, "pin", STAFF, null, NOW);
  assert.equal(await verifySessionToken(SECRET, withStaff.token, NOW), null);
  const session = await createSessionToken(SECRET, STAFF, NOW);
  assert.equal(await readChallenge(SECRET, session, "login", null, NOW), null);
});

test("cookie: Path=/api, HttpOnly, SameSite=Strict, Secure khi https, hết hạn 300 giây; bản xoá Max-Age=0", () => {
  assert.equal(challengeCookie("t", true), "td_webauthn=t; Path=/api; Max-Age=300; HttpOnly; SameSite=Strict; Secure");
  assert.equal(challengeCookie("t", false), "td_webauthn=t; Path=/api; Max-Age=300; HttpOnly; SameSite=Strict");
  assert.equal(clearedChallengeCookie(true), "td_webauthn=; Path=/api; Max-Age=0; HttpOnly; SameSite=Strict; Secure");
});
