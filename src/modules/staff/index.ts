// API công khai của module staff — module khác CHỈ import từ file này. Không có route: API quản trị ở module `accounts`.
// staff sở hữu bảng `staff`, `stf_*` và luật tài khoản; các hàm ghi trả về CÂU LỆNH D1 chưa chạy để module gọi (accounts) gộp cùng nhật ký
// audit vào một db.batch() — đổi tài khoản và ghi dấu vết thành công/thất bại cùng nhau. Tên người thuộc hồ sơ (module parties):
// tạo/đổi tên tài khoản gọi hàm của parties (cạnh staff → parties, ADR-0002); staff.full_name/role là cột chết (ADR-0005).
import {
  accountRolesOf, closeAccountRoleStatement, hoSoCaNhanKhop, hoSoMangNhanDoiTac, newPersonStatements, openAccountRoleStatement, openRoleCodesByParty, partySummary, renamePersonStatements,
  reopenAccountRoleStatement, splitPersonName, validatePersonFullName, type AccountRole,
} from "../parties";
import { hashPin, verifyDummy, verifyPin } from "./password";
import { isValidPin, normalizePhone } from "./phone";
import {
  accountIdOfParty, closeAdjustmentStatement, closePermissionStatement, countActiveAdmins, findById, findByPhone, insertAdjustmentStatement, insertPermissionStatement,
  insertStaffStatement, labelsByIds, listAll, mfaDeadlinesRow, mfaEnrollSetRow, mfaGraceAll, mfaGraceIfNullRow, openAdjustments, parsePermissions, partiesWithAccount, phonesByParty, recordLoginRow, sessionOwnersByIds, setPinStatement as setPinRow, taiKhoanChoXacMinhRows, touchCredentialsStatement, updateStaffStatement,
  type AdjustmentRow, type StaffRow,
} from "./repository";
import {
  KHONG_NHAN_VAI_NOI_BO, canManageAccount, checkAccountChange, coQuyenNoiBo, generatePin, isWeakPin, MFA_ENROLL_WINDOW_MS, mfaGraceOnCreate, mfaGraceOnReactivate, mfaKhiThanhNoiBo, mfaSauDoiQuyen, moNoiBoChoHoSoCoNhanProblem, partyAccountVerdict,
  validateFreshPin,
} from "./rules";
import type { PartyMatchResponse, StaffAccount, StaffProfile } from "../../shared/contracts";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions";
import { ROLES, ROLE_CODES, effectivePermissions, groupOf, isRoleCode, type RoleAssignment, type RoleCode } from "../../shared/roles";
import { addDays, vnToday } from "../../shared/vn-date";

export type { StaffAccount, StaffProfile };
export {
  KHONG_NHAN_VAI_NOI_BO, MFA_ENROLL_WINDOW_MS, canManageAccount, checkAccountChange, countActiveAdmins, generatePin, hashPin, isValidPin, isWeakPin, mfaKhiThanhNoiBo,
  mfaGraceOnReactivate, mfaSauDoiQuyen, moNoiBoChoHoSoCoNhanProblem, normalizePhone, touchCredentialsStatement, updateStaffStatement, validateFreshPin,
};

/**
 * ADR-0117 điều 4, chiều 2 — hồ sơ `partyId` có đang mang loại đối tác được hưởng không (hàm công bố của parties). `accounts` hỏi qua đây (không có cạnh
 * accounts → parties) rồi gọi hàm thuần moNoiBoChoHoSoCoNhanProblem TRƯỚC mọi lô ghi.
 */
export async function hoSoCoNhanDoiTac(db: D1Database, partyId: string): Promise<boolean> {
  return (await hoSoMangNhanDoiTac(db, [partyId])).has(partyId);
}

/**
 * HÀM CÔNG BỐ (ADR-0125 đ3, đ5) — CHỈ gốc lắp ráp gọi (tiêm `ctx.taiKhoanXacMinh`): mọi tài khoản (id, quyền ĐANG HIỆU LỰC, đang hoạt động, hồ sơ gắn) cho route xác minh phiếu
 * tự khai của `parties` (cấp bậc, "còn ai xác minh được"). Không SĐT, email, tên. MỘT truy vấn D1.
 */
export const taiKhoanChoXacMinh = (db: D1Database): Promise<{ id: string; permissions: PermissionCode[]; active: boolean; partyId: string | null }[]> => taiKhoanChoXacMinhRows(db);

/**
 * HÀM CÔNG BỐ (ruling R-P20 của điều phối — ADR-0049 kế hoạch mục 1.8 / R-P11): TÊN HIỂN THỊ của các tài khoản theo id — nhãn "người bấm" trên nhật ký chuyến
 * của van-chuyen. CHỈ gốc lắp ráp gọi (tiêm `ctx.nhanNhanVien`) — van-chuyen không import staff. Chỉ tên (view `v_stf_staff_label`): không SĐT, email, quyền.
 */
export const nhanNhanVienTheoId = (db: D1Database, ids: readonly string[]): Promise<Map<string, string>> => labelsByIds(db, ids);

/**
 * HÀM CÔNG BỐ (ADR-0075 điều 7) — `accounts` gọi cho route xem sổ phiên: tên hiển thị + mốc `credentials_changed_at` (mili-giây) của các tài khoản theo id,
 * để trạng thái phiên tính cả theo lưới (phiên cấp trước lần đổi PIN/gỡ Face ID không hiện "Đang hiệu lực"), và mã quyền đang mở — để route tính
 * "đặt lại PIN được không" bằng CÙNG luật cấp bậc với route reset-pin (canManageAccount). Không SĐT.
 */
export const chuPhienTheoId = (
  db: D1Database,
  ids: readonly string[],
): Promise<Map<string, { label: string; credentialsChangedAt: number | null; permissions: PermissionCode[] }>> =>
  sessionOwnersByIds(db, ids);

/** HÀM CÔNG BỐ (ADR-0068 Đ8) — CHỈ gốc lắp ráp gọi (ctx.gopHoSo.soDangNhap): SĐT đăng nhập theo hồ sơ, cho lý do "số đăng nhập trùng số liên hệ". */
export const soDangNhapTheoHoSo = (db: D1Database): Promise<{ partyId: string; phone: string }[]> => phonesByParty(db);

/**
 * Kiểm họ tên của tài khoản theo đúng giới hạn sẽ ghi vào hồ sơ (`pty_person`, CHECK của migration 0011) — trả thông báo lỗi hoặc null.
 * Giới hạn do module parties giữ (một nguồn duy nhất); `accounts` gọi hàm này để trả 400 thay vì để `db.batch()` vỡ thành 500.
 */
export function checkStaffName(fullName: string): string | null {
  const checked = validatePersonFullName(fullName);
  return checked.ok ? null : checked.message;
}

function toProfile(s: StaffRow): StaffProfile {
  return { id: s.id, fullName: s.label, phone: s.phone, partyId: s.party_id, permissions: parsePermissions(s.permissions) };
}

function toAccount(s: StaffRow): StaffAccount {
  return { ...toProfile(s), active: s.active === 1, createdAt: s.created_at, lastLoginAt: s.last_login_at };
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
 * Ghi nhận một lần đăng nhập THÀNH CÔNG (`staff.last_login_at`, ISO UTC) — `POST /api/auth/login` (PIN) VÀ `POST /api/auth/passkey/login` (Face ID, ADR-0016)
 * đều gọi. KHÔNG đặt trong `verifyPinThrottled`: hàm đó dùng chung với đổi PIN, ghi ở đó thì mỗi lần đổi PIN thành "một lần đăng nhập". Chỉ ghi thời điểm,
 * không ghi SĐT/PIN vào đâu cả.
 */
export async function recordLogin(db: D1Database, id: string, at: string): Promise<void> {
  await recordLoginRow(db, id, at);
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

/**
 * HÀM CÔNG BỐ (ADR-0074) — module auth gọi ở cổng lớp hai của đăng nhập PIN: hạn ân hạn 14 ngày (`mfa_grace_until`) và cửa sổ bật lại 24 giờ sau khi
 * Quản trị/Toàn quyền tắt lớp hai (`mfa_enroll_until`), ISO UTC hoặc null. Tài khoản không có → cả hai null (cổng đóng cửa an toàn với tài khoản nội bộ).
 */
export async function mfaDeadlinesOf(db: D1Database, id: string): Promise<{ graceUntil: string | null; enrollUntil: string | null }> {
  const r = await mfaDeadlinesRow(db, id);
  return { graceUntil: r?.mfa_grace_until ?? null, enrollUntil: r?.mfa_enroll_until ?? null };
}

/** HÀM CÔNG BỐ (kế hoạch Task 6) — nhãn "Hai lớp" ở danh sách Quản lý tài khoản: hạn ân hạn của mọi tài khoản theo id (ISO UTC hoặc null). */
export const mfaGraceTheoId = (db: D1Database): Promise<Map<string, string | null>> => mfaGraceAll(db);
/**
 * Câu (CHƯA chạy) đặt hạn ân hạn `until` cho tài khoản đang hoạt động CHỈ khi hạn đang NULL (ADR-0074 điều 1: trở thành nội bộ, kích hoạt lại; vòng sửa 1
 * Task 6: hạn đã qua không gia hạn tự động). `until` tính bằng mfaKhiThanhNoiBo / mfaGraceOnReactivate (null ⇒ người gọi không nối câu này).
 */
export const mfaGraceIfNullStatement = (db: D1Database, id: string, until: string): D1PreparedStatement => mfaGraceIfNullRow(db, id, until);
/** Câu (CHƯA chạy) đặt / xoá cửa sổ bật lại lớp hai `mfa_enroll_until` (ADR-0074 điều 5). Auth gọi với null trong lô bật xong ở bước đăng nhập. */
export const mfaEnrollWindowStatement = (db: D1Database, id: string, until: string | null): D1PreparedStatement => mfaEnrollSetRow(db, id, until);

export async function getStaffAccount(db: D1Database, id: string): Promise<StaffAccount | null> {
  const s = await findById(db, id);
  return s ? toAccount(s) : null;
}

/**
 * ADR-0013 điều 4 — gốc lắp ráp tiêm vào `ctx.partyAccount` (module `parties` không import `staff`). Trả KẾT LUẬN, không trả id/quyền
 * của tài khoản. Hai lượt đọc: id theo hồ sơ, rồi tài khoản đầy đủ (có quyền) bằng hàm đã có.
 */
export async function accountOfParty(
  db: D1Database,
  actor: { id: string; permissions: readonly PermissionCode[] },
  partyId: string,
): Promise<{ linked: false } | { linked: true; manageable: boolean; vaiAn: boolean; coQuyenNoiBo: boolean }> {
  const id = await accountIdOfParty(db, partyId);
  const target = id ? await getStaffAccount(db, id) : null;
  const shown = id && !target ? { id, permissions: ["SUPER_ADMIN"] as PermissionCode[] } : target;
  const v = partyAccountVerdict(actor, shown);
  // ADR-0044: hồ sơ gắn tài khoản Toàn quyền là "vai ẩn" — parties lọc lịch sử vai khi người xem không giữ Toàn quyền.
  // ADR-0117 điều 4 (vế 3): tài khoản có quyền nội bộ — bản giả «Toàn quyền ẩn» ở trên cho true (siết).
  return v.linked ? { ...v, vaiAn: shown!.permissions.includes("SUPER_ADMIN"), coQuyenNoiBo: coQuyenNoiBo(shown!.permissions) } : v;
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
      insertStaffStatement(db, { id, phone: input.phone, pinHash: await hashPin(pin), createdAt: at, partyId: person.partyId, mfaGraceUntil: mfaGraceOnCreate(input.permissions, now.getTime()) }),
      ...input.permissions.map((code) => insertPermissionStatement(db, id, code, actorId, at, false)),
    ],
  };
}

/**
 * Đổi tên hiển thị của tài khoản = đổi tên hồ sơ (parties). Trả null nếu tài khoản chưa có hồ sơ (khoảng giữa hai lần triển khai N1).
 * `onlyIfPrevApplied` = true khi người gọi ghép các câu này vào một batch có CÂU CHỐT thắng/thua đứng trước: đổi tên chỉ áp dụng nếu
 * câu ngay trước đã áp dụng (`changes() > 0`), để bên thua không đổi tên nửa vời mà không có nhật ký.
 */
export function renameAccountStatements(db: D1Database, account: StaffAccount, fullName: string, actorId: string, at: string, onlyIfPrevApplied = false): D1PreparedStatement[] | null {
  const name = splitPersonName(fullName);
  return account.partyId && name ? renamePersonStatements(db, account.partyId, name, actorId, at, onlyIfPrevApplied) : null;
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

/**
 * Đặt PIN mới (hash) và thu hồi mọi phiên cũ. `at` (mili-giây) = mốc `credentials_changed_at`; phiên mới cấp ngay sau phải dùng
 * CÙNG mốc (so sánh là `>`, xem `getActiveStaff`). Trả câu lệnh D1 chưa chạy (PIN thô do người gọi tự giữ để hiện một lần).
 */
export async function setPinStatement(db: D1Database, id: string, pin: string, at = Date.now()): Promise<D1PreparedStatement> {
  return setPinRow(db, id, await hashPin(pin), at);
}

/** Đổi PIN mới: kiểm tra độ mạnh. Trả thông báo lỗi hoặc null. */
export function validateNewPin(pin: unknown, currentPin: string): string | null {
  if (!isValidPin(pin)) return "PIN mới phải gồm đúng 6 chữ số.";
  if (pin === currentPin) return "PIN mới phải khác PIN hiện tại.";
  if (isWeakPin(pin)) return "PIN mới quá dễ đoán (ví dụ 123456, 111111). Hãy chọn PIN khác.";
  return null;
}

// =================================================================================================================================================
// Vai → quyền (ADR-0018 điều 3). NƠI DUY NHẤT vai ảnh hưởng quyền: đọc vai qua hàm của parties (không nhắc bảng vai — R-N1-12), tính quyền hiệu lực
// bằng src/shared/roles.ts, trả câu lệnh CHƯA chạy để accounts gộp cùng nhật ký. Tài khoản chưa gán vai mới KHÔNG bao giờ bị tính lại quyền ở đây.
// =================================================================================================================================================

/** Mã vai cũ (migration 0011) — đóng khi tài khoản được gán vai mô hình mới (đặc tả §4, §14). */
const LEGACY_ACCOUNT_ROLES: readonly string[] = ["STAFF", "SALES", "GUIDE", "AGENT"];

export interface AccountRoleState {
  /** Vai mô hình mới đang mở. Rỗng = tài khoản chưa chuyển sang cách mới (giữ nguyên quyền cũ). */
  roles: RoleCode[];
  adds: PermissionCode[];
  removes: PermissionCode[];
  /** Lý do của lần chỉnh tay gần nhất (giao diện điền sẵn); null khi không có chỉnh tay. */
  reason: string | null;
  /** Dòng vai không gắn nơi: đang mở + đóng từ hôm nay (để dựng câu đóng/mở lại). */
  rows: AccountRole[];
  adjustments: AdjustmentRow[];
}

export async function getAccountRoleState(db: D1Database, account: StaffAccount, today: string): Promise<AccountRoleState | null> {
  if (!account.partyId) return null;
  const [rows, adjustments] = await Promise.all([accountRolesOf(db, account.partyId, today), openAdjustments(db, account.id)]);
  const open = rows.filter((r) => r.validTo === null).map((r) => r.roleTypeCode);
  const adjusted = (direction: string) => PERMISSION_CODES.filter((c) => adjustments.some((a) => a.permission_type_code === c && a.direction === direction));
  return { roles: ROLE_CODES.filter((c) => open.includes(c)), adds: adjusted("ADD"), removes: adjusted("REMOVE"), reason: adjustments[0]?.reason ?? null, rows, adjustments };
}

export interface RoleChange {
  /** Câu vai (module parties) — ĐÓNG trước, MỞ sau, để trigger LC-3 không vấp khi đổi nhóm trong một lần lưu. */
  roleStatements: D1PreparedStatement[];
  adjustmentStatements: D1PreparedStatement[];
  /** Như setPermissionStatements: `guarded` ≠ null khi lần đổi gỡ ADMIN (route chạy hai batch — xem accounts). */
  permissions: { guarded: D1PreparedStatement | null; rest: D1PreparedStatement[] };
  next: PermissionCode[];
  dropped: PermissionCode[];
  changed: boolean;
}

/**
 * Câu lệnh cho MỘT lần đổi vai + chỉnh tay. Người gọi đã kiểm roleAssignmentProblem + checkAccountChange. Vai bỏ đi đóng vào HÔM QUA nếu bắt đầu trước
 * hôm nay (không còn hiệu lực từ hôm nay), vào HÔM NAY nếu mới mở hôm nay; gán lại một vai vừa đóng hôm nay thì MỞ LẠI dòng đó (không chèn dòng chồng lấn).
 */
export function roleChangeStatements(
  db: D1Database,
  args: { account: StaffAccount; partyId: string; state: AccountRoleState; next: RoleAssignment; actorId: string; at: string; today: string },
): RoleChange {
  const { account, partyId, state, next, actorId, at, today } = args;
  const { permissions: nextPermissions, dropped } = effectivePermissions(next.roles, next);
  const perm = setPermissionStatements(db, { staffId: account.id, current: account.permissions, next: nextPermissions, actorId, at });
  const guarded = perm.guarded !== null;
  const closing = state.rows.filter(
    (r) => r.validTo === null && ((isRoleCode(r.roleTypeCode) && !next.roles.includes(r.roleTypeCode)) || LEGACY_ACCOUNT_ROLES.includes(r.roleTypeCode)),
  );
  const opening = next.roles.filter((code) => !state.rows.some((r) => r.roleTypeCode === code && r.validTo === null));
  const roleStatements = [
    ...closing.map((r) => closeAccountRoleStatement(db, partyId, r.id, r.validFrom < today ? addDays(today, -1) : today, actorId, at)),
    ...opening.map((code) => {
      const closedToday = state.rows.find((r) => r.roleTypeCode === code && r.validTo === today);
      return closedToday ? reopenAccountRoleStatement(db, partyId, closedToday.id, actorId, at) : openAccountRoleStatement(db, partyId, code, today, actorId, at);
    }),
  ];
  const wanted = [...next.adds.map((c) => ({ c, d: "ADD" as const })), ...next.removes.map((c) => ({ c, d: "REMOVE" as const }))];
  const closeAdj = state.adjustments.filter((a) => !wanted.some((w) => w.c === a.permission_type_code && w.d === a.direction));
  const newAdj = wanted.filter((w) => !state.adjustments.some((a) => a.permission_type_code === w.c && a.direction === w.d));
  const adjustmentStatements = [
    ...closeAdj.map((a) => closeAdjustmentStatement(db, { id: a.id, staffId: account.id, at, actorId, guarded })),
    ...newAdj.map((w) => insertAdjustmentStatement(db, { staffId: account.id, code: w.c, direction: w.d, reason: next.reason ?? "", at, actorId, guarded })),
  ];
  return {
    roleStatements,
    adjustmentStatements,
    permissions: { guarded: perm.guarded, rest: perm.rest },
    next: nextPermissions,
    dropped,
    changed: perm.changed || roleStatements.length > 0 || adjustmentStatements.length > 0,
  };
}

export type CreateWithRoles =
  | { ok: true; id: string; partyId: string; pin: string; statements: D1PreparedStatement[]; permissions: PermissionCode[] }
  | { ok: false; message: string; code?: "party_merged" };

/**
 * ADR-0068 Đ9: hồ sơ cá nhân khớp khi Thêm tài khoản — MỘT nguồn cho 409 party_match_exists và route đọc của màn Quản lý tài khoản. Không SĐT của hồ sơ.
 * ADR-0071 điều 3b: thu hẹp theo người gọi. `xemDanhBa` (ô party.view) → như cũ. Không (Hành chính nhân sự) → chỉ hồ sơ đang mở vai tài khoản (ROLE_CODES) hoặc
 * đã có tài khoản, và trường `vai` chỉ gồm tên vai tài khoản; phần còn lại (khách, hồ sơ không vai tài khoản) gộp thành cờ `coHoSoKhacTrongDanhBa` — không id, tên, vai.
 */
export async function hoSoKhopKhiTaoTaiKhoan(db: D1Database, v: { phone: string | null; ten: string | null }, xemDanhBa: boolean): Promise<PartyMatchResponse> {
  const khop = await hoSoCaNhanKhop(db, v);
  const ids = khop.map((k) => k.id);
  const [coTaiKhoan, vai] = await Promise.all([partiesWithAccount(db, ids), vaiTaiKhoanDangMo(db, ids)]);
  const thayDuoc = (id: string) => xemDanhBa || laHoSoTaiKhoan(id, coTaiKhoan, vai);
  // Chủ dự án 2026-10-01: người không xem Danh bạ chỉ thấy tên VAI TÀI KHOẢN của hồ sơ (bỏ "Khách hàng", "Lái cano"… — vai đó là dữ liệu Danh bạ).
  const tenVai = (k: (typeof khop)[number]) => (xemDanhBa ? k.vai : (vai.get(k.id) ?? []).map((c) => ROLES[c].name));
  return {
    khop: khop.filter((k) => thayDuoc(k.id)).map((k) => ({ ...k, vai: tenVai(k), vaiTaiKhoan: vai.get(k.id) ?? [], coTaiKhoan: coTaiKhoan.has(k.id) })),
    coHoSoKhacTrongDanhBa: khop.some((k) => !thayDuoc(k.id)),
  };
}

/** Vai tài khoản (ROLE_CODES) ĐANG MỞ của nhiều hồ sơ — cùng định nghĩa "đang mở" với nguồn sinh quyền (không gắn nơi, chưa đóng; Ruling R1, R26). */
async function vaiTaiKhoanDangMo(db: D1Database, ids: readonly string[]): Promise<Map<string, RoleCode[]>> {
  const mo = await openRoleCodesByParty(db, ids);
  return new Map([...mo].map(([id, codes]) => [id, ROLE_CODES.filter((c) => codes.includes(c))]));
}
/** ADR-0071 điều 3b — MỘT luật "hồ sơ người không xem Danh bạ được thấy khi tạo tài khoản": đã có tài khoản, hoặc đang mở vai tài khoản. */
const laHoSoTaiKhoan = (id: string, coTaiKhoan: ReadonlySet<string>, vai: ReadonlyMap<string, readonly RoleCode[]>): boolean =>
  coTaiKhoan.has(id) || (vai.get(id)?.length ?? 0) > 0;

/**
 * Tạo tài khoản THEO VAI (ADR-0018): hồ sơ mới mang đúng các vai đã chọn (không thêm vai STAFF cũ), HOẶC dùng lại hồ sơ cá nhân có sẵn (chưa có tài khoản,
 * không va chạm nhóm vai, và chọn ĐỦ các vai tài khoản hồ sơ đang giữ — Ruling R26). Quyền = quyền hiệu lực của vai + chỉnh tay. Thứ tự câu: vai → tài khoản → quyền → chỉnh tay (khoá ngoại + trigger LC-1).
 */
export async function createAccountWithRolesStatements(
  db: D1Database,
  input: { fullName: string | null; phone: string; assignment: RoleAssignment; existingPartyId: string | null; xemDanhBa: boolean },
  actorId: string,
): Promise<CreateWithRoles> {
  const now = new Date();
  const at = now.toISOString();
  const today = vnToday(now);
  const { assignment } = input;
  const { permissions } = effectivePermissions(assignment.roles, assignment);
  const statements: D1PreparedStatement[] = [];
  let partyId: string;
  if (input.existingPartyId) {
    const party = await partySummary(db, input.existingPartyId);
    if (!party) return { ok: false, message: "Không tìm thấy hồ sơ đã chọn." };
    // ADR-0071 điều 3b: người gọi không xem được Danh bạ chỉ dùng được hồ sơ họ được thấy (đang mở vai tài khoản hoặc đã có tài khoản) — hồ sơ khác trả ĐÚNG
    // câu "không tìm thấy" như trên (không lộ hồ sơ tồn tại).
    if (!input.xemDanhBa) {
      const ids = [input.existingPartyId];
      const [coTaiKhoan, vai] = await Promise.all([partiesWithAccount(db, ids), vaiTaiKhoanDangMo(db, ids)]);
      if (!laHoSoTaiKhoan(input.existingPartyId, coTaiKhoan, vai)) return { ok: false, message: "Không tìm thấy hồ sơ đã chọn." };
    }
    if (party.kind !== "PERSON") return { ok: false, message: "Tài khoản chung cho công ty làm ở giai đoạn sau — hãy chọn hồ sơ cá nhân." };
    // ADR-0068 G16: hồ sơ đã gộp (luôn ngưng) — mã riêng để người tạo biết mở hồ sơ chính.
    if (party.mergedIntoId) return { ok: false, code: "party_merged", message: "Hồ sơ này đã gộp vào hồ sơ khác — chọn hồ sơ chính." };
    if (!party.active) return { ok: false, message: "Hồ sơ đã chọn đang ngưng hoạt động." };
    if (await accountIdOfParty(db, input.existingPartyId)) return { ok: false, message: "Hồ sơ này đã có tài khoản." };
    const open = (await accountRolesOf(db, input.existingPartyId, today)).filter((r) => r.validTo === null).map((r) => r.roleTypeCode).filter(isRoleCode);
    if (groupOf([...open, ...assignment.roles]) === "MIXED") return { ok: false, message: "Hồ sơ này đang giữ vai khác nhóm (nội bộ/bên ngoài) — đóng vai đó trước." };
    // ADR-0117 điều 4, chiều 2: hồ sơ đang mang loại đối tác được hưởng không nhận vai / quyền nội bộ. Câu không nêu tên loại (người gọi có thể là Nhân sự).
    const nhan = await hoSoMangNhanDoiTac(db, [input.existingPartyId]);
    const noiBo = moNoiBoChoHoSoCoNhanProblem({ nhanDoiTac: nhan.has(input.existingPartyId), vaiTiep: assignment.roles, quyenTiep: permissions });
    if (noiBo) return { ok: false, message: noiBo };
    // Ruling R26: quyền chỉ tính từ vai được chọn — hồ sơ còn giữ vai tài khoản nào KHÔNG được chọn thì quyền sẽ lệch vai. Chặn (an toàn), bắt chọn cả vai đó.
    const kept = ROLE_CODES.filter((c) => open.includes(c) && !assignment.roles.includes(c));
    if (kept.length) return { ok: false, message: `Hồ sơ này đang giữ vai ${kept.map((c) => ROLES[c].name).join(", ")}: chọn cả vai này (hoặc đổi vai sau khi tạo).` };
    partyId = input.existingPartyId;
    statements.push(...assignment.roles.filter((c) => !open.includes(c)).map((c) => openAccountRoleStatement(db, partyId, c, today, actorId, at)));
  } else {
    const name = input.fullName ? splitPersonName(input.fullName) : null;
    if (!name) throw new Error("createAccountWithRolesStatements: họ tên rỗng");
    const person = newPersonStatements(db, { name, roles: assignment.roles.map((c) => ({ roleTypeCode: c, locationId: null, from: today, to: null })), contactsFrom: today }, actorId, at);
    partyId = person.partyId;
    statements.push(...person.statements);
  }
  const id = crypto.randomUUID();
  const pin = generatePin();
  const adjust = (code: PermissionCode, direction: "ADD" | "REMOVE") =>
    insertAdjustmentStatement(db, { staffId: id, code, direction, reason: assignment.reason ?? "", at, actorId, guarded: false });
  statements.push(
    insertStaffStatement(db, { id, phone: input.phone, pinHash: await hashPin(pin), createdAt: at, partyId, mfaGraceUntil: mfaGraceOnCreate(permissions, now.getTime()) }),
    ...permissions.map((code) => insertPermissionStatement(db, id, code, actorId, at, false)),
    ...assignment.adds.map((c) => adjust(c, "ADD")),
    ...assignment.removes.map((c) => adjust(c, "REMOVE")),
  );
  return { ok: true, id, partyId, pin, statements, permissions };
}

/** Vai mô hình mới đang mở của từng tài khoản — MỘT truy vấn cho cả danh sách (vai cũ STAFF… không tính). */
export async function accountRoleCodes(db: D1Database, accounts: readonly StaffAccount[]): Promise<Map<string, RoleCode[]>> {
  const byParty = await openRoleCodesByParty(db, accounts.flatMap((a) => (a.partyId ? [a.partyId] : [])));
  return new Map(accounts.map((a) => [a.id, ROLE_CODES.filter((c) => (a.partyId ? (byParty.get(a.partyId) ?? []) : []).includes(c))]));
}

/** Mã vai tài khoản còn hiệu lực của MỘT tài khoản (ADR-0075 điều 3: auth hỏi vai IT lúc cấp phiên). */
export async function accountRoleCodesOf(db: D1Database, staffId: string): Promise<RoleCode[]> {
  const acct = await getStaffAccount(db, staffId);
  if (!acct) return [];
  return (await accountRoleCodes(db, [acct])).get(staffId) ?? [];
}
