// API công khai của module staff — module khác CHỈ import từ file này. Không có route: API quản trị ở module `accounts`.
// staff sở hữu bảng `staff` và luật tài khoản; các hàm ghi trả về CÂU LỆNH D1 chưa chạy để module gọi
// (accounts) gộp cùng nhật ký audit vào một db.batch() — đổi tài khoản và ghi dấu vết thành công/thất bại cùng nhau.
import { hashPin, verifyDummy, verifyPin } from "./password";
import { isValidPin, normalizePhone } from "./phone";
import { countActiveAdmins, findById, findByPhone, listAll, type StaffRecord } from "./repository";
import { checkAccountChange, generatePin, isWeakPin } from "./rules";
import { parseStaffSheet, type StaffCandidate, type StaffSheetParse } from "./sheet";
import type { StaffAccount, StaffProfile, StaffRole } from "../../shared/contracts";

export type { StaffAccount, StaffCandidate, StaffProfile, StaffRole, StaffSheetParse };
export { checkAccountChange, countActiveAdmins, generatePin, hashPin, isValidPin, isWeakPin, normalizePhone, parseStaffSheet };

/** Trả hồ sơ nhân viên nếu SĐT+PIN đúng và tài khoản còn hoạt động; ngược lại null. */
export async function authenticate(db: D1Database, rawPhone: string, pin: string): Promise<StaffProfile | null> {
  const phone = normalizePhone(rawPhone);
  const staff = phone ? await findByPhone(db, phone) : null;
  if (!staff) {
    await verifyDummy(pin);
    return null;
  }
  const ok = await verifyPin(pin, staff.pin_hash);
  if (!ok || !staff.active) return null;
  return toProfile(staff);
}

/**
 * Lấy nhân viên đang hoạt động theo id (xác thực lại phiên mỗi request).
 * `sessionIssuedAt` (mili-giây Unix): phiên phát hành trước lần đổi/đặt lại PIN gần nhất bị coi là hết hiệu lực.
 */
export async function getActiveStaff(db: D1Database, id: string, sessionIssuedAt?: number): Promise<StaffProfile | null> {
  const staff = await findById(db, id);
  if (!staff || !staff.active) return null;
  if (sessionIssuedAt !== undefined && staff.credentials_changed_at !== null && staff.credentials_changed_at > sessionIssuedAt) return null;
  return toProfile(staff);
}

export async function getStaffAccount(db: D1Database, id: string): Promise<StaffAccount | null> {
  const s = await findById(db, id);
  return s ? toAccount(s) : null;
}

export async function listStaffAccounts(db: D1Database): Promise<StaffAccount[]> {
  return (await listAll(db)).map(toAccount);
}

export async function findStaffByPhone(db: D1Database, phone: string): Promise<StaffAccount | null> {
  const s = await findByPhone(db, phone);
  return s ? toAccount(s) : null;
}

/** Câu lệnh tạo tài khoản + PIN ngẫu nhiên (chỉ trả PIN thô ở đây để hiện một lần; DB chỉ lưu hash). */
export async function newStaffStatement(
  db: D1Database,
  input: { fullName: string; phone: string; role: StaffRole },
): Promise<{ id: string; pin: string; statement: D1PreparedStatement }> {
  const id = crypto.randomUUID();
  const pin = generatePin();
  const statement = db
    .prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
    .bind(id, input.fullName, input.phone, await hashPin(pin), input.role, new Date().toISOString());
  return { id, pin, statement };
}

/**
 * Câu lệnh sửa hồ sơ. Khi làm mất một quản trị viên đang hoạt động (hạ quyền/ngưng), câu lệnh có điều kiện
 * "còn admin hoạt động khác" ngay trong SQL nên hai admin sửa nhau cùng lúc cũng không thể làm hết admin.
 */
export function updateStaffStatement(
  db: D1Database,
  id: string,
  patch: { fullName?: string; phone?: string; role?: StaffRole; active?: boolean },
  losesAdmin: boolean,
): D1PreparedStatement {
  const sets: string[] = [];
  const binds: (string | number)[] = [];
  if (patch.fullName !== undefined) (sets.push("full_name = ?"), binds.push(patch.fullName));
  if (patch.phone !== undefined) (sets.push("phone = ?"), binds.push(patch.phone));
  if (patch.role !== undefined) (sets.push("role = ?"), binds.push(patch.role));
  if (patch.active !== undefined) (sets.push("active = ?"), binds.push(patch.active ? 1 : 0));
  const guard = losesAdmin ? " AND (SELECT count(*) FROM staff WHERE role = 'admin' AND active = 1 AND id != ?) >= 1" : "";
  return db
    .prepare(`UPDATE staff SET ${sets.join(", ")} WHERE id = ?${guard}`)
    .bind(...binds, id, ...(losesAdmin ? [id] : []));
}

/** Đặt PIN mới (hash) và thu hồi mọi phiên cũ. Trả PIN thô để hiện một lần cho người có thẩm quyền. */
export async function setPinStatement(db: D1Database, id: string, pin: string): Promise<D1PreparedStatement> {
  return db.prepare("UPDATE staff SET pin_hash = ?, credentials_changed_at = ? WHERE id = ?").bind(await hashPin(pin), Date.now(), id);
}

/** Đổi PIN mới: kiểm tra độ mạnh. Trả thông báo lỗi hoặc null. */
export function validateNewPin(pin: unknown, currentPin: string): string | null {
  if (!isValidPin(pin)) return "PIN mới phải gồm đúng 6 chữ số.";
  if (pin === currentPin) return "PIN mới phải khác PIN hiện tại.";
  if (isWeakPin(pin)) return "PIN mới quá dễ đoán (ví dụ 123456, 111111). Hãy chọn PIN khác.";
  return null;
}

function toProfile(s: StaffRecord): StaffProfile {
  return { id: s.id, fullName: s.full_name, phone: s.phone, role: s.role };
}

function toAccount(s: StaffRecord): StaffAccount {
  return { ...toProfile(s), active: s.active === 1, createdAt: s.created_at };
}
