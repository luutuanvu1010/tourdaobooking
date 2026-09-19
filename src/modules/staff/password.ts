import { fromBase64Url, timingSafeEqual, toBase64Url } from "../../shared/encoding";

// Workers giới hạn PBKDF2 tối đa 100000 vòng lặp.
export const PBKDF2_ITERATIONS = 100_000;
const HASH_BITS = 256;

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, HASH_BITS);
  return new Uint8Array(bits);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, algo, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || algo !== "sha256" || !iter || !salt || !hash) return false;
  const actual = await derive(pin, fromBase64Url(salt), Number(iter));
  return timingSafeEqual(actual, fromBase64Url(hash));
}

// Băm giả để thời gian phản hồi không lộ SĐT nào tồn tại.
const DUMMY_HASH = `pbkdf2$sha256$${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
export async function verifyDummy(pin: string): Promise<void> {
  await verifyPin(pin, DUMMY_HASH);
}
