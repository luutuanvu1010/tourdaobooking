// Authenticator GIẢ cho test (đơn vị + e2e): sinh đúng định dạng WebAuthn mà iPhone/Chrome gửi, bằng Web Crypto của Node. KHÔNG dùng ở mã chạy thật.
const enc = new TextEncoder();

/** Bộ mã hoá CBOR tối thiểu (số nguyên, chuỗi, byte, mảng, map, true/false/null) — đủ cho attestationObject và khoá COSE. */
export function cborEncode(value) {
  const out = [];
  const head = (major, n) => {
    if (n < 24) out.push((major << 5) | n);
    else if (n < 0x100) out.push((major << 5) | 24, n);
    else if (n < 0x10000) out.push((major << 5) | 25, n >> 8, n & 0xff);
    else out.push((major << 5) | 26, (n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
  };
  const put = (v) => {
    if (typeof v === "number") {
      if (!Number.isInteger(v)) throw new Error("cborEncode: chỉ số nguyên");
      v >= 0 ? head(0, v) : head(1, -1 - v);
    } else if (typeof v === "string") { const b = enc.encode(v); head(3, b.length); out.push(...b); }
    else if (v instanceof Uint8Array) { head(2, v.length); out.push(...v); }
    else if (Array.isArray(v)) { head(4, v.length); v.forEach(put); }
    else if (v instanceof Map) { head(5, v.size); for (const [k, x] of v) { put(k); put(x); } }
    else if (v === false) out.push(0xf4);
    else if (v === true) out.push(0xf5);
    else if (v === null) out.push(0xf6);
    else throw new Error("cborEncode: kiểu không hỗ trợ");
  };
  put(value);
  return Uint8Array.from(out);
}

const b64u = (u8) => Buffer.from(u8).toString("base64url");
const sha256 = async (b) => new Uint8Array(await crypto.subtle.digest("SHA-256", b));
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** Chữ ký ECDSA r‖s (64 byte, như Web Crypto trả) → DER (như authenticator thật gửi). */
export function p1363ToDer(sig) {
  const int = (b) => {
    let i = 0;
    while (i < b.length - 1 && b[i] === 0) i++;
    let v = b.subarray(i);
    if (v[0] & 0x80) v = Uint8Array.of(0, ...v);
    return [0x02, v.length, ...v];
  };
  const body = [...int(sig.subarray(0, 32)), ...int(sig.subarray(32))];
  return Uint8Array.from([0x30, body.length, ...body]);
}

/**
 * Tuỳ chọn `o` của register/sign: `flags` (mặc định đăng ký 0x45 = UP|UV|AT, ký 0x05 = UP|UV), `signCount` (mặc định 0), `origin`, `rpId`, `type`,
 * `crossOrigin`, `userHandle` (đăng ký), `tamper` (lật một bit của chữ ký), `extensions` (Uint8Array CBOR nối sau, kèm cờ ED 0x80 do người gọi đặt).
 */
export async function createFakeAuthenticator({ rpId, origin, alg = -7 }) {
  const keyPair = alg === -7
    ? await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
    : await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: Uint8Array.of(1, 0, 1), hash: "SHA-256" }, true, ["sign", "verify"]);
  const credentialId = crypto.getRandomValues(new Uint8Array(32));
  const id = b64u(credentialId);
  let userHandle = null;
  const cose = async () => {
    if (alg === -7) {
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
      return new Map([[1, 2], [3, -7], [-1, 1], [-2, raw.slice(1, 33)], [-3, raw.slice(33, 65)]]);
    }
    const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    return new Map([[1, 3], [3, -257], [-1, new Uint8Array(Buffer.from(jwk.n, "base64url"))], [-2, new Uint8Array(Buffer.from(jwk.e, "base64url"))]]);
  };
  const clientData = (type, challenge, o) =>
    enc.encode(JSON.stringify({ type: o.type ?? type, challenge, origin: o.origin ?? origin, crossOrigin: o.crossOrigin ?? false }));
  const authData = async (flags, o, tail) => {
    const count = new Uint8Array(4);
    new DataView(count.buffer).setUint32(0, o.signCount ?? 0);
    return concat(await sha256(enc.encode(o.rpId ?? rpId)), Uint8Array.of(flags), count, tail, o.extensions ?? new Uint8Array(0));
  };
  return {
    id,
    async register(challenge, o = {}) {
      userHandle = o.userHandle ?? null;
      const idLen = new Uint8Array(2);
      new DataView(idLen.buffer).setUint16(0, credentialId.length);
      const attested = concat(new Uint8Array(16), idLen, credentialId, cborEncode(await cose()));
      const ad = await authData(o.flags ?? 0x45, o, attested);
      const attestationObject = cborEncode(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", ad]]));
      return { id: o.id ?? id, rawId: o.id ?? id, type: "public-key", response: { clientDataJSON: b64u(clientData("webauthn.create", challenge, o)), attestationObject: b64u(attestationObject) } };
    },
    async sign(challenge, o = {}) {
      const cd = clientData("webauthn.get", challenge, o);
      const ad = await authData(o.flags ?? 0x05, o, new Uint8Array(0));
      const data = concat(ad, await sha256(cd));
      let sig = alg === -7
        ? p1363ToDer(new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, data)))
        : new Uint8Array(await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, keyPair.privateKey, data));
      if (o.tamper) sig = sig.map((b, i) => (i === sig.length - 1 ? b ^ 1 : b));
      return { id, rawId: id, type: "public-key", response: { clientDataJSON: b64u(cd), authenticatorData: b64u(ad), signature: b64u(sig), userHandle } };
    },
  };
}
