// Luật thuần của Góp ý / Báo lỗi (không I/O). Kiểm đầu vào, lọc `context` (không đáng tin), trần tần suất.
// Import bằng đuôi .ts để node --test chạy trực tiếp.
import { FEEDBACK_STATUSES, isFeedbackKind, isFeedbackStatus, type FeedbackKind, type FeedbackStatus } from "../../shared/feedback-catalog.ts";
import { isPriority, type Priority } from "../../shared/ve-ho-tro.ts";
import type { FeedbackPatchRequest } from "../../shared/contracts.ts";
import { UUID_RE } from "../../shared/http.ts";

export const TITLE_MAX = 120;
export const BODY_MAX = 4000;
/** Trần theo tài khoản trong cửa sổ 1 giờ. Tin nhắn tính cả tin mô tả ban đầu của yêu cầu mới. */
export const TICKET_LIMIT_PER_HOUR = 5;
export const MESSAGE_LIMIT_PER_HOUR = 30;
export const RATE_WINDOW_MS = 60 * 60 * 1000;
/** Đầu cửa sổ tần suất (ISO UTC) — so chuỗi với created_at (cũng ISO UTC). */
export const windowStart = (now: Date): string => new Date(now.getTime() - RATE_WINDOW_MS).toISOString();

/** Tuyến làm mới (ADR-0127 quyết định 1): tối đa bấy nhiêu tin mỗi lần — đủ vì khách chỉ lấy phần chồng 30 giây sau tin cuối đã nhận. */
export const MESSAGES_SINCE_LIMIT = 100;
const SINCE_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d{1,3})?Z$/;
/**
 * Mốc `since` của tuyến làm mới: CHỈ ISO UTC đủ ngày giờ, có `Z` (không múi giờ khác, không chỉ ngày); ngày giờ không có thật (30/2, 24:00) ⇒ null.
 * Trả chuỗi ĐÃ chuẩn hoá `toISOString()` (luôn 3 chữ số nghìn giây) vì SQL so CHUỖI với `created_at` — «…:05Z» không chuẩn hoá sẽ lớn hơn «…:05.500Z» (Z > .)
 * và làm mất tin. null ⇒ route trả 400 (không để `new Date(sai).toISOString()` ném lỗi thành 500).
 */
export function parseSince(raw: string | null): string | null {
  const m = raw === null ? null : SINCE_RE.exec(raw);
  if (!m) return null;
  const t = Date.parse(raw!);
  if (Number.isNaN(t)) return null;
  const iso = new Date(t).toISOString();
  return iso.slice(0, 19) === m[1] ? iso : null; // ngày giờ bị «tràn» sang ngày khác (30/2 ⇒ 2/3) ⇒ không nhận
}

export const CLIENT_REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };
const bad = (message: string): { ok: false; message: string } => ({ ok: false, message });

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_KEEP_NEWLINE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

const cleanTitle = (v: unknown): string => (typeof v === "string" ? v.replace(CONTROL, " ").replace(/\s+/g, " ").trim() : "");
const cleanBody = (v: unknown): string => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(CONTROL_KEEP_NEWLINE, "").trim() : "");

export interface FeedbackContextShape {
  path?: string;
  orderCode?: string;
  device?: string;
  standalone?: boolean;
  appVersion?: string;
}

/** `context` do trình duyệt gửi → KHÔNG đáng tin: chỉ nhận bộ khoá cố định, cắt độ dài, bỏ ký tự điều khiển. Trả JSON đã lọc. */
export function sanitizeContext(raw: unknown): string {
  const out: FeedbackContextShape = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (typeof r.path === "string") {
      const p = r.path.replace(CONTROL, " ").slice(0, 200);
      if (p.startsWith("/")) out.path = p;
    }
    if (typeof r.orderCode === "string" && /^[A-Za-z0-9._-]{1,40}$/.test(r.orderCode)) out.orderCode = r.orderCode;
    if (typeof r.device === "string") {
      const d = r.device.replace(CONTROL, " ").trim().slice(0, 120);
      if (d) out.device = d;
    }
    if (typeof r.standalone === "boolean") out.standalone = r.standalone;
    if (typeof r.appVersion === "string" && /^[A-Za-z0-9._-]{1,40}$/.test(r.appVersion)) out.appVersion = r.appVersion;
  }
  return JSON.stringify(out);
}

/** Đọc lại JSON đã lưu; hỏng thì {} (không bao giờ ném). */
export function parseContext(json: string): FeedbackContextShape {
  try {
    const v = JSON.parse(json) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as FeedbackContextShape) : {};
  } catch {
    return {};
  }
}

export interface TicketInput {
  kind: FeedbackKind;
  title: string;
  body: string;
  clientRequestId: string;
  /** JSON đã lọc. */
  context: string;
  /** Nhóm nhận (ADR-0119); vắng = route dùng nhóm Kỹ thuật. Chỉ kiểm hình dạng; có thật/đang dùng do route kiểm. */
  teamId?: string;
  /** Đơn liên quan (ADR-0127): chỉ kiểm hình dạng ở đây; đơn có thật và do chính người gửi lập do route kiểm (repository: đoạn `DON_CUA_NGUOI`, hàm `getDonCuaToi`). */
  orderId?: string;
}
export const TEAM_ID_RE = /^[a-z0-9-]{1,60}$/;
/**
 * MỘT câu cho MỌI cách gắn đơn hỏng (ADR-0127 quyết định 3, Review Focus 3): sai dạng, không tồn tại, không phải của người gửi, tài khoản không có quyền
 * xem đơn — giống hệt nhau để không dò được đơn của người khác.
 */
export const CAU_DON_LIEN_QUAN_SAI = "Không gắn được đơn này: chỉ gắn được đơn do chính bạn lập.";

export function validateTicketInput(raw: Record<string, unknown>): Checked<TicketInput> {
  if (!isFeedbackKind(raw.kind)) return bad("Loại yêu cầu không hợp lệ.");
  const title = cleanTitle(raw.title);
  if (title.length < 1 || title.length > TITLE_MAX) return bad(`Tiêu đề phải từ 1 đến ${TITLE_MAX} ký tự.`);
  const body = cleanBody(raw.body);
  if (body.length < 1 || body.length > BODY_MAX) return bad(`Nội dung phải từ 1 đến ${BODY_MAX} ký tự.`);
  if (typeof raw.clientRequestId !== "string" || !CLIENT_REQUEST_ID_RE.test(raw.clientRequestId)) return bad("Mã yêu cầu của thiết bị không hợp lệ.");
  if (raw.teamId !== undefined && (typeof raw.teamId !== "string" || !TEAM_ID_RE.test(raw.teamId))) return bad("Nhóm nhận không hợp lệ.");
  const coDon = raw.orderId !== undefined && raw.orderId !== null;
  if (coDon && (typeof raw.orderId !== "string" || !UUID_RE.test(raw.orderId))) return bad(CAU_DON_LIEN_QUAN_SAI);
  // Dựng giá trị từ trường TƯỜNG MINH (không chép raw): `priority` người gửi kèm theo bị bỏ qua (ADR-0127 quyết định 2).
  const value: TicketInput = { kind: raw.kind, title, body, clientRequestId: raw.clientRequestId, context: sanitizeContext(raw.context) };
  if (typeof raw.teamId === "string") value.teamId = raw.teamId;
  if (coDon) value.orderId = raw.orderId as string;
  return { ok: true, value };
}

export interface MessageInput {
  body: string;
  internal: boolean;
}

export function validateMessageInput(raw: Record<string, unknown>): Checked<MessageInput> {
  const body = cleanBody(raw.body);
  if (body.length < 1 || body.length > BODY_MAX) return bad(`Nội dung phải từ 1 đến ${BODY_MAX} ký tự.`);
  if (raw.internal !== undefined && typeof raw.internal !== "boolean") return bad("Cờ ghi chú nội bộ không hợp lệ.");
  return { ok: true, value: { body, internal: raw.internal === true } };
}

export interface PatchInput {
  status?: FeedbackStatus;
  assignee?: { value: string | null };
  resolvedIn?: { value: string | null };
  /** Mức ưu tiên (ADR-0127): route chỉ cho người xử lý được phiếu (quyenPhieu.xuLy) tới đây. */
  priority?: Priority;
}
// Khoá hai chiều: thân PATCH (FeedbackPatchRequest ở contracts.ts, giao diện dùng) và bộ kiểm dưới đây phải cùng bộ trường.
// Thêm/bớt trường ở MỘT bên mà quên bên kia ⇒ `npm run typecheck` đỏ ở đây.
type PatchBodyKeys = "status" | "assigneeId" | "resolvedIn" | "priority";
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const PATCH_BODY_KEYS_KHOP: Same<keyof FeedbackPatchRequest, PatchBodyKeys> = true;

export function validatePatchInput(raw: Record<string, unknown>): Checked<PatchInput> {
  const out: PatchInput = {};
  if (raw.status !== undefined) {
    if (!isFeedbackStatus(raw.status)) return bad("Trạng thái không hợp lệ.");
    out.status = raw.status;
  }
  if (raw.assigneeId !== undefined) {
    if (raw.assigneeId !== null && (typeof raw.assigneeId !== "string" || !/^[0-9a-f-]{36}$/.test(raw.assigneeId))) return bad("Người xử lý không hợp lệ.");
    out.assignee = { value: raw.assigneeId };
  }
  if (raw.resolvedIn !== undefined) {
    if (out.status !== "DONE") return bad("Chỉ ghi bản sửa (resolvedIn) khi chuyển sang Đã xong.");
    if (raw.resolvedIn !== null && (typeof raw.resolvedIn !== "string" || !/^[A-Za-z0-9._-]{1,40}$/.test(raw.resolvedIn))) return bad("Mã bản sửa không hợp lệ.");
    out.resolvedIn = { value: raw.resolvedIn };
  }
  if (raw.priority !== undefined) {
    if (!isPriority(raw.priority)) return bad("Mức ưu tiên không hợp lệ.");
    out.priority = raw.priority;
  }
  if (out.status === undefined && out.assignee === undefined && out.priority === undefined) return bad("Không có thay đổi nào để lưu.");
  return { ok: true, value: out };
}

// ---- Quản lý nhóm hỗ trợ (ADR-0119; chỉ Toàn quyền) — giới hạn khớp CHECK của migration 0100 để trả 400 thay vì để lô ghi vỡ thành 500 --------
export const TEAM_CODE_RE = /^[A-Z0-9_]{1,40}$/;
export const TEAM_NAME_MAX = 60;
export const TEAM_DESCRIPTION_MAX = 300;

export interface TeamInput {
  code: string;
  name: string;
  description: string;
  sensitive: boolean;
}
export interface TeamPatch {
  name?: string;
  description?: string;
  sensitive?: boolean;
  active?: boolean;
}

const checkTeamName = (v: unknown): Checked<string> => {
  const name = cleanTitle(v);
  return name.length < 1 || name.length > TEAM_NAME_MAX ? bad(`Tên nhóm phải từ 1 đến ${TEAM_NAME_MAX} ký tự.`) : { ok: true, value: name };
};
const checkTeamDescription = (v: unknown): Checked<string> => {
  if (typeof v !== "string") return bad("Mô tả nhóm không hợp lệ.");
  const d = cleanTitle(v);
  return d.length > TEAM_DESCRIPTION_MAX ? bad(`Mô tả nhóm tối đa ${TEAM_DESCRIPTION_MAX} ký tự.`) : { ok: true, value: d };
};

/** Máy sinh mã nhóm từ tên (khi người lập không gửi `code`): bỏ dấu, đ→D, chữ HOA, ký tự ngoài A-Z0-9 thành `_`, cắt `_` hai đầu, tối đa 40; rỗng → NHOM. */
export function maNhomTuTen(ten: string): string {
  const khongDau = ten.replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D")).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ma = khongDau.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40).replace(/_+$/, "");
  return ma || "NHOM";
}

export function validateTeamInput(raw: Record<string, unknown>): Checked<TeamInput> {
  // Không gửi `code` thì máy sinh từ tên; gửi thì kiểm đúng như trước. Tên sai vẫn bị báo ở checkTeamName.
  const code = raw.code === undefined ? maNhomTuTen(typeof raw.name === "string" ? raw.name : "") : raw.code;
  if (typeof code !== "string" || !TEAM_CODE_RE.test(code)) return bad("Mã nhóm chỉ gồm chữ HOA không dấu, số, gạch dưới (tối đa 40 ký tự).");
  const name = checkTeamName(raw.name);
  if (!name.ok) return name;
  let description = "";
  if (raw.description !== undefined) {
    const d = checkTeamDescription(raw.description);
    if (!d.ok) return d;
    description = d.value;
  }
  if (raw.sensitive !== undefined && typeof raw.sensitive !== "boolean") return bad("Cờ nhạy cảm không hợp lệ.");
  return { ok: true, value: { code, name: name.value, description, sensitive: raw.sensitive === true } };
}

/** Sửa nhóm: ít nhất một trong tên / mô tả / nhạy cảm / đang dùng. Mã nhóm không sửa được (gửi `code` ⇒ 400, không lặng lẽ bỏ qua). */
export function validateTeamPatch(raw: Record<string, unknown>): Checked<TeamPatch> {
  if (raw.code !== undefined) return bad("Không sửa được mã nhóm.");
  const out: TeamPatch = {};
  if (raw.name !== undefined) {
    const n = checkTeamName(raw.name);
    if (!n.ok) return n;
    out.name = n.value;
  }
  if (raw.description !== undefined) {
    const d = checkTeamDescription(raw.description);
    if (!d.ok) return d;
    out.description = d.value;
  }
  if (raw.sensitive !== undefined) {
    if (typeof raw.sensitive !== "boolean") return bad("Cờ nhạy cảm không hợp lệ.");
    out.sensitive = raw.sensitive;
  }
  if (raw.active !== undefined) {
    if (typeof raw.active !== "boolean") return bad("Cờ đang dùng không hợp lệ.");
    out.active = raw.active;
  }
  if (Object.keys(out).length === 0) return bad("Không có thay đổi nào để lưu.");
  return { ok: true, value: out };
}

export function validateMemberRole(raw: Record<string, unknown>): Checked<"LEAD" | "MEMBER"> {
  return raw.role === "LEAD" || raw.role === "MEMBER" ? { ok: true, value: raw.role } : bad("Vai trò trong nhóm phải là Trưởng nhóm hoặc Thành viên.");
}

/** Chuyển nhóm (ADR-0119 điều 8): nhóm đích (chỉ kiểm hình dạng; có thật/đang dùng do route kiểm) + lý do 1–300 ký tự sau khi gọn khoảng trắng. */
export const TRANSFER_REASON_MAX = 300;
export interface TransferInput {
  teamId: string;
  reason: string;
}
export function validateTransferInput(raw: Record<string, unknown>): Checked<TransferInput> {
  if (typeof raw.teamId !== "string" || !TEAM_ID_RE.test(raw.teamId)) return bad("Nhóm nhận không hợp lệ.");
  const reason = cleanTitle(raw.reason);
  if (reason.length < 1 || reason.length > TRANSFER_REASON_MAX) return bad(`Lý do chuyển nhóm phải từ 1 đến ${TRANSFER_REASON_MAX} ký tự.`);
  return { ok: true, value: { teamId: raw.teamId, reason } };
}

/** Tìm trong hàng đợi: tối đa 60 ký tự (đã bỏ khoảng trắng hai đầu). */
export const HANG_DOI_Q_MAX = 60;
/**
 * Tham số `status` của hàng đợi nhóm: danh sách mã cách nhau dấu phẩy (`NEW,ACK`), một mã vẫn chạy. Vắng tham số (null) = mọi trạng thái; chuỗi rỗng, mã lạ
 * hay phần tử rỗng (`NEW,`) ⇒ lỗi. Mã lặp được bỏ. Trả chuỗi đã chuẩn hoá (bỏ trùng, giữ thứ tự gõ) để máy chủ tìm bằng `instr` — câu SQL vẫn tĩnh.
 */
export function parseTrangThaiHangDoi(raw: string | null): { ok: true; value: string | null } | { ok: false } {
  if (raw === null) return { ok: true, value: null };
  const ds = raw.split(",");
  if (ds.length > FEEDBACK_STATUSES.length * 2 || !ds.every(isFeedbackStatus)) return { ok: false };
  return { ok: true, value: [...new Set(ds)].join(",") };
}
/** Tham số `q` của hàng đợi: vắng hoặc rỗng sau khi bỏ khoảng trắng = không tìm; quá 60 ký tự ⇒ cắt còn 60 (đặc tả B2). */
export function parseTimHangDoi(raw: string | null): { ok: true; value: string | null } | { ok: false } {
  const q = (raw ?? "").trim().slice(0, HANG_DOI_Q_MAX);
  return { ok: true, value: q === "" ? null : q };
}
