// Kiểm WebAuthn phía máy chủ (ADR-0016 điều 2, 8). THUẦN: không D1, không HTTP. Tự viết bằng Web Crypto — không thư viện chạy lúc runtime.
// Lỗi luôn là WebAuthnError với `reason` là mã ngắn (bad_origin, bad_signature…) để ghi log; KHÔNG chứa id khoá hay dữ liệu người dùng.
import { decodeCbor, type CborValue } from "./cbor.ts";
import { fromBase64Url, timingSafeEqual, toBase64Url } from "../../shared/encoding.ts";

export class WebAuthnError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}
export interface RelyingParty { rpId: string; origin: string }
export type PasskeyAlgorithm = -7 | -257;
export interface NewPasskey { credentialId: string; publicKey: string; algorithm: PasskeyAlgorithm; signCount: number }
export interface AuthenticatorData { rpIdHash: Uint8Array; flags: number; signCount: number; credentialId?: Uint8Array; publicKeyCose?: Map<number | string, CborValue> }

const FLAG_UP = 0x01, FLAG_UV = 0x04, FLAG_AT = 0x40, FLAG_ED = 0x80;
const enc = new TextEncoder();
const B64URL = /^[A-Za-z0-9_-]+$/;
const P256_SPKI_PREFIX = Uint8Array.from("3059301306072a8648ce3d020106082a8648ce3d030107034200".match(/../g)!.map((b) => parseInt(b, 16)));

const sha256 = async (data: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", data.slice()));
const concat = (a: Uint8Array, b: Uint8Array) => { const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; };
function asObject(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new WebAuthnError("bad_input");
  return v as Record<string, unknown>;
}
function b64(text: unknown, reason: string): Uint8Array {
  if (typeof text !== "string" || text.length === 0 || text.length > 16384 || !B64URL.test(text)) throw new WebAuthnError(reason);
  try { return fromBase64Url(text); } catch { throw new WebAuthnError(reason); }
}

/** Cấu hình RP từ `vars`; null = TẮT (thiếu biến, hostname của origin khác rpId, hoặc http ngoài localhost/127.0.0.1). */
export function passkeyRelyingParty(env: { PASSKEY_RP_ID?: string; PASSKEY_ORIGIN?: string }): RelyingParty | null {
  const rpId = env.PASSKEY_RP_ID?.trim(), origin = env.PASSKEY_ORIGIN?.trim();
  if (!rpId || !origin) return null;
  let u: URL;
  try { u = new URL(origin); } catch { return null; }
  if (u.origin !== origin || u.hostname !== rpId) return null;
  const local = rpId === "localhost" || rpId === "127.0.0.1";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) return null;
  return { rpId, origin };
}

export function credentialIdOf(credential: unknown): string | null {
  if (!credential || typeof credential !== "object") return null;
  const id = (credential as Record<string, unknown>).id;
  return typeof id === "string" && id.length >= 16 && id.length <= 1400 && B64URL.test(id) ? id : null;
}

export const counterRegressed = (stored: number, next: number): boolean => stored > 0 && next > 0 && next <= stored;

function checkClientData(bytes: Uint8Array, expected: { type: "webauthn.create" | "webauthn.get"; challenge: string; origin: string }): void {
  let d: Record<string, unknown>;
  try { d = asObject(JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes))); } catch { throw new WebAuthnError("bad_client_data"); }
  if (d.type !== expected.type) throw new WebAuthnError("bad_type");
  if (d.challenge !== expected.challenge) throw new WebAuthnError("bad_challenge");
  if (d.origin !== expected.origin) throw new WebAuthnError("bad_origin");
  if (d.crossOrigin === true) throw new WebAuthnError("cross_origin");
}

export function parseAuthenticatorData(bytes: Uint8Array): AuthenticatorData {
  if (bytes.length < 37) throw new WebAuthnError("bad_auth_data");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const flags = bytes[32]!;
  const out: AuthenticatorData = { rpIdHash: bytes.slice(0, 32), flags, signCount: view.getUint32(33) };
  let pos = 37;
  try {
    if (flags & FLAG_AT) {
      if (bytes.length < pos + 18) throw new WebAuthnError("bad_auth_data");
      const len = view.getUint16(pos + 16);
      pos += 18;
      if (len < 16 || len > 1023 || bytes.length < pos + len) throw new WebAuthnError("bad_credential_id");
      out.credentialId = bytes.slice(pos, pos + len);
      pos += len;
      const key = decodeCbor(bytes, pos);
      if (!(key.value instanceof Map)) throw new WebAuthnError("bad_public_key");
      out.publicKeyCose = key.value;
      pos = key.end;
    }
    if (flags & FLAG_ED) pos = decodeCbor(bytes, pos).end;
  } catch (e) {
    if (e instanceof WebAuthnError) throw e;
    throw new WebAuthnError("bad_auth_data");
  }
  if (pos !== bytes.length) throw new WebAuthnError("bad_auth_data");
  return out;
}

async function checkAuthData(ad: AuthenticatorData, rp: RelyingParty): Promise<void> {
  if (!timingSafeEqual(ad.rpIdHash, await sha256(enc.encode(rp.rpId)))) throw new WebAuthnError("bad_rp_id");
  if (!(ad.flags & FLAG_UP)) throw new WebAuthnError("no_user_presence");
  if (!(ad.flags & FLAG_UV)) throw new WebAuthnError("no_user_verification");
}

async function importKey(spki: Uint8Array, algorithm: number): Promise<CryptoKey> {
  try {
    if (algorithm === -7) return await crypto.subtle.importKey("spki", spki.slice(), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    if (algorithm === -257) return await crypto.subtle.importKey("spki", spki.slice(), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  } catch {
    throw new WebAuthnError("bad_public_key");
  }
  throw new WebAuthnError("unsupported_algorithm");
}

async function coseToSpki(cose: Map<number | string, CborValue>): Promise<{ spki: Uint8Array; algorithm: PasskeyAlgorithm }> {
  const kty = cose.get(1), alg = cose.get(3);
  if (kty === 2 && alg === -7) {
    const crv = cose.get(-1), x = cose.get(-2), y = cose.get(-3);
    if (crv !== 1 || !(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== 32 || y.length !== 32) throw new WebAuthnError("bad_public_key");
    const spki = new Uint8Array(P256_SPKI_PREFIX.length + 65);
    spki.set(P256_SPKI_PREFIX);
    spki[P256_SPKI_PREFIX.length] = 0x04;
    spki.set(x, P256_SPKI_PREFIX.length + 1);
    spki.set(y, P256_SPKI_PREFIX.length + 33);
    await importKey(spki, -7); // ném nếu điểm không nằm trên đường cong P-256
    return { spki, algorithm: -7 };
  }
  if (kty === 3 && alg === -257) {
    const n = cose.get(-1), e = cose.get(-2);
    if (!(n instanceof Uint8Array) || !(e instanceof Uint8Array) || n.length > 513) throw new WebAuthnError("bad_public_key");
    // Bỏ byte 0x00 đệm đầu (thường gặp khi mã hoá số nguyên không dấu) rồi mới đo độ dài thật —
    // tránh việc đệm 0 để giả một modulus yếu (vd. 1024 bit) thành đủ 256 byte.
    let ni = 0;
    while (ni < n.length - 1 && n[ni] === 0) ni++;
    const nBits = n.length - ni;
    if (!(nBits > 256 || (nBits === 256 && (n[ni]! & 0x80) !== 0))) throw new WebAuthnError("bad_public_key"); // đòi modulus ≥ 2048 bit
    let ei = 0;
    while (ei < e.length - 1 && e[ei] === 0) ei++;
    const eBytes = e.subarray(ei);
    if (eBytes.length === 0 || eBytes.length > 8) throw new WebAuthnError("bad_public_key");
    const eOdd = (eBytes[eBytes.length - 1]! & 1) === 1;
    const eAtLeast3 = eBytes.length > 1 || eBytes[0]! >= 3;
    if (!eOdd || !eAtLeast3) throw new WebAuthnError("bad_public_key"); // số mũ công khai phải lẻ và ≥ 3 (không ép cứng 65537)
    let key: CryptoKey;
    try {
      key = await crypto.subtle.importKey("jwk", { kty: "RSA", n: toBase64Url(n), e: toBase64Url(e), alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]);
    } catch {
      throw new WebAuthnError("bad_public_key");
    }
    return { spki: new Uint8Array((await crypto.subtle.exportKey("spki", key)) as ArrayBuffer), algorithm: -257 };
  }
  throw new WebAuthnError("unsupported_algorithm");
}

/** Chữ ký ECDSA dạng DER (authenticator gửi) → r‖s cố định `size * 2` byte (Web Crypto đòi). */
export function derToP1363(der: Uint8Array, size = 32): Uint8Array {
  if (der.length < 8 || der[0] !== 0x30 || der[1] !== der.length - 2) throw new WebAuthnError("bad_signature");
  const out = new Uint8Array(size * 2);
  let pos = 2;
  for (let k = 0; k < 2; k++) {
    if (der[pos] !== 0x02) throw new WebAuthnError("bad_signature");
    const len = der[pos + 1]!;
    pos += 2;
    if (len < 1 || len > size + 1 || pos + len > der.length) throw new WebAuthnError("bad_signature");
    let int = der.subarray(pos, pos + len);
    pos += len;
    if (int.length === size + 1) {
      if (int[0] !== 0) throw new WebAuthnError("bad_signature");
      int = int.subarray(1);
    }
    out.set(int, k * size + (size - int.length));
  }
  if (pos !== der.length) throw new WebAuthnError("bad_signature");
  return out;
}

/** Đăng ký (navigator.credentials.create): trả khoá cần lưu. Bỏ qua fmt/attStmt (attestation "none", ADR-0016 điều 2). */
export async function verifyRegistration(rp: RelyingParty, challenge: string, credential: unknown): Promise<NewPasskey> {
  const c = asObject(credential);
  const r = asObject(c.response ?? {});
  if (c.type !== undefined && c.type !== "public-key") throw new WebAuthnError("bad_type");
  const clientData = b64(r.clientDataJSON, "bad_client_data");
  checkClientData(clientData, { type: "webauthn.create", challenge, origin: rp.origin });
  const attBytes = b64(r.attestationObject, "bad_attestation");
  let att: CborValue;
  try {
    const d = decodeCbor(attBytes);
    if (d.end !== attBytes.length) throw new WebAuthnError("bad_attestation");
    att = d.value;
  } catch {
    throw new WebAuthnError("bad_attestation");
  }
  const authData = att instanceof Map ? att.get("authData") : undefined;
  if (!(authData instanceof Uint8Array)) throw new WebAuthnError("bad_attestation");
  const ad = parseAuthenticatorData(authData);
  await checkAuthData(ad, rp);
  if (!(ad.flags & FLAG_AT) || !ad.credentialId || !ad.publicKeyCose) throw new WebAuthnError("bad_auth_data");
  const credentialId = toBase64Url(ad.credentialId);
  if (c.id !== credentialId) throw new WebAuthnError("id_mismatch");
  const { spki, algorithm } = await coseToSpki(ad.publicKeyCose);
  return { credentialId, publicKey: toBase64Url(spki), algorithm, signCount: ad.signCount };
}

/** Đăng nhập / xác nhận (navigator.credentials.get) bằng khoá đã lưu. Trả bộ đếm mới; người gọi tự kiểm `counterRegressed`. */
export async function verifyAssertion(rp: RelyingParty, challenge: string, stored: { publicKey: string; algorithm: number }, credential: unknown): Promise<{ signCount: number }> {
  const c = asObject(credential);
  const r = asObject(c.response ?? {});
  if (c.type !== undefined && c.type !== "public-key") throw new WebAuthnError("bad_type");
  const clientData = b64(r.clientDataJSON, "bad_client_data");
  checkClientData(clientData, { type: "webauthn.get", challenge, origin: rp.origin });
  const authData = b64(r.authenticatorData, "bad_auth_data");
  const ad = parseAuthenticatorData(authData);
  await checkAuthData(ad, rp);
  if (ad.flags & FLAG_AT) throw new WebAuthnError("bad_auth_data");
  const signature = b64(r.signature, "bad_signature");
  const key = await importKey(b64(stored.publicKey, "bad_public_key"), stored.algorithm);
  const data = concat(authData, await sha256(clientData));
  const ok = stored.algorithm === -7
    ? await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToP1363(signature).slice(), data)
    : await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, signature.slice(), data);
  if (!ok) throw new WebAuthnError("bad_signature");
  return { signCount: ad.signCount };
}
