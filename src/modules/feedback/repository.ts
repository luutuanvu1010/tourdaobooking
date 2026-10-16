// src/modules/feedback/repository.ts
// SQL của các bảng module feedback sở hữu (fbk_*). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)); câu SQL TĨNH, tham số đánh số ?N.
// Tên người đọc CHỈ qua view công bố v_stf_staff_label (module staff). Không có DELETE (R-N1-9).
import { defineSql } from "../../shared/sql-registry.ts";
import type { Membership } from "./quyen.ts";

export interface TicketRow {
  id: string;
  seq: number;
  kind_code: string;
  kind_name: string;
  status_code: string;
  status_name: string;
  title: string;
  context: string;
  submitter_id: string;
  submitter_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  resolved_in: string | null;
  last_activity_at: string;
  last_public_reply_at: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
  unread: number;
  /** 1 = người giữ hợp lệ (nguoiGiuHopLe); 0 khi chưa ai giữ, người giữ đã khoá, bị gỡ khỏi nhóm hoặc phiếu đã sang nhóm khác (ADR-0119 điều 8: coi như chưa ai nhận). */
  assignee_active: number;
  team_id: string;
  team_name: string;
  team_sensitive: number;
}
export interface TeamRow { id: string; code: string; name: string; description: string; sensitive: number; active: number; sort_order: number }
export interface MessageRow {
  id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  internal: number;
  created_at: string;
}

// NGƯỜI GIỮ HỢP LỆ (ADR-0119 điều 2, 8; ruling R10): tài khoản còn hoạt động VÀ (còn là thành viên đang hiệu lực của nhóm ĐANG giữ phiếu, HOẶC đang giữ Toàn quyền —
// Toàn quyền nhận việc không cần là thành viên). Bị khoá, bị gỡ khỏi nhóm, hay phiếu đã chuyển sang nhóm khác ⇒ coi như chưa ai nhận. Quyền Toàn quyền đọc qua view
// công bố v_stf_toan_quyen của staff (ADR-0038, migration 0027) — không đọc thẳng stf_permission. Một nguồn cho ba chỗ: cột assignee_active, lọc UNASSIGNED, CLAIM.
// `p` = tên/bí danh bảng phiếu ("t" trong câu đọc, "fbk_ticket" trong câu UPDATE không có bí danh). Chuỗi dựng lúc nạp tệp ⇒ câu SQL vẫn tĩnh.
const nguoiGiuHopLe = (p: string) => `EXISTS (SELECT 1 FROM v_stf_staff_label gx WHERE gx.id = ${p}.assignee_id AND gx.active = 1
    AND (EXISTS (SELECT 1 FROM fbk_team_member gm WHERE gm.staff_id = ${p}.assignee_id AND gm.team_id = ${p}.team_id AND gm.valid_to_at IS NULL)
         OR EXISTS (SELECT 1 FROM v_stf_toan_quyen gq WHERE gq.staff_id = ${p}.assignee_id)))`;

const COLS = `t.id, t.seq, t.kind_code, k.name AS kind_name, t.status_code, st.name AS status_name, t.title, t.context, t.submitter_id,
  s.label AS submitter_name, t.assignee_id, a.label AS assignee_name, CASE WHEN t.assignee_id IS NOT NULL AND ${nguoiGiuHopLe("t")} THEN 1 ELSE 0 END AS assignee_active, t.resolved_in, t.last_activity_at, t.last_public_reply_at, t.notified_at,
  t.created_at, t.updated_at, t.team_id, tm.name AS team_name, tm.sensitive AS team_sensitive`;
const FROM = `FROM fbk_ticket t JOIN fbk_kind k ON k.code = t.kind_code JOIN fbk_status st ON st.code = t.status_code JOIN fbk_team tm ON tm.id = t.team_id
  LEFT JOIN v_stf_staff_label s ON s.id = t.submitter_id LEFT JOIN v_stf_staff_label a ON a.id = t.assignee_id`;

// "Chưa đọc" theo người xem: người gửi → có phản hồi công khai mới hơn lần xem của họ (submitter_seen_at);
// người xử lý (thành viên nhóm, Toàn quyền) → RIÊNG từng người (ADR-0119): chưa có mốc ở fbk_ticket_read, hoặc mốc cũ hơn hoạt động cuối. ?1 = người xem.
// Cột cũ fbk_ticket.admin_seen_at không còn đọc/ghi (một người mở từng làm mọi admin hết chấm đỏ).
const UNREAD_SUBMITTER = `(t.last_public_reply_at IS NOT NULL AND (t.submitter_seen_at IS NULL OR t.last_public_reply_at > t.submitter_seen_at))`;
const UNREAD_USER = `NOT EXISTS (SELECT 1 FROM fbk_ticket_read r WHERE r.ticket_id = t.id AND r.staff_id = ?1 AND r.seen_at >= t.last_activity_at)`;

// ---- Đọc -----------------------------------------------------------------------------------------------------------
const GET = defineSql("feedback", "get", `SELECT ${COLS}, 0 AS unread ${FROM} WHERE t.id = ?1`);
const FIND_BY_REQUEST = defineSql("feedback", "find_by_request", `SELECT id FROM fbk_ticket WHERE submitter_id = ?1 AND client_request_id = ?2`);
const MESSAGE_EXISTS = defineSql("feedback", "message_exists", `SELECT 1 AS ok FROM fbk_message WHERE id = ?1`);

// PHẠM VI XEM (không có hàm dùng chung: SQL của module phải tĩnh, nên phạm vi được quyết định ở một tập nhỏ, LIỆT KÊ ĐỦ dưới đây).
// Khi thêm tenant_id (đợt migration đa tenant) PHẢI thêm điều kiện tenant vào TỪNG chỗ sau:
//  1. LIST_MINE: lọc `t.submitter_id = ?1` (người thường chỉ thấy yêu cầu của mình).
//  2. LIST_QUEUE: KHÔNG lọc chủ; dựa vào route GET /api/feedback khai `access: "admin"` trong index.ts (kèm điều kiện tenant khi có).
//  2b. LIST_QUEUE_TEAM / STATS_TEAM: lọc `t.team_id = ?2`; route GET /api/feedback/queue gọi quyenPhieu (thành viên nhóm đó hoặc Toàn quyền) trước.
//  3. BADGE: đếm theo người xem (mine lọc `submitter_id = ?1`; queue = phiếu chưa đọc ở nhóm người xem thuộc, hoặc mọi nhóm khi ?2 = 1 tức Toàn quyền;
//     tài khoản bên ngoài: route không gọi câu này cho phần queue — index.ts trả 0).
//  4. GET / messages theo id (GET, FIND_BY_REQUEST, LIST_MESSAGES): không lọc chủ trong SQL; index.ts gọi quyenPhieu() trước khi trả (`doc`), và LIST_MESSAGES lọc ghi chú nội bộ theo `noiBo` của quyenPhieu (nhóm đang giữ phiếu).
//  5. Các câu ghi (TOUCH_AFTER_REPLY, PATCH_TICKET, CLAIM, TRANSFER, INSERT_TRANSFER_NOTE, INSERT_EVENT, markSeen): chỉ chạy sau quyenPhieu()/quyền admin ở route.
const LIST_MINE = defineSql(
  "feedback",
  "list_mine",
  `SELECT ${COLS}, CASE WHEN ${UNREAD_SUBMITTER} THEN 1 ELSE 0 END AS unread ${FROM}
   WHERE t.submitter_id = ?1 ORDER BY t.last_activity_at DESC LIMIT ?2 OFFSET ?3`,
);
// Hàng đợi: CHỈ route admin gọi. ?2 trạng thái, ?3 loại (NULL = tất cả), ?4 giới hạn, ?5 vị trí bắt đầu.
const LIST_QUEUE = defineSql(
  "feedback",
  "list_queue",
  `SELECT ${COLS}, CASE WHEN ${UNREAD_USER} THEN 1 ELSE 0 END AS unread ${FROM}
   WHERE (?2 IS NULL OR t.status_code = ?2) AND (?3 IS NULL OR t.kind_code = ?3) AND ?1 IS NOT NULL
   ORDER BY t.last_activity_at DESC LIMIT ?4 OFFSET ?5`,
);
const LIST_MESSAGES = defineSql(
  "feedback",
  "list_messages",
  `SELECT m.id, m.author_id, s.label AS author_name, m.body, m.internal, m.created_at
   FROM fbk_message m LEFT JOIN v_stf_staff_label s ON s.id = m.author_id
   WHERE m.ticket_id = ?1 AND (m.internal = 0 OR ?2 = 'all' OR (?2 = 'team' AND m.team_id = ?3)) ORDER BY m.created_at, m.rowid`,
);
// Hàng đợi MỘT nhóm (route GET /api/feedback/queue, sau quyenPhieu). Không chứa phiếu do chính người xem gửi (nằm ở "của tôi").
// ?1 người xem, ?2 nhóm, ?3 trạng thái|NULL, ?4 loc (ALL|MINE|UNASSIGNED), ?5 limit, ?6 offset.
// UNASSIGNED gồm cả phiếu có người giữ KHÔNG hợp lệ (nguoiGiuHopLe: khoá tài khoản, bị gỡ khỏi nhóm — coi như chưa ai nhận, ADR-0119 điều 8).
const LIST_QUEUE_TEAM = defineSql(
  "feedback",
  "list_queue_team",
  `SELECT ${COLS}, CASE WHEN ${UNREAD_USER} THEN 1 ELSE 0 END AS unread ${FROM}
   WHERE t.team_id = ?2 AND (?3 IS NULL OR t.status_code = ?3) AND t.submitter_id <> ?1
     AND (?4 = 'ALL' OR (?4 = 'MINE' AND t.assignee_id = ?1)
          OR (?4 = 'UNASSIGNED' AND (t.assignee_id IS NULL OR NOT ${nguoiGiuHopLe("t")})))
   ORDER BY t.last_activity_at DESC LIMIT ?5 OFFSET ?6`,
);
// ?1 người xem, ?2 Toàn quyền (1/0): "queue" = phiếu CHƯA ĐỌC ở nhóm tôi đang thuộc (Toàn quyền: mọi nhóm), trừ phiếu tôi gửi.
const BADGE = defineSql(
  "feedback",
  "badge",
  `SELECT
     (SELECT count(*) FROM fbk_ticket t WHERE t.submitter_id = ?1 AND ${UNREAD_SUBMITTER}) AS mine,
     (SELECT count(*) FROM fbk_ticket t WHERE t.submitter_id <> ?1 AND t.status_code NOT IN ('DONE', 'DECLINED') AND ${UNREAD_USER}
        AND (?2 = 1 OR t.team_id IN (SELECT m.team_id FROM fbk_team_member m WHERE m.staff_id = ?1 AND m.valid_to_at IS NULL))) AS queue`,
);
const STATS = defineSql(
  "feedback",
  "stats",
  `SELECT strftime('%Y-%W', created_at) AS week, kind_code, status_code, count(*) AS n
   FROM fbk_ticket WHERE created_at >= ?1 GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`,
);
// Thống kê tuần CHỈ của một nhóm (hàng đợi nhóm không lộ số phiếu nhóm khác). ?1 từ ngày, ?2 nhóm.
const STATS_TEAM = defineSql(
  "feedback",
  "stats_team",
  `SELECT strftime('%Y-%W', created_at) AS week, kind_code, status_code, count(*) AS n
   FROM fbk_ticket WHERE created_at >= ?1 AND team_id = ?2 GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`,
);

// Nhóm hỗ trợ (ADR-0119).
const LIST_TEAMS_ACTIVE = defineSql("feedback", "list_teams_active", `SELECT id, code, name, description, sensitive, active, sort_order FROM fbk_team WHERE active = 1 ORDER BY sort_order, name`);
const GET_TEAM = defineSql("feedback", "get_team", `SELECT id, code, name, description, sensitive, active, sort_order FROM fbk_team WHERE id = ?1`);
// Thành viên ĐANG hiệu lực của MỘT tài khoản CÒN HOẠT ĐỘNG (khoá tài khoản ⇒ mất quyền ngay — ADR-0119 điều 8).
const MEMBERSHIPS_OF = defineSql(
  "feedback",
  "memberships_of",
  `SELECT m.team_id, m.role FROM fbk_team_member m
   WHERE m.staff_id = ?1 AND m.valid_to_at IS NULL AND EXISTS (SELECT 1 FROM v_stf_staff_label s WHERE s.id = ?1 AND s.active = 1)`,
);

// Quản lý nhóm (ADR-0119, chỉ route có `feedback.team.manage` gọi): mọi nhóm kể cả đã ngưng; thành viên ĐANG hiệu lực kèm tên (view nhãn của staff).
const LIST_TEAMS_ALL = defineSql("feedback", "list_teams_all", `SELECT id, code, name, description, sensitive, active, sort_order FROM fbk_team ORDER BY sort_order, name`);
const LIST_MEMBERS_ALL = defineSql(
  "feedback",
  "list_members_all",
  `SELECT m.team_id, m.staff_id, s.label AS name, m.role FROM fbk_team_member m LEFT JOIN v_stf_staff_label s ON s.id = m.staff_id
   WHERE m.valid_to_at IS NULL ORDER BY m.team_id, m.role, s.label`,
);

export const getTicket = (db: D1Database, id: string) => db.prepare(GET).bind(id).first<TicketRow>();
export const findByRequest = (db: D1Database, submitterId: string, clientRequestId: string) =>
  db.prepare(FIND_BY_REQUEST).bind(submitterId, clientRequestId).first<{ id: string }>();
export const messageExists = async (db: D1Database, id: string): Promise<boolean> => (await db.prepare(MESSAGE_EXISTS).bind(id).first()) !== null;
export const listMine = async (db: D1Database, staffId: string, limit: number, offset: number): Promise<TicketRow[]> =>
  (await db.prepare(LIST_MINE).bind(staffId, limit, offset).all<TicketRow>()).results;
export const listQueue = async (db: D1Database, staffId: string, status: string | null, kind: string | null, limit: number, offset: number): Promise<TicketRow[]> =>
  (await db.prepare(LIST_QUEUE).bind(staffId, status, kind, limit, offset).all<TicketRow>()).results;
/** Ghi chú nội bộ theo `noiBo` của quyenPhieu: "none" không có; "team" chỉ ghi chú do nhóm `teamId` (nhóm đang giữ phiếu) viết; "all" mọi ghi chú (Toàn quyền). */
export const listMessages = async (db: D1Database, ticketId: string, noiBo: "none" | "team" | "all", teamId: string): Promise<MessageRow[]> =>
  (await db.prepare(LIST_MESSAGES).bind(ticketId, noiBo, teamId).all<MessageRow>()).results;
export const listQueueTeam = async (
  db: D1Database, staffId: string, teamId: string, status: string | null, loc: string, limit: number, offset: number,
): Promise<TicketRow[]> => (await db.prepare(LIST_QUEUE_TEAM).bind(staffId, teamId, status, loc, limit, offset).all<TicketRow>()).results;
/** Huy hiệu: `mine` phiếu của tôi có phản hồi mới; `queue` phiếu chưa đọc (riêng tôi) ở nhóm tôi thuộc — Toàn quyền: mọi nhóm. */
export async function badgeCounts(db: D1Database, staffId: string, isSuper: boolean): Promise<{ mine: number; queue: number }> {
  const r = await db.prepare(BADGE).bind(staffId, isSuper ? 1 : 0).first<{ mine: number; queue: number }>();
  return { mine: r?.mine ?? 0, queue: r?.queue ?? 0 };
}
export const listTeamsActive = async (db: D1Database): Promise<TeamRow[]> => (await db.prepare(LIST_TEAMS_ACTIVE).all<TeamRow>()).results;
export const getTeam = (db: D1Database, id: string) => db.prepare(GET_TEAM).bind(id).first<TeamRow>();
export const membershipsOf = async (db: D1Database, staffId: string): Promise<Membership[]> =>
  (await db.prepare(MEMBERSHIPS_OF).bind(staffId).all<{ team_id: string; role: "LEAD" | "MEMBER" }>()).results.map((r) => ({ teamId: r.team_id, role: r.role }));
export interface TeamMemberRow { team_id: string; staff_id: string; name: string | null; role: "LEAD" | "MEMBER" }
export const listTeamsAll = async (db: D1Database): Promise<TeamRow[]> => (await db.prepare(LIST_TEAMS_ALL).all<TeamRow>()).results;
export const listMembersAll = async (db: D1Database): Promise<TeamMemberRow[]> => (await db.prepare(LIST_MEMBERS_ALL).all<TeamMemberRow>()).results;
export const weeklyStats = async (db: D1Database, sinceIso: string) =>
  (await db.prepare(STATS).bind(sinceIso).all<{ week: string; kind_code: string; status_code: string; n: number }>()).results;
export const statsTeam = async (db: D1Database, sinceIso: string, teamId: string) =>
  (await db.prepare(STATS_TEAM).bind(sinceIso, teamId).all<{ week: string; kind_code: string; status_code: string; n: number }>()).results;

// ---- Ghi -----------------------------------------------------------------------------------------------------------
// Tạo yêu cầu: MỘT câu INSERT … SELECT … WHERE (đếm trong cửa sổ) < trần AND chưa có cùng (người gửi, client_request_id).
// Đếm và chèn trong cùng một câu lệnh nên hai request song song không cùng qua trần (D1 tuần tự hoá ghi). seq = max+1 cùng câu.
// ?1 id, ?2 loại, ?3 tiêu đề, ?4 context JSON, ?5 người gửi, ?6 client_request_id, ?7 bây giờ, ?8 đầu cửa sổ, ?9 trần, ?10 nhóm nhận (route đã kiểm có thật, đang dùng).
const INSERT_TICKET = defineSql(
  "feedback",
  "insert_ticket",
  `INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, created_by, updated_at, updated_by, team_id)
   SELECT ?1, COALESCE((SELECT max(seq) FROM fbk_ticket), 0) + 1, ?2, 'NEW', ?3, ?4, ?5, ?6, ?7, ?7, ?5, ?7, ?5, ?10
   WHERE (SELECT count(*) FROM fbk_ticket WHERE submitter_id = ?5 AND created_at > ?8) < ?9
     AND NOT EXISTS (SELECT 1 FROM fbk_ticket WHERE submitter_id = ?5 AND client_request_id = ?6)`,
);
// Tin mô tả ban đầu: chỉ chèn khi yêu cầu ?2 (vừa chèn ở câu trước) có mặt. ?1 id tin, ?2 id yêu cầu, ?3 tác giả, ?4 nội dung, ?5 bây giờ.
// team_id của tin = nhóm đang giữ phiếu lúc viết (ADR-0119).
const INSERT_FIRST_MESSAGE = defineSql(
  "feedback",
  "insert_first_message",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by, team_id)
   SELECT ?1, ?2, ?3, ?4, 0, ?5, ?3, ?5, ?3, (SELECT team_id FROM fbk_ticket WHERE id = ?2) WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?2)`,
);
// Trả lời: chèn khi yêu cầu có mặt, VẪN ở nhóm route đã kiểm quyền (?9 — R11: phiếu vừa chuyển nhóm ⇒ không chèn, kẻo ghi chú nội bộ mang nhãn nhóm mới hay
// người của nhóm cũ ghi sau khi đã mất quyền), VÀ dưới trần tin nhắn. team_id của tin = ?9 (bằng nhóm đang giữ phiếu vì điều kiện trên).
// ?1 id tin, ?2 id yêu cầu, ?3 tác giả, ?4 nội dung, ?5 internal 0/1, ?6 bây giờ, ?7 đầu cửa sổ, ?8 trần, ?9 nhóm đã kiểm quyền.
const INSERT_REPLY = defineSql(
  "feedback",
  "insert_reply",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by, team_id)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?3, ?6, ?3, ?9
   WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?2 AND team_id = ?9)
     AND (SELECT count(*) FROM fbk_message WHERE author_id = ?3 AND created_at > ?7) < ?8`,
);
// Sau khi tin ?2 đã chèn: cập nhật mốc hoạt động. ?1 id yêu cầu, ?2 id tin, ?3 bây giờ, ?4 internal 0/1, ?5 tác giả.
// Người gửi trả lời → thấy mọi thứ của mình + mở lại nếu đã đóng (phản chiếu statusAfterSubmitterReply); công khai thì báo người gửi.
// Mốc "đã xem" riêng của người trả lời (fbk_ticket_read) ghi bằng markSeenAfterWriteStatement CÙNG lô, sau câu này.
const TOUCH_AFTER_REPLY = defineSql(
  "feedback",
  "touch_after_reply",
  `UPDATE fbk_ticket SET
     last_activity_at = ?3,
     last_public_reply_at = CASE WHEN ?4 = 0 AND submitter_id <> ?5 THEN ?3 ELSE last_public_reply_at END,
     submitter_seen_at = CASE WHEN submitter_id = ?5 THEN ?3 ELSE submitter_seen_at END,
     status_code = CASE WHEN submitter_id = ?5 AND status_code IN ('DONE', 'DECLINED') THEN 'ACK' ELSE status_code END,
     updated_at = ?3, updated_by = ?5
   WHERE id = ?1 AND EXISTS (SELECT 1 FROM fbk_message WHERE id = ?2 AND ticket_id = ?1)`,
);
// Đổi trạng thái/người xử lý (tuyến cũ PATCH /api/feedback/:id của Toàn quyền VÀ tuyến PATCH …/xu-ly theo quyenPhieu dùng chung câu này).
// ?1 id, ?2 trạng thái mới hoặc NULL, ?3 có đổi người xử lý (0/1), ?4 người xử lý mới, ?5 có đổi resolved_in (0/1),
// ?6 resolved_in mới, ?7 bây giờ, ?8 người làm, ?9 trạng thái CŨ (khoá lạc quan: đã khác → 0 dòng đổi),
// ?10 nhóm route đã kiểm quyền (khoá lạc quan theo nhóm như R11: phiếu vừa chuyển nhóm → 0 dòng, người vừa mất quyền không ghi được).
// Người xử lý mới (ADR-0119 điều 2) phải là thành viên ĐANG hiệu lực, tài khoản còn hoạt động, của nhóm ĐANG giữ phiếu, và không phải người gửi phiếu.
// Mốc "đã xem" riêng của người làm ghi bằng markSeenAfterWriteStatement CÙNG lô, sau câu này.
const PATCH_TICKET = defineSql(
  "feedback",
  "patch_ticket",
  `UPDATE fbk_ticket SET
     status_code = COALESCE(?2, status_code),
     assignee_id = CASE WHEN ?3 = 1 THEN ?4 ELSE assignee_id END,
     resolved_in = CASE WHEN ?5 = 1 THEN ?6 ELSE resolved_in END,
     last_activity_at = CASE WHEN ?2 IS NULL THEN last_activity_at ELSE ?7 END,
     last_public_reply_at = CASE WHEN ?2 IS NULL THEN last_public_reply_at ELSE ?7 END,
     updated_at = ?7, updated_by = ?8
   WHERE id = ?1 AND status_code = ?9 AND team_id = ?10
     AND (?3 = 0 OR ?4 IS NULL OR (?4 <> fbk_ticket.submitter_id AND EXISTS (SELECT 1 FROM fbk_team_member m JOIN v_stf_staff_label s ON s.id = m.staff_id
       WHERE m.team_id = fbk_ticket.team_id AND m.staff_id = ?4 AND m.valid_to_at IS NULL AND s.active = 1)))`,
);
// Nhận việc (ADR-0119 điều 8): chỉ khi chưa ai giữ (hoặc người giữ không hợp lệ — nguoiGiuHopLe) và phiếu chưa đóng — hai người bấm cùng lúc: D1 tuần tự hoá ghi,
// câu sau thấy assignee_id đã có (còn hoạt động) ⇒ 0 dòng ⇒ route trả 409. Phiếu Mới ⇒ Đã tiếp nhận (báo người gửi như đổi trạng thái).
// ?1 phiếu, ?2 người nhận, ?3 bây giờ, ?4 nhóm route đã kiểm quyền (R11: phiếu vừa chuyển sang nhóm khác giữa lúc kiểm và lúc ghi ⇒ 0 dòng ⇒ 409).
// updated_at/updated_by = mốc của lệnh (cổng cho markSeenAfterWriteStatement cùng lô).
const CLAIM = defineSql(
  "feedback",
  "claim",
  `UPDATE fbk_ticket SET
     assignee_id = ?2,
     last_public_reply_at = CASE WHEN status_code = 'NEW' THEN ?3 ELSE last_public_reply_at END,
     status_code = CASE WHEN status_code = 'NEW' THEN 'ACK' ELSE status_code END,
     last_activity_at = ?3, updated_at = ?3, updated_by = ?2
   WHERE id = ?1 AND team_id = ?4 AND status_code NOT IN ('DONE', 'DECLINED')
     AND (assignee_id IS NULL OR NOT ${nguoiGiuHopLe("fbk_ticket")})`,
);
// Sự kiện phiếu (chỉ thêm). Cổng `changes() > 0`: PHẢI đứng NGAY SAU câu cập nhật phiếu (CLAIM / PATCH_TICKET / TRANSFER) và TRƯỚC auditStatement — changes() đổi sau mỗi câu.
// ?1 id, ?2 phiếu, ?3 loại (TEAM_CHANGED|ASSIGNED|CLAIMED), ?4 giá trị cũ, ?5 giá trị mới, ?6 người làm, ?7 bây giờ.
const INSERT_EVENT = defineSql(
  "feedback",
  "insert_event",
  `INSERT INTO fbk_ticket_event (id, ticket_id, type, from_value, to_value, actor_id, at, created_by, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?6 WHERE changes() > 0`,
);
// Chuyển nhóm (ADR-0119 điều 8): khoá lạc quan theo nhóm HIỆN TẠI (?4 — nhóm route đã kiểm quyền); bỏ người xử lý; Đang xử lý ⇒ Đã tiếp nhận do chính câu này đặt
// (không qua bảng luật chuyển trạng thái thủ công). Chuyển sang chính nhóm đang giữ, phiếu vừa đổi nhóm, phiếu đã đóng (R13), hay nhóm đích không có/đã ngưng ⇒ 0 dòng.
// ?1 phiếu, ?2 nhóm mới, ?3 bây giờ, ?4 nhóm cũ, ?5 người làm. updated_at/updated_by = mốc của lệnh (cổng cho markSeenAfterWriteStatement cùng lô).
const TRANSFER = defineSql(
  "feedback",
  "transfer",
  `UPDATE fbk_ticket SET team_id = ?2, assignee_id = NULL,
     status_code = CASE WHEN status_code = 'IN_PROGRESS' THEN 'ACK' ELSE status_code END,
     last_activity_at = ?3, updated_at = ?3, updated_by = ?5
   WHERE id = ?1 AND team_id = ?4 AND ?2 <> ?4 AND status_code NOT IN ('DONE', 'DECLINED') AND EXISTS (SELECT 1 FROM fbk_team WHERE id = ?2 AND active = 1)`,
);
// Lý do chuyển = ghi chú nội bộ của nhóm MỚI (?6). Cổng: sự kiện TEAM_CHANGED ?7 của CÙNG lô đã chèn (sự kiện chỉ chèn khi TRANSFER đổi dòng) — chính xác hơn so
// mốc giờ. ?1 id tin, ?2 phiếu, ?3 tác giả, ?4 nội dung, ?5 bây giờ, ?6 nhóm mới, ?7 id sự kiện.
const INSERT_TRANSFER_NOTE = defineSql(
  "feedback",
  "insert_transfer_note",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by, team_id)
   SELECT ?1, ?2, ?3, ?4, 1, ?5, ?3, ?5, ?3, ?6 WHERE EXISTS (SELECT 1 FROM fbk_ticket_event WHERE id = ?7 AND ticket_id = ?2 AND type = 'TEAM_CHANGED')`,
);
// Đánh dấu đã xem khi MỞ chi tiết: mốc riêng của người xem (fbk_ticket_read, upsert) và, nếu là người gửi, submitter_seen_at. Không đổi updated_at của phiếu.
// ?1 phiếu, ?2 người xem, ?3 bây giờ. updated_at của dòng đọc đặt = seen_at (cột có mặc định giờ máy nên không tự đổi khi ON CONFLICT).
const MARK_SEEN_USER = defineSql(
  "feedback",
  "mark_seen_user",
  `INSERT INTO fbk_ticket_read (ticket_id, staff_id, seen_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?2, ?3, ?2)
   ON CONFLICT(ticket_id, staff_id) DO UPDATE SET seen_at = excluded.seen_at, updated_at = excluded.seen_at, updated_by = excluded.updated_by`,
);
const MARK_SEEN_SUBMITTER = defineSql("feedback", "mark_seen_submitter", `UPDATE fbk_ticket SET submitter_seen_at = ?2 WHERE id = ?1`);
// Sau một lệnh ghi lên phiếu (trả lời, đổi trạng thái/người xử lý) trong CÙNG lô: người làm coi như đã xem. Cổng: câu trước đã thật sự cập nhật phiếu
// (updated_at = bây giờ VÀ updated_by = người làm) — câu trước không đổi gì (chạm trần, khoá lạc quan) thì không ghi mốc. ?1 phiếu, ?2 người làm, ?3 bây giờ.
const MARK_SEEN_AFTER_WRITE = defineSql(
  "feedback",
  "mark_seen_after_write",
  `INSERT INTO fbk_ticket_read (ticket_id, staff_id, seen_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?2, ?3, ?2 WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?1 AND updated_at = ?3 AND updated_by = ?2)
   ON CONFLICT(ticket_id, staff_id) DO UPDATE SET seen_at = excluded.seen_at, updated_at = excluded.seen_at, updated_by = excluded.updated_by`,
);
const SET_NOTIFIED = defineSql("feedback", "set_notified", `UPDATE fbk_ticket SET notified_at = ?2 WHERE id = ?1`);

export const insertTicketStatement = (
  db: D1Database,
  a: { id: string; kind: string; title: string; context: string; submitterId: string; clientRequestId: string; now: string; windowStart: string; limit: number; teamId: string },
) => db.prepare(INSERT_TICKET).bind(a.id, a.kind, a.title, a.context, a.submitterId, a.clientRequestId, a.now, a.windowStart, a.limit, a.teamId);
export const insertFirstMessageStatement = (db: D1Database, a: { id: string; ticketId: string; authorId: string; body: string; now: string }) =>
  db.prepare(INSERT_FIRST_MESSAGE).bind(a.id, a.ticketId, a.authorId, a.body, a.now);
export const insertReplyStatement = (
  db: D1Database,
  a: { id: string; ticketId: string; authorId: string; body: string; internal: boolean; now: string; windowStart: string; limit: number; teamId: string },
) => db.prepare(INSERT_REPLY).bind(a.id, a.ticketId, a.authorId, a.body, a.internal ? 1 : 0, a.now, a.windowStart, a.limit, a.teamId);
export const touchAfterReplyStatement = (db: D1Database, a: { ticketId: string; messageId: string; now: string; internal: boolean; authorId: string }) =>
  db.prepare(TOUCH_AFTER_REPLY).bind(a.ticketId, a.messageId, a.now, a.internal ? 1 : 0, a.authorId);
export const patchTicketStatement = (
  db: D1Database,
  a: { id: string; status: string | null; assignee?: { value: string | null }; resolvedIn?: { value: string | null }; now: string; adminId: string; fromStatus: string; teamId: string },
) =>
  db
    .prepare(PATCH_TICKET)
    .bind(a.id, a.status, a.assignee ? 1 : 0, a.assignee?.value ?? null, a.resolvedIn ? 1 : 0, a.resolvedIn?.value ?? null, a.now, a.adminId, a.fromStatus, a.teamId);
export const claimStatement = (db: D1Database, a: { id: string; staffId: string; now: string; teamId: string }) => db.prepare(CLAIM).bind(a.id, a.staffId, a.now, a.teamId);
export const transferStatement = (db: D1Database, a: { id: string; toTeam: string; fromTeam: string; now: string; by: string }) =>
  db.prepare(TRANSFER).bind(a.id, a.toTeam, a.now, a.fromTeam, a.by);
export const insertTransferNoteStatement = (db: D1Database, a: { id: string; ticketId: string; authorId: string; body: string; now: string; teamId: string; eventId: string }) =>
  db.prepare(INSERT_TRANSFER_NOTE).bind(a.id, a.ticketId, a.authorId, a.body, a.now, a.teamId, a.eventId);
export type TicketEventType = "TEAM_CHANGED" | "ASSIGNED" | "CLAIMED";
export const insertEventStatement = (
  db: D1Database,
  a: { id: string; ticketId: string; type: TicketEventType; from: string | null; to: string | null; actor: string; now: string },
) => db.prepare(INSERT_EVENT).bind(a.id, a.ticketId, a.type, a.from, a.to, a.actor, a.now);
/** Mở chi tiết (route đã kiểm quyền đọc): ghi mốc riêng của người xem; người gửi thì thêm submitter_seen_at — một lô. Không gọi ở tuyến làm mới danh sách. */
export const markSeen = async (db: D1Database, ticketId: string, viewerId: string, asSubmitter: boolean, now: string): Promise<void> => {
  const user = db.prepare(MARK_SEEN_USER).bind(ticketId, viewerId, now);
  await db.batch(asSubmitter ? [user, db.prepare(MARK_SEEN_SUBMITTER).bind(ticketId, now)] : [user]);
};
export const markSeenAfterWriteStatement = (db: D1Database, a: { ticketId: string; staffId: string; now: string }) =>
  db.prepare(MARK_SEEN_AFTER_WRITE).bind(a.ticketId, a.staffId, a.now);
export const setNotified = async (db: D1Database, id: string, at: string | null): Promise<void> => {
  await db.prepare(SET_NOTIFIED).bind(id, at).run();
};

// ---- Ghi: quản lý nhóm hỗ trợ (ADR-0119; chỉ route có `feedback.team.manage`) -----------------------------------------------
// Tạo nhóm: chỉ chèn khi mã chưa có (route đọc lại theo id: không thấy ⇒ 409 mã trùng). sort_order = max+1 cùng câu.
// ?1 id, ?2 mã, ?3 tên, ?4 mô tả, ?5 nhạy cảm 0/1, ?6 bây giờ, ?7 người làm.
const INSERT_TEAM = defineSql(
  "feedback",
  "insert_team",
  `INSERT INTO fbk_team (id, code, name, description, sensitive, sort_order, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, COALESCE((SELECT max(sort_order) FROM fbk_team), 0) + 1, ?6, ?7, ?6, ?7
   WHERE NOT EXISTS (SELECT 1 FROM fbk_team WHERE code = ?2)`,
);
// Sửa nhóm: NULL = giữ nguyên. Mã nhóm KHÔNG sửa được. ?1 id, ?2 tên|NULL, ?3 mô tả|NULL, ?4 nhạy cảm 0/1|NULL, ?5 đang dùng 0/1|NULL, ?6 bây giờ, ?7 người làm.
const PATCH_TEAM = defineSql(
  "feedback",
  "patch_team",
  `UPDATE fbk_team SET name = COALESCE(?2, name), description = COALESCE(?3, description), sensitive = COALESCE(?4, sensitive), active = COALESCE(?5, active),
     updated_at = ?6, updated_by = ?7
   WHERE id = ?1`,
);
// Kết thúc tư cách đang hiệu lực (gỡ, hoặc vế đầu của đổi vai). Không xoá dòng: dòng cũ là lịch sử. ?1 nhóm, ?2 người, ?3 bây giờ, ?4 người làm.
const END_MEMBER = defineSql(
  "feedback",
  "end_member",
  `UPDATE fbk_team_member SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE team_id = ?1 AND staff_id = ?2 AND valid_to_at IS NULL`,
);
// Mở tư cách mới: chỉ chèn khi người ĐANG HOẠT ĐỘNG và nhóm có thật (lưới thứ hai — route đã kiểm trước lô). Tài khoản bên ngoài do route chặn (R6, đọc quyền
// qua hàm công bố của staff) và quyenPhieu bỏ qua (lưới thứ hai). ?1 id, ?2 nhóm, ?3 người, ?4 vai, ?5 bây giờ, ?6 người làm.
const INSERT_MEMBER = defineSql(
  "feedback",
  "insert_member",
  `INSERT INTO fbk_team_member (id, team_id, staff_id, role, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6
   WHERE EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?3 AND active = 1) AND EXISTS (SELECT 1 FROM fbk_team WHERE id = ?2)`,
);

export const insertTeamStatement = (db: D1Database, a: { id: string; code: string; name: string; description: string; sensitive: boolean; now: string; by: string }) =>
  db.prepare(INSERT_TEAM).bind(a.id, a.code, a.name, a.description, a.sensitive ? 1 : 0, a.now, a.by);
export const patchTeamStatement = (
  db: D1Database,
  a: { id: string; name?: string; description?: string; sensitive?: boolean; active?: boolean; now: string; by: string },
) =>
  db
    .prepare(PATCH_TEAM)
    .bind(
      a.id,
      a.name ?? null,
      a.description ?? null,
      a.sensitive === undefined ? null : a.sensitive ? 1 : 0,
      a.active === undefined ? null : a.active ? 1 : 0,
      a.now,
      a.by,
    );
export const endMemberStatement = (db: D1Database, a: { teamId: string; staffId: string; now: string; by: string }) =>
  db.prepare(END_MEMBER).bind(a.teamId, a.staffId, a.now, a.by);
export const insertMemberStatement = (db: D1Database, a: { id: string; teamId: string; staffId: string; role: "LEAD" | "MEMBER"; now: string; by: string }) =>
  db.prepare(INSERT_MEMBER).bind(a.id, a.teamId, a.staffId, a.role, a.now, a.by);
