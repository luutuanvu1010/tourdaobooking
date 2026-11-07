// Gửi thư qua binding `EMAIL` (Cloudflare Email Service, khối `send_email` của wrangler.jsonc) — phần dùng chung của `feedback` (thư báo nhóm hỗ trợ) và
// `auth` (mã email của bảo mật hai lớp, ADR-0074 điều 4). Tách ra đây vì `auth` không được import `feedback` (ALLOWED_EDGES của src/architecture.test.ts).
// Không import module nào; nhận môi trường theo DẠNG (không dùng kiểu Env toàn cục) để bài thử truyền bộ gửi giả.
// Người gửi = biến bí mật có sẵn `FEEDBACK_MAIL_FROM` (cùng tên miền gửi đã xác minh — ruling Task 0 Phần C; không thêm bí mật mới).

/** Bộ gửi thư: đúng hình `env.EMAIL.send({ to, from, subject, text, html })` của Email Service (thư Góp ý chỉ html; thư mã hai lớp gửi cả hai). */
export interface Mailer {
  send(msg: { to: string; from: string; subject: string; text?: string; html?: string }): Promise<unknown>;
}

/**
 * Bản Development (ADR-0162 Đ2): khi `MOI_TRUONG` được đặt (giá trị nào cũng tính), bộ gửi bị bọc — chỉ thư có `to` KHỚP NGUYÊN CHUỖI (không phân biệt hoa thường)
 * một mục của `THU_CHO_PHEP` (danh sách ngăn dấu phẩy) mới tới bộ gửi thật; thư khác bị bỏ, không ném, log một dòng không có địa chỉ. Danh sách trống/thiếu = không thư nào tới.
 */
function locThuBanThu(that: Mailer, danhSach: unknown): Mailer {
  const duoc = new Set(typeof danhSach === "string" ? danhSach.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : []);
  return {
    async send(msg) {
      if (!duoc.has(String(msg.to).trim().toLowerCase())) {
        console.warn(JSON.stringify({ level: "warn", event: "thu_bi_loc_ban_thu" }));
        return undefined;
      }
      return that.send(msg);
    },
  };
}

/** Bộ gửi + địa chỉ người gửi đọc từ môi trường; thiếu cái nào thì trường đó `undefined` (tính năng thư tự tắt — không ném). Có `MOI_TRUONG` thì bộ gửi được lọc theo `THU_CHO_PHEP`. */
export function cauHinhThu(env: { EMAIL?: unknown; FEEDBACK_MAIL_FROM?: unknown; MOI_TRUONG?: unknown; THU_CHO_PHEP?: unknown }): { mailer?: Mailer; from?: string } {
  const e = env.EMAIL as Partial<Mailer> | undefined;
  let mailer = e && typeof e.send === "function" ? (e as Mailer) : undefined;
  if (mailer && env.MOI_TRUONG !== undefined && env.MOI_TRUONG !== null) mailer = locThuBanThu(mailer, env.THU_CHO_PHEP);
  const from = typeof env.FEEDBACK_MAIL_FROM === "string" && env.FEEDBACK_MAIL_FROM.trim() ? env.FEEDBACK_MAIL_FROM.trim() : undefined;
  return { mailer, from };
}

export type LyDoThuHong = "no_binding" | "no_from" | "send_threw";

/**
 * Gửi MỘT thư; KHÔNG BAO GIỜ ném. Trả `{ ok: true }` hoặc `{ ok: false, lyDo }` (lý do cố định để người gọi ghi log — hàm này không tự log: câu lỗi
 * của nhà cung cấp có thể nhắc lại địa chỉ người nhận, nên không được đưa ra ngoài).
 */
export async function guiThu(
  cfg: { mailer?: Mailer; from?: string },
  thu: { to: string; subject: string; text?: string; html?: string },
): Promise<{ ok: true } | { ok: false; lyDo: LyDoThuHong }> {
  if (!cfg.mailer) return { ok: false, lyDo: "no_binding" };
  if (!cfg.from) return { ok: false, lyDo: "no_from" };
  try {
    await cfg.mailer.send({ ...thu, from: cfg.from });
    return { ok: true };
  } catch {
    return { ok: false, lyDo: "send_threw" };
  }
}
