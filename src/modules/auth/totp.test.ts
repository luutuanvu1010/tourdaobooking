import { test } from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, matchTotp, otpauthUri, totpCode } from "./totp.ts";

const SEED = new TextEncoder().encode("12345678901234567890"); // RFC 6238 phụ lục B, SHA-1

test("RFC 6238 phụ lục B (SHA-1, 8 số) và 6 số = 6 số cuối", async () => {
  const cases: [number, string][] = [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"]];
  for (const [t, eight] of cases) {
    assert.equal(await totpCode(SEED, Math.floor(t / 30), 8), eight, `T=${t}`);
    assert.equal(await totpCode(SEED, Math.floor(t / 30)), eight.slice(-6), `T=${t} (6 số)`);
  }
});

test("base32 hai chiều; bỏ khoảng trắng, chữ thường; ký tự lạ bị từ chối", () => {
  const b = crypto.getRandomValues(new Uint8Array(20));
  const s = base32Encode(b);
  assert.match(s, /^[A-Z2-7]{32}$/);
  assert.deepEqual(base32Decode(s.toLowerCase().replace(/(.{4})/g, "$1 ")), b);
  assert.throws(() => base32Decode("ABC1"));
});

test("chấp nhận bước −1/0/+1, từ chối ±2; mã không phải 6 số → null", async () => {
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 30_000);
  for (const d of [-1, 0, 1]) assert.equal(await matchTotp(SEED, await totpCode(SEED, step + d), now), step + d);
  for (const d of [-2, 2]) assert.equal(await matchTotp(SEED, await totpCode(SEED, step + d), now), null);
  assert.equal(await matchTotp(SEED, "12345", now), null);
  assert.equal(await matchTotp(SEED, "abcdef", now), null);
});

test("otpauth:// không chứa SĐT, có issuer Tour Đảo", () => {
  const u = otpauthUri("JBSWY3DPEHPK3PXP", "Nguyễn Văn A");
  assert.match(u, /^otpauth:\/\/totp\//);
  assert.match(u, /secret=JBSWY3DPEHPK3PXP/);
  assert.match(u, /issuer=Tour%20%C4%90%E1%BA%A3o/);
  assert.doesNotMatch(u, /09\d{8}/);
});
