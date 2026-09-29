// Module accounts — quản trị tài khoản nhân viên (chỉ admin) và đổi PIN cá nhân. Route: /api/staff*, /api/account/*.
// Sheet nhân viên chỉ là nguồn ĐỀ XUẤT: admin xem trước rồi xác nhận; Sheet không bao giờ tự tạo/ngưng tài khoản hay cấp quyền ngoài "Bán hàng".
// Quyền trong app (ADR-0005) là tập SALES/ACCOUNTING/ADMIN/FIELD của tài khoản; KHÔNG phải vai trò hồ sơ (HDV, tài xế… — module parties).
import { auditStatement, type AuditAction } from "../audit";
import {
  PASSKEY_ERRORS, checkPasskeyAssertion, clearChallengeCookie, countActivePasskeys, deviceLabel, firstUserHandle, insertPasskeyStatement, issuePasskeyChallenge,
  limitChallenge, listActivePasskeys, lockedPhones, logPasskeyRejected, newSessionCookie, passkeyRp, readPasskeyChallenge, revokeAllPasskeysIfSuspendedStatement,
  revokeAllPasskeysStatement, revokePasskeyStatement, toPasskeyDto, unlockPhone, verifyPinThrottled, verifyRegistration,
} from "../auth";
import { getMaintenanceState } from "../maintenance";
import {
  accountRoleCodes, canManageAccount, checkAccountChange, checkStaffName, countActiveAdmins, createAccountStatements, createAccountWithRolesStatements, findStaffByPhone,
  generatePin, getAccountRoleState, getStaffAccount, isValidPin, listStaffAccounts, normalizePhone, parseStaffSheet, renameAccountStatements, roleChangeStatements,
  setPermissionStatements, setPinStatement, touchCredentialsStatement, updateStaffStatement, validateFreshPin, validateNewPin, type StaffAccount,
} from "../staff";
import type {
  PasskeyCreationOptionsResponse, PasskeyListResponse, PasskeyResponse, PasskeyRequestOptionsResponse, StaffAccountDto, StaffListResponse, StaffResponse,
  StaffRolesResponse, StaffSheetApplyResponse, StaffSheetPreviewResponse, StaffWithPinResponse,
} from "../../shared/contracts";
import { toBase64Url } from "../../shared/encoding";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { phoneChangeProblem } from "../../shared/maintenance";
import { PARTY_ID_RE } from "../../shared/party-id";
import { PERMISSION_CODES, can, isPermissionCode, type PermissionCode, quyenHienThi } from "../../shared/permissions";
import { route, type AppModule, type Ctx } from "../../shared/router";
import {
  highPermissionProblem, parseRoleAssignment, permissionsLabel, roleAssignmentProblem, rolesLabel, taiKhoanLaiProblem, type RoleAssignment, type RoleCode, type RoleProblem,
} from "../../shared/roles";
import { SheetError, fetchSheetCsv } from "../../shared/sheets";
import { vnToday } from "../../shared/vn-date";

const isUniqueViolation = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: staff\.phone/.test(e.message);
// A-1: trùng khoá passkey là một ràng buộc UNIQUE KHÁC (aut_passkey.credential_id) — isUniqueViolation ở trên KHÔNG khớp, nên phải kiểm riêng.
const isPasskeyTaken = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: aut_passkey\.credential_id/.test(e.message);
const PHONE_TAKEN = () => error(409, "phone_taken", "Số điện thoại này đã có tài khoản.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy nhân viên.");
const LAST_ADMIN = () => error(409, "account_rule", "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.");
// ADR-0019 điều 2: lời cổng `admin` của router, nhắc lại ở thân handler khi ô `admin.manage` của bảng quyền không cho.
const NOT_ADMIN = () => error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
const NOT_SUPER_ONLY = () => error(403, "forbidden", "Việc này chỉ người phụ trách hệ thống làm được.");
const NOT_MANAGER = () => error(403, "forbidden", "Chỉ quản lý được tài khoản cấp dưới.");
// DK-T3-02: đặt lại PIN ở đây KHÔNG hỏi PIN cũ — áp lên chính mình thì một phiên bỏ quên đủ để chiếm hẳn tài khoản (vượt ADR-0016 điều 2a).
const SELF_RESET_PIN = () => error(403, "forbidden", "Không tự đặt lại PIN của chính mình ở đây. Để đổi PIN, vào trang Tôi, mục “Đổi mã PIN”, rồi nhập PIN hiện tại.");
const NO_PARTY = () => error(409, "no_party", "Tài khoản này chưa có hồ sơ (đang di trú dữ liệu). Thử lại sau ít phút.");
const ROLE_MANAGED = () => error(409, "role_managed", "Tài khoản đã gán vai — đổi quyền bằng cách chọn vai hoặc chỉnh riêng ở mục Vai và quyền.");
const problemResponse = (p: RoleProblem): Response => error(p.forbidden ? 403 : 400, p.forbidden ? "forbidden" : "invalid_input", p.message);
/** Lỗi trigger luật cứng / ràng buộc duy nhất → phản hồi rõ nghĩa (lưới cuối — kiểm thuần đã chặn trước). */
function ruleViolation(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : "";
  if (/party_role_group_conflict/.test(m)) return error(409, "account_rule", "Một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài.");
  if (/lc1_external_account_permission/.test(m)) return error(409, "account_rule", "Tài khoản bên ngoài chỉ giữ quyền bên ngoài (Đối tác hoặc Tài xế đối tác).");
  // LC-1b (ADR-0048 B2.2): lớp CSDL — chỉ tới đây khi lời kiểm máy chủ (taiKhoanLaiProblem / roleAssignmentProblem, 400 invalid_input) bị vượt.
  if (/lc1b_driver_partner_alone/.test(m)) return error(409, "account_rule", "Tài khoản Tài xế đối tác không giữ thêm quyền nào khác.");
  if (/UNIQUE constraint failed: staff\.party_id/.test(m)) return error(409, "account_rule", "Hồ sơ này đã có tài khoản.");
  // R20 (điều phối viên 2026-09-24): tranh chấp ghi ĐỒNG THỜI trên cùng tài khoản (hai lần chỉnh tay trùng quyền, vai chồng lấn thời gian,
  // hoặc hai lần cùng mở một vai) — một bên thua cuộc đua, không phải lỗi hệ thống; báo tải lại rồi thử lại thay vì 500.
  // KHÔNG viết liền "pty_" + tên bảng vai hồ sơ ở đây (R-N1-12 quét cả chú thích) — khớp theo TÊN CHỈ MỤC không mang tiền tố "pty_".
  if (/UNIQUE constraint failed: stf_permission_adjustment/.test(m) || /party_role_overlap/.test(m) || /party_role_open_uq/.test(m)) {
    return error(409, "account_rule", "Tài khoản vừa được người khác sửa — tải lại rồi thử lại.");
  }
  return null;
}
/**
 * ADR-0014 điều 8 áp cho tài khoản NGƯỜI KHÁC ("Admin không làm được các việc đó với một Admin/Super Admin KHÁC") — tự sửa chính
 * mình đi theo luật riêng đã có từ trước (`checkAccountChange`: không tự ngưng/tự đổi quyền), không bị chặn thêm ở đây, kẻo che mất
 * thông báo cụ thể hơn của luật đó (và khoá luôn cả việc tự mở khoá của chính mình — chưa từng bị cấm).
 * Riêng tự ĐẶT LẠI PIN của chính mình thì bị chặn ngay trong route reset-pin (DK-T3-02, `SELF_RESET_PIN`), không ở hàm này — unlock và
 * passkeys/remove-all vẫn dùng hàm này nguyên như cũ.
 */
const mayManage = (actor: { id: string; permissions: readonly PermissionCode[] }, target: StaffAccount): boolean => actor.id === target.id || canManageAccount(actor.permissions, target.permissions);

function sheetError(e: unknown): Response {
  if (e instanceof SheetError) return error(e.code === "sheet_unreachable" ? 502 : 424, e.code, e.message);
  throw e;
}

// Giới hạn độ dài do module parties giữ (khớp CHECK của pty_person): kiểm Ở ĐÂY để tên quá dài thành 400, không làm vỡ db.batch() thành 500.
function cleanName(v: unknown): { value?: string; error?: string } {
  if (typeof v !== "string" || !v.trim()) return { error: "Họ tên là bắt buộc." };
  const s = v.trim().replace(/\s+/g, " ");
  const problem = checkStaffName(s);
  return problem ? { error: problem } : { value: s };
}

/** Tập quyền từ đầu vào: mảng mã hợp lệ, không trùng, ít nhất một (tài khoản không quyền không làm được gì). Trả tập theo thứ tự chuẩn hoặc lỗi. */
function cleanPermissions(v: unknown): { value?: PermissionCode[]; error?: string } {
  if (!Array.isArray(v) || v.length === 0 || !v.every(isPermissionCode)) return { error: "Danh sách quyền không hợp lệ: chọn ít nhất một quyền." };
  return { value: PERMISSION_CODES.filter((code) => v.includes(code)) };
}

const dto = (s: StaffAccount, locked: Set<string>, passkeys: Map<string, number>, roles: Map<string, RoleCode[]>): StaffAccountDto => ({
  ...s,
  locked: locked.has(s.phone),
  passkeyCount: passkeys.get(s.id) ?? 0,
  roles: roles.get(s.id) ?? [],
});
/** DTO của MỘT tài khoản sau thao tác — đọc lại khoá đăng nhập, số Face ID, vai. */
async function one(db: D1Database, id: string): Promise<StaffAccountDto> {
  const s = (await getStaffAccount(db, id))!;
  const [locked, passkeys, roles] = await Promise.all([lockedPhones(db), countActivePasskeys(db), accountRoleCodes(db, [s])]);
  return dto(s, locked, passkeys, roles);
}

/** Câu lệnh nhật ký cho thao tác quản trị trên một tài khoản. */
const adminAudit = (db: D1Database, adminId: string, action: AuditAction, targetId: string | undefined, detail?: string, onlyIf?: string) =>
  auditStatement(db, { staffId: adminId, action, at: new Date().toISOString(), targetType: "staff", targetId, detail }, onlyIf);

/** Tài khoản theo `:id`; id sai dạng hoặc không có → null (route trả 404). */
async function target(ctx: Ctx): Promise<StaffAccount | null> {
  const id = ctx.params.id!;
  return UUID_RE.test(id) ? getStaffAccount(ctx.env.DB, id) : null;
}

export interface StaffPatch {
  fullName?: string;
  phone?: string;
  active?: boolean;
}

/**
 * Các câu lệnh của MỘT `PATCH /api/staff/:id` (tách khỏi route để kiểm được bằng SQLite thật).
 * Trả `null` khi phải đổi tên mà tài khoản chưa có hồ sơ (route trả 409 `no_party`).
 * `guardIndex` là vị trí câu chốt thắng/thua trong batch, hoặc −1 nếu lần sửa này không có câu chốt (chỉ đổi tên).
 *
 * Thứ tự BẮT BUỘC khi có câu chốt (`updateStaffStatement`, mang vị từ OTHER_ADMIN): chốt → nhật ký (`changes() > 0`) → đổi tên
 * (cũng `changes() > 0`). Mọi câu ghi của cùng một PATCH mang CÙNG điều kiện thắng, như `PUT /api/staff/:id/permissions` và
 * `wonGuard` của orders: bên thua không ghi gì, không nhật ký; bên thắng đổi đủ. Hai điều làm chuỗi này đúng:
 * (1) mỗi mắt xích đều đổi ≥ 1 dòng ở đường thắng (dòng nhật ký được chèn; dòng `pty_party` chắc chắn có — xem renamePersonStatements);
 * (2) hễ có câu đổi tên thì CHẮC CHẮN có dòng nhật ký `staff_updated` đứng trước (cả hai cùng do `patch.fullName !== undefined` sinh ra).
 * Sửa ở đây phải giữ hai điều đó.
 *
 * Ngưng tài khoản (`active: false`) gỡ mọi Face ID trong CÙNG lô (ADR-0016 điều 6; chủ chọn A-4 phương án 1). Câu gỡ có thể đổi 0 dòng
 * (không có khoá) nên KHÔNG được chen vào chuỗi trên — nó đứng CUỐI, sau mọi mắt xích cũ, và mang điều kiện riêng "tài khoản đang ngưng"
 * (câu chốt thua ⇒ vẫn active = 1 ⇒ không gỡ gì). Thứ tự: gỡ → touch `credentials_changed_at` (`changes() > 0`, phải NGAY SAU câu gỡ — A-3)
 * → nhật ký `passkey_removed` (`changes() > 0`, đọc câu touch: touch đổi đúng 1 dòng khi và chỉ khi câu gỡ đổi ≥ 1 dòng).
 * Mốc `credentials_changed_at` = `Date.parse(at)`: một mốc duy nhất cho cả lần sửa.
 */
export function patchStaffStatements(
  db: D1Database,
  args: { target: StaffAccount; patch: StaffPatch; adminId: string; at: string; losesAdmin: boolean },
): { statements: D1PreparedStatement[]; guardIndex: number } | null {
  const { target: t, patch, adminId, at, losesAdmin } = args;
  const needsUpdate = patch.phone !== undefined || patch.active !== undefined;
  const rename = patch.fullName === undefined ? [] : renameAccountStatements(db, t, patch.fullName, adminId, at, needsUpdate);
  if (rename === null) return null;
  const stmts: D1PreparedStatement[] = [];
  if (needsUpdate) stmts.push(updateStaffStatement(db, t.id, patch, losesAdmin));
  // Chỉ ghi nhật ký nếu câu chốt thực sự áp dụng (changes() > 0), tránh ghi dấu vết cho thao tác bị chặn khi tranh chấp.
  const onlyIf = needsUpdate ? "changes() > 0" : undefined;
  const log = (action: AuditAction, detail?: string) => adminAudit(db, adminId, action, t.id, detail, onlyIf);
  if (patch.fullName !== undefined || patch.phone !== undefined) {
    const bits = [patch.fullName !== undefined && `tên "${t.fullName}" → "${patch.fullName}"`, patch.phone !== undefined && "đổi SĐT đăng nhập"].filter(Boolean); // KHÔNG ghi số: nhật ký không chứa SĐT/email/MST (chủ chốt 2026-09-21)
    stmts.push(log("staff_updated", bits.join("; ")));
  }
  if (patch.active === false) stmts.push(log("staff_suspended"));
  if (patch.active === true) stmts.push(log("staff_reactivated"));
  stmts.push(...rename);
  if (patch.active === false) {
    stmts.push(
      revokeAllPasskeysIfSuspendedStatement(db, t.id, at, adminId),
      touchCredentialsStatement(db, t.id, Date.parse(at), true),
      adminAudit(db, adminId, "passkey_removed", t.id, "gỡ khi ngưng tài khoản", "changes() > 0"),
    );
  }
  return { statements: stmts, guardIndex: needsUpdate ? 0 : -1 };
}

export const accountsModule: AppModule = {
  name: "accounts",
  routes: [
    // ---- Đổi PIN của chính mình -------------------------------------------------
    route("POST", "/api/account/change-pin", "staff", async ({ request, env, staff, dongBangTin }) => {
      const body = await readJson(request);
      const currentPin = body?.currentPin;
      if (!isValidPin(currentPin)) return error(400, "invalid_input", "Cần nhập PIN hiện tại (6 số).");
      const problem = validateNewPin(body?.newPin, currentPin);
      if (problem) return error(400, "invalid_input", problem);
      // Cùng bộ đếm chống dò với đăng nhập: đổi PIN không được thành đường vòng để dò PIN hiện tại.
      const check = await verifyPinThrottled(request, env, staff.phone, currentPin);
      if (!check.ok) return check.response.status === 401 ? error(403, "invalid_credentials", "PIN hiện tại không đúng.") : check.response;
      const at = new Date().toISOString();
      await env.DB.batch([
        await setPinStatement(env.DB, staff.id, body!.newPin as string),
        auditStatement(env.DB, { staffId: staff.id, action: "pin_changed", at, targetType: "staff", targetId: staff.id }),
      ]);
      // BẢNG TIN (KN-2): PIN vừa đổi — đóng các kết nối cũ của chính tài khoản này (thiết bị khác sẽ phải đăng nhập lại rồi mới nối lại được).
      dongBangTin({ staffId: staff.id, tatThongBao: true });
      // Mọi phiên cũ (kể cả thiết bị khác) đã bị thu hồi; cấp phiên mới để thiết bị này không phải đăng nhập lại.
      return json({ ok: true }, 200, { "set-cookie": await newSessionCookie(request, env, staff.id) });
    }),

    // ---- Đăng nhập bằng Face ID (passkey, ADR-0016) — của chính mình ------------------------------------------
    // Bật: nhập lại PIN (điều 2a, cùng bộ chống dò của đăng nhập) → thách thức "register" → trình duyệt tạo khoá → kiểm → lưu + nhật ký.
    route("POST", "/api/account/passkeys/options", "staff", async ({ request, env, staff }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const pin = (await readJson(request))?.pin;
      if (!isValidPin(pin)) return error(400, "invalid_input", "Cần nhập PIN hiện tại (6 số).");
      const check = await verifyPinThrottled(request, env, staff.phone, pin);
      if (!check.ok) return check.response.status === 401 ? error(403, "invalid_credentials", "PIN không đúng.") : check.response;
      const [keys, handle] = await Promise.all([listActivePasskeys(env.DB, staff.id), firstUserHandle(env.DB, staff.id)]);
      const userHandle = handle ?? toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
      const { challenge, cookie } = await issuePasskeyChallenge(request, env, "register", staff.id, userHandle);
      const name = staff.fullName.trim() || "Tài khoản Tour Đảo"; // KHÔNG dùng SĐT (ADR-0016 điều 8)
      return json(
        {
          publicKey: {
            challenge,
            rp: { id: rp.rpId, name: "Island Booking System" }, // tên app hiện trong hộp thoại Face ID; rpId (miền) KHÔNG đổi nên khoá đã bật vẫn dùng được
            user: { id: userHandle, name, displayName: name },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
            timeout: 120_000,
            attestation: "none",
            authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
            excludeCredentials: keys.map((k) => ({ type: "public-key" as const, id: k.credential_id })),
          },
        } satisfies PasskeyCreationOptionsResponse,
        200,
        { "set-cookie": cookie },
      );
    }),

    route("POST", "/api/account/passkeys", "staff", async ({ request, env, staff }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const credential = (await readJson(request))?.credential;
      const ch = await readPasskeyChallenge(request, env, "register", staff.id);
      if (!ch?.extra) return PASSKEY_ERRORS.expired();
      let reg;
      try {
        reg = await verifyRegistration(rp, ch.challenge, credential);
      } catch (e) {
        logPasskeyRejected(e);
        return PASSKEY_ERRORS.registerInvalid();
      }
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      const label = deviceLabel(request.headers.get("user-agent"));
      try {
        await env.DB.batch([
          insertPasskeyStatement(env.DB, { id, staffId: staff.id, ...reg, userHandle: ch.extra, label, at }),
          auditStatement(env.DB, { staffId: staff.id, action: "passkey_added", at, targetType: "staff", targetId: staff.id }),
        ]);
      } catch (e) {
        if (isPasskeyTaken(e)) return PASSKEY_ERRORS.exists();
        throw e;
      }
      const res = json({ passkey: { id, label, createdAt: at, lastUsedAt: null } } satisfies PasskeyResponse, 201);
      res.headers.append("set-cookie", clearChallengeCookie(request));
      return res;
    }),

    // Đặc tả §2.3: Face ID TẮT ⇒ MỌI route passkey trả 503, kể cả xem danh sách và gỡ (đặt lại PIN do quản trị viên vẫn gỡ hết Face ID).
    route("GET", "/api/account/passkeys", "staff", async ({ env, staff }) => {
      if (!passkeyRp(env)) return PASSKEY_ERRORS.off();
      return json({ passkeys: (await listActivePasskeys(env.DB, staff.id)).map(toPasskeyDto) } satisfies PasskeyListResponse);
    }),

    // Gỡ = đóng hiệu lực + đăng xuất mọi máy khác (điều 6); máy đang thao tác nhận phiên mới cùng mốc `now`.
    route("POST", "/api/account/passkeys/remove-all", "staff", async ({ request, env, staff, dongBangTin }) => {
      if (!passkeyRp(env)) return PASSKEY_ERRORS.off();
      const now = Date.now();
      const at = new Date(now).toISOString();
      const [revoked] = await env.DB.batch([
        revokeAllPasskeysStatement(env.DB, staff.id, at, staff.id),
        touchCredentialsStatement(env.DB, staff.id, now, true),
        auditStatement(env.DB, { staffId: staff.id, action: "passkey_removed", at, targetType: "staff", targetId: staff.id, detail: "gỡ tất cả" }, "changes() > 0"),
      ]);
      const removed = revoked!.meta.changes ?? 0;
      // BẢNG TIN (KN-2): credentials_changed_at luôn được "touch" ở trên dù không còn Face ID nào — đóng kết nối cũ theo đúng nhịp đó.
      dongBangTin({ staffId: staff.id, tatThongBao: true });
      return json({ removed }, 200, removed > 0 ? { "set-cookie": await newSessionCookie(request, env, staff.id, now) } : {});
    }),

    route("DELETE", "/api/account/passkeys/:id", "staff", async ({ request, env, staff, params, dongBangTin }) => {
      if (!passkeyRp(env)) return PASSKEY_ERRORS.off();
      const id = params.id!;
      if (!UUID_RE.test(id)) return error(404, "not_found", "Không tìm thấy Face ID này.");
      const now = Date.now();
      const at = new Date(now).toISOString();
      const [revoked] = await env.DB.batch([
        revokePasskeyStatement(env.DB, id, staff.id, at, staff.id),
        touchCredentialsStatement(env.DB, staff.id, now, true),
        auditStatement(env.DB, { staffId: staff.id, action: "passkey_removed", at, targetType: "staff", targetId: staff.id }, "changes() > 0"),
      ]);
      if ((revoked!.meta.changes ?? 0) === 0) return error(404, "not_found", "Không tìm thấy Face ID này.");
      dongBangTin({ staffId: staff.id, tatThongBao: true }); // BẢNG TIN (KN-2): gỡ thành công — đóng kết nối cũ.
      return json({ ok: true }, 200, { "set-cookie": await newSessionCookie(request, env, staff.id, now) });
    }),

    // Đặt PIN mới bằng Face ID, không cần PIN cũ (điều 2b): bắt buộc MỘT lần ký passkey mới với thách thức "pin" riêng — phiên đang mở là không đủ.
    route("POST", "/api/account/pin-by-passkey/options", "staff", async ({ request, env, staff }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const limited = await limitChallenge(request, env);
      if (limited) return limited;
      const keys = await listActivePasskeys(env.DB, staff.id);
      if (keys.length === 0) return PASSKEY_ERRORS.none();
      const { challenge, cookie } = await issuePasskeyChallenge(request, env, "pin", staff.id);
      return json(
        { publicKey: { challenge, rpId: rp.rpId, timeout: 120_000, userVerification: "required", allowCredentials: keys.map((k) => ({ type: "public-key" as const, id: k.credential_id })) } } satisfies PasskeyRequestOptionsResponse,
        200,
        { "set-cookie": cookie },
      );
    }),

    route("POST", "/api/account/pin-by-passkey", "staff", async ({ request, env, staff, dongBangTin }) => {
      const rp = passkeyRp(env);
      if (!rp) return PASSKEY_ERRORS.off();
      const body = await readJson(request);
      const problem = validateFreshPin(body?.newPin);
      if (problem) return error(400, "invalid_input", problem);
      const ch = await readPasskeyChallenge(request, env, "pin", staff.id);
      if (!ch) return PASSKEY_ERRORS.expired();
      const checked = await checkPasskeyAssertion(env, rp, ch, body?.credential, staff.id);
      if (!checked.ok) return checked.response;
      const now = Date.now();
      const at = new Date(now).toISOString();
      await env.DB.batch([
        await setPinStatement(env.DB, staff.id, body!.newPin as string, now),
        auditStatement(env.DB, { staffId: staff.id, action: "pin_set_by_passkey", at, targetType: "staff", targetId: staff.id }),
      ]);
      await unlockPhone(env.DB, staff.phone); // chủ quyết 2026-09-23: có PIN mới thì gỡ khoá "sai PIN quá nhiều", như admin reset-pin
      dongBangTin({ staffId: staff.id, tatThongBao: true }); // BẢNG TIN (KN-2): PIN vừa đổi.
      const res = json({ ok: true }, 200, { "set-cookie": await newSessionCookie(request, env, staff.id, now) });
      res.headers.append("set-cookie", clearChallengeCookie(request));
      return res;
    }),

    // ---- Danh sách / tạo thủ công ------------------------------------------------
    route("GET", "/api/staff", "admin", async ({ env, staff: admin }) => {
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      const [staff, locked, passkeys] = await Promise.all([listStaffAccounts(env.DB), lockedPhones(env.DB), countActivePasskeys(env.DB)]);
      const roles = await accountRoleCodes(env.DB, staff);
      const seesHidden = can(admin, "admin.manage.superadmin"); // ADR-0042: Toàn quyền là vai ẩn với người khác
      return json({ staff: staff.map((s) => ({ ...dto(s, locked, passkeys, roles), permissions: quyenHienThi(s.permissions, seesHidden) })) } satisfies StaffListResponse);
    }),

    route("POST", "/api/staff", "admin", async ({ request, env, staff: admin }) => {
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      const actorIsSuper = can(admin, "admin.manage.superadmin"); // LC-4 (ADR-0019): "là Toàn quyền" do bảng quyền trả lời, không kiểm tay
      const db = env.DB;
      const body = await readJson(request);
      const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
      if (body?.roles !== undefined) {
        // ---- Đường MỚI (ADR-0018): tạo theo vai, có thể trên hồ sơ cá nhân có sẵn.
        const parsed = parseRoleAssignment(body);
        if (!parsed.ok) return error(400, "invalid_input", parsed.message);
        const existingPartyId = typeof body.partyId === "string" && body.partyId ? body.partyId : null;
        if (existingPartyId !== null && !PARTY_ID_RE.test(existingPartyId)) return error(400, "invalid_input", "Hồ sơ đã chọn không hợp lệ.");
        const name: { value?: string | null; error?: string } = existingPartyId ? { value: null } : cleanName(body.fullName);
        if (name.error) return error(400, "invalid_input", name.error);
        if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
        const problem = roleAssignmentProblem({ actorIsSuper, currentRoles: [], currentPermissions: [], currentAdjustments: { adds: [], removes: [] }, next: parsed.value });
        if (problem) return problemResponse(problem);
        if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
        const created = await createAccountWithRolesStatements(db, { fullName: name.value ?? null, phone, assignment: parsed.value, existingPartyId }, admin.id);
        if (!created.ok) return error(409, "account_rule", created.message);
        const detail = [
          `vai: ${rolesLabel(parsed.value.roles)}`,
          `quyền: ${permissionsLabel(created.permissions)}`,
          existingPartyId ? "dùng hồ sơ có sẵn" : "",
          parsed.value.reason ? `lý do: ${parsed.value.reason}` : "",
        ].filter(Boolean).join("; ");
        try {
          await db.batch([...created.statements, adminAudit(db, admin.id, "staff_created", created.id, detail)]);
        } catch (e) {
          if (isUniqueViolation(e)) return PHONE_TAKEN();
          const rule = ruleViolation(e);
          if (rule) return rule;
          throw e;
        }
        return json({ staff: await one(db, created.id), pin: created.pin } satisfies StaffWithPinResponse, 201);
      }
      // ---- Đường CŨ (giữ nguyên hành vi, thêm LC-4): danh sách quyền, hồ sơ mới mang vai STAFF.
      const name = cleanName(body?.fullName);
      if (name.error) return error(400, "invalid_input", name.error);
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      // D-02 (ADR-0014 điều 7): trường permissions HOÀN TOÀN VẮNG MẶT → không quyền nào (trước đây tự động Bán hàng — lỗ khi gọi thẳng API,
      // bỏ qua màn quản trị vốn luôn gửi danh sách và bắt chọn ít nhất một). Gửi permissions: [] tường minh vẫn bị cleanPermissions từ chối.
      const perms = body?.permissions === undefined ? { value: [] } : cleanPermissions(body.permissions);
      if (perms.error) return error(400, "invalid_input", perms.error);
      // LC-4 (ADR-0018 điều 5): chỉ Toàn quyền cấp Quản trị/Toàn quyền — thay luật cũ chỉ chặn SUPER_ADMIN (trước đây Quản trị cấp được Quản trị).
      const high = highPermissionProblem(actorIsSuper, [], perms.value!);
      if (high) return problemResponse(high);
      const lai = taiKhoanLaiProblem(perms.value!); // LC-1b (ADR-0048 B2.2): đường cũ không qua roleAssignmentProblem
      if (lai) return problemResponse(lai);
      if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
      const created = await createAccountStatements(db, { fullName: name.value!, phone, permissions: perms.value! }, admin.id);
      try {
        await db.batch([...created.statements, adminAudit(db, admin.id, "staff_created", created.id, `quyền: ${permissionsLabel(perms.value!)}`)]);
      } catch (e) {
        if (isUniqueViolation(e)) return PHONE_TAKEN();
        const rule = ruleViolation(e); // lưới cuối: lỗi trigger (LC-1b…) thành 409, không 500
        if (rule) return rule;
        throw e;
      }
      return json({ staff: await one(db, created.id), pin: created.pin } satisfies StaffWithPinResponse, 201);
    }),

    // ---- Đồng bộ từ Google Sheet: xem trước rồi áp dụng --------------------------
    route("GET", "/api/staff/sheet", "admin", async ({ env, staff: admin }) => {
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      if (!can(admin, "staff.sheet.sync")) return NOT_SUPER_ONLY(); // ADR-0038 điều 6 (sửa bởi ADR-0042: ô đăng nhập mở lại cho Quản trị, chỉ cấp dưới qua mayManage)
      let parsed;
      try {
        parsed = parseStaffSheet(await fetchSheetCsv(env.STAFF_SHEET_ID));
      } catch (e) {
        return sheetError(e);
      }
      if (!parsed.ok) return error(422, "sheet_bad_format", `Sheet thiếu cột "Tên người dùng" hoặc "Số điện thoại" (đọc được: ${parsed.headers.join(" | ")}).`);
      const existing = new Map((await listStaffAccounts(env.DB)).map((s) => [s.phone, s]));
      const inSheet = new Set(parsed.candidates.map((c) => c.phone));
      return json({
        candidates: parsed.candidates.map((c) => {
          const have = existing.get(c.phone);
          return { row: c.row, name: c.name, phone: c.phone, status: !have ? "new" : have.fullName === c.name ? "same" : "name_differs", currentName: have?.fullName ?? null };
        }),
        problems: parsed.problems,
        notInSheet: [...existing.values()].filter((s) => !inSheet.has(s.phone)).map((s) => ({ fullName: s.fullName, phone: s.phone, active: s.active })),
      } satisfies StaffSheetPreviewResponse);
    }),

    route("POST", "/api/staff/sheet/apply", "admin", async ({ request, env, staff: admin }) => {
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      if (!can(admin, "staff.sheet.sync")) return NOT_SUPER_ONLY(); // ADR-0038 điều 6 (sửa bởi ADR-0042: ô đăng nhập mở lại cho Quản trị, chỉ cấp dưới qua mayManage)
      const db = env.DB;
      const body = await readJson(request);
      const wanted = Array.isArray(body?.phones) ? body.phones.filter((p): p is string => typeof p === "string") : [];
      if (wanted.length === 0) return error(400, "invalid_input", "Chưa chọn ai để thêm.");
      // Tải lại Sheet và chỉ tin dữ liệu của Sheet, không tin tên/SĐT do client gửi.
      let parsed;
      try {
        parsed = parseStaffSheet(await fetchSheetCsv(env.STAFF_SHEET_ID));
      } catch (e) {
        return sheetError(e);
      }
      if (!parsed.ok) return error(422, "sheet_bad_format", "Sheet thiếu cột bắt buộc.");
      const pick = new Set(wanted);
      const todo = [];
      for (const c of parsed.candidates) if (pick.has(c.phone) && !(await findStaffByPhone(db, c.phone))) todo.push(c);
      if (todo.length === 0) return error(409, "nothing_to_add", "Không có ai để thêm (đã có tài khoản hoặc Sheet vừa thay đổi). Hãy đồng bộ lại.");
      const salesStaff: RoleAssignment = { roles: ["SALES_STAFF"], adds: [], removes: [], reason: null };
      const made = await Promise.all(todo.map(async (c) => {
        const r = await createAccountWithRolesStatements(db, { fullName: c.name, phone: c.phone, assignment: salesStaff, existingPartyId: null }, admin.id);
        if (!r.ok) throw new Error(r.message); // hồ sơ mới luôn hợp lệ — không xảy ra
        return { c, ...r };
      }));
      try {
        await db.batch([
          ...made.flatMap((m) => [...m.statements, adminAudit(db, admin.id, "staff_created", m.id, "nạp từ Google Sheet, vai: Nhân viên kinh doanh")]),
          adminAudit(db, admin.id, "staff_synced", undefined, `thêm ${made.length} tài khoản từ Google Sheet`),
        ]);
      } catch (e) {
        if (isUniqueViolation(e)) return error(409, "phone_taken", "Có số điện thoại vừa được tạo bởi người khác. Hãy đồng bộ lại.");
        throw e;
      }
      return json({ created: made.map((m) => ({ id: m.id, fullName: m.c.name, phone: m.c.phone, pin: m.pin })) } satisfies StaffSheetApplyResponse, 201);
    }),

    // ---- Sửa một tài khoản (tên, SĐT đăng nhập, ngưng/kích hoạt) --------------------------------
    route("PATCH", "/api/staff/:id", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      // ADR-0014 điều 8: Quản trị viên chỉ quản lý được tài khoản cấp dưới (không giữ ADMIN/SUPER_ADMIN); Super Admin quản lý được mọi tài khoản.
      if (!mayManage(admin, t)) return NOT_MANAGER();
      const body = await readJson(request);
      if (!body) return error(400, "invalid_input", "Dữ liệu không hợp lệ.");
      const patch: { fullName?: string; phone?: string; active?: boolean } = {};
      if (body.fullName !== undefined) {
        const n = cleanName(body.fullName);
        if (n.error) return error(400, "invalid_input", n.error);
        if (n.value !== t.fullName) patch.fullName = n.value;
      }
      if (body.phone !== undefined) {
        const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
        if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ.");
        if (phone !== t.phone) {
          // Chế độ bảo trì nhận diện chủ dự án theo SĐT: đổi SĐT của tài khoản chủ sẽ khoá chính họ (đang bật thì không ai tắt được từ giao diện) hoặc để số cũ rơi vào tay người khác.
          const locksOwner = phoneChangeProblem(await getMaintenanceState(db), t.phone, phone);
          if (locksOwner) return error(409, "account_rule", locksOwner);
          if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
          patch.phone = phone;
        }
      }
      if (body.active !== undefined) {
        if (typeof body.active !== "boolean") return error(400, "invalid_input", "Trạng thái phải là true/false.");
        if (body.active !== t.active) patch.active = body.active;
      }
      if (Object.keys(patch).length === 0) return json({ staff: await one(db, t.id) } satisfies StaffResponse);

      const problem = checkAccountChange(admin.id, t, { active: patch.active }, await countActiveAdmins(db));
      if (problem) return error(409, "account_rule", problem);
      const losesAdmin = t.permissions.includes("ADMIN") && t.active && patch.active === false;

      const now = Date.now(); // MỘT mốc cho cả lần sửa: `at` (ISO) và, khi ngưng tài khoản, `credentials_changed_at` = Date.parse(at) = now
      const at = new Date(now).toISOString();
      const built = patchStaffStatements(db, { target: t, patch, adminId: admin.id, at, losesAdmin });
      if (!built) return error(409, "no_party", "Tài khoản này chưa có hồ sơ (đang di trú dữ liệu). Thử lại sau ít phút.");
      let results;
      try {
        results = await db.batch(built.statements);
      } catch (e) {
        if (isUniqueViolation(e)) return PHONE_TAKEN();
        throw e;
      }
      if (built.guardIndex >= 0 && (results[built.guardIndex]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
      // BẢNG TIN (KN-2): tài khoản bị ngưng hoặc đổi SĐT đăng nhập — đóng các kết nối của NÓ (không phải của admin đang thao tác).
      if (patch.active === false || patch.phone !== undefined) ctx.dongBangTin({ staffId: t.id, tatThongBao: true });
      return json({ staff: await one(db, t.id) } satisfies StaffResponse);
    }),

    // ---- Đặt tập quyền của tài khoản (ADR-0005) ---------------------------------------------------------
    route("PUT", "/api/staff/:id/permissions", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      const actorIsSuper = can(admin, "admin.manage.superadmin");
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      // ADR-0014 điều 8: Quản trị viên chỉ quản lý được tài khoản cấp dưới; Super Admin quản lý được mọi tài khoản.
      if (!mayManage(admin, t)) return NOT_MANAGER();
      const state = await getAccountRoleState(db, t, vnToday(new Date()));
      if (state && state.roles.length > 0) return ROLE_MANAGED();
      const perms = cleanPermissions((await readJson(request))?.permissions);
      if (perms.error) return error(400, "invalid_input", perms.error);
      const next = perms.value!;
      const problem = checkAccountChange(admin.id, t, { permissions: next }, await countActiveAdmins(db));
      if (problem) return error(409, "account_rule", problem);
      const high = highPermissionProblem(actorIsSuper, t.permissions, next); // LC-4 (ADR-0018 điều 5), thay luật riêng cho SUPER_ADMIN
      if (high) return problemResponse(high);
      const lai = taiKhoanLaiProblem(next); // LC-1b (ADR-0048 B2.2): tài khoản chưa gán vai đổi quyền bằng đường cũ
      if (lai) return problemResponse(lai);

      const at = new Date().toISOString();
      const plan = setPermissionStatements(db, { staffId: t.id, current: t.permissions, next, actorId: admin.id, at });
      if (!plan.changed) return json({ staff: await one(db, t.id) } satisfies StaffResponse);
      const detail = `${permissionsLabel(t.permissions)} → ${permissionsLabel(next)}`;
      // Khi bỏ ADMIN: câu đóng ADMIN có điều kiện đứng đầu; nhật ký chỉ ghi nếu nó thắng (changes() > 0); các câu còn lại mang cùng điều kiện.
      const stmts = [...(plan.guarded ? [plan.guarded] : []), adminAudit(db, admin.id, "permission_changed", t.id, detail, plan.guarded ? "changes() > 0" : undefined), ...plan.rest];
      let results: D1Result[];
      try {
        results = await db.batch(stmts);
      } catch (e) {
        const rule = ruleViolation(e); // lưới cuối: lỗi trigger (LC-1b…) thành 409, không 500
        if (rule) return rule;
        throw e;
      }
      if (plan.guarded && (results[0]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
      ctx.dongBangTin({ staffId: t.id, tatThongBao: false }); // BẢNG TIN (KN-2): quyền vừa đổi. ADR-0046: đổi quyền KHÔNG tắt thông báo điện thoại.
      return json({ staff: await one(db, t.id) } satisfies StaffResponse);
    }),

    // ---- Vai với Tour Đảo của tài khoản (ADR-0018) ---------------------------------------------------------
    route("GET", "/api/staff/:id/roles", "admin", async (ctx) => {
      if (!can(ctx.staff, "admin.manage")) return NOT_ADMIN();
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      if (!mayManage(ctx.staff, t)) return NOT_MANAGER(); // ADR-0042: vai + chỉnh riêng của tài khoản Toàn quyền/Quản trị khác không lộ cho Quản trị
      const state = await getAccountRoleState(ctx.env.DB, t, vnToday(new Date()));
      if (!state) return NO_PARTY();
      return json({ roles: state.roles, adds: state.adds, removes: state.removes, reason: state.reason } satisfies StaffRolesResponse);
    }),

    route("PUT", "/api/staff/:id/roles", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      if (!can(admin, "admin.manage")) return NOT_ADMIN();
      const actorIsSuper = can(admin, "admin.manage.superadmin");
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      if (!mayManage(admin, t)) return NOT_MANAGER();
      const parsed = parseRoleAssignment(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const now = new Date();
      const at = now.toISOString();
      const today = vnToday(now);
      const state = await getAccountRoleState(db, t, today);
      if (!state || !t.partyId) return NO_PARTY();
      const problem = roleAssignmentProblem({ actorIsSuper, currentRoles: state.roles, currentPermissions: t.permissions, currentAdjustments: { adds: state.adds, removes: state.removes }, next: parsed.value });
      if (problem) return problemResponse(problem);
      const change = roleChangeStatements(db, { account: t, partyId: t.partyId, state, next: parsed.value, actorId: admin.id, at, today });
      const accountProblem = checkAccountChange(admin.id, t, { permissions: change.next }, await countActiveAdmins(db));
      if (accountProblem) return error(409, "account_rule", accountProblem);
      if (!change.changed) return json({ staff: await one(db, t.id) } satisfies StaffResponse);
      const detail = [
        `vai: ${rolesLabel(state.roles)} → ${rolesLabel(parsed.value.roles)}`,
        `quyền: ${permissionsLabel(t.permissions)} → ${permissionsLabel(change.next)}`,
        change.dropped.length ? `luật cứng gạt: ${permissionsLabel(change.dropped)}` : "",
        parsed.value.reason ? `lý do: ${parsed.value.reason}` : "",
      ].filter(Boolean).join("; ");
      try {
        if (change.permissions.guarded) {
          // Gỡ ADMIN: câu chốt "còn quản trị viên khác" ĐẦU batch; nhật ký + quyền + chỉnh tay mang cùng điều kiện. Vai (module parties) không mang được
          // điều kiện của staff nên chạy SAU, chỉ khi câu chốt thắng — tranh chấp chỉ có thể xảy ra giữa hai tài khoản Toàn quyền (LC-4).
          const results = await db.batch([
            change.permissions.guarded,
            adminAudit(db, admin.id, "account_roles_changed", t.id, detail, "changes() > 0"),
            ...change.permissions.rest,
            ...change.adjustmentStatements,
          ]);
          if ((results[0]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
          if (change.roleStatements.length) await db.batch(change.roleStatements);
        } else {
          await db.batch([...change.roleStatements, ...change.adjustmentStatements, ...change.permissions.rest, adminAudit(db, admin.id, "account_roles_changed", t.id, detail)]);
        }
      } catch (e) {
        const rule = ruleViolation(e);
        if (rule) return rule;
        throw e;
      }
      ctx.dongBangTin({ staffId: t.id, tatThongBao: false }); // BẢNG TIN (KN-2): vai/quyền vừa đổi. ADR-0046: đổi vai KHÔNG tắt thông báo điện thoại.
      return json({ staff: await one(db, t.id) } satisfies StaffResponse);
    }),

    route("POST", "/api/staff/:id/reset-pin", "admin", async (ctx) => {
      if (!can(ctx.staff, "admin.manage")) return NOT_ADMIN();
      if (!can(ctx.staff, "account.access.manage")) return NOT_SUPER_ONLY(); // ADR-0038 điều 6 (sửa bởi ADR-0042: ô đăng nhập mở lại cho Quản trị, chỉ cấp dưới qua mayManage)
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      if (t.id === ctx.staff.id) return SELF_RESET_PIN(); // DK-T3-02: chặn TRƯỚC mọi ghi; tự đổi PIN chỉ qua change-pin (PIN hiện tại) hoặc pin-by-passkey (ký Face ID mới)
      if (!mayManage(ctx.staff, t)) return NOT_MANAGER();
      const pin = generatePin();
      const now = Date.now();
      const at = new Date(now).toISOString();
      await db.batch([
        await setPinStatement(db, t.id, pin, now),
        adminAudit(db, ctx.staff.id, "pin_reset", t.id), // nhật ký KHÔNG chứa PIN
        revokeAllPasskeysStatement(db, t.id, at, ctx.staff.id), // ADR-0016 điều 6: đặt lại PIN gỡ mọi Face ID
        adminAudit(db, ctx.staff.id, "passkey_removed", t.id, "gỡ khi đặt lại PIN", "changes() > 0"),
      ]);
      await unlockPhone(db, t.phone);
      ctx.dongBangTin({ staffId: t.id, tatThongBao: true }); // BẢNG TIN (KN-2): PIN vừa được đặt lại.
      return json({ staff: await one(db, t.id), pin } satisfies StaffWithPinResponse);
    }),

    // ADR-0016 điều 6/8: quản trị viên gỡ mọi Face ID của một tài khoản (vd. mất máy, nghi lộ khoá) mà không cần đặt lại PIN.
    route("POST", "/api/staff/:id/passkeys/remove-all", "admin", async (ctx) => {
      if (!can(ctx.staff, "admin.manage")) return NOT_ADMIN();
      if (!can(ctx.staff, "account.access.manage")) return NOT_SUPER_ONLY(); // ADR-0038 điều 6 (sửa bởi ADR-0042: ô đăng nhập mở lại cho Quản trị, chỉ cấp dưới qua mayManage)
      if (!passkeyRp(ctx.env)) return PASSKEY_ERRORS.off();
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      if (!mayManage(ctx.staff, t)) return NOT_MANAGER();
      const now = Date.now();
      const at = new Date(now).toISOString();
      await db.batch([
        revokeAllPasskeysStatement(db, t.id, at, ctx.staff.id),
        touchCredentialsStatement(db, t.id, now, true),
        adminAudit(db, ctx.staff.id, "passkey_removed", t.id, "quản trị viên gỡ", "changes() > 0"),
      ]);
      ctx.dongBangTin({ staffId: t.id, tatThongBao: true }); // BẢNG TIN (KN-2): credentials_changed_at vừa được "touch".
      return json({ staff: await one(db, t.id) } satisfies StaffResponse);
    }),

    route("POST", "/api/staff/:id/unlock", "admin", async (ctx) => {
      if (!can(ctx.staff, "admin.manage")) return NOT_ADMIN();
      if (!can(ctx.staff, "account.access.manage")) return NOT_SUPER_ONLY(); // ADR-0038 điều 6 (sửa bởi ADR-0042: ô đăng nhập mở lại cho Quản trị, chỉ cấp dưới qua mayManage)
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      if (!mayManage(ctx.staff, t)) return NOT_MANAGER();
      await unlockPhone(db, t.phone);
      await adminAudit(db, ctx.staff.id, "login_unlocked", t.id).run();
      return json({ ok: true });
    }),
  ],
};
