// Thư mã xác nhận của người đăng ký (ADR-0206 Đ8): câu chữ RIÊNG, không dùng lại thư «mã xác minh đăng nhập» của hai lớp (người nhận có thể là người lạ chưa từng đăng nhập).
// Như thư hai lớp: không liên kết, không `http`, không tên miền (ứng dụng thư tự biến tên miền thành liên kết); mã không nằm ở chủ đề (chủ đề hiện trên màn hình khoá).
// Gửi bằng `guiThu` dùng chung (src/shared/gui-thu.ts); KHÔNG BAO GIỜ ném, KHÔNG BAO GIỜ log địa chỉ, mã hay câu lỗi của nhà cung cấp.
import { cauHinhThu, guiThu } from "../../shared/gui-thu.ts";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!);

/** Nội dung thư: chủ đề «Mã xác nhận đăng ký Tour Đảo»; thân chỉ có mã, hạn dùng, mã phiếu (nếu email đã có phiếu) và câu «không phải bạn». `phutHan` lấy từ chính sách. */
export function thuMaDangKy(ma: string, phutHan: number, maPhieu: string | null): { subject: string; text: string; html: string } {
  const dong = [`Mã xác nhận đăng ký của bạn là: ${ma}`, `Mã dùng được trong ${phutHan} phút.`];
  if (maPhieu) dong.push(`Mã phiếu của bạn: ${maPhieu}`);
  dong.push("Nếu không phải bạn xin mã này, hãy bỏ qua thư.");
  return {
    subject: "Mã xác nhận đăng ký Tour Đảo",
    text: `${dong.join("\n")}\n`,
    html: [`<p>Mã xác nhận đăng ký của bạn là: <strong>${escHtml(ma)}</strong></p>`, ...dong.slice(1).map((d) => `<p>${escHtml(d)}</p>`)].join(""),
  };
}

/** Gửi thư mã tới `den`; lỗi chỉ ghi một dòng `dk_mail_failed` với lý do cố định. Trả kết quả để bài thử kiểm. */
export async function guiThuMa(env: unknown, den: string, ma: string, phutHan: number, maPhieu: string | null): Promise<boolean> {
  const kq = await guiThu(cauHinhThu(env as Parameters<typeof cauHinhThu>[0]), { to: den, ...thuMaDangKy(ma, phutHan, maPhieu) });
  if (!kq.ok) console.error(JSON.stringify({ level: "error", event: "dk_mail_failed", message: kq.lyDo }));
  return kq.ok;
}
