// src/modules/feedback/index.ts
// Module feedback — Góp ý / Báo lỗi (ticket): người dùng gửi, admin tiếp nhận/trả lời/đổi trạng thái. Route: /api/feedback*.
// Phụ thuộc: staff (tên qua view công bố — chỉ trong repository; quyền của người được gán vào nhóm qua hàm công bố `getStaffAccount` — R6) và audit (dấu vết).
// Module khác CHỈ import từ file này.
import { auditStatement } from "../audit";
import { getStaffAccount } from "../staff";
import type {
  FeedbackAdminTeamDto, FeedbackAdminTeamsResponse, FeedbackBadgeResponse, FeedbackDetailResponse, FeedbackMessageDto, FeedbackQueueResponse, FeedbackTeamsResponse, FeedbackTicketDto,
} from "../../shared/contracts";
import { FEEDBACK_KIND_NAME, FEEDBACK_STATUS_NAME, canTransition, feedbackCode, isFeedbackKind, isFeedbackStatus, type FeedbackKind, type FeedbackStatus } from "../../shared/feedback-catalog";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { can, isExternalPermission, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { NHOM_KY_THUAT_ID } from "../../shared/ve-ho-tro";
import { mailConfig, notifyAdmins, type NotifyEvent } from "./notify";
import { choPhepNhomGui } from "./quyen";
import {
  badgeCounts, endMemberStatement, findByRequest, getTeam, getTicket, insertFirstMessageStatement, insertMemberStatement, insertReplyStatement, insertTeamStatement,
  insertTicketStatement, listMembersAll, listMessages, listMine, listQueue, listTeamsActive, listTeamsAll, markSeen, membershipsOf, messageExists, patchTeamStatement,
  patchTicketStatement, setNotified, touchAfterReplyStatement, weeklyStats, type MessageRow, type TeamMemberRow, type TeamRow, type TicketRow,
} from "./repository";
import {
  MESSAGE_LIMIT_PER_HOUR, TEAM_ID_RE, TICKET_LIMIT_PER_HOUR, parseContext, validateMemberRole, validateMessageInput, validatePatchInput, validateTeamInput, validateTeamPatch,
  validateTicketInput, windowStart,
} from "./rules";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy yêu cầu.");
const RATE_LIMITED = () => error(429, "rate_limited", "Bạn gửi quá nhiều trong một giờ, hãy thử lại sau.");
const BAD_JSON = () => error(400, "invalid_input", "Nội dung gửi lên không hợp lệ.");
const TEAM_FORBIDDEN = () => error(403, "forbidden", "Chỉ người phụ trách hệ thống được quản lý nhóm hỗ trợ.");
const TEAM_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy nhóm hỗ trợ.");

const toAdminTeam = (t: TeamRow, members: readonly TeamMemberRow[]): FeedbackAdminTeamDto => ({
  id: t.id,
  code: t.code,
  name: t.name,
  description: t.description,
  sensitive: t.sensitive === 1,
  active: t.active === 1,
  members: members.filter((m) => m.team_id === t.id).map((m) => ({ staffId: m.staff_id, name: m.name, role: m.role })),
});

const toTicket = (r: TicketRow, showMail: boolean): FeedbackTicketDto => ({
  id: r.id,
  code: feedbackCode(r.seq),
  kind: r.kind_code as FeedbackKind,
  kindName: r.kind_name,
  status: r.status_code as FeedbackStatus,
  statusName: r.status_name,
  title: r.title,
  context: parseContext(r.context),
  submitterId: r.submitter_id,
  submitterName: r.submitter_name,
  assigneeId: r.assignee_id,
  assigneeName: r.assignee_name,
  resolvedIn: r.resolved_in,
  lastActivityAt: r.last_activity_at,
  lastPublicReplyAt: r.last_public_reply_at,
  createdAt: r.created_at,
  unread: r.unread === 1,
  mailPending: showMail && r.notified_at === null,
  teamId: r.team_id,
  teamName: r.team_name,
  teamSensitive: r.team_sensitive === 1,
});
const toMessage = (m: MessageRow, viewerId: string): FeedbackMessageDto => ({
  id: m.id,
  authorId: m.author_id,
  authorName: m.author_name,
  body: m.body,
  internal: m.internal === 1,
  createdAt: m.created_at,
  mine: m.author_id === viewerId,
});

/** Ai xem được yêu cầu: chủ (feedback.view ô `own`) hoặc admin (ô `any`). Người khác nhận 404, không lộ sự tồn tại. */
const canRead = (who: PermissionHolder, submitterId: string): boolean => can(who, "feedback.view", { ownerId: submitterId });

async function detail(db: D1Database, who: PermissionHolder, id: string): Promise<FeedbackDetailResponse | null> {
  const t = await getTicket(db, id);
  if (!t || !canRead(who, t.submitter_id)) return null;
  const triage = can(who, "feedback.triage");
  return { ticket: toTicket(t, triage), messages: (await listMessages(db, id, triage)).map((m) => toMessage(m, who.id)), canTriage: triage };
}

/** Email báo admin sau khi D1 đã ghi; lỗi không làm hỏng yêu cầu (xem notify.ts). */
function scheduleMail(env: Env, exec: ExecutionContext, request: Request, ticketId: string, event: Omit<NotifyEvent, "url">): void {
  const cfg = mailConfig(env);
  const url = `${new URL(request.url).origin}/feedback?id=${ticketId}`;
  exec.waitUntil(
    notifyAdmins(
      { ...cfg, setNotified: (at) => setNotified(env.DB, ticketId, at), now: () => new Date().toISOString(), log: (m, e) => console.error(m, e) },
      { ...event, url },
    ).then(() => undefined),
  );
}

export const feedbackModule: AppModule = {
  name: "feedback",
  routes: [
    // Tạo yêu cầu. Idempotent theo clientRequestId; trần 5/giờ bằng INSERT có điều kiện (xem repository.ts).
    route("POST", "/api/feedback", "staff", async ({ request, env, exec, staff }) => {
      if (!can(staff, "feedback.submit")) return error(403, "forbidden", "Không có quyền gửi yêu cầu.");
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateTicketInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      // Nhóm nhận (ADR-0119 điều 1, 6): vắng = Kỹ thuật; phải có thật và đang dùng; tài khoản bên ngoài chỉ gửi Kỹ thuật.
      const teamId = v.value.teamId ?? NHOM_KY_THUAT_ID;
      const team = await getTeam(env.DB, teamId);
      if (!team || team.active !== 1) return error(400, "invalid_input", "Nhóm nhận không hợp lệ.");
      if (!choPhepNhomGui(staff, teamId)) return error(403, "forbidden", "Tài khoản của bạn chỉ gửi được tới nhóm Kỹ thuật.");
      const now = new Date();
      const at = now.toISOString();
      const id = crypto.randomUUID();
      await env.DB.batch([
        insertTicketStatement(env.DB, { id, kind: v.value.kind, title: v.value.title, context: v.value.context, submitterId: staff.id, clientRequestId: v.value.clientRequestId, now: at, windowStart: windowStart(now), limit: TICKET_LIMIT_PER_HOUR, teamId }),
        insertFirstMessageStatement(env.DB, { id: crypto.randomUUID(), ticketId: id, authorId: staff.id, body: v.value.body, now: at }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_created", at, targetType: "feedback", targetId: id, detail: v.value.title.slice(0, 100) }, `EXISTS (SELECT 1 FROM fbk_ticket WHERE id = '${id}')`),
      ]);
      const mine = await findByRequest(env.DB, staff.id, v.value.clientRequestId);
      if (!mine) return RATE_LIMITED(); // không chèn được và cũng không phải gửi lại → chạm trần
      const d = await detail(env.DB, staff, mine.id);
      if (!d) return NOT_FOUND();
      if (mine.id !== id) return json(d, 200); // gửi lại cùng clientRequestId: trả yêu cầu cũ, không gửi email lần nữa
      scheduleMail(env, exec, request, id, {
        type: "created", code: d.ticket.code, kindName: FEEDBACK_KIND_NAME[d.ticket.kind], title: d.ticket.title, submitterName: staff.fullName, excerpt: v.value.body,
      });
      return json(d, 201, { location: "/feedback" });
    }),

    // Tuyến TĨNH khai trước tuyến có :id để "mine"/"badge"/"teams" không bị hiểu là id.
    // Danh sách nhóm để chọn khi gửi (bên ngoài chỉ thấy Kỹ thuật — ADR-0119 điều 6) + tư cách thành viên của chính người gọi.
    route("GET", "/api/feedback/teams", "staff", async ({ env, staff }) => {
      const [teams, mine] = await Promise.all([listTeamsActive(env.DB), membershipsOf(env.DB, staff.id)]);
      const ngoai = staff.permissions.some(isExternalPermission);
      return json({
        teams: teams
          .filter((t) => !ngoai || t.id === NHOM_KY_THUAT_ID)
          .map((t) => ({ id: t.id, code: t.code, name: t.name, description: t.description, sensitive: t.sensitive === 1 })),
        mine,
        isSuper: can(staff, "feedback.triage"),
      } satisfies FeedbackTeamsResponse);
    }),
    // ---- Quản lý nhóm hỗ trợ (ADR-0119 điều 2, 3): CHỈ Toàn quyền (ô feedback.team.manage). Tuyến tĩnh, khai trước /api/feedback/:id. ------------------
    // Nhật ký: targetId = id nhóm; detail CHỈ mã nhóm (+ vai với thành viên) — không tên/mô tả nhóm, không tên người, không SĐT.
    route("GET", "/api/feedback/admin/teams", "staff", async ({ env, staff }) => {
      if (!can(staff, "feedback.team.manage")) return TEAM_FORBIDDEN();
      const [teams, members] = await Promise.all([listTeamsAll(env.DB), listMembersAll(env.DB)]);
      return json({ teams: teams.map((t) => toAdminTeam(t, members)) } satisfies FeedbackAdminTeamsResponse);
    }),
    route("POST", "/api/feedback/admin/teams", "staff", async ({ request, env, staff }) => {
      if (!can(staff, "feedback.team.manage")) return TEAM_FORBIDDEN();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateTeamInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const id = crypto.randomUUID();
      const at = new Date().toISOString();
      await env.DB.batch([
        insertTeamStatement(env.DB, { id, code: v.value.code, name: v.value.name, description: v.value.description, sensitive: v.value.sensitive, now: at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_team_created", at, targetType: "feedback", targetId: id, detail: v.value.code }, `EXISTS (SELECT 1 FROM fbk_team WHERE id = '${id}')`),
      ]);
      const t = await getTeam(env.DB, id);
      if (!t) return error(409, "duplicate", "Mã nhóm đã có.");
      return json({ team: toAdminTeam(t, []) }, 201, { location: "/feedback" }); // trang quản lý nhóm làm ở việc giao diện; tạm trỏ trang Góp ý
    }),
    route("PATCH", "/api/feedback/admin/teams/:id", "staff", async ({ request, env, staff, params }) => {
      if (!can(staff, "feedback.team.manage")) return TEAM_FORBIDDEN();
      const id = params.id!;
      if (!TEAM_ID_RE.test(id)) return TEAM_NOT_FOUND();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateTeamPatch(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const truoc = await getTeam(env.DB, id);
      if (!truoc) return TEAM_NOT_FOUND();
      const at = new Date().toISOString();
      await env.DB.batch([
        patchTeamStatement(env.DB, { id, ...v.value, now: at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_team_updated", at, targetType: "feedback", targetId: id, detail: truoc.code }, "changes() > 0"),
      ]);
      const [t, members] = await Promise.all([getTeam(env.DB, id), listMembersAll(env.DB)]);
      return t ? json({ team: toAdminTeam(t, members) }) : TEAM_NOT_FOUND();
    }),
    // Gán / đổi vai: kết thúc dòng đang hiệu lực (nếu có) rồi mở dòng mới — cùng lô. Mọi điều kiện kiểm TRƯỚC lô (câu kết thúc chạy được dù câu chèn không chèn).
    route("PUT", "/api/feedback/admin/teams/:id/members/:staffId", "staff", async ({ request, env, staff, params }) => {
      if (!can(staff, "feedback.team.manage")) return TEAM_FORBIDDEN();
      const teamId = params.id!;
      const staffId = params.staffId!;
      if (!TEAM_ID_RE.test(teamId)) return TEAM_NOT_FOUND();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const role = validateMemberRole(raw);
      if (!role.ok) return error(400, "invalid_input", role.message);
      const team = await getTeam(env.DB, teamId);
      if (!team) return TEAM_NOT_FOUND();
      const nguoi = UUID_RE.test(staffId) ? await getStaffAccount(env.DB, staffId) : null;
      if (!nguoi || !nguoi.active) return error(400, "invalid_input", "Tài khoản không tồn tại hoặc đã khoá.");
      // R6: tài khoản có mã quyền bên ngoài (kể cả tài khoản lai) không làm thành viên nhóm (quyenPhieu cũng bỏ qua — lưới thứ hai).
      if (nguoi.permissions.some(isExternalPermission)) return error(400, "invalid_input", "Tài khoản bên ngoài không thể làm thành viên nhóm hỗ trợ.");
      const at = new Date().toISOString();
      const memberId = crypto.randomUUID();
      await env.DB.batch([
        endMemberStatement(env.DB, { teamId, staffId, now: at, by: staff.id }),
        insertMemberStatement(env.DB, { id: memberId, teamId, staffId, role: role.value, now: at, by: staff.id }),
        auditStatement(
          env.DB,
          { staffId: staff.id, action: "feedback_team_member_changed", at, targetType: "feedback", targetId: teamId, detail: `${team.code}: ${role.value}` },
          `EXISTS (SELECT 1 FROM fbk_team_member WHERE id = '${memberId}')`,
        ),
      ]);
      const [t, members] = await Promise.all([getTeam(env.DB, teamId), listMembersAll(env.DB)]);
      if (!t || !members.some((m) => m.team_id === teamId && m.staff_id === staffId)) return error(400, "invalid_input", "Tài khoản không tồn tại hoặc đã khoá.");
      return json({ team: toAdminTeam(t, members) });
    }),
    // Gỡ: kết thúc hiệu lực (không xoá dòng). Không phải thành viên ⇒ 404. Mất quyền ngay vì quyenPhieu đọc tư cách ĐANG hiệu lực mỗi request.
    route("DELETE", "/api/feedback/admin/teams/:id/members/:staffId", "staff", async ({ env, staff, params }) => {
      if (!can(staff, "feedback.team.manage")) return TEAM_FORBIDDEN();
      const teamId = params.id!;
      const staffId = params.staffId!;
      if (!TEAM_ID_RE.test(teamId)) return TEAM_NOT_FOUND();
      const team = await getTeam(env.DB, teamId);
      if (!team) return TEAM_NOT_FOUND();
      const at = new Date().toISOString();
      const res = await env.DB.batch([
        endMemberStatement(env.DB, { teamId, staffId, now: at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_team_member_changed", at, targetType: "feedback", targetId: teamId, detail: `${team.code}: gỡ` }, "changes() > 0"),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) return error(404, "not_found", "Người này không phải thành viên nhóm.");
      const members = await listMembersAll(env.DB);
      return json({ team: toAdminTeam(team, members) });
    }),

    route("GET", "/api/feedback/mine", "staff", async ({ env, staff, url }) => {
      const rows = await listMine(env.DB, staff.id, intParam(url.searchParams.get("limit"), 50, 1, 100), intParam(url.searchParams.get("offset"), 0, 0, 100000));
      return json({ tickets: rows.map((r) => toTicket(r, false)) });
    }),
    route("GET", "/api/feedback/badge", "staff", async ({ env, staff }) => {
      const b = await badgeCounts(env.DB, staff.id, can(staff, "feedback.triage"));
      return json(b satisfies FeedbackBadgeResponse);
    }),

    // Hàng đợi (admin).
    route("GET", "/api/feedback", "admin", async ({ env, staff, url }) => {
      if (!can(staff, "feedback.triage")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xử lý Góp ý.");
      const status = url.searchParams.get("status");
      const kind = url.searchParams.get("kind");
      if ((status !== null && !isFeedbackStatus(status)) || (kind !== null && !isFeedbackKind(kind))) return error(400, "invalid_input", "Bộ lọc không hợp lệ.");
      const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString();
      const [rows, stats] = await Promise.all([
        listQueue(env.DB, staff.id, status, kind, intParam(url.searchParams.get("limit"), 50, 1, 100), intParam(url.searchParams.get("offset"), 0, 0, 100000)),
        weeklyStats(env.DB, since),
      ]);
      return json({
        tickets: rows.map((r) => toTicket(r, true)),
        stats: stats.map((s) => ({ week: s.week, kind: s.kind_code as FeedbackKind, status: s.status_code as FeedbackStatus, count: s.n })),
      } satisfies FeedbackQueueResponse);
    }),

    route("GET", "/api/feedback/:id", "staff", async ({ env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t || !canRead(staff, t.submitter_id)) return NOT_FOUND();
      await markSeen(env.DB, id, t.submitter_id === staff.id, can(staff, "feedback.triage"), new Date().toISOString());
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),

    route("POST", "/api/feedback/:id/messages", "staff", async ({ request, env, exec, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t || !canRead(staff, t.submitter_id)) return NOT_FOUND();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateMessageInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const triage = can(staff, "feedback.triage");
      if (v.value.internal && !triage) return error(403, "forbidden", "Chỉ quản trị viên được ghi chú nội bộ.");
      const now = new Date();
      const at = now.toISOString();
      const messageId = crypto.randomUUID();
      await env.DB.batch([
        insertReplyStatement(env.DB, { id: messageId, ticketId: id, authorId: staff.id, body: v.value.body, internal: v.value.internal, now: at, windowStart: windowStart(now), limit: MESSAGE_LIMIT_PER_HOUR }),
        touchAfterReplyStatement(env.DB, { ticketId: id, messageId, now: at, internal: v.value.internal, authorId: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_replied", at, targetType: "feedback", targetId: id, detail: feedbackCode(t.seq) }, `EXISTS (SELECT 1 FROM fbk_message WHERE id = '${messageId}')`),
      ]);
      if (!(await messageExists(env.DB, messageId))) return RATE_LIMITED();
      if (staff.id === t.submitter_id) {
        scheduleMail(env, exec, request, id, {
          type: "user_replied", code: feedbackCode(t.seq), kindName: FEEDBACK_KIND_NAME[t.kind_code as FeedbackKind], title: t.title, submitterName: staff.fullName, excerpt: v.value.body,
        });
      }
      const d = await detail(env.DB, staff, id);
      return d ? json(d, 201, { location: "/feedback" }) : NOT_FOUND();
    }),

    // Admin đổi trạng thái / người xử lý. Trạng thái đi theo bảng luật (canTransition); khoá lạc quan theo trạng thái cũ.
    route("PATCH", "/api/feedback/:id", "admin", async ({ request, env, staff, params }) => {
      if (!can(staff, "feedback.triage")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xử lý Góp ý.");
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validatePatchInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const from = t.status_code as FeedbackStatus;
      const to = v.value.status ?? null;
      if (to !== null && !canTransition(from, to)) {
        return error(409, "bad_transition", `Không thể chuyển từ "${FEEDBACK_STATUS_NAME[from]}" sang "${FEEDBACK_STATUS_NAME[to]}".`);
      }
      const at = new Date().toISOString();
      const res = await env.DB.batch([
        patchTicketStatement(env.DB, { id, status: to, assignee: v.value.assignee, resolvedIn: v.value.resolvedIn, now: at, adminId: staff.id, fromStatus: from }),
        auditStatement(
          env.DB,
          { staffId: staff.id, action: to ? "feedback_status_changed" : "feedback_assigned", at, targetType: "feedback", targetId: id, detail: to ? `${feedbackCode(t.seq)}: ${from} → ${to}` : feedbackCode(t.seq) },
          "changes() > 0",
        ),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) {
        const now = await getTicket(env.DB, id);
        if (now && now.status_code !== from) return error(409, "stale", "Yêu cầu vừa được người khác đổi trạng thái, hãy tải lại.");
        return error(400, "invalid_input", "Người xử lý không tồn tại hoặc đã ngưng hoạt động.");
      }
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),
  ],
};
