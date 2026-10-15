// Email báo admin. Mọi email đi qua notifyAdmins(); CHỈ trong đây mới đụng bộ gửi (env.EMAIL, Cloudflare Email Service — đang beta).
// Chạy trong ctx.exec.waitUntil nên tự bắt mọi lỗi và tự ghi kết quả (notified_at): lỗi gửi KHÔNG bao giờ làm hỏng yêu cầu đã lưu.

export interface Mailer {
  send(msg: { to: string; from: string; subject: string; html: string }): Promise<unknown>;
}

export interface NotifyEvent {
  type: "created" | "user_replied";
  code: string;
  kindName: string;
  title: string;
  submitterName: string;
  excerpt: string;
  teamName: string;
  /** Nhóm nhạy cảm: thư không kèm tiêu đề, tên người gửi hay nội dung (ADR-0119 điều 9). */
  sensitive: boolean;
  url: string;
}

export interface MailDeps {
  mailer?: Mailer;
  to?: string;
  from?: string;
  setNotified(at: string | null): Promise<void>;
  now(): string;
  log(message: string, err?: unknown): void;
}

/** Đọc cấu hình từ môi trường. EMAIL là binding; hai địa chỉ là secret/biến (`wrangler secret put FEEDBACK_NOTIFY_EMAIL|FEEDBACK_MAIL_FROM`). Thiếu thì tính năng email tự tắt. */
export function mailConfig(env: Env): { mailer?: Mailer; to?: string; from?: string } {
  const e = env as unknown as { EMAIL?: Mailer; FEEDBACK_NOTIFY_EMAIL?: string; FEEDBACK_MAIL_FROM?: string };
  return { mailer: e.EMAIL, to: e.FEEDBACK_NOTIFY_EMAIL || undefined, from: e.FEEDBACK_MAIL_FROM || undefined };
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!);
const oneLine = (s: string, max: number): string => s.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function buildMail(e: NotifyEvent): { subject: string; html: string } {
  const head = e.type === "created" ? "Yêu cầu mới" : "Người gửi vừa trả lời";
  const team = oneLine(e.teamName, 60);
  const link = `<p><a href="${esc(e.url)}">Mở trong Nền tảng</a></p>`;
  if (e.sensitive) {
    const subject = oneLine(`[${team}] ${head} ${e.code}`, 150);
    const cau = e.type === "created" ? `Có phiếu mới cho nhóm ${team}. Mở Nền tảng để xem.` : `Có phản hồi mới ở phiếu nhóm ${team}. Mở Nền tảng để xem.`;
    const html = `<p><strong>${esc(head)}</strong> — ${esc(e.code)}</p><p>${esc(cau)}</p>` + link;
    return { subject, html };
  }
  const subject = oneLine(`[${team}] ${head} ${e.code}: ${e.title}`, 150);
  const html =
    `<p><strong>${esc(head)}</strong> — ${esc(e.code)} (${esc(e.kindName)}) · nhóm ${esc(team)}</p>` +
    `<p><strong>${esc(oneLine(e.title, 200))}</strong></p>` +
    `<p>Người gửi: ${esc(oneLine(e.submitterName, 100))}</p>` +
    `<blockquote>${esc(e.excerpt.slice(0, 500)).replace(/\n/g, "<br>")}</blockquote>` +
    link;
  return { subject, html };
}

export async function notifyAdmins(deps: MailDeps, e: NotifyEvent): Promise<"sent" | "skipped" | "failed"> {
  const record = async (at: string | null) => {
    try {
      await deps.setNotified(at);
    } catch (err) {
      deps.log("Không ghi được notified_at", err);
    }
  };
  if (!deps.mailer || !deps.to || !deps.from) {
    await record(null);
    return "skipped";
  }
  try {
    const { subject, html } = buildMail(e);
    await deps.mailer.send({ to: deps.to, from: deps.from, subject, html });
  } catch (err) {
    deps.log(`Gửi email báo admin thất bại (${e.code})`, err);
    await record(null);
    return "failed";
  }
  await record(deps.now());
  return "sent";
}
