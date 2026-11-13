// Luật THUẦN của ảnh đại diện dịch vụ (ADR-0201 Đ3): MỘT nguồn cho máy chủ (catalog) và màn «Dịch vụ và Giá». Không I/O.
// Chỉ nhận JPG/PNG theo CHỮ KÝ thật (không tin tên, đuôi, loại trình duyệt khai); trình duyệt thu nhỏ trước khi gửi, máy chủ nhận ≤ 1 MB.
import { doDaiBase64, giaiBase64, nhanLoaiTep } from "./tep-dinh-kem.ts";

export const ANH_TOI_DA_BYTE = 1024 * 1024;
/** Trần `Content-Length` của lệnh tải ảnh: base64 của 1 MB + 4 KB cho vỏ JSON. Route chặn TRƯỚC khi đọc thân. */
export const TOI_DA_THAN_ANH = doDaiBase64(ANH_TOI_DA_BYTE) + 4 * 1024;
/** Cạnh dài tối đa khi trình duyệt thu nhỏ ảnh đại diện (ảnh nhỏ, đủ nét trên điện thoại). */
export const CANH_DAI_ANH_DICH_VU = 1200;

export const CAU_ANH_SAI_LOAI = "Ảnh đại diện chỉ nhận ảnh JPG hoặc PNG.";
export const CAU_ANH_QUA_CO = "Ảnh đại diện không được quá 1 MB sau khi thu nhỏ.";
const CAU_ANH_HONG = "Ảnh không đọc được. Hãy chọn lại tệp.";

export type LoaiAnh = "jpg" | "png";
export type KiemAnh = { ok: true; tep: { bytes: Uint8Array; loai: LoaiAnh } | null } | { ok: false; status: 400 | 413 | 415; code: string; message: string };
const hong = (status: 400 | 413 | 415, code: string, message: string): KiemAnh => ({ ok: false, status, code, message });

/**
 * Thân `PUT /api/catalog/:code/anh`: `{ noiDung: string | null }` — null = gỡ ảnh. Thứ tự (khuôn `kiemBienLai`): hình dạng (400) → độ dài chuỗi (413, trước khi giải)
 * → base64 (400) → chữ ký JPG/PNG (415) → cỡ byte (413).
 */
export function kiemAnhDichVu(raw: unknown): KiemAnh {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("noiDung" in raw)) return hong(400, "invalid_input", CAU_ANH_HONG);
  const s = (raw as Record<string, unknown>).noiDung;
  if (s === null) return { ok: true, tep: null };
  if (typeof s !== "string") return hong(400, "invalid_input", CAU_ANH_HONG);
  if (s.length > doDaiBase64(ANH_TOI_DA_BYTE)) return hong(413, "file_too_large", CAU_ANH_QUA_CO);
  const bytes = giaiBase64(s);
  if (!bytes || bytes.length === 0) return hong(400, "invalid_input", CAU_ANH_HONG);
  const loai = nhanLoaiTep(bytes.subarray(0, 16));
  if (loai !== "jpg" && loai !== "png") return hong(415, "unsupported_file_type", CAU_ANH_SAI_LOAI);
  if (bytes.length > ANH_TOI_DA_BYTE) return hong(413, "file_too_large", CAU_ANH_QUA_CO);
  return { ok: true, tep: { bytes, loai } };
}

/** Đường xem ảnh qua Worker (ADR-0201 Đ3 mục 2), kèm 12 ký tự của khoá làm dấu phiên bản (đổi ảnh ⇒ đường mới ⇒ trình duyệt tải lại). */
export const duongAnhDichVu = (ma: string, khoa: string): string => `/api/catalog/${encodeURIComponent(ma)}/anh?v=${khoa.split("/").pop()!.slice(0, 12)}`;
