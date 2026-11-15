// Thư mã xác nhận của người đăng ký (ADR-0206 Đ8): câu chữ RIÊNG, không dùng lại thư «mã xác minh đăng nhập» của hai lớp (người nhận có thể là người lạ chưa từng đăng nhập).
// Như thư hai lớp: không liên kết, không `http`, không tên miền (ứng dụng thư tự biến tên miền thành liên kết); mã không nằm ở chủ đề (chủ đề hiện trên màn hình khoá).
// Gửi bằng `guiThu` dùng chung (src/shared/gui-thu.ts); KHÔNG BAO GIỜ ném, KHÔNG BAO GIỜ log địa chỉ, mã hay câu lỗi của nhà cung cấp.
import { cauHinhThu, guiThu } from "../../shared/gui-thu.ts";
import type { LoaiThu } from "./rules.ts";

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

const TRANG = "Hãy mở trang «Đăng ký làm đối tác» của Tour Đảo và nhập email này để nhận mã";
const KHONG_PHAI_BAN = "Nếu bạn không đăng ký làm đối tác với Tour Đảo, hãy bỏ qua thư.";

/**
 * Ba thư báo kết quả của phiếu (ADR-0206 Đ13: «cần bổ sung», «đã duyệt», «bị từ chối»; câu chữ AI viết 2026-11-16, chờ chủ chọn). Thân thư chỉ có MÃ PHIẾU (Đ13) — không tên, không số điện thoại,
 * không số giấy tờ; cùng khuôn thư mã: không liên kết, không tên miền (chỉ gọi tên trang bằng lời). Thư từ chối kèm câu lý do viết cho người đăng ký (`lyDoNhan`); thư đã duyệt kèm ngày hết hạn đặt PIN.
 */
export function thuBaoDangKy(loai: LoaiThu, maPhieu: string, them: { lyDoNhan?: string | null; hanNgay?: string | null } = {}): { subject: string; text: string; html: string } {
  let subject: string;
  let dong: string[];
  if (loai === "BO_SUNG") {
    subject = "Phiếu đăng ký Tour Đảo cần bổ sung";
    dong = [`Phiếu ${maPhieu} của bạn cần bổ sung thông tin.`, `${TRANG}, xem lý do rồi sửa và gửi lại phiếu.`];
  } else if (loai === "DA_DUYET") {
    subject = "Phiếu đăng ký Tour Đảo đã được duyệt";
    dong = [`Phiếu ${maPhieu} của bạn đã được duyệt.`, `${TRANG} mới, rồi tự đặt mã PIN${them.hanNgay ? ` trước hết ngày ${them.hanNgay}` : ""}.`, "Sau đó đăng nhập bằng số điện thoại đã khai và mã PIN vừa đặt."];
  } else {
    subject = "Phiếu đăng ký Tour Đảo không được duyệt";
    dong = [`Phiếu ${maPhieu} của bạn không được duyệt.`, ...(them.lyDoNhan ? [`Lý do: ${them.lyDoNhan}`] : []), "Nếu cần hỏi thêm, hãy liên hệ Tour Đảo."];
  }
  dong.push(KHONG_PHAI_BAN);
  return { subject, text: `${dong.join("\n")}\n`, html: dong.map((d) => `<p>${escHtml(d)}</p>`).join("") };
}

/** Gửi một thư báo; KHÔNG BAO GIỜ ném; lỗi chỉ ghi một dòng `dk_mail_failed` (lý do cố định, không địa chỉ). */
export async function guiThuBao(env: unknown, den: string, loai: LoaiThu, maPhieu: string, them: { lyDoNhan?: string | null; hanNgay?: string | null } = {}): Promise<boolean> {
  const kq = await guiThu(cauHinhThu(env as Parameters<typeof cauHinhThu>[0]), { to: den, ...thuBaoDangKy(loai, maPhieu, them) });
  if (!kq.ok) console.error(JSON.stringify({ level: "error", event: "dk_mail_failed", message: kq.lyDo }));
  return kq.ok;
}

/** Gửi thư mã tới `den`; lỗi chỉ ghi một dòng `dk_mail_failed` với lý do cố định. Trả kết quả để bài thử kiểm. */
export async function guiThuMa(env: unknown, den: string, ma: string, phutHan: number, maPhieu: string | null): Promise<boolean> {
  const kq = await guiThu(cauHinhThu(env as Parameters<typeof cauHinhThu>[0]), { to: den, ...thuMaDangKy(ma, phutHan, maPhieu) });
  if (!kq.ok) console.error(JSON.stringify({ level: "error", event: "dk_mail_failed", message: kq.lyDo }));
  return kq.ok;
}
