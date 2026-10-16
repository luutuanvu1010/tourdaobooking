// Chữ hiển thị của bảo mật hai lớp (ADR-0074; kế hoạch Phần B Task 7) — thuần, dùng ở giao diện: nhãn ở Quản lý tài khoản, dải nhắc ân hạn ở khung trang,
// câu báo 429 ở bước nhập mã, tệp mã dự phòng. KHÔNG quyết ai phải bật: `required` / `graceUntil` / `enabled` luôn do máy chủ trả.
import { ngayNgan, vnDateTimeText, vnToday } from "./vn-date.ts";

const NGAY_MS = 86_400_000;

/**
 * Câu báo khi bước hai bị khoá (429 `too_many_attempts`). Máy chủ trả câu chung với PIN ("…Thử lại sau N phút hoặc nhờ người phụ trách hệ thống mở khoá.");
 * ruling điều phối Task 7: ở các chỗ nhập MÃ (bước hai đăng nhập, bật lại trong 24 giờ, trang Tôi) dùng đúng câu này — KHÔNG hứa "dùng mã dự phòng" vì mã dự
 * phòng đi chung bộ đếm `mfa:<id>` (máy chủ đặt chỗ lượt thử trước khi xét cách xác minh). Nút "Mở khoá" của Quản trị gỡ cả khoá này (Task 6).
 */
export const CAU_SAI_QUA_NHIEU_HAI_LOP = "Nhập sai quá nhiều lần. Chờ 15 phút hoặc nhờ Quản trị mở khoá.";

/** Câu hiện cho một lỗi của route nhập mã: 429 → câu cố định ở trên; mã lỗi khác → nguyên câu máy chủ. */
export function cauLoiHaiLop(code: string, message: string): string {
  return code === "too_many_attempts" ? CAU_SAI_QUA_NHIEU_HAI_LOP : message;
}

/** Dòng giải thích ở khối Bảo mật đăng nhập khi máy chủ không cho chọn Email (ADR-0074 điều 7): người dùng khỏi tưởng là lỗi. */
export const CAU_CHI_UNG_DUNG_XAC_THUC = "Tài khoản Quản trị, Toàn quyền, Kế toán chỉ dùng ứng dụng xác thực, không nhận mã qua email.";

/** Chữ đỏ dưới bộ mã dự phòng (nguyên văn kế hoạch Task 7). */
export const CHU_DO_MA_DU_PHONG = "Cất các mã này ở nơi an toàn — mỗi mã dùng một lần.";

/** Số ngày còn lại tới `graceUntil` (làm tròn LÊN: còn 3 giờ = 1 ngày). Hạn đã qua, thiếu, hoặc không đọc được → null. */
export function soNgayCon(graceUntil: string | null, nowMs: number): number | null {
  const han = Date.parse(graceUntil ?? ""); // thiếu / không đọc được → NaN → null (NaN > x luôn sai)
  return han > nowMs ? Math.ceil((han - nowMs) / NGAY_MS) : null;
}

/**
 * Chữ của dải nhắc ở khung trang (`GET /api/account/mfa` → `required`, `graceUntil` — CÙNG luật `mfaBanner` của máy chủ). null = không hiện dải.
 * `required` mà không còn hạn (máy chủ trả null khi hạn đã qua): phiên đang mở vẫn dùng được nhưng lần đăng nhập PIN sau sẽ bị chặn → nhắc "đã quá hạn".
 */
export function daiNhacHaiLop(m: { required: boolean; graceUntil: string | null }, nowMs: number): string | null {
  if (!m.required) return null;
  const n = soNgayCon(m.graceUntil, nowMs);
  // (gọn có chủ ý: hàm này vào gói MỌI trang qua web/shell.ts — trang Đơn hàng có trần dung lượng, src/goi-trang-nhe.test.ts)
  return `${n === null ? "Đã quá hạn bật" : `Còn ${n} ngày để bật`} bảo mật hai lớp — Bật ngay`;
}

/** Ngày dân sự giờ Việt Nam của một mốc ISO, dạng ngắn (năm chỉ khi khác năm hôm nay). */
const ngayVn = (isoMoc: string, nowMs: number): string => ngayNgan(vnToday(new Date(isoMoc)), vnToday(new Date(nowMs)));

/**
 * Nhãn "Hai lớp: …" ở Quản lý tài khoản (`StaffListRowDto.mfa`): máy chủ trả `graceUntil` chỉ cho tài khoản nội bộ chưa bật (có thể đã qua). Không hạn
 * (bên ngoài, hoặc nội bộ cũ thiếu hạn) → "Chưa bật".
 */
export function nhanHaiLop(mfa: { enabled: boolean; graceUntil: string | null }, nowMs: number): string {
  if (mfa.enabled) return "Hai lớp: Đã bật";
  if (mfa.graceUntil === null || !Number.isFinite(Date.parse(mfa.graceUntil))) return "Hai lớp: Chưa bật";
  return Date.parse(mfa.graceUntil) > nowMs ? `Hai lớp: Chưa bật (hạn ${ngayVn(mfa.graceUntil, nowMs)})` : `Hai lớp: Chưa bật (quá hạn ${ngayVn(mfa.graceUntil, nowMs)})`;
}

/** Ô nhập mã 6 số: chỉ giữ chữ số, tối đa 6 (dán "123 456" vẫn được). */
export const maTotpTuO = (value: string): string => value.replace(/\D/g, "").slice(0, 6);

/** Khoá base32 tách nhóm 4 ký tự cho dễ gõ tay (Google Authenticator nhận cả dấu cách). Nút "Chép khoá" vẫn chép khoá gốc. */
export const khoaDeDoc = (secret: string): string => (secret.match(/.{1,4}/g) ?? []).join(" ");

/** Nội dung tệp `.txt` tải về: tiêu đề, giờ tạo (giờ VN), câu cảnh báo, 10 mã đánh số. Không tên, không SĐT. */
export function vanBanMaDuPhong(codes: readonly string[], nowIso: string): string {
  return [
    "Mã dự phòng — Tour Đảo Booking",
    `Tạo lúc ${vnDateTimeText(nowIso)}`,
    CHU_DO_MA_DU_PHONG,
    "Tạo bộ mới thì bộ này hết hiệu lực.",
    "",
    ...codes.map((c, i) => `${i + 1}. ${c}`),
    "",
  ].join("\n");
}

/** Tên tệp tải về: theo ngày dân sự giờ Việt Nam. */
export const tenTepMaDuPhong = (nowIso: string): string => `ma-du-phong-tour-dao-${vnToday(new Date(nowIso))}.txt`;
