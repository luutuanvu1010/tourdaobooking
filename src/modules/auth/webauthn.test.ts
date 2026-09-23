import { test } from "node:test";
import assert from "node:assert/strict";
import { WebAuthnError, counterRegressed, credentialIdOf, derToP1363, parseAuthenticatorData, passkeyRelyingParty, verifyAssertion, verifyRegistration } from "./webauthn.ts";
import { cborEncode, createFakeAuthenticator } from "../../../tests/e2e/fake-authenticator.mjs";

const RP = { rpId: "booking.tourdao.vn", origin: "https://booking.tourdao.vn" };
const CH = "q3m1V7m2mM0vTzZ6o3cQ4w7w0m3m5x8b1c2d3e4f5g6";
const rejects = async (p: Promise<unknown>, reason: string) =>
  assert.rejects(p, (e: unknown) => e instanceof WebAuthnError && e.reason === reason, reason);

for (const alg of [-7, -257] as const) {
  test(`alg ${alg}: đăng ký rồi đăng nhập hợp lệ; trả đúng id, khoá, bộ đếm`, async () => {
    const a = await createFakeAuthenticator({ ...RP, alg });
    const reg = await verifyRegistration(RP, CH, await a.register(CH));
    assert.equal(reg.credentialId, a.id);
    assert.equal(reg.algorithm, alg);
    assert.equal(reg.signCount, 0);
    const res = await verifyAssertion(RP, CH, reg, await a.sign(CH, { signCount: 7 }));
    assert.equal(res.signCount, 7);
  });
}

test("đăng ký: sai origin, sai rpId, sai thách thức, sai type, thiếu UV, thiếu UP, thiếu AT, crossOrigin, id không khớp → từ chối đúng lý do", async () => {
  const a = await createFakeAuthenticator(RP);
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { origin: "https://evil.example" })), "bad_origin");
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { rpId: "tourdao.vn" })), "bad_rp_id");
  await rejects(verifyRegistration(RP, "khac", await a.register(CH)), "bad_challenge");
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { type: "webauthn.get" })), "bad_type");
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { flags: 0x41 })), "no_user_verification");
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { flags: 0x44 })), "no_user_presence");
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { flags: 0x05 })), "bad_auth_data");
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { crossOrigin: true })), "cross_origin");
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { id: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" })), "id_mismatch");
  await rejects(verifyRegistration(RP, CH, { type: "public-key", response: {} }), "bad_client_data");
  await rejects(verifyRegistration(RP, CH, null), "bad_input");
});

test("đăng nhập: chữ ký bị sửa, sai origin, sai rpId, thiếu UV, sai thách thức, dùng khoá của passkey khác → từ chối", async () => {
  const a = await createFakeAuthenticator(RP);
  const b = await createFakeAuthenticator(RP);
  const reg = await verifyRegistration(RP, CH, await a.register(CH));
  const regB = await verifyRegistration(RP, CH, await b.register(CH));
  await rejects(verifyAssertion(RP, CH, reg, await a.sign(CH, { tamper: true })), "bad_signature");
  await rejects(verifyAssertion(RP, CH, reg, await a.sign(CH, { origin: "http://localhost:8787" })), "bad_origin");
  await rejects(verifyAssertion(RP, CH, reg, await a.sign(CH, { rpId: "evil.example" })), "bad_rp_id");
  await rejects(verifyAssertion(RP, CH, reg, await a.sign(CH, { flags: 0x01 })), "no_user_verification");
  await rejects(verifyAssertion(RP, "khac", reg, await a.sign(CH)), "bad_challenge");
  await rejects(verifyAssertion(RP, CH, reg, await a.sign(CH, { type: "webauthn.create" })), "bad_type");
  await rejects(verifyAssertion(RP, CH, regB, await a.sign(CH)), "bad_signature");
});

test("authenticatorData: có phần mở rộng (cờ ED) vẫn đọc đúng; thừa byte hoặc thiếu byte → bad_auth_data", async () => {
  const a = await createFakeAuthenticator(RP);
  const ext = cborEncode(new Map([["credProtect", 1]]));
  const reg = await verifyRegistration(RP, CH, await a.register(CH, { flags: 0xc5, extensions: ext }));
  assert.equal(reg.credentialId, a.id);
  await rejects(verifyRegistration(RP, CH, await a.register(CH, { extensions: Uint8Array.of(0) })), "bad_auth_data");
  assert.throws(() => parseAuthenticatorData(new Uint8Array(36)), WebAuthnError);
});

test("cờ thật đo trên iPhone (BE/BS bật): đăng ký 0x5D, đăng nhập 0x1D không bị từ chối", async () => {
  const a = await createFakeAuthenticator(RP);
  const reg = await verifyRegistration(RP, CH, await a.register(CH, { flags: 0x5d }));
  assert.equal(reg.credentialId, a.id);
  const res = await verifyAssertion(RP, CH, reg, await a.sign(CH, { flags: 0x1d }));
  assert.equal(res.signCount, 0);
});

test("derToP1363: đệm r/s ngắn, bỏ byte 0x00 đứng đầu của r/s có bit cao, từ chối DER hỏng", () => {
  const r = new Uint8Array(32).fill(0x80), s = new Uint8Array(31).fill(1);
  const der = Uint8Array.of(0x30, 2 + 33 + 2 + 31, 0x02, 33, 0, ...r, 0x02, 31, ...s);
  const out = derToP1363(der);
  assert.equal(out.length, 64);
  assert.deepEqual(out.subarray(0, 32), r);
  assert.equal(out[32], 0);
  assert.deepEqual(out.subarray(33), s);
  for (const bad of [Uint8Array.of(0x31, 0), Uint8Array.of(0x30, 6, 0x02, 1, 1, 0x02, 1, 1, 9), Uint8Array.of(0x30, 4, 0x03, 1, 1, 0x02)])
    assert.throws(() => derToP1363(bad), WebAuthnError);
});

test("counterRegressed: 0 không bao giờ là bất thường; chỉ bất thường khi cả hai > 0 và mới ≤ cũ", () => {
  assert.equal(counterRegressed(0, 0), false);
  assert.equal(counterRegressed(5, 0), false);
  assert.equal(counterRegressed(0, 3), false);
  assert.equal(counterRegressed(5, 6), false);
  assert.equal(counterRegressed(5, 5), true);
  assert.equal(counterRegressed(5, 4), true);
});

test("credentialIdOf: chỉ nhận chuỗi base64url dài 16–1400", () => {
  assert.equal(credentialIdOf({ id: "A".repeat(43) }), "A".repeat(43));
  for (const bad of [null, {}, { id: 1 }, { id: "ngan" }, { id: "A".repeat(20) + "+" }, { id: "A".repeat(1401) }]) assert.equal(credentialIdOf(bad), null);
});

test("passkeyRelyingParty: đủ và khớp thì bật; thiếu, lệch hostname, http ngoài localhost, origin có đường dẫn → tắt", () => {
  assert.deepEqual(passkeyRelyingParty({ PASSKEY_RP_ID: "booking.tourdao.vn", PASSKEY_ORIGIN: "https://booking.tourdao.vn" }), RP);
  assert.deepEqual(passkeyRelyingParty({ PASSKEY_RP_ID: "localhost", PASSKEY_ORIGIN: "http://localhost:8787" }), { rpId: "localhost", origin: "http://localhost:8787" });
  assert.deepEqual(passkeyRelyingParty({ PASSKEY_RP_ID: "127.0.0.1", PASSKEY_ORIGIN: "http://127.0.0.1:9000" }), { rpId: "127.0.0.1", origin: "http://127.0.0.1:9000" });
  for (const env of [{}, { PASSKEY_RP_ID: "booking.tourdao.vn" }, { PASSKEY_RP_ID: "tourdao.vn", PASSKEY_ORIGIN: "https://booking.tourdao.vn" },
    { PASSKEY_RP_ID: "booking.tourdao.vn", PASSKEY_ORIGIN: "http://booking.tourdao.vn" }, { PASSKEY_RP_ID: "booking.tourdao.vn", PASSKEY_ORIGIN: "https://booking.tourdao.vn/" },
    { PASSKEY_RP_ID: "", PASSKEY_ORIGIN: "" }])
    assert.equal(passkeyRelyingParty(env), null, JSON.stringify(env));
});
