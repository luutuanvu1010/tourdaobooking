// Luật THUẦN của «Ảnh bàn giao» (ADR-0232): MỘT nguồn cho máy chủ (module anh-ban-giao) và giao diện (web/anh-ban-giao.ts). Không I/O.
// Chỉ nhận JPEG HAI CỠ đã nén ở trình duyệt (Đ5): kiểm theo chữ ký thật, từ chối JPEG còn đoạn «Exif» (canvas không sinh đoạn này — tệp có nó là tệp không qua
// bước nén, có thể còn toạ độ chụp). Con số cỡ khớp CHECK của migration 0192 (bài src/shared/anh-ban-giao.test.ts ghim).
import { doDaiBase64, giaiBase64, nhanLoaiTep } from "./tep-dinh-kem.ts";

/** Cạnh dài (điểm ảnh) của hai bản (Đ5). */
export const CANH_ANH_NHO = 400;
export const CANH_ANH_XEM = 1600;
/** Trần cỡ (byte) — khớp CHECK thumb_size / view_size của 0192. */
export const TOI_DA_ANH_NHO = 100 * 1024;
export const TOI_DA_ANH_XEM = 600 * 1024;
/** Trần thân yêu cầu tải (chặn TRƯỚC khi đọc thân): hai chuỗi base64 + phần chữ. */
export const TOI_DA_THAN_ANH_BAN_GIAO = doDaiBase64(TOI_DA_ANH_NHO) + doDaiBase64(TOI_DA_ANH_XEM) + 16 * 1024;
/** Tối đa ảnh còn hiện mỗi đơn (khớp trigger abg_photo_order_full_ins). */
export const ANH_TOI_DA_MOI_DON = 30;
export const GHI_CHU_TOI_DA = 200;

export type LoaiViec = "GIAO_KHACH" | "GIAO_TAI_XE" | "KHAC";
export const LOAI_VIEC: readonly LoaiViec[] = ["GIAO_KHACH", "GIAO_TAI_XE", "KHAC"];
/** Nhãn ba loại việc (chữ giao diện — tra docs/BANG-THAM-CHIEU.md). */
export const NHAN_LOAI_VIEC: Record<LoaiViec, string> = { GIAO_KHACH: "Giao cho khách", GIAO_TAI_XE: "Giao khách cho tài xế", KHAC: "Việc khác" };

/** Mã lý do gỡ — danh sách ĐÓNG theo ADR (khớp trigger abg_photo_retention_hold). */
export const LY_DO_GO_ANH = { TAI_LEN_LOI: "TAI_LEN_LOI", HET_HAN: "HET_HAN", GIAY_TO_CHUP_NHAM: "GIAY_TO_CHUP_NHAM", XOA_THEO_YEU_CAU: "XOA_THEO_YEU_CAU" } as const;
/** Lý do Toàn quyền chọn được khi XOÁ một ảnh (lệnh xoá — Đ7, Đ8). HET_HAN chỉ sau hạn giữ; TAI_LEN_LOI chỉ hàng chờ dùng. */
export type LyDoXoaAnh = "GIAY_TO_CHUP_NHAM" | "XOA_THEO_YEU_CAU" | "HET_HAN";

/** Tên tính năng (chủ chọn 22/11/2026 — Hiến chương 5.27). */
export const TEN_ANH_BAN_GIAO = "Ảnh bàn giao";

/** Đường xem ảnh lớn của một ảnh. */
export const duongAnhBanGiao = (anhId: string): string => `/api/anh-ban-giao/anh/${encodeURIComponent(anhId)}`;

/**
 * JPEG còn đoạn APP1 «Exif» trước dữ liệu ảnh? Đi theo các đoạn (FFxx + độ dài) từ sau FFD8 tới SOS (FFDA). Cấu trúc hỏng ⇒ true (coi như không sạch — từ chối).
 */
export function coExif(b: Uint8Array): boolean {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return true;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return true;
    const m = b[i + 1]!;
    if (m === 0xda || m === 0xd9) return false; // tới dữ liệu ảnh / hết ảnh mà chưa gặp Exif
    if (m === 0xff) {
      i++;
      continue;
    }
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) {
      i += 2;
      continue;
    }
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (len < 2 || i + 2 + len > b.length) return true;
    if (m === 0xe1 && len >= 8 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66 && b[i + 8] === 0 && b[i + 9] === 0) return true;
    i += 2 + len;
  }
  return true;
}

export interface AnhBanGiaoDaKiem { nho: Uint8Array; xem: Uint8Array; loaiViec: LoaiViec; ghiChu: string | null; dichVuId: string | null; changId: string | null }
export type KiemAnhBanGiao = { ok: true; value: AnhBanGiaoDaKiem } | { ok: false; status: 400 | 413 | 415; code: string; message: string };

export const CAU_SAI_LOAI_ANH = "Chỉ nhận ảnh đã được Nền tảng thu nhỏ. Hãy chụp lại hoặc chọn lại ảnh.";
export const CAU_QUA_CO_ANH = "Ảnh quá lớn. Hãy chụp lại ở chỗ đủ sáng hoặc chọn ảnh khác.";
const MA = /^[A-Za-z0-9_-]{1,64}$/;

/** Thân `POST /api/anh-ban-giao/don/:orderId`: `{ anhNho, anhXem, loaiViec, ghiChu?, dichVuId?, changId? }` (hai ảnh base64). Không nhận giờ chụp, toạ độ, tên tệp. */
export function kiemAnhBanGiao(body: Record<string, unknown> | null): KiemAnhBanGiao {
  const sai = (message: string): KiemAnhBanGiao => ({ ok: false, status: 400, code: "invalid_input", message });
  if (!body) return sai("Dữ liệu không hợp lệ.");
  const loaiViec = body.loaiViec;
  if (typeof loaiViec !== "string" || !(LOAI_VIEC as readonly string[]).includes(loaiViec)) return sai("Chọn loại việc của ảnh.");
  const g = body.ghiChu;
  let ghiChu: string | null = null;
  if (g !== undefined && g !== null) {
    if (typeof g !== "string") return sai("Ghi chú không hợp lệ.");
    const t = g.normalize("NFC").trim();
    if (t.length > GHI_CHU_TOI_DA) return sai(`Ghi chú tối đa ${GHI_CHU_TOI_DA} ký tự.`);
    ghiChu = t === "" ? null : t;
  }
  const dv = body.dichVuId ?? null;
  const ch = body.changId ?? null;
  if (dv !== null && (typeof dv !== "string" || !MA.test(dv))) return sai("Dịch vụ không hợp lệ.");
  if (ch !== null && (typeof ch !== "string" || !MA.test(ch))) return sai("Lượt đón không hợp lệ.");
  if (dv !== null && ch !== null) return sai("Chỉ gắn ảnh vào một dịch vụ hoặc một lượt đón.");
  const sNho = body.anhNho;
  const sXem = body.anhXem;
  if (typeof sNho !== "string" || typeof sXem !== "string") return sai("Thiếu ảnh.");
  if (sNho.length > doDaiBase64(TOI_DA_ANH_NHO) || sXem.length > doDaiBase64(TOI_DA_ANH_XEM)) return { ok: false, status: 413, code: "payload_too_large", message: CAU_QUA_CO_ANH };
  const nho = giaiBase64(sNho);
  const xem = giaiBase64(sXem);
  if (!nho || !xem) return sai("Ảnh không đọc được. Hãy chụp lại.");
  if (nho.length > TOI_DA_ANH_NHO || xem.length > TOI_DA_ANH_XEM) return { ok: false, status: 413, code: "payload_too_large", message: CAU_QUA_CO_ANH };
  for (const b of [nho, xem]) {
    if (b.length === 0 || nhanLoaiTep(b.subarray(0, 16)) !== "jpg" || coExif(b)) return { ok: false, status: 415, code: "unsupported_media_type", message: CAU_SAI_LOAI_ANH };
  }
  return { ok: true, value: { nho, xem, loaiViec: loaiViec as LoaiViec, ghiChu, dichVuId: dv as string | null, changId: ch as string | null } };
}

/** Hạn giữ = giờ tải + số năm (máy chủ tính; chuỗi ISO UTC cùng khuôn toISOString — trigger so chuỗi). */
export function hanGiuAnh(taiLuc: string, soNam: number): string {
  const d = new Date(taiLuc);
  d.setUTCFullYear(d.getUTCFullYear() + soNam);
  return d.toISOString();
}

/** Lý do ẩn / ghi chú yêu cầu xoá: 3–300 ký tự (khớp CHECK hidden_reason / channel_note của 0192). */
export function kiemLyDoAnh(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.normalize("NFC").trim();
  return t.length >= 3 && t.length <= 300 ? t : null;
}

// ---- DTO (máy chủ ↔ giao diện) --------------------------------------------------------------------------------------------------------------------------------
/** `GET /api/anh-ban-giao/don/:orderId/tom-tat` — không nội dung ảnh. */
export interface AnhBanGiaoTomTatResponse { soAnh: number; coTheTai: boolean }
/** Một ảnh trong danh sách: `anhNho` = JPEG base64 (null khi kho thiếu đối tượng). Không khoá kho, không băm, không lý do ẩn. */
export interface AnhBanGiaoDong {
  id: string; loaiViec: LoaiViec; ghiChu: string | null; dichVuId: string | null; changId: string | null; nguoiTai: string | null; luc: string; daAn: boolean; anhNho: string | null;
}
export interface AnhBanGiaoDanhSachResponse { anh: AnhBanGiaoDong[]; coTheAn: boolean; coTheXoa: boolean }
export interface AnhBanGiaoChoXoaResponse { anh: { id: string; orderId: string; luc: string; hanGiu: string; trangThai: "TAI_DO_DANG" | "CHO_XOA_KHO" | "QUA_HAN" }[]; conNua: boolean }
