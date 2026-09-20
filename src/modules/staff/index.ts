// API công khai của module staff — module khác CHỈ import từ file này. Không có route: API quản trị ở module `accounts`.
// staff sở hữu bảng `staff`, `stf_*` và luật tài khoản; các hàm ghi trả về CÂU LỆNH D1 chưa chạy để module gọi (accounts) gộp cùng nhật ký
// audit vào một db.batch() — đổi tài khoản và ghi dấu vết thành công/thất bại cùng nhau. Tên người thuộc hồ sơ (module parties):
// tạo/đổi tên tài khoản gọi hàm của parties (cạnh staff → parties, ADR-0002); staff.full_name/role là cột chết (ADR-0005).
import { newPersonStatements, renamePersonStatements, splitPersonName, validatePersonFullName } from "../parties";
import { hashPin, verifyDummy, verifyPin } from "./password";
import { isValidPin, normalizePhone } from "./phone";
import {
  closePermissionStatement, countActiveAdmins, findById, findByPhone, insertPermissionStatement, insertStaffStatement, listAll, parsePermissions,
  setPinStatement as setPinRow, updateStaffStatement, type StaffRow,
} from "./repository";
import { checkAccountChange, generatePin, isWeakPin } from "./rules";
import { parseStaffSheet as parseSheetRows, type StaffCandidate, type StaffSheetParse } from "./sheet";
import type { StaffAccount, StaffProfile } from "../../shared/contracts";
import type { PermissionCode } from "../../shared/permissions";
import { vnToday } from "../../shared/vn-date";

export type { StaffAccount, StaffCandidate, StaffProfile, StaffSheetParse };
export { checkAccountChange, countActiveAdmins, generatePin, hashPin, isValidPin, isWeakPin, normalizePhone, updateStaffStatement };

/**
 * Kiểm họ tên của tài khoản theo đúng giới hạn sẽ ghi vào hồ sơ (`pty_person`, CHECK của migration 0011) — trả thông báo lỗi hoặc null.
 * Giới hạn do module parties giữ (một nguồn duy nhất); `accounts` gọi hàm này để trả 400 thay vì để `db.batch()` vỡ thành 500.
 */
export function checkStaffName(fullName: string): string | null {
  const checked = validatePersonFullName(fullName);
  return checked.ok ? null : checked.message;
}

/** Đọc Sheet nhân viên, dùng chính luật tên của hồ sơ để loại dòng tên không hợp lệ (thành "dòng có vấn đề"). */
export const parseStaffSheet = (csv: string): StaffSheetParse => parseSheetRows(csv, checkStaffName);

function toProfile(s: StaffRow): StaffProfile {
  return { id: s.id, fullName: s.label, phone: s.phone, partyId: s.party_id, permissions: parsePermissions(s.permissions) };
}

function toAccount(s: StaffRow): StaffAccount {
  return { ...toProfile(s), active: s.active === 1, createdAt: s.created_at };
}

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
 * Lấy nhân viên đang hoạt động theo id (xác thực lại phiên mỗi request) — MỘT truy vấn D1 kèm tên và quyền.
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

/**
 * Câu lệnh tạo tài khoản: hồ sơ PERSON + vai trò hồ sơ STAFF (của parties) + tài khoản + quyền, theo thứ tự khoá ngoại; PIN ngẫu nhiên
 * (chỉ trả PIN thô ở đây để hiện một lần; DB chỉ lưu hash). `fullName` đã được người gọi kiểm không rỗng.
 * SĐT đăng nhập KHÔNG được sao chép thành liên hệ của hồ sơ (ADR-0001 mục 5).
 */
export async function createAccountStatements(
  db: D1Database,
  input: { fullName: string; phone: string; permissions: readonly PermissionCode[] },
  actorId: string | null,
): Promise<{ id: string; partyId: string; pin: string; statements: D1PreparedStatement[] }> {
  const now = new Date();
  const at = now.toISOString();
  const today = vnToday(now);
  const name = splitPersonName(input.fullName);
  if (!name) throw new Error("createAccountStatements: họ tên rỗng");
  const person = newPersonStatements(db, { name, roles: [{ roleTypeCode: "STAFF", locationId: null, from: today, to: null }], contactsFrom: today }, actorId, at);
  const id = crypto.randomUUID();
  const pin = generatePin();
  return {
    id,
    partyId: person.partyId,
    pin,
    statements: [
      ...person.statements,
      insertStaffStatement(db, { id, phone: input.phone, pinHash: await hashPin(pin), createdAt: at, partyId: person.partyId }),
      ...input.permissions.map((code) => insertPermissionStatement(db, id, code, actorId, at, false)),
    ],
  };
}

/** Đổi tên hiển thị của tài khoản = đổi tên hồ sơ (parties). Trả null nếu tài khoản chưa có hồ sơ (khoảng giữa hai lần triển khai N1). */
export function renameAccountStatements(db: D1Database, account: StaffAccount, fullName: string, actorId: string, at: string): D1PreparedStatement[] | null {
  const name = splitPersonName(fullName);
  return account.partyId && name ? renamePersonStatements(db, account.partyId, name, actorId, at) : null;
}

/**
 * Đặt tập quyền của tài khoản: đóng dòng quyền bị bỏ, mở dòng quyền mới (không xoá — lịch sử giữ nguyên).
 * Khi bỏ ADMIN, `guarded` là câu đóng ADMIN có điều kiện "còn quản trị viên hoạt động khác" và MỌI câu còn lại mang cùng điều kiện
 * (điều kiện bất biến trong giao dịch nên tất cả cùng áp dụng hoặc cùng không). Người gọi đặt `guarded` ĐẦU batch, ngay sau đó là câu nhật ký
 * `changes() > 0`, rồi đến `rest`; nếu `guarded.changes = 0` → 409 và không có gì thay đổi, không có dòng nhật ký.
 */
export function setPermissionStatements(
  db: D1Database,
  args: { staffId: string; current: readonly PermissionCode[]; next: readonly PermissionCode[]; actorId: string; at: string },
): { guarded: D1PreparedStatement | null; rest: D1PreparedStatement[]; changed: boolean } {
  const { staffId, current, next, actorId, at } = args;
  const removed = current.filter((c) => !next.includes(c));
  const added = next.filter((c) => !current.includes(c));
  const revokesAdmin = removed.includes("ADMIN");
  return {
    guarded: revokesAdmin ? closePermissionStatement(db, staffId, "ADMIN", actorId, at, true) : null,
    rest: [
      ...removed.filter((c) => c !== "ADMIN").map((c) => closePermissionStatement(db, staffId, c, actorId, at, revokesAdmin)),
      ...added.map((c) => insertPermissionStatement(db, staffId, c, actorId, at, revokesAdmin)),
    ],
    changed: removed.length + added.length > 0,
  };
}

/** Đặt PIN mới (hash) và thu hồi mọi phiên cũ. Trả PIN thô để hiện một lần cho người có thẩm quyền. */
export async function setPinStatement(db: D1Database, id: string, pin: string): Promise<D1PreparedStatement> {
  return setPinRow(db, id, await hashPin(pin), Date.now());
}

/** Đổi PIN mới: kiểm tra độ mạnh. Trả thông báo lỗi hoặc null. */
export function validateNewPin(pin: unknown, currentPin: string): string | null {
  if (!isValidPin(pin)) return "PIN mới phải gồm đúng 6 chữ số.";
  if (pin === currentPin) return "PIN mới phải khác PIN hiện tại.";
  if (isWeakPin(pin)) return "PIN mới quá dễ đoán (ví dụ 123456, 111111). Hãy chọn PIN khác.";
  return null;
}
