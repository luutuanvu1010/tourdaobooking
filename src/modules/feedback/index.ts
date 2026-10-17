// src/modules/feedback/index.ts
// Module feedback — Góp ý / Báo lỗi (ticket): người dùng gửi, admin tiếp nhận/trả lời/đổi trạng thái. Route: /api/feedback*.
// Phụ thuộc: staff (tên qua view công bố — chỉ trong repository; quyền của người được gán vào nhóm qua hàm công bố `getStaffAccount` — R6), audit (dấu vết) và
// orders CHỈ qua ba view công bố trong repository (đơn liên quan — ADR-0127; KHÔNG import ../orders, bài siết ở src/architecture.test.ts).
// Module khác CHỈ import từ file này.
import { auditStatement } from "../audit";
import { getStaffAccount } from "../staff";
import type {
  FeedbackAdminTeamDto, FeedbackAdminTeamsResponse, FeedbackBadgeResponse, FeedbackDetailResponse, FeedbackMembersResponse, FeedbackMessageDto, FeedbackMessagesSinceResponse, FeedbackMyOrdersResponse, FeedbackQueueResponse, FeedbackTeamsResponse,
  FeedbackTicketDto, OrderStatus,
} from "../../shared/contracts";
import { FEEDBACK_KIND_NAME, FEEDBACK_STATUS_NAME, canTransition, feedbackCode, isFeedbackKind, isFeedbackStatus, type FeedbackKind, type FeedbackStatus } from "../../shared/feedback-catalog";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { can, isExternalPermission, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { NHOM_KY_THUAT_ID, isLocHangDoi, isPriority } from "../../shared/ve-ho-tro";
import { mailConfig, notifyAdmins, type NotifyEvent } from "./notify";
import { choPhepNhomGui, quyenPhieu, type Membership, type QuyenPhieu } from "./quyen";
import {
  badgeCounts, claimStatement, endMemberStatement, findByRequest, getDonCuaToi, getTeam, getTicket, insertEventStatement, insertFirstMessageStatement, insertMemberStatement, insertReplyStatement, insertTeamStatement,
  insertTicketStatement, insertTransferNoteStatement, listAssignable, listDonCuaToi, listMembersAll, listMessages, listMessagesSince, listMine, listQueue, listQueueTeam, listTeamsActive, listTeamsAll, markSeen, markSeenAfterWriteStatement,
  membershipsOf, messageExists, patchTeamStatement, patchTicketStatement, setNotified, statsTeam, touchAfterReplyStatement, transferStatement, weeklyStats, type MessageRow, type TeamMemberRow, type TeamRow, type TicketRow,
} from "./repository";
import {
  CAU_DON_LIEN_QUAN_SAI, MESSAGE_LIMIT_PER_HOUR, MESSAGES_SINCE_LIMIT, TEAM_ID_RE, TICKET_LIMIT_PER_HOUR, parseContext, validateMemberRole, validateMessageInput, validatePatchInput, validateTeamInput, validateTeamPatch,
  parseSince, validateTicketInput, validateTransferInput, windowStart, type PatchInput,
} from "./rules";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy yêu cầu.");
const RATE_LIMITED = () => error(429, "rate_limited", "Bạn gửi quá nhiều trong một giờ, hãy thử lại sau.");
const BAD_ASSIGNEE = () => error(400, "invalid_input", "Người xử lý phải là thành viên đang hoạt động của nhóm giữ phiếu (không phải người gửi).");
const STALE_TEAM = () => error(409, "stale", "Phiếu vừa đổi nhóm, hãy tải lại.");
const CLOSED_NO_TRANSFER = () => error(409, "conflict", "Phiếu đã đóng, hãy mở lại trước khi chuyển nhóm.");
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
  assigneeActive: r.assignee_active === 1,
  resolvedIn: r.resolved_in,
  lastActivityAt: r.last_activity_at,
  lastPublicReplyAt: r.last_public_reply_at,
  createdAt: r.created_at,
  unread: r.unread === 1,
  mailPending: showMail && r.notified_at === null,
  teamId: r.team_id,
  teamName: r.team_name,
  teamSensitive: r.team_sensitive === 1,
  priority: isPriority(r.priority) ? r.priority : "NORMAL",
  orderId: r.order_id,
  orderCode: r.order_code,
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

/**
 * Quyền đọc kiểu cũ (chủ phiếu ô `own`, Toàn quyền ô `any`). Từ Việc 5a các route theo id dùng quyenPhieu; giữ lại cho tới khi gỡ tuyến cũ
 * (tên còn trong GUARDS của src/route-write-guard.test.ts). Đừng dùng cho route mới.
 */
const canRead = (who: PermissionHolder, submitterId: string): boolean => can(who, "feedback.view", { ownerId: submitterId });

// Nhật ký của lệnh đổi phiếu (dùng chung PATCH …/xu-ly và tuyến cũ PATCH /api/feedback/:id — ADR-0127): đổi trạng thái ⇒ feedback_status_changed; không đổi
// trạng thái mà có người xử lý ⇒ feedback_assigned; có mức ưu tiên ⇒ THÊM một dòng feedback_priority_changed «mã: cũ → mới» (không tiêu đề, kể cả nhóm nhạy
// cảm; gửi lại đúng mức cũ vẫn ghi, như giao việc). Mọi dòng gác bằng `changes() > 0`: dòng đầu theo câu cập nhật (hoặc sự kiện ngay sau nó), dòng sau theo dòng
// nhật ký ngay trước (INSERT…SELECT không chèn ⇒ changes() = 0) — nên cả chuỗi chỉ ghi khi cổng đã qua. Gọi ĐÚNG sau câu cập nhật/sự kiện, TRƯỚC mốc đã xem.
function nhatKyDoiPhieu(db: D1Database, a: { staffId: string; t: TicketRow; v: PatchInput; from: FeedbackStatus; to: FeedbackStatus | null; at: string }): D1PreparedStatement[] {
  const code = feedbackCode(a.t.seq);
  const ra: D1PreparedStatement[] = [];
  const goc = { staffId: a.staffId, at: a.at, targetType: "feedback", targetId: a.t.id } as const;
  if (a.to) ra.push(auditStatement(db, { ...goc, action: "feedback_status_changed", detail: `${code}: ${a.from} → ${a.to}` }, "changes() > 0"));
  else if (a.v.assignee !== undefined) ra.push(auditStatement(db, { ...goc, action: "feedback_assigned", detail: code }, "changes() > 0"));
  if (a.v.priority !== undefined) {
    const cu = isPriority(a.t.priority) ? a.t.priority : "NORMAL";
    ra.push(auditStatement(db, { ...goc, action: "feedback_priority_changed", detail: `${code}: ${cu} → ${a.v.priority}` }, "changes() > 0"));
  }
  return ra;
}

/**
 * Tư cách thành viên nhóm của người gọi cho MỘT request — mọi chỗ nạp tư cách đi qua ĐÂY (ruling R6b).
 * Tài khoản có mã quyền bên ngoài (kể cả tài khoản lai) ⇒ luôn rỗng, dù dữ liệu còn dòng thành viên cũ (quyenPhieu cũng bỏ qua — lưới thứ hai).
 */
async function memberships(db: D1Database, who: PermissionHolder): Promise<Membership[]> {
  return who.permissions.some(isExternalPermission) ? [] : membershipsOf(db, who.id);
}

/** Nạp tư cách rồi quyết quyền trên một phiếu. CHỈ dùng trong detail(); route gọi thẳng quyenPhieu (hàng rào route-write-guard đọc thân route). */
async function quyenCuaToi(db: D1Database, who: PermissionHolder, t: TicketRow): Promise<QuyenPhieu> {
  return quyenPhieu({ who, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await memberships(db, who) });
}

/** Chi tiết theo quyền của người xem: không đọc được ⇒ null (route trả 404, không lộ sự tồn tại); ghi chú nội bộ lọc theo `noiBo`. */
async function detail(db: D1Database, who: PermissionHolder, id: string): Promise<FeedbackDetailResponse | null> {
  const t = await getTicket(db, id);
  if (!t) return null;
  const q = await quyenCuaToi(db, who, t);
  if (!q.doc) return null;
  return {
    ticket: toTicket(t, can(who, "feedback.triage")),
    messages: (await listMessages(db, id, q.noiBo, t.team_id)).map((m) => toMessage(m, who.id)),
    canTriage: q.xuLy,
    perms: { xuLy: q.xuLy, giaoViec: q.giaoViecChoNguoiKhac, chuyenNhom: q.chuyenNhom },
  };
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
      // Đơn liên quan (ADR-0127 quyết định 3): cùng cổng với my-orders — quyền xem đơn của chính mình (ô order.view, ownerId = người gửi) rồi đơn phải có thật VÀ do
      // người gửi lập. Mọi cách hỏng trả CÙNG một câu (không dò đơn của người khác). Mã đơn chụp lúc gửi; nhật ký không ghi mã đơn.
      let order: { id: string; code: string } | null = null;
      if (v.value.orderId !== undefined) {
        const don = can(staff, "order.view", { ownerId: staff.id }) ? await getDonCuaToi(env.DB, staff.id, v.value.orderId) : null;
        if (!don) return error(400, "invalid_input", CAU_DON_LIEN_QUAN_SAI);
        order = { id: don.id, code: don.order_code };
      }
      const now = new Date();
      const at = now.toISOString();
      const id = crypto.randomUUID();
      await env.DB.batch([
        insertTicketStatement(env.DB, { id, kind: v.value.kind, title: v.value.title, context: v.value.context, submitterId: staff.id, clientRequestId: v.value.clientRequestId, now: at, windowStart: windowStart(now), limit: TICKET_LIMIT_PER_HOUR, teamId, order }),
        insertFirstMessageStatement(env.DB, { id: crypto.randomUUID(), ticketId: id, authorId: staff.id, body: v.value.body, now: at }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_created", at, targetType: "feedback", targetId: id, detail: team.sensitive === 1 ? "phiếu nhóm nhạy cảm" : v.value.title.slice(0, 100) }, `EXISTS (SELECT 1 FROM fbk_ticket WHERE id = '${id}')`),
      ]);
      const mine = await findByRequest(env.DB, staff.id, v.value.clientRequestId);
      if (!mine) return RATE_LIMITED(); // không chèn được và cũng không phải gửi lại → chạm trần
      const d = await detail(env.DB, staff, mine.id);
      if (!d) return NOT_FOUND();
      if (mine.id !== id) return json(d, 200); // gửi lại cùng clientRequestId: trả yêu cầu cũ, không gửi email lần nữa
      scheduleMail(env, exec, request, id, {
        type: "created", code: d.ticket.code, kindName: FEEDBACK_KIND_NAME[d.ticket.kind], title: d.ticket.title, submitterName: staff.fullName, excerpt: v.value.body, teamName: team.name, sensitive: team.sensitive === 1,
      });
      return json(d, 201, { location: "/feedback" });
    }),

    // Tuyến TĨNH khai trước tuyến có :id để "mine"/"badge"/"teams" không bị hiểu là id.
    // Danh sách đơn để gắn vào phiếu (ADR-0127 quyết định 3): tối đa 30 đơn do CHÍNH người gọi lập, mã giảm dần, chỉ id / mã / trạng thái (mã — nhãn tiếng Việt do
    // giao diện lấy từ trangThaiHienThi). Cổng: ô order.view của chính mình — tài khoản bị rút quyền xem đơn không còn thấy mã đơn cũ qua cửa này. Không ghi gì.
    route("GET", "/api/feedback/my-orders", "staff", async ({ env, staff }) => {
      if (!can(staff, "order.view", { ownerId: staff.id })) return error(403, "forbidden", "Tài khoản của bạn không xem được đơn hàng.");
      const rows = await listDonCuaToi(env.DB, staff.id);
      return json({ orders: rows.map((r) => ({ id: r.id, orderCode: r.order_code, status: r.status as OrderStatus })) } satisfies FeedbackMyOrdersResponse);
    }),
    // Danh sách nhóm để chọn khi gửi (bên ngoài chỉ thấy Kỹ thuật — ADR-0119 điều 6) + tư cách thành viên của chính người gọi.
    route("GET", "/api/feedback/teams", "staff", async ({ env, staff }) => {
      const [teams, mine] = await Promise.all([listTeamsActive(env.DB), memberships(env.DB, staff)]);
      const ngoai = staff.permissions.some(isExternalPermission);
      return json({
        teams: teams
          .filter((t) => !ngoai || t.id === NHOM_KY_THUAT_ID)
          .map((t) => ({ id: t.id, code: t.code, name: t.name, description: t.description, sensitive: t.sensitive === 1 })),
        mine,
        isSuper: can(staff, "feedback.triage"),
      } satisfies FeedbackTeamsResponse);
    }),
    // Ứng viên giao việc của MỘT nhóm (ADR-0127 quyết định 4): Trưởng nhóm của ĐÚNG nhóm đó và Toàn quyền — quyenPhieu với submitterId "" (không phiếu cụ thể, như
    // hàng đợi) rồi DÙNG giaoViecChoNguoiKhac; không thêm hàm mới vào GUARDS. Thứ tự: hình dạng id → nhóm có thật (404) → quyền (403) → đọc. `?ticket=` (tuỳ chọn)
    // = phiếu đang giao: loại người gửi phiếu đó CHỈ khi phiếu thuộc nhóm này (câu SQL tự kiểm). Tài khoản bên ngoài còn dòng thành viên cũ bị loại (R6, cùng
    // phép thử với route gán thành viên) vì chọn họ thì giao việc thất bại. Chỉ id / tên (view nhãn) / vai — không SĐT, email. Không ghi gì.
    route("GET", "/api/feedback/teams/:id/members", "staff", async ({ env, staff, params, url }) => {
      const teamId = params.id!;
      if (!TEAM_ID_RE.test(teamId)) return TEAM_NOT_FOUND();
      if (!(await getTeam(env.DB, teamId))) return TEAM_NOT_FOUND();
      const q = quyenPhieu({ who: staff, submitterId: "", ticketTeamId: teamId, memberships: await memberships(env.DB, staff) });
      if (!q.giaoViecChoNguoiKhac) return error(403, "forbidden", "Chỉ Trưởng nhóm được giao việc.");
      const rows = await listAssignable(env.DB, teamId, url.searchParams.get("ticket") ?? "");
      const tk = await Promise.all(rows.map((r) => getStaffAccount(env.DB, r.staff_id)));
      const members = rows.filter((_, i) => tk[i] !== null && tk[i]!.active && !tk[i]!.permissions.some(isExternalPermission));
      return json({ members: members.map((r) => ({ staffId: r.staff_id, name: r.name, role: r.role })) } satisfies FeedbackMembersResponse);
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
      // Kỹ thuật là nhóm mặc định (phiếu cũ, bản web cũ không gửi teamId) và là nhóm DUY NHẤT tài khoản bên ngoài gửi được (ADR-0119 điều 1, 6) — không ngưng được.
      if (id === NHOM_KY_THUAT_ID && v.value.active === false) {
        return error(409, "conflict", "Không thể ngưng nhóm Kỹ thuật: đây là nhóm mặc định cho phiếu cũ và tài khoản bên ngoài.");
      }
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
    // Huy hiệu: queue = phiếu chưa đọc (riêng người gọi) ở nhóm mình thuộc; Toàn quyền mọi nhóm. Tài khoản bên ngoài không có tư cách nhóm (helper memberships
    // trả rỗng) ⇒ queue = 0, KHÔNG dựa vào câu SQL tư cách (dòng thành viên cũ chèn thẳng vẫn có thể còn — R6b).
    route("GET", "/api/feedback/badge", "staff", async ({ env, staff }) => {
      const sieu = can(staff, "feedback.triage");
      const [b, tv] = await Promise.all([badgeCounts(env.DB, staff.id, sieu), memberships(env.DB, staff)]);
      return json({ mine: b.mine, queue: sieu || tv.length > 0 ? b.queue : 0 } satisfies FeedbackBadgeResponse);
    }),
    // Hàng đợi MỘT nhóm (ADR-0119 điều 2, 3): thành viên đang hiệu lực của nhóm đó hoặc Toàn quyền; người khác 403. Thống kê tuần CHỈ của nhóm đó.
    // submitterId "" vì không có phiếu cụ thể: không ai có id rỗng nên chỉ còn nhánh thành viên/Toàn quyền của quyenPhieu.
    route("GET", "/api/feedback/queue", "staff", async ({ env, staff, url }) => {
      const team = url.searchParams.get("team");
      const loc = url.searchParams.get("loc") ?? "ALL";
      const status = url.searchParams.get("status");
      if (!team || !isLocHangDoi(loc) || (status !== null && !isFeedbackStatus(status))) return error(400, "invalid_input", "Bộ lọc không hợp lệ.");
      const t = await getTeam(env.DB, team);
      if (!t) return error(404, "not_found", "Không tìm thấy nhóm.");
      const q = quyenPhieu({ who: staff, submitterId: "", ticketTeamId: team, memberships: await memberships(env.DB, staff) });
      if (!q.xuLy) return error(403, "forbidden", "Bạn không thuộc nhóm này.");
      const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString();
      const [rows, stats] = await Promise.all([
        listQueueTeam(env.DB, staff.id, team, status, loc, intParam(url.searchParams.get("limit"), 50, 1, 100), intParam(url.searchParams.get("offset"), 0, 0, 100000)),
        statsTeam(env.DB, since, team),
      ]);
      return json({
        tickets: rows.map((r) => toTicket(r, true)),
        stats: stats.map((s) => ({ week: s.week, kind: s.kind_code as FeedbackKind, status: s.status_code as FeedbackStatus, count: s.n })),
      } satisfies FeedbackQueueResponse);
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

    // ---- Xử lý theo nhóm (ADR-0119 điều 2, 3, 8): cổng `staff`, quyền trong thân bằng quyenPhieu. Khai TRƯỚC /api/feedback/:id. ---------------------------
    // Thứ tự kiểm: id → phiếu → quyenPhieu (404 khi không đọc được, 403 khi không xử lý được) → thân. Không đọc thân trước khi biết người gọi đọc được phiếu.
    // Nhận việc cho mình. KHÔNG kiểm trước assignee_id ở đây: 409 chỉ đến từ điều kiện của chính câu CLAIM (hai người bấm cùng lúc — một thắng).
    route("POST", "/api/feedback/:id/claim", "staff", async ({ env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const q = quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await memberships(env.DB, staff) });
      if (!q.doc) return NOT_FOUND();
      if (!q.xuLy) return error(403, "forbidden", "Chỉ nhóm xử lý được nhận việc.");
      const at = new Date().toISOString();
      const eventId = crypto.randomUUID();
      // Lô: cổng (CLAIM) → sự kiện (changes() của CLAIM) → nhật ký (có sự kiện) → mốc đã xem của người nhận (phiếu vừa đổi bởi người này).
      const res = await env.DB.batch([
        claimStatement(env.DB, { id, staffId: staff.id, now: at, teamId: t.team_id }),
        insertEventStatement(env.DB, { id: eventId, ticketId: id, type: "CLAIMED", from: t.assignee_id, to: staff.id, actor: staff.id, now: at }),
        auditStatement(
          env.DB,
          { staffId: staff.id, action: "feedback_claimed", at, targetType: "feedback", targetId: id, detail: feedbackCode(t.seq) },
          `EXISTS (SELECT 1 FROM fbk_ticket_event WHERE id = '${eventId}')`,
        ),
        markSeenAfterWriteStatement(env.DB, { ticketId: id, staffId: staff.id, now: at }),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) {
        const lai = await getTicket(env.DB, id);
        if (!lai || lai.team_id !== t.team_id) return STALE_TEAM(); // R11: phiếu vừa chuyển nhóm sau lúc kiểm quyền
        return error(409, "taken", "Vừa có người nhận việc này, hoặc phiếu đã đóng.");
      }
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),
    // Đổi trạng thái / người xử lý theo nhóm: như tuyến cũ (bảng luật canTransition, khoá lạc quan theo trạng thái cũ) nhưng quyền theo quyenPhieu.
    // Đổi người xử lý (kể cả gỡ, kể cả tự gán) cần giaoViecChoNguoiKhac (Trưởng nhóm, Toàn quyền); thành viên thường nhận việc cho mình qua /claim
    // (có điều kiện chống giành — tự gán ở đây sẽ đè lên người đang giữ).
    route("PATCH", "/api/feedback/:id/xu-ly", "staff", async ({ request, env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const q = quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await memberships(env.DB, staff) });
      if (!q.doc) return NOT_FOUND();
      if (!q.xuLy) return error(403, "forbidden", "Chỉ nhóm xử lý được xử lý phiếu.");
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validatePatchInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      if (v.value.assignee && !q.giaoViecChoNguoiKhac) return error(403, "forbidden", "Chỉ Trưởng nhóm được giao việc; bạn hãy bấm «Nhận việc» để nhận cho mình.");
      const from = t.status_code as FeedbackStatus;
      const to = v.value.status ?? null;
      if (to !== null && !canTransition(from, to)) {
        return error(409, "bad_transition", `Không thể chuyển từ "${FEEDBACK_STATUS_NAME[from]}" sang "${FEEDBACK_STATUS_NAME[to]}".`);
      }
      const at = new Date().toISOString();
      const doiNguoi = v.value.assignee !== undefined && v.value.assignee.value !== t.assignee_id;
      // Lô: cổng (PATCH_TICKET) → sự kiện ASSIGNED khi đổi người (changes() của câu cập nhật) → nhật ký (changes() của câu ngay trước: sự kiện, hoặc câu cập nhật
      // khi không có sự kiện — sự kiện chỉ chèn khi câu cập nhật đổi dòng nên hai cách đều nghĩa là «cổng đã qua») → mốc đã xem của người làm.
      const res = await env.DB.batch([
        patchTicketStatement(env.DB, { id, status: to, assignee: v.value.assignee, resolvedIn: v.value.resolvedIn, priority: v.value.priority, now: at, adminId: staff.id, fromStatus: from, teamId: t.team_id }),
        ...(doiNguoi
          ? [insertEventStatement(env.DB, { id: crypto.randomUUID(), ticketId: id, type: "ASSIGNED", from: t.assignee_id, to: v.value.assignee!.value, actor: staff.id, now: at })]
          : []),
        ...nhatKyDoiPhieu(env.DB, { staffId: staff.id, t, v: v.value, from, to, at }),
        markSeenAfterWriteStatement(env.DB, { ticketId: id, staffId: staff.id, now: at }),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) {
        const now = await getTicket(env.DB, id);
        if (!now || now.team_id !== t.team_id) return STALE_TEAM();
        if (now.status_code !== from) return error(409, "stale", "Yêu cầu vừa được người khác đổi trạng thái, hãy tải lại.");
        return BAD_ASSIGNEE();
      }
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),

    // Chuyển nhóm (ADR-0119 điều 2, 8): Toàn quyền hoặc Trưởng nhóm của nhóm ĐANG giữ phiếu (quyenPhieu chuyenNhom). Bỏ người xử lý, Đang xử lý ⇒ Đã tiếp nhận
    // (câu TRANSFER đặt). Lý do chuyển = ghi chú nội bộ của nhóm MỚI; ghi chú cũ giữ nhãn nhóm cũ nên nhóm mới không đọc được (điều 5).
    // Lô: cổng (TRANSFER, khoá lạc quan theo nhóm đã kiểm quyền) → sự kiện TEAM_CHANGED (changes() của TRANSFER) → ghi chú lý do (có sự kiện) → nhật ký (có sự
    // kiện; detail CHỈ mã phiếu, kể cả nhóm nhạy cảm) → mốc đã xem của người làm.
    route("POST", "/api/feedback/:id/transfer", "staff", async ({ request, env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const q = quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await memberships(env.DB, staff) });
      if (!q.doc) return NOT_FOUND();
      if (!q.chuyenNhom) return error(403, "forbidden", "Chỉ Trưởng nhóm hoặc người phụ trách hệ thống được chuyển nhóm.");
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateTransferInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const dich = await getTeam(env.DB, v.value.teamId);
      if (!dich || dich.active !== 1) return error(400, "invalid_input", "Nhóm nhận không hợp lệ.");
      if (dich.id === t.team_id) return error(409, "stale", "Phiếu đang ở nhóm này.");
      // R13: phiếu đã đóng không chuyển nhóm (tránh xoá người xử lý / đẩy chấm đỏ của phiếu đã đóng). Câu TRANSFER cũng có điều kiện này (khỏi race).
      if (t.status_code === "DONE" || t.status_code === "DECLINED") return CLOSED_NO_TRANSFER();
      const cu = await getTeam(env.DB, t.team_id);
      const at = new Date().toISOString();
      const eventId = crypto.randomUUID();
      const res = await env.DB.batch([
        transferStatement(env.DB, { id, toTeam: dich.id, fromTeam: t.team_id, now: at, by: staff.id }),
        insertEventStatement(env.DB, { id: eventId, ticketId: id, type: "TEAM_CHANGED", from: t.team_id, to: dich.id, actor: staff.id, now: at }),
        insertTransferNoteStatement(env.DB, {
          id: crypto.randomUUID(), ticketId: id, authorId: staff.id, body: `Chuyển từ ${cu?.name ?? "nhóm cũ"}: ${v.value.reason}`, now: at, teamId: dich.id, eventId,
        }),
        auditStatement(
          env.DB,
          { staffId: staff.id, action: "feedback_team_changed", at, targetType: "feedback", targetId: id, detail: feedbackCode(t.seq) },
          `EXISTS (SELECT 1 FROM fbk_ticket_event WHERE id = '${eventId}')`,
        ),
        markSeenAfterWriteStatement(env.DB, { ticketId: id, staffId: staff.id, now: at }),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) {
        const lai = await getTicket(env.DB, id);
        if (!lai || lai.team_id !== t.team_id) return STALE_TEAM();
        if (lai.status_code === "DONE" || lai.status_code === "DECLINED") return CLOSED_NO_TRANSFER(); // phiếu vừa đóng
        return error(400, "invalid_input", "Nhóm nhận không hợp lệ."); // nhóm đích vừa bị ngưng
      }
      // Trưởng nhóm cũ mất quyền ngay (detail ⇒ null): vẫn trả 200 với phiếu và tin CÔNG KHAI, mọi quyền false — không kèm ghi chú nội bộ nhóm nào.
      const d = await detail(env.DB, staff, id);
      if (d) return json(d);
      const sau = await getTicket(env.DB, id);
      if (!sau) return NOT_FOUND();
      return json({
        ticket: toTicket(sau, false),
        messages: (await listMessages(env.DB, id, "none", sau.team_id)).map((m) => toMessage(m, staff.id)),
        canTriage: false,
        perms: { xuLy: false, giaoViec: false, chuyenNhom: false },
      } satisfies FeedbackDetailResponse);
    }),

    // Tuyến làm mới khung trò chuyện (ADR-0127 quyết định 1): CHỈ ĐỌC — KHÔNG gọi markSeen / ghi mốc đã xem (tab chỉ để mở không được tắt chấm đỏ). Quyền đọc như
    // tuyến chi tiết ngay dưới: id → phiếu → quyenPhieu (không đọc được ⇒ 404, kể cả khi since sai — không lộ phiếu có thật) → since (thiếu / sai ⇒ 400). Ghi chú
    // nội bộ lọc bằng CÙNG đoạn SQL với tuyến chi tiết theo q.noiBo. Khai trước /api/feedback/:id (tuyến tĩnh/dài trước tuyến có tham số).
    route("GET", "/api/feedback/:id/messages", "staff", async ({ env, staff, params, url }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const q = quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await memberships(env.DB, staff) });
      if (!q.doc) return NOT_FOUND();
      const since = parseSince(url.searchParams.get("since"));
      if (!since) return error(400, "invalid_input", "Mốc thời gian không hợp lệ.");
      const rows = await listMessagesSince(env.DB, id, q.noiBo, t.team_id, since, MESSAGES_SINCE_LIMIT);
      const p = toTicket(t, false);
      return json({
        messages: rows.map((m) => toMessage(m, staff.id)),
        ticket: { status: p.status, assigneeId: p.assigneeId, assigneeName: p.assigneeName, priority: p.priority, teamId: p.teamId },
      } satisfies FeedbackMessagesSinceResponse);
    }),

    route("GET", "/api/feedback/:id", "staff", async ({ env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const q = quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await memberships(env.DB, staff) });
      if (!q.doc) return NOT_FOUND();
      // Mọi người đọc được phiếu đều ghi mốc đã xem RIÊNG của mình (chưa đọc tính theo từng người — ADR-0119).
      await markSeen(env.DB, id, staff.id, t.submitter_id === staff.id, new Date().toISOString());
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),

    route("POST", "/api/feedback/:id/messages", "staff", async ({ request, env, exec, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const q = quyenPhieu({ who: staff, submitterId: t.submitter_id, ticketTeamId: t.team_id, memberships: await memberships(env.DB, staff) });
      if (!q.doc) return NOT_FOUND();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateMessageInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      // Ghi chú nội bộ: chỉ người xử lý được phiếu (Toàn quyền hoặc thành viên nhóm đang giữ phiếu, KHÔNG phải người gửi — R2).
      if (v.value.internal && !q.xuLy) return error(403, "forbidden", "Chỉ nhóm xử lý được ghi chú nội bộ.");
      const now = new Date();
      const at = now.toISOString();
      const messageId = crypto.randomUUID();
      await env.DB.batch([
        insertReplyStatement(env.DB, { id: messageId, ticketId: id, authorId: staff.id, body: v.value.body, internal: v.value.internal, now: at, windowStart: windowStart(now), limit: MESSAGE_LIMIT_PER_HOUR, teamId: t.team_id }),
        touchAfterReplyStatement(env.DB, { ticketId: id, messageId, now: at, internal: v.value.internal, authorId: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_replied", at, targetType: "feedback", targetId: id, detail: feedbackCode(t.seq) }, `EXISTS (SELECT 1 FROM fbk_message WHERE id = '${messageId}')`),
        markSeenAfterWriteStatement(env.DB, { ticketId: id, staffId: staff.id, now: at }),
      ]);
      if (!(await messageExists(env.DB, messageId))) {
        // Không chèn: hoặc phiếu vừa đổi nhóm sau lúc kiểm quyền (R11 — điều kiện nhóm của INSERT_REPLY), hoặc chạm trần tin nhắn. Đọc lại phiếu để phân biệt.
        const lai = await getTicket(env.DB, id);
        if (!lai || lai.team_id !== t.team_id) return STALE_TEAM();
        return RATE_LIMITED();
      }
      if (staff.id === t.submitter_id) {
        scheduleMail(env, exec, request, id, {
          type: "user_replied", code: feedbackCode(t.seq), kindName: FEEDBACK_KIND_NAME[t.kind_code as FeedbackKind], title: t.title, submitterName: staff.fullName, excerpt: v.value.body, teamName: t.team_name, sensitive: t.team_sensitive === 1,
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
        patchTicketStatement(env.DB, { id, status: to, assignee: v.value.assignee, resolvedIn: v.value.resolvedIn, priority: v.value.priority, now: at, adminId: staff.id, fromStatus: from, teamId: t.team_id }),
        ...nhatKyDoiPhieu(env.DB, { staffId: staff.id, t, v: v.value, from, to, at }),
        markSeenAfterWriteStatement(env.DB, { ticketId: id, staffId: staff.id, now: at }),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) {
        const now = await getTicket(env.DB, id);
        if (!now || now.team_id !== t.team_id) return STALE_TEAM();
        if (now.status_code !== from) return error(409, "stale", "Yêu cầu vừa được người khác đổi trạng thái, hãy tải lại.");
        return BAD_ASSIGNEE();
      }
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),
  ],
};
