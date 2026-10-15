// Mật mã phụ trợ của bảo mật hai lớp (ADR-0074): mã hoá khoá TOTP, mã dự phòng, token máy tin, kiểm khoá cấu hình.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMfaKey, decryptSecret, encryptSecret, newRecoveryCodes, newTrustedToken, normalizeRecoveryCode, recoveryHash, sha256Hex } from "./mfa-crypto.ts";

const b64 = (n: number, fill: number) => Buffer.alloc(n, fill).toString("base64");
const KEY = b64(32, 7);
const KEY2 = b64(32, 9);

test("mã hoá rồi giải mã trả đúng khoá; định dạng v1.<iv>.<ct> base64url; hai lần mã hoá khác nhau (IV ngẫu nhiên)", async () => {
  const plain = new Uint8Array([1, 2, 3, 250, 251, 252, 0, 9, 8, 7]);
  const a = await encryptSecret(KEY, plain);
  const b = await encryptSecret(KEY, plain);
  assert.match(a, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.notEqual(a, b);
  assert.deepEqual([...(await decryptSecret(KEY, a))], [...plain]);
  assert.equal(Buffer.from(a.split(".")[1]!, "base64url").length, 12);
});

test("giải mã bằng khoá sai, bản bị sửa hoặc sai định dạng đều ném lỗi, không lộ nội dung", async () => {
  const enc = await encryptSecret(KEY, new Uint8Array([1, 2, 3]));
  await assert.rejects(decryptSecret(KEY2, enc));
  const [v, iv, ct] = enc.split(".");
  const bad = Buffer.from(ct!, "base64url");
  bad[0] = bad[0]! ^ 1;
  await assert.rejects(decryptSecret(KEY, `${v}.${iv}.${bad.toString("base64url")}`));
  await assert.rejects(decryptSecret(KEY, "v2.a.b"));
  await assert.rejects(decryptSecret(KEY, "rác"));
});

test("sha256Hex đúng vectơ chuẩn", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("10 mã dự phòng khác nhau, đúng dạng xxxx-xxxx trong bảng ký tự", () => {
  const codes = newRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  for (const c of codes) assert.match(c, /^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}$/);
});

test("chuẩn hoá mã dự phòng: bỏ gạch/khoảng trắng, chữ thường, đúng 8 ký tự trong bảng; sai thì null", () => {
  assert.equal(normalizeRecoveryCode(" ABCD-efgh "), "abcdefgh");
  assert.equal(normalizeRecoveryCode("ab cd 2345"), "abcd2345");
  assert.equal(normalizeRecoveryCode("abcd-efgi"), null); // i không thuộc bảng
  assert.equal(normalizeRecoveryCode("abcd-ef10"), null); // 0, 1 không thuộc bảng
  assert.equal(normalizeRecoveryCode("abcdefg"), null);
  assert.equal(normalizeRecoveryCode("abcdefghj"), null);
  assert.equal(normalizeRecoveryCode(""), null);
  for (const c of newRecoveryCodes()) assert.equal(normalizeRecoveryCode(c), c.replace("-", ""));
});

test("băm mã dự phòng gắn với tài khoản: cùng mã khác người → băm khác; không chứa mã thô", async () => {
  const h1 = await recoveryHash("s1", "abcdefgh");
  const h2 = await recoveryHash("s2", "abcdefgh");
  assert.notEqual(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.equal(h1, await recoveryHash("s1", "abcdefgh"));
});

test("token máy tin: 32 byte base64url, mỗi lần khác nhau", () => {
  const a = newTrustedToken();
  assert.equal(Buffer.from(a, "base64url").length, 32);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, newTrustedToken());
});

test("checkMfaKey: thiếu/sai độ dài/không phải base64 → câu lỗi không in khoá; đúng → null", () => {
  assert.equal(checkMfaKey({ MFA_ENCRYPTION_KEY: KEY }), null);
  assert.match(checkMfaKey({})!, /MFA_ENCRYPTION_KEY/);
  const short = b64(16, 3);
  const msg = checkMfaKey({ MFA_ENCRYPTION_KEY: short })!;
  assert.ok(msg);
  assert.ok(!msg.includes(short), "câu lỗi không được chứa khoá");
  assert.ok(checkMfaKey({ MFA_ENCRYPTION_KEY: "!!!không-phải-base64" }));
});
