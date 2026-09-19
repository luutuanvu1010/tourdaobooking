// Module accounts — quản trị tài khoản nhân viên (chỉ admin) và đổi PIN cá nhân. Route: /api/staff*, /api/account/*.
// Sheet nhân viên chỉ là nguồn ĐỀ XUẤT: admin xem trước rồi xác nhận; Sheet không bao giờ tự tạo/ngưng tài khoản hay cấp admin.
import { auditStatement, type AuditAction } from "../audit";
import { lockedPhones, newSessionCookie, unlockPhone, verifyPinThrottled } from "../auth";
import {
  checkAccountChange, countActiveAdmins, findStaffByPhone, generatePin, getStaffAccount, isValidPin, listStaffAccounts, newStaffStatement, normalizePhone,
  parseStaffSheet, setPinStatement, updateStaffStatement, validateNewPin, type StaffAccount, type StaffRole,
} from "../staff";
import type { StaffAccountDto, StaffListResponse, StaffResponse, StaffSheetApplyResponse, StaffSheetPreviewResponse, StaffWithPinResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { route, type AppModule, type Ctx } from "../../shared/router";
import { SheetError, fetchSheetCsv } from "../../shared/sheets";

const isRole = (v: unknown): v is StaffRole => v === "sales" || v === "admin";
const isUniqueViolation = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: staff\.phone/.test(e.message);
const ROLE_LABEL: Record<StaffRole, string> = { sales: "nhân viên", admin: "quản trị viên" };
const PHONE_TAKEN = () => error(409, "phone_taken", "Số điện thoại này đã có tài khoản.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy nhân viên.");

function sheetError(e: unknown): Response {
  if (e instanceof SheetError) return error(e.code === "sheet_unreachable" ? 502 : 424, e.code, e.message);
  throw e;
}

function cleanName(v: unknown): { value?: string; error?: string } {
  if (typeof v !== "string" || !v.trim()) return { error: "Họ tên là bắt buộc." };
  const s = v.trim().replace(/\s+/g, " ");
  return s.length > 200 ? { error: "Họ tên tối đa 200 ký tự." } : { value: s };
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
      const role = body?.role ?? "sales";
      if (!isRole(role)) return error(400, "invalid_input", "Vai trò phải là sales hoặc admin.");
      if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
      const created = await newStaffStatement(db, { fullName: name.value!, phone, role });
      try {
        await db.batch([created.statement, adminAudit(db, admin.id, "staff_created", created.id, `vai trò ${ROLE_LABEL[role]}`)]);
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
      const made = await Promise.all(todo.map(async (c) => ({ c, ...(await newStaffStatement(db, { fullName: c.name, phone: c.phone, role: "sales" })) })));
      try {
        await db.batch([
          ...made.flatMap((m) => [m.statement, adminAudit(db, admin.id, "staff_created", m.id, "nạp từ Google Sheet, vai trò nhân viên")]),
          adminAudit(db, admin.id, "staff_synced", undefined, `thêm ${made.length} tài khoản từ Google Sheet`),
        ]);
      } catch (e) {
        if (isUniqueViolation(e)) return error(409, "phone_taken", "Có số điện thoại vừa được tạo bởi người khác. Hãy đồng bộ lại.");
        throw e;
      }
      return json({ created: made.map((m) => ({ id: m.id, fullName: m.c.name, phone: m.c.phone, pin: m.pin })) } satisfies StaffSheetApplyResponse, 201);
    }),

    // ---- Sửa một tài khoản -------------------------------------------------------
    route("PATCH", "/api/staff/:id", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      const body = await readJson(request);
      if (!body) return error(400, "invalid_input", "Dữ liệu không hợp lệ.");
      const patch: { fullName?: string; phone?: string; role?: StaffRole; active?: boolean } = {};
      if (body.fullName !== undefined) {
        const n = cleanName(body.fullName);
        if (n.error) return error(400, "invalid_input", n.error);
        if (n.value !== t.fullName) patch.fullName = n.value;
      }
      if (body.phone !== undefined) {
        const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
        if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ.");
        if (phone !== t.phone) {
          if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
          patch.phone = phone;
        }
      }
      if (body.role !== undefined) {
        if (!isRole(body.role)) return error(400, "invalid_input", "Vai trò phải là sales hoặc admin.");
        if (body.role !== t.role) patch.role = body.role;
      }
      if (body.active !== undefined) {
        if (typeof body.active !== "boolean") return error(400, "invalid_input", "Trạng thái phải là true/false.");
        if (body.active !== t.active) patch.active = body.active;
      }
      if (Object.keys(patch).length === 0) return json({ staff: dto(t, await lockedPhones(db)) } satisfies StaffResponse);

      const problem = checkAccountChange(admin.id, t, patch, await countActiveAdmins(db));
      if (problem) return error(409, "account_rule", problem);
      const losesAdmin = t.role === "admin" && t.active && (patch.role === "sales" || patch.active === false);

      const stmts: D1PreparedStatement[] = [updateStaffStatement(db, t.id, patch, losesAdmin)];
      // Chỉ ghi nhật ký nếu UPDATE thực sự áp dụng (changes() > 0), tránh ghi dấu vết cho thao tác bị chặn khi tranh chấp.
      const log = (action: AuditAction, detail?: string) => adminAudit(db, admin.id, action, t.id, detail, "changes() > 0");
      if (patch.fullName !== undefined || patch.phone !== undefined) {
        const bits = [patch.fullName !== undefined && `tên "${t.fullName}" → "${patch.fullName}"`, patch.phone !== undefined && `SĐT ${t.phone} → ${patch.phone}`].filter(Boolean);
        stmts.push(log("staff_updated", bits.join("; ")));
      }
      if (patch.role !== undefined) stmts.push(log("staff_role_changed", `${ROLE_LABEL[t.role]} → ${ROLE_LABEL[patch.role]}`));
      if (patch.active === false) stmts.push(log("staff_suspended"));
      if (patch.active === true) stmts.push(log("staff_reactivated"));
      let results;
      try {
        results = await db.batch(stmts);
      } catch (e) {
        if (isUniqueViolation(e)) return PHONE_TAKEN();
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "account_rule", "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.");
      return json({ staff: dto((await getStaffAccount(db, t.id))!, await lockedPhones(db)) } satisfies StaffResponse);
    }),

    route("POST", "/api/staff/:id/reset-pin", "admin", async (ctx) => {
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      const pin = generatePin();
      await db.batch([await setPinStatement(db, t.id, pin), adminAudit(db, ctx.staff.id, "pin_reset", t.id)]); // nhật ký KHÔNG chứa PIN
      await unlockPhone(db, t.phone);
      return json({ staff: dto((await getStaffAccount(db, t.id))!, new Set()), pin } satisfies StaffWithPinResponse);
    }),

    route("POST", "/api/staff/:id/unlock", "admin", async (ctx) => {
      const db = ctx.env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      await unlockPhone(db, t.phone);
      await adminAudit(db, ctx.staff.id, "login_unlocked", t.id).run();
      return json({ ok: true });
    }),
  ],
};
