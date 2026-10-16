// Bộ tính mã TOTP GIẢ cho e2e (ADR-0074) — bản JS của `totpCode` (src/modules/auth/totp.ts): RFC 6238, HMAC-SHA1, 6 số, bước 30 giây. Dùng `node:crypto`.
// Kèm `maHoaKhoa` để gieo thẳng một yếu tố TOTP vào D1 tạm: cùng định dạng `v1.<iv>.<ct>` (base64url) của `encryptSecret` (AES-GCM 256; Web Crypto trả
// ciphertext NỐI với thẻ xác thực 16 byte — node trả thẻ riêng nên phải nối lại).
import { createCipheriv, createHmac, randomBytes } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD = 30;

export function base32Encode(bytes) {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = ((value << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of s.replace(/[\s=]/g, "").toUpperCase()) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("base32 không hợp lệ");
    value = ((value << 5) | i) & 0xffff;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** Mã 6 số của khoá base32 tại thời điểm `nowMs`. */
export function totp(secretB32, nowMs = Date.now()) {
  const step = Math.floor(nowMs / (TOTP_PERIOD * 1000));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const bin = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

const b64u = (b) => Buffer.from(b).toString("base64url");
/** Mã hoá khoá TOTP thô bằng khoá `MFA_ENCRYPTION_KEY` (base64 của 32 byte) — kết quả giải mã được bằng `decryptSecret` của máy chủ. */
export function maHoaKhoa(keyB64, plain) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", Buffer.from(keyB64, "base64"), iv);
  const ct = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
  return `v1.${b64u(iv)}.${b64u(ct)}`;
}
