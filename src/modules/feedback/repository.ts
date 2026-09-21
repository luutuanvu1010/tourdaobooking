// src/modules/feedback/repository.ts
// SQL của các bảng module feedback sở hữu (fbk_*). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)); câu SQL TĨNH, tham số đánh số ?N.
// Tên người đọc CHỈ qua view công bố v_stf_staff_label (module staff). Không có DELETE (R-N1-9).
import { defineSql } from "../../shared/sql-registry.ts";

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
}
export interface MessageRow {
  id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  internal: number;
  created_at: string;
}

const COLS = `t.id, t.seq, t.kind_code, k.name AS kind_name, t.status_code, st.name AS status_name, t.title, t.context, t.submitter_id,
  s.label AS submitter_name, t.assignee_id, a.label AS assignee_name, t.resolved_in, t.last_activity_at, t.last_public_reply_at, t.notified_at,
  t.created_at, t.updated_at`;
const FROM = `FROM fbk_ticket t JOIN fbk_kind k ON k.code = t.kind_code JOIN fbk_status st ON st.code = t.status_code
  LEFT JOIN v_stf_staff_label s ON s.id = t.submitter_id LEFT JOIN v_stf_staff_label a ON a.id = t.assignee_id`;

// "Chưa đọc" theo người xem: người gửi → có phản hồi công khai mới hơn lần xem của họ; admin → có hoạt động mới hơn lần xem của admin.
const UNREAD_SUBMITTER = `(t.last_public_reply_at IS NOT NULL AND (t.submitter_seen_at IS NULL OR t.last_public_reply_at > t.submitter_seen_at))`;
const UNREAD_ADMIN = `(t.admin_seen_at IS NULL OR t.last_activity_at > t.admin_seen_at)`;

// ---- Đọc -----------------------------------------------------------------------------------------------------------
const GET = defineSql("feedback", "get", `SELECT ${COLS}, 0 AS unread ${FROM} WHERE t.id = ?1`);
const FIND_BY_REQUEST = defineSql("feedback", "find_by_request", `SELECT id FROM fbk_ticket WHERE submitter_id = ?1 AND client_request_id = ?2`);
const MESSAGE_EXISTS = defineSql("feedback", "message_exists", `SELECT 1 AS ok FROM fbk_message WHERE id = ?1`);

// PHẠM VI XEM (không có hàm dùng chung: SQL của module phải tĩnh, nên phạm vi được quyết định ở một tập nhỏ, LIỆT KÊ ĐỦ dưới đây).
// Khi thêm tenant_id (đợt migration đa tenant) PHẢI thêm điều kiện tenant vào TỪNG chỗ sau:
//  1. LIST_MINE: lọc `t.submitter_id = ?1` (người thường chỉ thấy yêu cầu của mình).
//  2. LIST_QUEUE: KHÔNG lọc chủ; dựa vào route GET /api/feedback khai `access: "admin"` trong index.ts (kèm điều kiện tenant khi có).
//  3. BADGE: đếm theo người xem (mine lọc `submitter_id = ?1`; queue chỉ đếm khi ?2 = 1, tức admin).
//  4. GET / messages theo id (GET, FIND_BY_REQUEST, LIST_MESSAGES): không lọc trong SQL; index.ts gọi canRead() trước khi trả (và ẩn tin nội bộ với người không phải admin).
//  5. Các câu ghi (TOUCH_AFTER_REPLY, PATCH_TICKET, markSeen): chỉ chạy sau canRead()/quyền admin ở route.
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
  `SELECT ${COLS}, CASE WHEN ${UNREAD_ADMIN} THEN 1 ELSE 0 END AS unread ${FROM}
   WHERE (?2 IS NULL OR t.status_code = ?2) AND (?3 IS NULL OR t.kind_code = ?3) AND ?1 IS NOT NULL
   ORDER BY t.last_activity_at DESC LIMIT ?4 OFFSET ?5`,
);
const LIST_MESSAGES = defineSql(
  "feedback",
  "list_messages",
  `SELECT m.id, m.author_id, s.label AS author_name, m.body, m.internal, m.created_at
   FROM fbk_message m LEFT JOIN v_stf_staff_label s ON s.id = m.author_id
   WHERE m.ticket_id = ?1 AND (?2 = 1 OR m.internal = 0) ORDER BY m.created_at, m.rowid`,
);
// ?1 = id người xem, ?2 = 1 nếu là admin.
const BADGE = defineSql(
  "feedback",
  "badge",
  `SELECT
     (SELECT count(*) FROM fbk_ticket t WHERE t.submitter_id = ?1 AND ${UNREAD_SUBMITTER}) AS mine,
     (SELECT count(*) FROM fbk_ticket t WHERE ?2 = 1 AND ${UNREAD_ADMIN}) AS queue`,
);
const STATS = defineSql(
  "feedback",
  "stats",
  `SELECT strftime('%Y-%W', created_at) AS week, kind_code, status_code, count(*) AS n
   FROM fbk_ticket WHERE created_at >= ?1 GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`,
);

export const getTicket = (db: D1Database, id: string) => db.prepare(GET).bind(id).first<TicketRow>();
export const findByRequest = (db: D1Database, submitterId: string, clientRequestId: string) =>
  db.prepare(FIND_BY_REQUEST).bind(submitterId, clientRequestId).first<{ id: string }>();
export const messageExists = async (db: D1Database, id: string): Promise<boolean> => (await db.prepare(MESSAGE_EXISTS).bind(id).first()) !== null;
export const listMine = async (db: D1Database, staffId: string, limit: number, offset: number): Promise<TicketRow[]> =>
  (await db.prepare(LIST_MINE).bind(staffId, limit, offset).all<TicketRow>()).results;
export const listQueue = async (db: D1Database, staffId: string, status: string | null, kind: string | null, limit: number, offset: number): Promise<TicketRow[]> =>
  (await db.prepare(LIST_QUEUE).bind(staffId, status, kind, limit, offset).all<TicketRow>()).results;
export const listMessages = async (db: D1Database, ticketId: string, includeInternal: boolean): Promise<MessageRow[]> =>
  (await db.prepare(LIST_MESSAGES).bind(ticketId, includeInternal ? 1 : 0).all<MessageRow>()).results;
export async function badgeCounts(db: D1Database, staffId: string, isAdmin: boolean): Promise<{ mine: number; queue: number }> {
  const r = await db.prepare(BADGE).bind(staffId, isAdmin ? 1 : 0).first<{ mine: number; queue: number }>();
  return { mine: r?.mine ?? 0, queue: r?.queue ?? 0 };
}
export const weeklyStats = async (db: D1Database, sinceIso: string) =>
  (await db.prepare(STATS).bind(sinceIso).all<{ week: string; kind_code: string; status_code: string; n: number }>()).results;

// ---- Ghi -----------------------------------------------------------------------------------------------------------
// Tạo yêu cầu: MỘT câu INSERT … SELECT … WHERE (đếm trong cửa sổ) < trần AND chưa có cùng (người gửi, client_request_id).
// Đếm và chèn trong cùng một câu lệnh nên hai request song song không cùng qua trần (D1 tuần tự hoá ghi). seq = max+1 cùng câu.
// ?1 id, ?2 loại, ?3 tiêu đề, ?4 context JSON, ?5 người gửi, ?6 client_request_id, ?7 bây giờ, ?8 đầu cửa sổ, ?9 trần.
const INSERT_TICKET = defineSql(
  "feedback",
  "insert_ticket",
  `INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, COALESCE((SELECT max(seq) FROM fbk_ticket), 0) + 1, ?2, 'NEW', ?3, ?4, ?5, ?6, ?7, ?7, ?5, ?7, ?5
   WHERE (SELECT count(*) FROM fbk_ticket WHERE submitter_id = ?5 AND created_at > ?8) < ?9
     AND NOT EXISTS (SELECT 1 FROM fbk_ticket WHERE submitter_id = ?5 AND client_request_id = ?6)`,
);
// Tin mô tả ban đầu: chỉ chèn khi yêu cầu ?2 (vừa chèn ở câu trước) có mặt. ?1 id tin, ?2 id yêu cầu, ?3 tác giả, ?4 nội dung, ?5 bây giờ.
const INSERT_FIRST_MESSAGE = defineSql(
  "feedback",
  "insert_first_message",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, 0, ?5, ?3, ?5, ?3 WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?2)`,
);
// Trả lời: chèn khi yêu cầu có mặt VÀ dưới trần tin nhắn. ?1 id tin, ?2 id yêu cầu, ?3 tác giả, ?4 nội dung, ?5 internal 0/1, ?6 bây giờ, ?7 đầu cửa sổ, ?8 trần.
const INSERT_REPLY = defineSql(
  "feedback",
  "insert_reply",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?3, ?6, ?3
   WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?2)
     AND (SELECT count(*) FROM fbk_message WHERE author_id = ?3 AND created_at > ?7) < ?8`,
);
// Sau khi tin ?2 đã chèn: cập nhật mốc hoạt động. ?1 id yêu cầu, ?2 id tin, ?3 bây giờ, ?4 internal 0/1, ?5 tác giả.
// Người gửi trả lời → thấy mọi thứ của mình + mở lại nếu đã đóng (phản chiếu statusAfterSubmitterReply); admin trả lời → đã xem; công khai thì báo người gửi.
const TOUCH_AFTER_REPLY = defineSql(
  "feedback",
  "touch_after_reply",
  `UPDATE fbk_ticket SET
     last_activity_at = ?3,
     last_public_reply_at = CASE WHEN ?4 = 0 AND submitter_id <> ?5 THEN ?3 ELSE last_public_reply_at END,
     admin_seen_at = CASE WHEN submitter_id <> ?5 THEN ?3 ELSE admin_seen_at END,
     submitter_seen_at = CASE WHEN submitter_id = ?5 THEN ?3 ELSE submitter_seen_at END,
     status_code = CASE WHEN submitter_id = ?5 AND status_code IN ('DONE', 'DECLINED') THEN 'ACK' ELSE status_code END,
     updated_at = ?3, updated_by = ?5
   WHERE id = ?1 AND EXISTS (SELECT 1 FROM fbk_message WHERE id = ?2 AND ticket_id = ?1)`,
);
// Admin đổi trạng thái/người xử lý. ?1 id, ?2 trạng thái mới hoặc NULL, ?3 có đổi người xử lý (0/1), ?4 người xử lý mới, ?5 có đổi resolved_in (0/1),
// ?6 resolved_in mới, ?7 bây giờ, ?8 admin, ?9 trạng thái CŨ (khoá lạc quan: đã khác → 0 dòng đổi). Người xử lý mới phải là tài khoản đang hoạt động.
const PATCH_TICKET = defineSql(
  "feedback",
  "patch_ticket",
  `UPDATE fbk_ticket SET
     status_code = COALESCE(?2, status_code),
     assignee_id = CASE WHEN ?3 = 1 THEN ?4 ELSE assignee_id END,
     resolved_in = CASE WHEN ?5 = 1 THEN ?6 ELSE resolved_in END,
     last_activity_at = CASE WHEN ?2 IS NULL THEN last_activity_at ELSE ?7 END,
     last_public_reply_at = CASE WHEN ?2 IS NULL THEN last_public_reply_at ELSE ?7 END,
     admin_seen_at = CASE WHEN ?2 IS NULL THEN admin_seen_at ELSE ?7 END,
     updated_at = ?7, updated_by = ?8
   WHERE id = ?1 AND status_code = ?9
     AND (?3 = 0 OR ?4 IS NULL OR EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?4 AND active = 1))`,
);
// Đánh dấu đã xem. ?1 id, ?2 người xem là người gửi (0/1), ?3 người xem là admin (0/1), ?4 bây giờ. Không đổi updated_at.
const MARK_SEEN = defineSql(
  "feedback",
  "mark_seen",
  `UPDATE fbk_ticket SET
     submitter_seen_at = CASE WHEN ?2 = 1 THEN ?4 ELSE submitter_seen_at END,
     admin_seen_at = CASE WHEN ?3 = 1 THEN ?4 ELSE admin_seen_at END
   WHERE id = ?1`,
);
const SET_NOTIFIED = defineSql("feedback", "set_notified", `UPDATE fbk_ticket SET notified_at = ?2 WHERE id = ?1`);

export const insertTicketStatement = (
  db: D1Database,
  a: { id: string; kind: string; title: string; context: string; submitterId: string; clientRequestId: string; now: string; windowStart: string; limit: number },
) => db.prepare(INSERT_TICKET).bind(a.id, a.kind, a.title, a.context, a.submitterId, a.clientRequestId, a.now, a.windowStart, a.limit);
export const insertFirstMessageStatement = (db: D1Database, a: { id: string; ticketId: string; authorId: string; body: string; now: string }) =>
  db.prepare(INSERT_FIRST_MESSAGE).bind(a.id, a.ticketId, a.authorId, a.body, a.now);
export const insertReplyStatement = (
  db: D1Database,
  a: { id: string; ticketId: string; authorId: string; body: string; internal: boolean; now: string; windowStart: string; limit: number },
) => db.prepare(INSERT_REPLY).bind(a.id, a.ticketId, a.authorId, a.body, a.internal ? 1 : 0, a.now, a.windowStart, a.limit);
export const touchAfterReplyStatement = (db: D1Database, a: { ticketId: string; messageId: string; now: string; internal: boolean; authorId: string }) =>
  db.prepare(TOUCH_AFTER_REPLY).bind(a.ticketId, a.messageId, a.now, a.internal ? 1 : 0, a.authorId);
export const patchTicketStatement = (
  db: D1Database,
  a: { id: string; status: string | null; assignee?: { value: string | null }; resolvedIn?: { value: string | null }; now: string; adminId: string; fromStatus: string },
) =>
  db
    .prepare(PATCH_TICKET)
    .bind(a.id, a.status, a.assignee ? 1 : 0, a.assignee?.value ?? null, a.resolvedIn ? 1 : 0, a.resolvedIn?.value ?? null, a.now, a.adminId, a.fromStatus);
export const markSeen = async (db: D1Database, id: string, asSubmitter: boolean, asAdmin: boolean, now: string): Promise<void> => {
  if (!asSubmitter && !asAdmin) return;
  await db.prepare(MARK_SEEN).bind(id, asSubmitter ? 1 : 0, asAdmin ? 1 : 0, now).run();
};
export const setNotified = async (db: D1Database, id: string, at: string | null): Promise<void> => {
  await db.prepare(SET_NOTIFIED).bind(id, at).run();
};
