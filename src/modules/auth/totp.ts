// TOTP (RFC 6238, HMAC-SHA1, 6 số, bước 30 giây) — THUẦN, Web Crypto. ADR-0074 điều 2.
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD = 30;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = ((value << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Uint8Array {
  const clean = s.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("base32 không hợp lệ");
    value = ((value << 5) | i) & 0xffff;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

export async function totpCode(secret: Uint8Array, step: number, digits = 6): Promise<string> {
  const msg = new Uint8Array(8);
  let x = step;
  for (let i = 7; i >= 0; i--) { msg[i] = x & 255; x = Math.floor(x / 256); }
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[h.length - 1]! & 15;
  const bin = ((h[o]! & 127) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(bin % 10 ** digits).padStart(digits, "0");
}

// So sánh chuỗi 6 số không cần thời gian hằng: kẻ dò bị hạn mức 5 lần/15 phút.
export async function matchTotp(secret: Uint8Array, code: string, nowMs: number): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(nowMs / (TOTP_PERIOD * 1000));
  for (const d of [0, -1, 1]) if ((await totpCode(secret, step + d)) === code) return step + d;
  return null;
}

export function otpauthUri(secretB32: string, accountLabel: string): string {
  const issuer = "Tour Đảo";
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&digits=6&period=${TOTP_PERIOD}`;
}
