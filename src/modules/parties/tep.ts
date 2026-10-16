// Luật THUẦN của kho tệp hồ sơ (ADR-0123 đ2, đ3; Hiến chương 5.22). Không I/O ngoài Web Crypto. Mã MỚI: khuôn kiểm tệp của ADR-0041 chưa từng có mã thật
// (kế hoạch 2026-10-16-goi-2-h2-kho-tep, sự thật 1) — phỏng theo mã mẫu của kế hoạch 2026-09-28, bỏ DOC/DOCX/TXT/MD và bỏ phụ thuộc đuôi tên (không nhận tên tệp).
// Tải lên là JSON { noiDung: base64 } (ruling R3: router trả 415 cho lệnh ghi không phải JSON — không nới lớp chống gửi chéo trang).

export type LoaiTep = "jpg" | "png" | "heic" | "pdf";
export const TOI_DA_BYTE = 10 * 1024 * 1024;
export const TOI_DA_BASE64 = Math.ceil(TOI_DA_BYTE / 3) * 4;
/** Trần `Content-Length` (thân JSON = chuỗi base64 + vỏ) — vượt thì 413 TRƯỚC khi đọc thân. */
export const TOI_DA_THAN = TOI_DA_BASE64 + 1024;
/** Dòng tệp `stored_at` rỗng, chưa quyết xoá, tạo quá mốc này = "tải dở dang" (ruling R16) — lệnh chạy lại xử lý. */
export const DO_DANG_SAU_MS = 10 * 60 * 1000;
export const LY_DO_XOA_TEP = { TAI_LEN_LOI: "TAI_LEN_LOI", TAI_LEN_DO_DANG: "TAI_LEN_DO_DANG" } as const;
export const LOAI_NOI_DUNG: Record<LoaiTep, string> = { jpg: "image/jpeg", png: "image/png", heic: "image/heic", pdf: "application/pdf" };

const CAU_QUA_CO = "Tệp lớn hơn 10 MB.";
const CAU_SAI_LOAI = "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.";
const CAU_THIEU = "Chưa có nội dung tệp, hoặc nội dung không đọc được.";

const bat = (d: Uint8Array, sig: readonly number[], o = 0): boolean => d.length >= o + sig.length && sig.every((x, i) => d[o + i] === x);
const chu = (d: Uint8Array, s: number, e: number): string => (d.length >= e ? String.fromCharCode(...d.subarray(s, e)) : "");
/** Nhãn chính của ảnh TĨNH HEIF (ruling R11). Không `msf1` (chuỗi ảnh), không `avif`. */
const HEIF = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1"]);

/** Loại theo CHỮ KÝ ở đầu tệp (không tin tên, đuôi hay loại trình duyệt khai). Không khớp ⇒ null (kể cả HTML, SVG). */
export function nhanLoaiTep(dau: Uint8Array): LoaiTep | null {
  if (bat(dau, [0xff, 0xd8, 0xff])) return "jpg";
  if (bat(dau, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (chu(dau, 0, 5) === "%PDF-") return "pdf";
  if (chu(dau, 4, 8) === "ftyp" && HEIF.has(chu(dau, 8, 12))) return "heic";
  return null;
}

const B64 = /^[A-Za-z0-9+/]*={0,2}$/;
/** Base64 chuẩn (RFC 4648 §4), không khoảng trắng, không tiền tố `data:`. Sai ⇒ null. */
export function giaiBase64(s: unknown): Uint8Array | null {
  if (typeof s !== "string" || s.length === 0 || s.length % 4 !== 0 || !B64.test(s)) return null;
  let bin: string;
  try {
    bin = atob(s);
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

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

const hex = (u: Uint8Array): string => Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
/** Khoá kho `pty/<128 bit ngẫu nhiên>` — không mang nghĩa (Hiến chương 5.22). */
export function khoaNgauNhien(): string {
  return `pty/${hex(crypto.getRandomValues(new Uint8Array(16)))}`;
}
export async function bamSha256(b: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", b)));
}

/** Header tải xuống (ADR-0123 đ3; ruling R4, R9). Không tên tệp gốc; ảnh xem tại chỗ, PDF tải về; không bao giờ phục vụ loại chạy được. */
export function dauPhanHoiTep(t: { id: string; loai: LoaiTep }): Record<string, string> {
  return {
    "content-type": LOAI_NOI_DUNG[t.loai],
    "content-disposition": `${t.loai === "pdf" ? "attachment" : "inline"}; filename="giay-to-${t.id.slice(0, 8)}.${t.loai}"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
  };
}
