// Mật mã phụ trợ của bảo mật hai lớp (ADR-0074) — THUẦN, Web Crypto. Khoá TOTP, mã dự phòng và token máy tin KHÔNG BAO GIỜ vào nhật ký, DTO, câu lỗi.
const RECOVERY_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"; // 31 ký tự, bỏ 0 1 i l o (dễ nhầm)

const toB64u = (b: Uint8Array): string => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function fromB64u(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("base64url không hợp lệ");
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(std + "=".repeat((4 - (std.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function keyBytes(keyB64: string): Uint8Array {
  const bin = atob(keyB64);
  if (bin.length !== 32) throw new Error("khoá mã hoá hai lớp sai độ dài");
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const aesKey = (keyB64: string, use: "encrypt" | "decrypt"): Promise<CryptoKey> => crypto.subtle.importKey("raw", keyBytes(keyB64), "AES-GCM", false, [use]);

/** AES-GCM 256, IV 12 byte ngẫu nhiên; kết quả `v1.<iv>.<ct>` (base64url). */
export async function encryptSecret(keyB64: string, plain: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(keyB64, "encrypt"), plain));
  return `v1.${toB64u(iv)}.${toB64u(ct)}`;
}

export async function decryptSecret(keyB64: string, enc: string): Promise<Uint8Array> {
  const parts = enc.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("định dạng khoá đã mã hoá không hợp lệ");
  const iv = fromB64u(parts[1]!);
  if (iv.length !== 12) throw new Error("định dạng khoá đã mã hoá không hợp lệ");
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(keyB64, "decrypt"), fromB64u(parts[2]!)));
}

export async function sha256Hex(s: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomChars(n: number): string {
  const limit = 256 - (256 % RECOVERY_ALPHABET.length); // loại bỏ lệch (rejection sampling)
  let out = "";
  while (out.length < n) for (const b of crypto.getRandomValues(new Uint8Array(n * 2))) if (b < limit && out.length < n) out += RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length];
  return out;
}

/** 10 mã dự phòng `xxxx-xxxx`, không trùng nhau. */
export function newRecoveryCodes(): string[] {
  const set = new Set<string>();
  while (set.size < 10) { const c = randomChars(8); set.add(`${c.slice(0, 4)}-${c.slice(4)}`); }
  return [...set];
}

/** Bỏ gạch/khoảng trắng, chữ thường; đúng 8 ký tự trong bảng, ngược lại null. */
export function normalizeRecoveryCode(s: string): string | null {
  const n = s.replace(/[-\s]/g, "").toLowerCase();
  return n.length === 8 && [...n].every((c) => RECOVERY_ALPHABET.includes(c)) ? n : null;
}

/** Băm gắn với tài khoản: cùng mã khác người cho băm khác. Cơ sở dữ liệu chỉ giữ băm. */
export const recoveryHash = (staffId: string, normalized: string): Promise<string> => sha256Hex(`${staffId}:${normalized}`);

/** Token máy tin: 32 byte ngẫu nhiên, base64url. Cơ sở dữ liệu chỉ giữ `sha256Hex` của nó. */
export const newTrustedToken = (): string => toB64u(crypto.getRandomValues(new Uint8Array(32)));

/** Thiếu/sai độ dài → câu lỗi cho nhật ký máy (không in khoá); đúng → null. */
export function checkMfaKey(env: { MFA_ENCRYPTION_KEY?: string }): string | null {
  const k = env.MFA_ENCRYPTION_KEY;
  if (!k) return "thiếu bí mật MFA_ENCRYPTION_KEY";
  try { keyBytes(k); } catch { return "MFA_ENCRYPTION_KEY phải là 32 byte mã hoá base64"; }
  return null;
}
