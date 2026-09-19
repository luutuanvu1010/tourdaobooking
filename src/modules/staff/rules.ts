// Luật thuần của quản lý tài khoản nhân viên. Không import gì, không I/O.

export type StaffRole = "sales" | "admin";

/** PIN quá dễ đoán: cả 6 số giống nhau hoặc chạy liên tiếp tăng/giảm, kể cả cuộn vòng (000000, 123456, 654321, 890123…). */
export function isWeakPin(pin: string): boolean {
  return /^(\d)\1{5}$/.test(pin) || "01234567890123456789".includes(pin) || "98765432109876543210".includes(pin);
}

/** Sinh PIN 6 chữ số ngẫu nhiên có kiểm soát (rejection sampling, không thiên lệch), bỏ PIN yếu. `random` để test được. */
export function generatePin(random: (max: number) => number = randomBelow): string {
  for (;;) {
    const pin = String(random(1_000_000)).padStart(6, "0");
    if (!isWeakPin(pin)) return pin;
  }
}

function randomBelow(max: number): number {
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

/**
 * Kiểm tra một thay đổi tài khoản do `actorId` thực hiện. Trả thông báo lỗi, hoặc null nếu hợp lệ.
 * - Không tự ngưng/hạ quyền chính mình (tránh tự khoá).
 * - Không để hệ thống hết quản trị viên hoạt động (không còn ai vào bảng Admin để sửa).
 */
export function checkAccountChange(
  actorId: string,
  target: { id: string; role: StaffRole; active: boolean },
  next: { role?: StaffRole; active?: boolean },
  activeAdminCount: number,
): string | null {
  const nextRole = next.role ?? target.role;
  const nextActive = next.active ?? target.active;
  const losesAdmin = target.role === "admin" && target.active && (nextRole !== "admin" || !nextActive);
  if (target.id === actorId && (nextActive === false || nextRole !== target.role)) {
    return "Không thể tự ngưng hoặc đổi vai trò của chính mình. Hãy nhờ một quản trị viên khác.";
  }
  if (losesAdmin && activeAdminCount <= 1) return "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.";
  return null;
}
