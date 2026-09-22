// Module accounts — quản trị tài khoản nhân viên (chỉ admin) và đổi PIN cá nhân. Route: /api/staff*, /api/account/*.
// Sheet nhân viên chỉ là nguồn ĐỀ XUẤT: admin xem trước rồi xác nhận; Sheet không bao giờ tự tạo/ngưng tài khoản hay cấp quyền ngoài "Bán hàng".
// Quyền trong app (ADR-0005) là tập SALES/ACCOUNTING/ADMIN/FIELD của tài khoản; KHÔNG phải vai trò hồ sơ (HDV, tài xế… — module parties).
import { auditStatement, type AuditAction } from "../audit";
import { lockedPhones, newSessionCookie, unlockPhone, verifyPinThrottled } from "../auth";
import { getMaintenanceState } from "../maintenance";
import {
  canManageAccount, checkAccountChange, checkStaffName, countActiveAdmins, createAccountStatements, findStaffByPhone, generatePin, getStaffAccount, isValidPin,
  listStaffAccounts, normalizePhone, parseStaffSheet, renameAccountStatements, setPermissionStatements, setPinStatement, updateStaffStatement, validateNewPin,
  type StaffAccount,
} from "../staff";
import type { StaffAccountDto, StaffListResponse, StaffResponse, StaffSheetApplyResponse, StaffSheetPreviewResponse, StaffWithPinResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { phoneChangeProblem } from "../../shared/maintenance";
import { PERMISSION_CODES, PERMISSION_LABEL, isPermissionCode, type PermissionCode } from "../../shared/permissions";
import { route, type AppModule, type Ctx } from "../../shared/router";
import { SheetError, fetchSheetCsv } from "../../shared/sheets";

const isUniqueViolation = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: staff\.phone/.test(e.message);
const PHONE_TAKEN = () => error(409, "phone_taken", "Số điện thoại này đã có tài khoản.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy nhân viên.");
const LAST_ADMIN = () => error(409, "account_rule", "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.");
const NOT_MANAGER = () => error(403, "forbidden", "Chỉ quản lý được tài khoản cấp dưới; tài khoản này do Super Admin quản lý.");
const SUPER_ADMIN_ONLY = () => error(403, "forbidden", "Chỉ Super Admin mới cấp hoặc gỡ quyền Super Admin.");
/**
 * ADR-0014 điều 8 áp cho tài khoản NGƯỜI KHÁC ("Admin không làm được các việc đó với một Admin/Super Admin KHÁC") — tự sửa chính
 * mình đi theo luật riêng đã có từ trước (`checkAccountChange`: không tự ngưng/tự đổi quyền), không bị chặn thêm ở đây, kẻo che mất
 * thông báo cụ thể hơn của luật đó (và khoá luôn cả việc tự đặt lại mã/mở khoá của chính mình — chưa từng bị cấm).
 */
const mayManage = (actor: { id: string; permissions: readonly PermissionCode[] }, target: StaffAccount): boolean => actor.id === target.id || canManageAccount(actor.permissions, target.permissions);
const labelOf = (list: readonly PermissionCode[]) => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "không có quyền");

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
  if (!Array.isArray(v) || v.length === 0 || !v.every(isPermissionCode)) return { error: `Quyền phải là một danh sách không rỗng gồm: ${PERMISSION_CODES.join(", ")}.` };
  return { value: PERMISSION_CODES.filter((code) => v.includes(code)) };
}

const dto = (s: StaffAccount, locked: Set<string>): StaffAccountDto => ({ ...s, locked: locked.has(s.phone) });

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
  return { statements: stmts, guardIndex: needsUpdate ? 0 : -1 };
}

export const accountsModule: AppModule = {
  name: "accounts",
  routes: [
    // ---- Đổi PIN của chính mình -------------------------------------------------
    route("POST", "/api/account/change-pin", "staff", async ({ request, env, staff }) => {
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
      // Mọi phiên cũ (kể cả thiết bị khác) đã bị thu hồi; cấp phiên mới để thiết bị này không phải đăng nhập lại.
      return json({ ok: true }, 200, { "set-cookie": await newSessionCookie(request, env, staff.id) });
    }),

    // ---- Danh sách / tạo thủ công ------------------------------------------------
    route("GET", "/api/staff", "admin", async ({ env }) => {
      const [staff, locked] = await Promise.all([listStaffAccounts(env.DB), lockedPhones(env.DB)]);
      return json({ staff: staff.map((s) => dto(s, locked)) } satisfies StaffListResponse);
    }),

    route("POST", "/api/staff", "admin", async ({ request, env, staff: admin }) => {
      const db = env.DB;
      const body = await readJson(request);
      const name = cleanName(body?.fullName);
      if (name.error) return error(400, "invalid_input", name.error);
      const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      // D-02 (ADR-0014 điều 7): trường permissions HOÀN TOÀN VẮNG MẶT → không quyền nào (trước đây tự động Bán hàng — lỗ khi gọi thẳng API,
      // bỏ qua màn quản trị vốn luôn gửi danh sách và bắt chọn ít nhất một). Gửi permissions: [] tường minh vẫn bị cleanPermissions từ chối.
      const perms = body?.permissions === undefined ? { value: [] } : cleanPermissions(body.permissions);
      if (perms.error) return error(400, "invalid_input", perms.error);
      // admin.manage.superadmin (điều 2/8): cấp SUPER_ADMIN cho một tài khoản MỚI chỉ Super Admin làm được — cùng luật với PUT .../permissions,
      // áp riêng ở đây vì tạo mới không có "target" có sẵn để so cấp bậc qua canManageAccount.
      if (perms.value!.includes("SUPER_ADMIN") && !admin.permissions.includes("SUPER_ADMIN")) return SUPER_ADMIN_ONLY();
      if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
      const created = await createAccountStatements(db, { fullName: name.value!, phone, permissions: perms.value! }, admin.id);
      try {
        await db.batch([...created.statements, adminAudit(db, admin.id, "staff_created", created.id, `quyền: ${labelOf(perms.value!)}`)]);
      } catch (e) {
        if (isUniqueViolation(e)) return PHONE_TAKEN();
        throw e;
      }
      return json({ staff: dto((await getStaffAccount(db, created.id))!, new Set()), pin: created.pin } satisfies StaffWithPinResponse, 201);
    }),

    // ---- Đồng bộ từ Google Sheet: xem trước rồi áp dụng --------------------------
    route("GET", "/api/staff/sheet", "admin", async ({ env }) => {
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
      const made = await Promise.all(todo.map(async (c) => ({ c, ...(await createAccountStatements(db, { fullName: c.name, phone: c.phone, permissions: ["SALES"] }, admin.id)) })));
      try {
        await db.batch([
          ...made.flatMap((m) => [...m.statements, adminAudit(db, admin.id, "staff_created", m.id, "nạp từ Google Sheet, quyền: Bán hàng")]),
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
      if (Object.keys(patch).length === 0) return json({ staff: dto(t, await lockedPhones(db)) } satisfies StaffResponse);

      const problem = checkAccountChange(admin.id, t, { active: patch.active }, await countActiveAdmins(db));
      if (problem) return error(409, "account_rule", problem);
      const losesAdmin = t.permissions.includes("ADMIN") && t.active && patch.active === false;

      const at = new Date().toISOString();
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
      return json({ staff: dto((await getStaffAccount(db, t.id))!, await lockedPhones(db)) } satisfies StaffResponse);
    }),

    // ---- Đặt tập quyền của tài khoản (ADR-0005) ---------------------------------------------------------
    route("PUT", "/api/staff/:id/permissions", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      // ADR-0014 điều 8: Quản trị viên chỉ quản lý được tài khoản cấp dưới; Super Admin quản lý được mọi tài khoản.
      if (!mayManage(admin, t)) return NOT_MANAGER();
      const perms = cleanPermissions((await readJson(request))?.permissions);
      if (perms.error) return error(400, "invalid_input", perms.error);
      const next = perms.value!;
      // admin.manage.superadmin (điều 2/8): cấp hoặc gỡ SUPER_ADMIN chỉ Super Admin làm được, kể cả với tài khoản "cấp dưới" vừa qua được kiểm ở trên.
      if (t.permissions.includes("SUPER_ADMIN") !== next.includes("SUPER_ADMIN") && !admin.permissions.includes("SUPER_ADMIN")) return SUPER_ADMIN_ONLY();
      const problem = checkAccountChange(admin.id, t, { permissions: next }, await countActiveAdmins(db));
      if (problem) return error(409, "account_rule", problem);

      const at = new Date().toISOString();
      const plan = setPermissionStatements(db, { staffId: t.id, current: t.permissions, next, actorId: admin.id, at });
      if (!plan.changed) return json({ staff: dto(t, await lockedPhones(db)) } satisfies StaffResponse);
      const detail = `${labelOf(t.permissions)} → ${labelOf(next)}`;
      // Khi bỏ ADMIN: câu đóng ADMIN có điều kiện đứng đầu; nhật ký chỉ ghi nếu nó thắng (changes() > 0); các câu còn lại mang cùng điều kiện.
      const stmts = [...(plan.guarded ? [plan.guarded] : []), adminAudit(db, admin.id, "permission_changed", t.id, detail, plan.guarded ? "changes() > 0" : undefined), ...plan.rest];
      const results = await db.batch(stmts);
      if (plan.guarded && (results[0]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
      return json({ staff: dto((await getStaffAccount(db, t.id))!, await lockedPhones(db)) } satisfies StaffResponse);
    }),

    route("POST", "/api/staff/:id/reset-pin", "admin", async (ctx) => {
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      if (!mayManage(ctx.staff, t)) return NOT_MANAGER();
      const pin = generatePin();
      await db.batch([await setPinStatement(db, t.id, pin), adminAudit(db, ctx.staff.id, "pin_reset", t.id)]); // nhật ký KHÔNG chứa PIN
      await unlockPhone(db, t.phone);
      return json({ staff: dto((await getStaffAccount(db, t.id))!, new Set()), pin } satisfies StaffWithPinResponse);
    }),

    route("POST", "/api/staff/:id/unlock", "admin", async (ctx) => {
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
