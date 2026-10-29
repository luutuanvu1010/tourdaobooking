// Luật THUẦN của kho tệp hồ sơ (ADR-0123 đ2, đ3; Hiến chương 5.22). Không I/O ngoài Web Crypto. Phần kiểm MỘT tệp (chữ ký, base64, khoá, băm, header) nay ở
// src/shared/tep-dinh-kem.ts (một nguồn với tệp kèm tin vé hỗ trợ — ADR-0144 đ9); tệp này giữ tên và hành vi cũ cho parties (bài tep.test.ts không đổi).
// Tải lên là JSON { noiDung: base64 } (ruling R3: router trả 415 cho lệnh ghi không phải JSON — không nới lớp chống gửi chéo trang).
import {
  CAU_SAI_LOAI, LOAI_NOI_DUNG, TOI_DA_BYTE, bamSha256, dauPhanHoiTepChung, doDaiBase64, giaiBase64, nhanLoaiTep, taoKhoaNgauNhien, type LoaiTep,
} from "../../shared/tep-dinh-kem.ts";

export { LOAI_NOI_DUNG, TOI_DA_BYTE, bamSha256, giaiBase64, nhanLoaiTep, type LoaiTep };
export const TOI_DA_BASE64 = doDaiBase64(TOI_DA_BYTE);
/** Trần `Content-Length` (thân JSON = chuỗi base64 + vỏ) — vượt thì 413 TRƯỚC khi đọc thân. */
export const TOI_DA_THAN = TOI_DA_BASE64 + 1024;
/** Dòng tệp `stored_at` rỗng, chưa quyết xoá, tạo quá mốc này = "tải dở dang" (ruling R16) — lệnh chạy lại xử lý. */
export const DO_DANG_SAU_MS = 10 * 60 * 1000;
export const LY_DO_XOA_TEP = { TAI_LEN_LOI: "TAI_LEN_LOI", TAI_LEN_DO_DANG: "TAI_LEN_DO_DANG" } as const;

const CAU_QUA_CO = "Tệp lớn hơn 10 MB.";
const CAU_THIEU = "Chưa có nội dung tệp, hoặc nội dung không đọc được.";

export type KiemTep = { ok: true; bytes: Uint8Array; loai: LoaiTep } | { ok: false; status: 400 | 413 | 415; code: string; message: string };
/** Thân `{ noiDung }`: 413 khi quá cỡ (kể cả chuỗi quá dài — không giải), 400 khi thiếu / hỏng, 415 khi sai loại. */
export function kiemTepTaiLen(body: Record<string, unknown> | null): KiemTep {
  const s = body?.noiDung;
  if (typeof s === "string" && s.length > TOI_DA_BASE64) return { ok: false, status: 413, code: "file_too_large", message: CAU_QUA_CO };
  const bytes = giaiBase64(s);
  if (!bytes || bytes.length === 0) return { ok: false, status: 400, code: "invalid_input", message: CAU_THIEU };
  if (bytes.length > TOI_DA_BYTE) return { ok: false, status: 413, code: "file_too_large", message: CAU_QUA_CO };
  const loai = nhanLoaiTep(bytes.subarray(0, 16));
  if (!loai) return { ok: false, status: 415, code: "unsupported_file_type", message: CAU_SAI_LOAI };
  return { ok: true, bytes, loai };
}

/** Khoá kho `pty/<128 bit ngẫu nhiên>` — không mang nghĩa (Hiến chương 5.22). */
export function khoaNgauNhien(): string {
  return taoKhoaNgauNhien("pty");
}

/** Header tải xuống (ADR-0123 đ3; ruling R4, R9). Không tên tệp gốc; ảnh xem tại chỗ, PDF tải về; không bao giờ phục vụ loại chạy được. */
export function dauPhanHoiTep(t: { id: string; loai: LoaiTep }): Record<string, string> {
  return dauPhanHoiTepChung({ ...t, tenDau: "giay-to" });
}
