// Chống dò PIN. PIN 6 số chỉ có 1 triệu tổ hợp nên phải giới hạn số lần thử.
// Mỗi lần thử là một dòng `login_attempt` (key = "phone:0xxxxxxxxx" hoặc "ip:<địa chỉ>") đếm trong cửa sổ trượt.
// Đặt chỗ TRƯỚC khi kiểm PIN (chèn rồi đếm lại): dù bắn song song hàng trăm request, tối đa `max` lần được phép kiểm PIN.
import { attemptCount, attemptDeleteIdStatement, attemptDeleteKeyStatement, attemptInsertStatement, attemptPruneStatement, lockedPhoneKeys } from "./repository.ts";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const PHONE_LIMIT = 5;
export const IP_LIMIT = 30;

export type Reservation = { allowed: true; ids: Record<string, string> } | { allowed: false; retryAfterSeconds: number };

const cutoff = (now: number) => now - LOGIN_WINDOW_MS;

const countIn = (db: D1Database, key: string, now: number) => attemptCount(db, key, cutoff(now));

const retryAfter = (oldest: number | null, now: number) => Math.max(1, Math.ceil(((oldest ?? now) + LOGIN_WINDOW_MS - now) / 1000));

export async function reserveAttempts(db: D1Database, keys: { key: string; max: number }[], now = Date.now()): Promise<Reservation> {
  // Đã đủ số lần thì chặn ngay và KHÔNG ghi thêm, để kẻ tấn công không kéo dài mãi việc khoá nạn nhân.
  for (const k of keys) {
    const { n, oldest } = await countIn(db, k.key, now);
    if (n >= k.max) return { allowed: false, retryAfterSeconds: retryAfter(oldest, now) };
  }
  const ids: Record<string, string> = {};
  const inserts = keys.map((k) => {
    ids[k.key] = crypto.randomUUID();
    return attemptInsertStatement(db, ids[k.key]!, k.key, now);
  });
  await db.batch([attemptPruneStatement(db, cutoff(now)), ...inserts]);
  // Kiểm lại sau khi chèn: nếu nhiều request đến cùng lúc thì chỉ `max` request đầu còn thấy count <= max.
  for (const k of keys) {
    const { n, oldest } = await countIn(db, k.key, now);
    if (n > k.max) {
      await db.batch(Object.values(ids).map((id) => attemptDeleteIdStatement(db, id)));
      return { allowed: false, retryAfterSeconds: retryAfter(oldest, now) };
    }
  }
  return { allowed: true, ids };
}

/** Đăng nhập/đổi PIN thành công: xoá các lần thử của SĐT đó và lần thử vừa đặt chỗ của IP (chỉ lần THẤT BẠI mới tính). */
export async function clearAttempts(db: D1Database, phoneKey: string | null, ids: Record<string, string>): Promise<void> {
  const stmts = Object.values(ids).map((id) => attemptDeleteIdStatement(db, id));
  if (phoneKey) stmts.push(attemptDeleteKeyStatement(db, phoneKey));
  if (stmts.length) await db.batch(stmts);
}

export const phoneKey = (phone: string) => `phone:${phone}`;
export const ipKey = (ip: string) => `ip:${ip}`;

/** Các SĐT đang bị khoá (đủ số lần thử trong cửa sổ) — cho bảng Admin. */
export async function lockedPhones(db: D1Database, now = Date.now()): Promise<Set<string>> {
  return new Set((await lockedPhoneKeys(db, cutoff(now), PHONE_LIMIT)).map((k) => k.slice("phone:".length)));
}

export async function unlockPhone(db: D1Database, phone: string): Promise<void> {
  await attemptDeleteKeyStatement(db, phoneKey(phone)).run();
}
