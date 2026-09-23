import { test } from "node:test";
import assert from "node:assert/strict";
import { CHALLENGE_TTL_SECONDS, challengeCookie, clearedChallengeCookie, issueChallenge, readChallenge } from "./challenge.ts";
import { createSessionToken, verifySessionToken } from "./session.ts";
import { toBase64Url } from "../../shared/encoding.ts";

const SECRET = "s".repeat(48);
const STAFF = "3f0c9a52-7a51-4c1b-9f8e-2d6b1e0a9c11";
const NOW = 1_790_000_000_000;

// Tất cả 0: cố định để chữ ký (và do đó ký tự cuối token) không đổi giữa các lần chạy — dùng khi test cần
// giả mạo/soi từng byte của chữ ký (ngẫu nhiên thật sẽ làm test "tampered signature" flaky ~1/1024, xem T5 vòng 1).
const FIXED_RANDOM = new Uint8Array(32);

const B64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Đổi ký tự cuối một chuỗi base64url sang ký tự kế tiếp trong bảng chữ cái — giải mã ra CÙNG byte (2 bit đệm cuối vốn
 * luôn = 0 ở dạng canonical, xem readChallenge) nhưng chuỗi khác đi: mô phỏng biến thể "không canonical" của cùng chữ ký. */
function bumpLastChar(s: string): string {
  const idx = B64URL_ALPHABET.indexOf(s.at(-1)!);
  return s.slice(0, -1) + B64URL_ALPHABET[(idx + 1) % B64URL_ALPHABET.length];
}

/** Chữ ký bằng khoá PHIÊN thẳng (giống hàm `hmac` nội bộ của session.ts), KHÔNG qua dẫn xuất — dùng để chứng minh
 * readChallenge từ chối token 7 phần dù đủ hình thức nhưng ký sai khoá. */
async function hmacWithRawSecret(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

test("đọc lại đúng thách thức, giờ phát hành và phần phụ", async () => {
  const c = await issueChallenge(SECRET, "register", STAFF, "u".repeat(22), NOW);
  const r = await readChallenge(SECRET, c.token, "register", STAFF, NOW + 1000);
  assert.deepEqual(r, { challenge: c.challenge, issuedAt: NOW, extra: "u".repeat(22) });
  assert.equal(c.challenge.length, 43); // 32 byte base64url, không '='
});

test("sai mục đích, sai người, hết hạn, giờ tương lai, chữ ký sửa, khác bí mật, token rỗng → null", async () => {
  // random CỐ ĐỊNH (không phải mặc định ngẫu nhiên): ký tự cuối token phải biết trước để phép thử "đổi 2 ký tự cuối
  // thành AA" chắc chắn là một thay đổi thật (đã tự kiểm: với FIXED_RANDOM ký tự cuối token là "lo", khác "AA" — nếu
  // dùng random mặc định, có lần token thật sự đã kết thúc bằng "AA" thì phép thử không còn là "sửa chữ ký" nữa).
  const c = await issueChallenge(SECRET, "login", null, null, NOW, FIXED_RANDOM);
  assert.notEqual(c.token.slice(-2), "AA");
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

test("issueChallenge ném lỗi khi staffId/extra chứa dấu chấm hoặc đúng bằng \"-\" (vỡ định dạng 7 phần)", async () => {
  await assert.rejects(() => issueChallenge(SECRET, "register", "a.b", null, NOW));
  await assert.rejects(() => issueChallenge(SECRET, "register", "-", null, NOW));
  await assert.rejects(() => issueChallenge(SECRET, "register", STAFF, "u.v", NOW));
  await assert.rejects(() => issueChallenge(SECRET, "register", STAFF, "-", NOW));
  // Giá trị hợp lệ (không chấm, không phải "-") vẫn qua bình thường.
  assert.ok(await issueChallenge(SECRET, "register", STAFF, "u".repeat(22), NOW));
});

test("chữ ký hợp lệ nhưng KHÔNG canonical (cùng byte, khác ký tự base64url) → null", async () => {
  const c = await issueChallenge(SECRET, "login", null, null, NOW, FIXED_RANDOM);
  const tampered = bumpLastChar(c.token);
  assert.notEqual(tampered, c.token); // đổi ký tự thật
  assert.equal(await readChallenge(SECRET, tampered, "login", null, NOW), null);
});

test("chữ ký bằng khoá PHIÊN thẳng (chưa dẫn xuất theo nhãn) dù đủ 7 phần → null", async () => {
  const c = await issueChallenge(SECRET, "login", null, null, NOW, FIXED_RANDOM);
  const payload = c.token.split(".").slice(0, 6).join(".");
  const forged = `${payload}.${toBase64Url(await hmacWithRawSecret(SECRET, payload))}`;
  assert.notEqual(forged, c.token);
  assert.equal(await readChallenge(SECRET, forged, "login", null, NOW), null);
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
