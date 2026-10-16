// Mã đăng nhập gửi qua email — yếu tố EMAIL của bảo mật hai lớp (ADR-0074 điều 4, 7; đặc tả §4.3, §6 quy tắc 2, 5, 8; kế hoạch Phần C).
// KHÔNG BAO GIỜ đưa mã, địa chỉ email đầy đủ hay câu lỗi của nhà cung cấp thư vào nhật ký, log máy, DTO hay câu lỗi. Ra ngoài chỉ dạng che `t***@gmail.com`.
// Email là việc BÊN NGOÀI (Hiến chương 5.16): ghi dòng mã (băm) TRƯỚC, gửi SAU — gửi hỏng thì dòng mã vẫn còn và tự hết hạn sau 10 phút.
import { cauHinhThu, guiThu } from "../../shared/gui-thu.ts";
import { sha256Hex } from "./mfa-crypto.ts";
import { emailCodeBumpStatement, emailCodeInsertStatement, emailCodeOpen, emailCodeRevokeOpenStatement, emailCodeTryStatement, type EmailCodePurpose } from "./mfa-repo.ts";

/** Mã email sống 10 phút; tối đa 5 lần nhập mỗi mã (CHECK của bảng); tối đa 3 thư / 15 phút mỗi tài khoản (khoá `mfa-mail:<staffId>` của bảng login_attempt). */
export const EMAIL_CODE_TTL_MS = 10 * 60_000;
export const MAIL_LIMIT = 3;
export const mailKey = (staffId: string): string => `mfa-mail:${staffId}`;

/** Email che dạng `t***@gmail.com` (đặc tả §6 quy tắc 5). Không phải email hợp lệ → null. */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  return `${email[0]}***${email.slice(at)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Chuẩn hoá địa chỉ người dùng gõ: cắt khoảng trắng, chữ thường, đúng khuôn `a@b.c`, ≤ 254 ký tự. Sai → null. */
export function normalizeEmail(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const e = s.trim().toLowerCase();
  return e.length > 0 && e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

/**
 * Nội dung thư (tiếng Việt có dấu). KHÔNG có liên kết, `http`, hay tên miền (ứng dụng thư tự biến tên miền thành liên kết — chống lừa đảo: thư thật của
 * Nền tảng không bao giờ có chỗ bấm). Mã không nằm ở chủ đề (chủ đề hiện trên màn hình khoá điện thoại).
 */
export function emailBody(code: string): { subject: string; text: string; html: string } {
  const CANH_BAO = "Nếu không phải bạn, đổi PIN ngay và báo IT.";
  return {
    subject: "Mã xác minh đăng nhập Nền tảng Tour Đảo",
    // Kế hoạch Phần C (Global Constraints) + ruling (d): CHỈ mã + câu cảnh báo — không thêm câu nào khác.
    text: `Mã xác minh đăng nhập của bạn là: ${code}\n\n${CANH_BAO}\n`,
    // Vòng sửa 2: gửi KÈM html — đường thư đang chạy được trên production (thư Góp ý, feedback/notify.ts) gửi html; chưa chắc Email Service nhận thư chỉ
    // có text. Cùng nội dung, chỉ thẻ đoạn văn + chữ đậm, đã thoát ký tự; không liên kết.
    html: `<p>Mã xác minh đăng nhập của bạn là: <strong>${escHtml(code)}</strong></p><p>${escHtml(CANH_BAO)}</p>`,
  };
}
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!);

/** Mã 6 chữ số đều nhau (lấy mẫu loại bỏ trên số ngẫu nhiên 32 bit — không lệch về số nhỏ), giữ số 0 đầu. */
export function newEmailCode(): string {
  const gioiHan = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < gioiHan) return String(buf[0]! % 1_000_000).padStart(6, "0");
  }
}

/** Băm mã: SHA-256("<staffId>:<id>:<mã>") — gắn với đúng dòng và đúng người. */
export const emailCodeHash = (staffId: string, id: string, code: string): Promise<string> => sha256Hex(`${staffId}:${id}:${code}`);
/** Băm địa chỉ đã chuẩn hoá — so với địa chỉ của yếu tố lúc nhập mã (đổi địa chỉ thì mã đã gửi tới địa chỉ cũ hết tác dụng). */
export const emailHash = (email: string): Promise<string> => sha256Hex(normalizeEmail(email) ?? email.trim().toLowerCase());

type MoiTruongThu = { EMAIL?: unknown; FEEDBACK_MAIL_FROM?: unknown };

/**
 * Gửi MỘT thư mã tới `to`. KHÔNG ném: thiếu binding `EMAIL`, thiếu `FEEDBACK_MAIL_FROM`, hay nhà cung cấp báo lỗi → false (route trả 502 "Chưa gửi được
 * email…"). Log một dòng `mfa_mail_failed` CHỈ có lý do cố định — không địa chỉ, không mã, không câu lỗi của nhà cung cấp.
 */
export async function sendMfaEmail(env: MoiTruongThu | Env, to: string, code: string): Promise<boolean> {
  const kq = await guiThu(cauHinhThu(env as MoiTruongThu), { to, ...emailBody(code) });
  if (!kq.ok) console.error(JSON.stringify({ level: "error", event: "mfa_mail_failed", message: kq.lyDo }));
  return kq.ok;
}

/**
 * Phát một mã mới tới `email`: MỘT lô [huỷ mọi mã còn mở của (người, mục đích) → chèn dòng mã mới (băm)] — rồi mới gửi thư (Hiến chương 5.16).
 * Trả kết quả gửi; dòng mã đã ghi dù gửi hỏng (hết hạn tự nhiên). Hạn mức gửi do route giữ.
 */
export async function phatMaEmail(
  env: Env,
  v: { staffId: string; email: string; purpose: EmailCodePurpose; by: string | null; nowMs: number },
): Promise<boolean> {
  const id = crypto.randomUUID();
  const code = newEmailCode();
  const at = new Date(v.nowMs).toISOString();
  await env.DB.batch([
    emailCodeRevokeOpenStatement(env.DB, v.staffId, v.purpose, at, v.by),
    emailCodeInsertStatement(env.DB, {
      id, staffId: v.staffId, purpose: v.purpose, emailHash: await emailHash(v.email), codeHash: await emailCodeHash(v.staffId, id, code),
      at, expiresAt: new Date(v.nowMs + EMAIL_CODE_TTL_MS).toISOString(), by: v.by,
    }),
  ]);
  return sendMfaEmail(env, v.email, code);
}

/**
 * Kiểm mã người dùng gõ với mã đang mở của (người, mục đích): phải gửi tới ĐÚNG địa chỉ `email` (địa chỉ của yếu tố hiện hành), chưa hết hạn, chưa đủ 5
 * lần, chưa dùng/huỷ. Đúng → tiêu mã (MỘT câu có điều kiện, đòi changes = 1 — hai lần nhập song song chỉ một lần thắng). Sai → đếm thêm một lần cho mã đó.
 */
export async function useEmailCode(
  db: D1Database, v: { staffId: string; email: string; purpose: EmailCodePurpose; code: string; nowIso: string; phatTu?: string | null },
): Promise<boolean> {
  const row = await emailCodeOpen(db, v.staffId, v.purpose, v.nowIso);
  if (!row) return false;
  // `phatTu` (bật yếu tố email — Phần C Task 3): mã phải phát SAU khi yếu tố sống mới nhất được bật. Mã phát trước đó (lúc chưa phải đưa mã yếu tố hiện có)
  // không được dùng để thêm yếu tố sau khi đã có yếu tố khác — không tiêu, không đếm.
  if (v.phatTu && row.created_at < v.phatTu) return false;
  const ma = v.code.trim();
  if (/^\d{6}$/.test(ma) && row.email_hash === (await emailHash(v.email))) {
    const r = await emailCodeTryStatement(db, row.id, v.staffId, await emailCodeHash(v.staffId, row.id, ma), v.nowIso).run();
    if (r.meta.changes === 1) return true;
  }
  await emailCodeBumpStatement(db, row.id, v.nowIso).run();
  return false;
}
