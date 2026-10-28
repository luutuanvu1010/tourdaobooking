// Luật THUẦN dùng chung của tệp đính kèm (Hiến chương 5.22): MỘT nguồn cho kho tệp hồ sơ (ADR-0123, `parties/tep.ts` gọi lại) và tệp kèm tin vé hỗ trợ
// (ADR-0144, module feedback; giao diện kiểm trước trên máy). Không I/O ngoài Web Crypto. Không nhận tên tệp, đuôi hay loại trình duyệt khai — chỉ chữ ký thật.
// Thân tải lên là JSON base64 (router trả 415 cho lệnh ghi không phải JSON — không nới lớp chống gửi chéo trang).

export type LoaiTep = "jpg" | "png" | "heic" | "pdf";
export const TOI_DA_BYTE = 10 * 1024 * 1024;
export const LOAI_NOI_DUNG: Record<LoaiTep, string> = { jpg: "image/jpeg", png: "image/png", heic: "image/heic", pdf: "application/pdf" };
/** Độ dài chuỗi base64 chuẩn của `n` byte. */
export const doDaiBase64 = (n: number): number => Math.ceil(n / 3) * 4;

export const CAU_SAI_LOAI = "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.";

const bat = (d: Uint8Array, sig: readonly number[], o = 0): boolean => d.length >= o + sig.length && sig.every((x, i) => d[o + i] === x);
const chu = (d: Uint8Array, s: number, e: number): string => (d.length >= e ? String.fromCharCode(...d.subarray(s, e)) : "");
/** Nhãn chính của ảnh TĨNH HEIF (ruling R11 kế hoạch 2026-10-16-goi-2-h2-kho-tep). Không `msf1` (chuỗi ảnh), không `avif`. */
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

const hex = (u: Uint8Array): string => Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
/** Khoá kho `<tiền tố>/<128 bit ngẫu nhiên>` — không mang nghĩa (Hiến chương 5.22). `pty` = kho tệp hồ sơ (ADR-0123), `fbk` = kho tệp vé hỗ trợ (ADR-0144). */
export function taoKhoaNgauNhien(tienTo: "pty" | "fbk"): string {
  return `${tienTo}/${hex(crypto.getRandomValues(new Uint8Array(16)))}`;
}
export async function bamSha256(b: Uint8Array): Promise<string> {
  // Ép kiểu chỉ cho trình kiểm kiểu của web/ (thư viện DOM đòi ArrayBuffer thường): mảng ở đây do giaiBase64 / đọc tệp tạo, không bao giờ là SharedArrayBuffer.
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", b as Uint8Array<ArrayBuffer>)));
}

/** Header tải xuống (ADR-0123 đ3). Không tên tệp gốc; ảnh xem tại chỗ, PDF tải về; không bao giờ phục vụ loại chạy được. */
export function dauPhanHoiTepChung(t: { id: string; loai: LoaiTep; tenDau: string }): Record<string, string> {
  return {
    "content-type": LOAI_NOI_DUNG[t.loai],
    "content-disposition": `${t.loai === "pdf" ? "attachment" : "inline"}; filename="${t.tenDau}-${t.id.slice(0, 8)}.${t.loai}"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
  };
}

// ---- Tệp kèm MỘT tin của vé hỗ trợ (ADR-0144 đ2, đ5) ---------------------------------------------------------------------------------------------------------
export const TEP_MOI_TIN = 5;
/** TỔNG byte của mọi tệp trong một tin (ADR-0144 đ2 — cả tin đi trong một yêu cầu). */
export const TONG_BYTE_MOI_TIN = TOI_DA_BYTE;
export const TOI_DA_BASE64_TIN = doDaiBase64(TONG_BYTE_MOI_TIN);
/** Trần `Content-Length` của lệnh gửi tin CÓ tệp: base64 của 10 MB + 64 KB cho chữ (tiêu đề, 4000 ký tự tiếng Việt ≈ 12 KB, bối cảnh, vỏ JSON). */
export const TOI_DA_THAN_TIN_CO_TEP = TOI_DA_BASE64_TIN + 64 * 1024;
/** Trần tệp mỗi giờ mỗi tài khoản (ADR-0144 đ5), ngoài trần tin có sẵn. */
export const TEP_MOI_GIO = 20;
/** Tệp chưa lưu (chưa quyết xoá) quá mốc này ⇒ «chưa tải được» ở DTO và vào hàng dọn (ADR-0144 đ5; bằng DO_DANG_SAU_MS của ADR-0123). */
export const CHUA_TAI_DUOC_SAU_MS = 10 * 60 * 1000;

export const CAU_QUA_SO_TEP = `Mỗi tin đính kèm tối đa ${TEP_MOI_TIN} tệp.`;
export const CAU_QUA_TONG = "Tổng các tệp của một tin không được quá 10 MB.";
const CAU_TEP_HONG = "Tệp đính kèm không đọc được. Hãy chọn lại tệp.";

export interface TepDaKiem { bytes: Uint8Array; loai: LoaiTep }
export type KiemTepTin = { ok: true; tep: TepDaKiem[] } | { ok: false; status: 400 | 413 | 415; code: string; message: string };
const hong = (status: 400 | 413 | 415, code: string, message: string): KiemTepTin => ({ ok: false, status, code, message });

/**
 * Trường `tep` của thân gửi tin: vắng / `[]` ⇒ không tệp. Thứ tự kiểm: hình dạng + số tệp (400) → TỔNG độ dài chuỗi (413, TRƯỚC khi giải — chuỗi rác dài
 * không tốn công giải) → từng tệp: base64 (400), chữ ký (415) → tổng byte (413).
 */
export function kiemTepCuaTin(raw: unknown): KiemTepTin {
  if (raw === undefined) return { ok: true, tep: [] };
  if (!Array.isArray(raw)) return hong(400, "invalid_input", CAU_TEP_HONG);
  if (raw.length > TEP_MOI_TIN) return hong(400, "invalid_input", CAU_QUA_SO_TEP);
  const chuoi: string[] = [];
  for (const x of raw) {
    const s = x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>).noiDung : undefined;
    if (typeof s !== "string") return hong(400, "invalid_input", CAU_TEP_HONG);
    chuoi.push(s);
  }
  if (chuoi.reduce((n, s) => n + s.length, 0) > TOI_DA_BASE64_TIN) return hong(413, "file_too_large", CAU_QUA_TONG);
  const tep: TepDaKiem[] = [];
  let tong = 0;
  for (const s of chuoi) {
    const bytes = giaiBase64(s);
    if (!bytes || bytes.length === 0) return hong(400, "invalid_input", CAU_TEP_HONG);
    const loai = nhanLoaiTep(bytes.subarray(0, 16));
    if (!loai) return hong(415, "unsupported_file_type", CAU_SAI_LOAI);
    tong += bytes.length;
    tep.push({ bytes, loai });
  }
  if (tong > TONG_BYTE_MOI_TIN) return hong(413, "file_too_large", CAU_QUA_TONG);
  return { ok: true, tep };
}
